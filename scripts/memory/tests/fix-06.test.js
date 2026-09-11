'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { fixture, mod } = require('./helpers');

const events = mod('events');
const jsonl = mod('jsonl');
const { DurableQueue } = mod('queue');

test('B10: UTF-8 truncation preserves code points and the byte limit', () => {
  for (const [value, limit] of [['яяяя', 6], ['😀😀', 7], ['abc', 0], ['😀', 2]]) {
    const output = events.truncateUtf8(value, limit);
    assert.ok(Buffer.byteLength(output, 'utf8') <= limit);
    assert.equal(output.includes('\uFFFD'), false);
  }
  assert.equal(events.truncateUtf8('short', 20), 'short');
  assert.throws(() => events.truncateUtf8('x', -1), /non-negative integer/);
});

test('B11: event validation rejects missing identity and malformed list fields', () => {
  fixture('b11-event-schema');
  const valid = events.createEvent({ kind: 'commit', project_id: 'A', sha: 'abcdef0', summary: 'valid' });
  for (const mutate of [
    event => { delete event.event_id; },
    event => { event.event_id = 'evt_000000000000'; },
    event => { event.decisions = {}; },
    event => { event.user_corrections = [1]; },
    event => { event.checks = 'ok'; },
    event => { event.next_action = null; },
  ]) {
    const event = structuredClone(valid);
    mutate(event);
    assert.throws(() => events.validateEvent(event));
  }
});

test('B11: queue validates direct API input before append', () => {
  fixture('b11-queue-boundary');
  const queue = new DurableQueue();
  const event = events.createEvent({ kind: 'commit', project_id: 'A', sha: 'abcdef1', summary: 'valid' });
  delete event.event_id;
  assert.throws(() => queue.enqueue(event), /event_id/);
  assert.equal(queue.list().length, 0);
});

test('B09/F10: truncated tails are quarantined and valid writer/indexer/queue records survive', () => {
  const root = fixture('b09-jsonl-tail');
  const writerLog = mod('writer-log');
  const indexerLog = mod('indexer-log');
  writerLog.append({ event_id: 'evt_valid', hash: 'h', status: 'intent' });
  indexerLog.append({ task_id: 'idx_valid', event_id: 'evt_valid', status: 'pending' });
  const validEvent = events.createEvent({ kind: 'commit', project_id: 'A', sha: 'abcdef2', summary: 'valid' });
  const queue = new DurableQueue();
  queue.enqueue(validEvent);
  for (const file of [writerLog.logPath(), indexerLog.logPath(), queue.file]) {
    fs.appendFileSync(file, '{"unfinished":', 'utf8');
  }
  assert.equal(writerLog.get('evt_valid').status, 'intent');
  assert.equal(indexerLog.records().get('idx_valid').status, 'pending');
  assert.equal(queue.list().length, 1);
  for (const file of [writerLog.logPath(), indexerLog.logPath(), queue.file]) {
    const quarantines = fs.readdirSync(path.dirname(file)).filter(name => name.startsWith(path.basename(file) + '.corrupt-tail-'));
    assert.equal(quarantines.length, 1);
    assert.equal(fs.readFileSync(path.join(path.dirname(file), quarantines[0]), 'utf8'), '{"unfinished":');
  }
});

test('B09: corruption in the middle is fail-closed and is not silently removed', () => {
  fixture('b09-jsonl-middle');
  const writerLog = mod('writer-log');
  const file = writerLog.logPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '{"event_id":"one"}\nnot-json\n{"event_id":"two"}\n', 'utf8');
  assert.throws(() => writerLog.records(), error => error.code === 'JSONL_CORRUPT_MIDDLE');
  assert.match(fs.readFileSync(file, 'utf8'), /not-json/);
});

test('F09: recapture of the same commit ignores timestamp-only differences', () => {
  fixture('f09-recapture');
  const queue = new DurableQueue();
  const base = { kind: 'commit', project_id: 'A', sha: 'abcdef3', summary: 'same' };
  const first = events.createEvent({ ...base, timestamp: '2026-09-11T00:00:00.000Z' });
  const second = events.createEvent({ ...base, timestamp: '2026-09-11T00:01:00.000Z' });
  assert.equal(first.event_id, second.event_id);
  queue.enqueue(first);
  assert.doesNotThrow(() => queue.enqueue(second));
  assert.equal(queue.list().length, 1);
});

test('F08: only one concurrent worker delivers a live lease', async () => {
  fixture('f08-single-owner');
  const event = events.createEvent({ kind: 'commit', project_id: 'A', sha: 'abcdef4', summary: 'one delivery' });
  const first = new DurableQueue({ leaseMs: 5000 });
  first.enqueue(event);
  let resume;
  let started;
  const startedPromise = new Promise(resolve => { started = resolve; });
  const gate = new Promise(resolve => { resume = resolve; });
  let deliveries = 0;
  const firstRun = first.process(async () => { deliveries += 1; started(); await gate; return { ok: true }; });
  await startedPromise;
  const second = new DurableQueue({ leaseMs: 5000 });
  await second.process(async () => { deliveries += 1; return { ok: true }; });
  resume();
  await firstRun;
  assert.equal(deliveries, 1);
  assert.equal(first.list()[0].status, 'delivered');
});

