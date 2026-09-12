'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { fixture, proposal, memoryFile, mod } = require('./helpers');

const indexer = mod('indexer');
const indexerLog = mod('indexer-log');
const writerLog = mod('writer-log');
const writer = mod('writer');

function configured(backoff = 1000) {
  return { indexer: { retries_max: 5, timeout_ms: 1000, backoff_ms: backoff, lease_ms: 1000 } };
}

async function withFetch(fn, body) {
  const original = global.fetch;
  global.fetch = fn;
  try { return await body(); } finally { global.fetch = original; }
}

// Ответ Khoj 1.42.10 на GET /api/update: 200 приходит только после
// завершённого прохода индексации, тело подтверждает его статусом ok.
const ok = async () => ({ ok: true, json: async () => ({ status: 'ok', message: 'khoj reloaded' }) });

function index() {
  return withFetch(ok, () => indexer.run({ config: configured(), reindexUrl: 'http://fixture' }));
}

async function withStderr(body) {
  const original = process.stderr.write;
  let text = '';
  process.stderr.write = chunk => { text += chunk; return true; };
  try { await body(); } finally { process.stderr.write = original; }
  return text;
}

// G01. Событие проиндексировано только пока каждая его файловая задача
// подтверждает ТЕКУЩУЮ ревизию файла. Новая ревизия снимает подтверждение
// сразу, а не после того, как новая задача будет обработана где-то позже.
test('G01: a new file revision withdraws indexed at once, and a completed task restores it', async () => {
  fixture('fix08-flip-down');
  writer.writeProposal('evt_flip', proposal('FLIP_ORIGINAL'));
  await index();
  assert.equal(writerLog.get('evt_flip').indexed, true);

  // тот же event_id, тот же пакет: writer пересоздаёт задачу на новую ревизию
  // файла, потому что между записями в тот же файл писал другой event_id
  writer.writeProposal('evt_other', proposal('FLIP_OTHER'));
  const before = writerLog.get('evt_flip').indexed;
  const retry = writer.writeProposal('evt_flip', proposal('FLIP_ORIGINAL'));
  assert.equal(retry.idempotent, true);
  assert.equal(before, true);
  const after = writerLog.get('evt_flip').indexed;
  const pending = indexer.status().filter(task => task.event_id === 'evt_flip' && task.status === 'pending').length;
  // RED on original: событие оставалось indexed:true при наличии незавершённой
  // задачи на текущую ревизию, то есть подтверждение стояло по устаревшему снимку
  assert.equal(after, false, 'a pending task on the current revision cannot be reported as indexed');
  assert.ok(pending > 0);
  assert.deepEqual(writerLog.get('evt_flip').index_state.missing, []);

  await index();
  assert.equal(writerLog.get('evt_flip').indexed, true);
  assert.equal(writerLog.get('evt_flip').index_state, null);
});

// Ревизия берётся с диска, а не из снимка задач: правка файла в обход очереди
// делает подтверждение недействительным.
test('G01: a file changed outside the queue invalidates the confirmation', async () => {
  const root = fixture('fix08-stale-revision');
  writer.writeProposal('evt_drift', proposal('DRIFT_ORIGINAL'));
  await index();
  assert.equal(writerLog.get('evt_drift').indexed, true);

  fs.appendFileSync(memoryFile(root), '\nвнешняя правка\n', 'utf8');
  const results = await index();
  // задача не пригодна к захвату — она уже indexed на прежнюю ревизию
  assert.equal(results.length, 0);
  const record = writerLog.get('evt_drift');
  assert.equal(record.indexed, false, 'the old task revision does not confirm the current file');
  assert.deepEqual(record.index_state.missing, ['.claude/memory/facts/writer-entries.md']);

  // предусмотренное восстановление приводит состояние к факту
  const summary = indexer.reconcile();
  assert.equal(summary.created, 1);
  await index();
  assert.equal(writerLog.get('evt_drift').indexed, true);
});

