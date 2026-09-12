'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { fixture, proposal, memoryFile, mod } = require('./helpers');

const indexer = mod('indexer');
const indexerLog = mod('indexer-log');
const writerLog = mod('writer-log');
const writer = mod('writer');
const { resolvePaths } = mod('resolve-paths');

function configured(backoff = 1000) {
  return { indexer: { retries_max: 5, timeout_ms: 1000, backoff_ms: backoff, lease_ms: 1000 } };
}

async function withFetch(fn, body) {
  const original = global.fetch;
  global.fetch = fn;
  try { return await body(); } finally { global.fetch = original; }
}

test('B16: one batch creates one raw pending index record per unique file revision', () => {
  fixture('b16-index-dedupe');
  writer.writeProposal('evt_batch', [proposal('FIRST'), proposal('SECOND')]);
  const lines = fs.readFileSync(indexerLog.logPath(), 'utf8').trim().split(/\r?\n/);
  assert.equal(lines.length, 1);
  assert.equal(indexer.status().length, 1);
});

test('B19: indexer rejects dot-dot and junction escapes', () => {
  const root = fixture('b19-index-path');
  const paths = resolvePaths();
  const dotdot = path.join(paths.memory_root, '..', '..', 'outside.md');
  assert.throws(() => indexer.normalizeFile(dotdot, paths), /escapes/);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 's2-b19-outside-'));
  const link = path.join(paths.memory_root, 'linked');
  fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => indexer.normalizeFile(path.join(link, 'file.md'), paths), /symbolic link|junction|outside/);
});

test('B07: changed file creates a new manual index revision', async () => {
  const root = fixture('b07-reindex');
  const file = memoryFile(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'one');
  const first = indexer.queueIndex('manual', file)[0];
  await withFetch(async () => ({ ok: true }), () => indexer.run({ config: configured(), reindexUrl: 'http://fixture' }));
  fs.writeFileSync(file, 'two');
  const second = indexer.queueIndex('manual', file)[0];
  assert.notEqual(second.task_id, first.task_id);
  let calls = 0;
  await withFetch(async () => { calls += 1; return { ok: true }; }, () => indexer.run({ config: configured(), reindexUrl: 'http://fixture' }));
  assert.equal(calls, 1);
  assert.equal(indexer.status().filter(task => task.status === 'indexed').length, 2);
});

test('B08: failed index task observes backoff before retry', async () => {
  const root = fixture('b08-backoff');
  const file = memoryFile(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'backoff');
  indexer.queueIndex('evt_backoff', file);
  let calls = 0;
  const start = Date.now();
  await withFetch(async () => { calls += 1; return { ok: false, status: 503 }; }, async () => {
    await indexer.run({ config: configured(60000), reindexUrl: 'http://fixture', now: start });
    const immediate = await indexer.run({ config: configured(60000), reindexUrl: 'http://fixture', now: start + 10 });
    assert.equal(immediate.length, 0);
    await indexer.run({ config: configured(60000), reindexUrl: 'http://fixture', now: start + 60000 });
  });
  assert.equal(calls, 2);
});

test('F06: legacy in-flight task without a lease is recovered by run', async () => {
  const root = fixture('f06-inflight');
  const file = memoryFile(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'recover');
  const task = indexer.queueIndex('evt_inflight', file)[0];
  indexerLog.append({ ...task, status: 'in-flight' });
  const result = await withFetch(async () => ({ ok: true }), () => indexer.run({ config: configured(), reindexUrl: 'http://fixture' }));
  assert.equal(result[0].status, 'indexed');
});

test('F07: writer event is indexed only after every file succeeds', async () => {
  fixture('f07-partial');
  writer.writeProposal('evt_partial', [proposal('FACT'), proposal('DECISION', 'user', 'decisions')]);
  await withFetch(async (_url, init) => {
    const payload = JSON.parse(init.body);
    return { ok: !payload.file.includes('decisions'), status: 503 };
  }, () => indexer.run({ config: configured(), reindexUrl: 'http://fixture' }));
  assert.equal(writerLog.get('evt_partial').indexed, false);
  assert.equal(indexer.status().some(task => task.status === 'failed'), true);
});

test('F05: idempotent writer retry recreates a lost index task', () => {
  const root = fixture('f05-reconcile');
  const blocked = path.join(root, '.local', 'indexer');
  fs.mkdirSync(path.dirname(blocked), { recursive: true });
  fs.writeFileSync(blocked, 'blocked');
  const first = writer.writeProposal('evt_f05', proposal('PERSISTED'));
  assert.equal(first.status, 'persisted');
  assert.match(writerLog.get('evt_f05').index_error, /EEXIST|directory/i);
  fs.unlinkSync(blocked);
  const second = writer.writeProposal('evt_f05', proposal('PERSISTED'));
  assert.equal(second.idempotent, true);
  assert.equal(indexer.status().length, 1);
});