test('F08: an expired worker cannot overwrite a newer delivered generation', async () => {
  fixture('f08-stale-generation');
  const event = events.createEvent({ kind: 'commit', project_id: 'A', sha: 'abcdef5', summary: 'lease generation' });
  const stale = new DurableQueue({ leaseMs: 20 });
  stale.enqueue(event);
  let resume;
  let started;
  const startedPromise = new Promise(resolve => { started = resolve; });
  const gate = new Promise(resolve => { resume = resolve; });
  const staleRun = stale.process(async () => { started(); await gate; return { ok: false, error: 'stale failure' }; });
  await startedPromise;
  await new Promise(resolve => setTimeout(resolve, 30));
  const current = new DurableQueue({ leaseMs: 5000 });
  await current.process(async () => ({ ok: true }));
  resume();
  await staleRun;
  const final = current.list()[0];
  assert.equal(final.status, 'delivered');
  assert.notEqual(final.last_error, 'stale failure');
});

// U2 (независимая проверка 2026-09-11): ремонт оборванного хвоста не имеет права
// обнулить единственную корректную копию журнала. Здесь проверяются границы
// отказа и смерти процесса, а также байтовая точность префикса. Только TEMP.

const REPAIR_FIXTURE = path.join(__dirname, 'fix-06-repair-crash.cjs');
const TORN = '{"n":"я"}\n{"m":2}\n{"broken":';
const TORN_PREFIX = '{"n":"я"}\n{"m":2}\n';
const TORN_TAIL = '{"broken":';

function tornRoot(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's2-' + name + '-'));
  const file = path.join(dir, 'journal.jsonl');
  fs.writeFileSync(file, Buffer.from(TORN, 'utf8'));
  return { dir, file };
}

function quarantinesOf(dir, file) {
  return fs.readdirSync(dir).filter(name => name.startsWith(path.basename(file) + '.corrupt-tail-'));
}

function runRepair(file, stage) {
  return spawnSync(process.execPath, [REPAIR_FIXTURE, file, stage], { encoding: 'utf8', timeout: 60000 });
}

// Инвариант всех аварийных ветвей: канонический журнал остаётся байт-в-байт
// тем же, а оборванный хвост доступен в карантине.
function assertJournalIntact(dir, file) {
  assert.deepEqual(fs.readFileSync(file), Buffer.from(TORN, 'utf8'), 'the only correct copy must not be touched');
  const names = quarantinesOf(dir, file);
  assert.equal(names.length, 1, 'the torn tail must stay recoverable: ' + names.join(', '));
  assert.equal(fs.readFileSync(path.join(dir, names[0]), 'utf8'), TORN_TAIL);
}

test('U2: a failed quarantine write leaves the journal byte-identical', () => {
  const { dir, file } = tornRoot('u2-quarantine-fail');
  const result = runRepair(file, 'quarantine-write-fail');
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.threw, true);
  assert.equal(report.code, 'EIO');
  assert.deepEqual(fs.readFileSync(file), Buffer.from(TORN, 'utf8'));
  assert.deepEqual(quarantinesOf(dir, file), [], 'a failed quarantine is not claimed as evidence');
});

test('U2: a failed repaired-copy write keeps prefix and tail recoverable', () => {
  const { dir, file } = tornRoot('u2-repair-copy-fail');
  const result = runRepair(file, 'repair-copy-write-fail');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).threw, true);
  assertJournalIntact(dir, file);
  // Корректный префикс остаётся в самом журнале, хвост — в карантине.
  assert.ok(fs.readFileSync(file, 'utf8').startsWith(TORN_PREFIX));
});

test('U2: a failed replacement leaves the journal intact and no repair leftovers', () => {
  const { dir, file } = tornRoot('u2-rename-fail');
  const result = runRepair(file, 'rename-fail');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).threw, true);
  assertJournalIntact(dir, file);
  assert.deepEqual(fs.readdirSync(dir).filter(name => name.includes('.repair-')), [], 'the prepared copy is cleaned up');
});

test('U2: process death at a repair boundary keeps both parts recoverable', () => {
  for (const stage of ['death-after-quarantine', 'death-before-replace']) {
    const { dir, file } = tornRoot('u2-' + stage);
    const result = runRepair(file, stage);
    assert.equal(result.status, 23, stage + ': ' + result.stderr);
    assertJournalIntact(dir, file);
    assert.equal(fs.readFileSync(file, 'utf8'), TORN, stage + ': the correct prefix is still in place');
  }
});