// G02. Сбой записи агрегата не выдаётся за исход самой задачи: задача
// завершилась и завершилась успешно, а несогласованность остаётся видимой и
// восстанавливается следующим проходом без повтора доставки.
test('G02: a failed aggregate write is visible and repaired, never reported as a task outcome', async () => {
  fixture('fix08-aggregate-gap');
  writer.writeProposal('evt_gap', proposal('GAP'));
  const append = writerLog.append;
  let injected = false;
  writerLog.append = record => {
    if (record.indexed === true && !injected) {
      injected = true;
      throw new Error('synthetic writer-log write failure');
    }
    return append(record);
  };
  let first;
  const stderr = await withStderr(async () => {
    try { first = await index(); } finally { writerLog.append = append; }
  });
  assert.equal(injected, true, 'the injected failure must have fired');
  // RED on original: задача докладывалась как superseded, хотя её результат
  // записан и принят — ошибкой записи агрегата подменялся исход доставки
  assert.equal(first.length, 1);
  assert.equal(first[0].status, 'indexed');
  assert.equal(first[0].reason, null);
  assert.equal(indexer.status()[0].status, 'indexed');
  assert.match(stderr, /index aggregate repair failed for evt_gap: synthetic writer-log write failure/);
  assert.equal(writerLog.get('evt_gap').indexed, false, 'the aggregate stays honest while the write fails');

  // следующая очередь задач пуста, но агрегат восстанавливается
  const retry = await index();
  assert.equal(retry.length, 0);
  assert.equal(writerLog.get('evt_gap').indexed, true);
});

// G18. reconcile — предусмотренная операция восстановления производного
// состояния из written_files, в том числе на границе между журналами.
test('G18: reconcile restores a lost task set and its aggregate, and is idempotent', async () => {
  fixture('fix08-reconcile');
  writer.writeProposal('evt_rec', [proposal('REC_A'), proposal('REC_B', 'user', 'decisions')]);
  await index();
  assert.equal(writerLog.get('evt_rec').indexed, true);
  assert.equal(indexer.status().length, 2);

  // производное состояние потеряно целиком — так выглядит сбой между журналами
  fs.rmSync(indexerLog.logPath());
  assert.equal(indexer.status().length, 0);

  // честность: пустой набор задач не подтверждает событие
  const results = await index();
  assert.equal(results.length, 0);
  assert.equal(writerLog.get('evt_rec').indexed, false, 'a lost task set must not stay confirmed');

  const summary = indexer.reconcile();
  assert.equal(summary.events, 1);
  assert.equal(summary.created, 2, 'reconcile must recreate one task per written file');
  assert.deepEqual(summary.errors, []);
  assert.equal(indexer.status().length, 2);

  await index();
  assert.equal(writerLog.get('evt_rec').indexed, true);

  const again = indexer.reconcile();
  assert.equal(again.created, 0);
  assert.equal(again.aggregates, 0);
  assert.deepEqual(again.errors, []);
});

// Восстановление не освобождает от проверки: задача, потерявшая аренду, не
// подтверждает агрегат, а повторный проход возвращает событие к факту.
test('G18: an in-flight task left by a dead pass does not confirm the aggregate', async () => {
  fixture('fix08-inflight');
  writer.writeProposal('evt_inflight', proposal('INFLIGHT'));
  const tasks = indexer.status();
  assert.equal(tasks.length, 1);
  // осиротевшая задача с истёкшей арендой — как после аварии процесса
  indexerLog.append({ ...tasks[0], status: 'in-flight', lease_id: 'orphan', lease_expires_at: new Date(Date.now() - 1000).toISOString() });
  assert.equal(writerLog.get('evt_inflight').indexed, false);
  await index();
  assert.equal(indexer.status()[0].status, 'indexed');
  assert.equal(writerLog.get('evt_inflight').indexed, true);
});