test('U2: the canonical journal is only replaced by an atomic rename of a prepared sibling', () => {
  const { dir, file } = tornRoot('u2-no-inplace');
  const canonical = path.resolve(file);
  const opens = [];
  const writes = [];
  const renames = [];
  const originalOpen = fs.openSync;
  const originalWrite = fs.writeFileSync;
  const originalAppend = fs.appendFileSync;
  const originalRename = fs.renameSync;
  fs.openSync = function (target, ...rest) {
    if (path.resolve(String(target)) === canonical) opens.push(String(rest[0]));
    return originalOpen.call(fs, target, ...rest);
  };
  fs.writeFileSync = function (target, ...rest) {
    if (typeof target === 'string' && path.resolve(target) === canonical) writes.push('writeFileSync');
    return originalWrite.call(fs, target, ...rest);
  };
  fs.appendFileSync = function (target, ...rest) {
    if (typeof target === 'string' && path.resolve(target) === canonical) writes.push('appendFileSync');
    return originalAppend.call(fs, target, ...rest);
  };
  fs.renameSync = function (from, to) {
    if (path.resolve(String(to)) === canonical) {
      renames.push({ from: path.resolve(String(from)), content: fs.readFileSync(from, 'utf8') });
    }
    return originalRename.call(fs, from, to);
  };
  let records;
  try {
    records = jsonl.readJsonl(file);
  } finally {
    fs.openSync = originalOpen;
    fs.writeFileSync = originalWrite;
    fs.appendFileSync = originalAppend;
    fs.renameSync = originalRename;
  }

  assert.deepEqual(records, [{ n: 'я' }, { m: 2 }]);
  // RED до правки: repair переписывал канонический файл на месте (flag 'w').
  assert.deepEqual(opens, [], 'the canonical journal is never opened for a write');
  assert.deepEqual(writes, [], 'the canonical journal is never written in place');
  assert.equal(renames.length, 1, 'exactly one atomic replacement');
  assert.ok(renames[0].from.startsWith(canonical + '.repair-'), 'the replacement comes from a prepared sibling');
  assert.equal(renames[0].content, TORN_PREFIX, 'the prepared copy carries the byte-exact prefix');
  assert.equal(fs.readFileSync(file, 'utf8'), TORN_PREFIX);
  const names = quarantinesOf(dir, file);
  assert.equal(names.length, 1);
  assert.equal(fs.readFileSync(path.join(dir, names[0]), 'utf8'), TORN_TAIL);
});

test('U2: a valid final record without LF is not rewritten and stays appendable', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's2-u2-no-lf-'));
  const file = path.join(dir, 'journal.jsonl');
  fs.writeFileSync(file, '{"a":1}\n{"b":2}', 'utf8');
  const before = fs.readFileSync(file);
  assert.deepEqual(jsonl.readJsonl(file), [{ a: 1 }, { b: 2 }]);
  assert.deepEqual(fs.readFileSync(file), before, 'a complete final record without LF is not damage');
  assert.deepEqual(quarantinesOf(dir, file), []);
  jsonl.appendJsonl(file, { c: 3 });
  assert.equal(fs.readFileSync(file, 'utf8'), '{"a":1}\n{"b":2}\n{"c":3}\n');
  assert.deepEqual(jsonl.readJsonl(file), [{ a: 1 }, { b: 2 }, { c: 3 }]);
});

test('U2: an append is flushed to disk through its own fd', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's2-u2-durable-'));
  const file = path.join(dir, 'journal.jsonl');
  const canonical = path.resolve(file);
  const opens = [];
  const synced = [];
  const plainAppends = [];
  const originalOpen = fs.openSync;
  const originalFsync = fs.fsyncSync;
  const originalAppend = fs.appendFileSync;
  fs.openSync = function (target, flags, ...rest) {
    const fd = originalOpen.call(fs, target, flags, ...rest);
    opens.push({ fd, path: path.resolve(String(target)), flags: String(flags) });
    return fd;
  };
  fs.fsyncSync = function (fd, ...rest) { synced.push(fd); return originalFsync.call(fs, fd, ...rest); };
  fs.appendFileSync = function (target, ...rest) {
    plainAppends.push(path.resolve(String(target)));
    return originalAppend.call(fs, target, ...rest);
  };
  try {
    jsonl.appendJsonl(file, { a: 1 });
  } finally {
    fs.openSync = originalOpen;
    fs.fsyncSync = originalFsync;
    fs.appendFileSync = originalAppend;
  }
  assert.deepEqual(plainAppends, [], 'durability must not rest on appendFileSync');
  const appendOpen = opens.filter(entry => entry.path === canonical && entry.flags === 'a');
  assert.equal(appendOpen.length, 1, 'the record is appended through an explicitly opened fd');
  assert.ok(synced.includes(appendOpen[0].fd), 'the append fd is flushed before the lock is released');
  assert.deepEqual(jsonl.readJsonl(file), [{ a: 1 }]);
});
