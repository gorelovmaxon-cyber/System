#!/usr/bin/env node
'use strict';

const { DurableQueue } = require('./queue');
const { deliverEvent } = require('./deliver');
const { acquireProcessLock, lockStatePath } = require('./ipc-lock');

const DEFAULT_MAX_IDLE_MS = 600000;
const MAX_REVIVE_MS = 60000;

async function drain(options = {}) {
  const queue = options.queue || new DurableQueue();
  return queue.process(options.deliver || deliverEvent, { limit: options.limit ?? Infinity });
}

// Один активный worker на очередь: право входа даёт тот же примитив, что и у
// писателя (эксклюзивный OS bind), поэтому второй экземпляр не делит очередь
// с первым, а сообщает занятость.
function acquireWorkerLock(queue, options = {}) {
  return acquireProcessLock(queue.dir, {
    metadataFile: lockStatePath(queue.dir),
    attempts: options.attempts ?? 1,
    timeoutMessage: 'another queue worker is already running',
  });
}

// Автономная повторная доставка: один проход drain возвращался с pending, и до
// следующего commit никто событие не забирал — после перезапуска сервиса
// событие оставалось недоставленным (G12). Здесь ожидание ограничено
// next_attempt_at (backoff очереди), исчерпавшие попытки события оживляются
// одним циклом ожидания, а вся работа прекращается по бездействию (maxIdleMs).
// Это не глобальный оркестратор: процесс ограничен по времени и работает
// только с одной очередью. С `--no-revive` унаследованный терминальный failed не
// считается недоставленным: доставлять его этот режим не будет, поэтому он не
// держит владение до истечения reviveMs на каждый commit (L04-04, F-04-2).
async function watch(options = {}) {
  const queue = options.queue || new DurableQueue();
  const deliver = options.deliver || deliverEvent;
  const now = options.now || Date.now;
  const sleep = options.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const maxIdleMs = Number.isFinite(options.maxIdleMs) ? options.maxIdleMs : DEFAULT_MAX_IDLE_MS;
  const reviveMs = options.reviveMs ?? Math.min(queue.backoffMs * (2 ** queue.retriesMax), MAX_REVIVE_MS);
  const hold = options.lock === false ? null : acquireWorkerLock(queue, options);
  const deadline = now() + maxIdleMs;
  const result = { status: 'idle', passes: 0, revives: 0, delivered: 0, pending: 0, failed: 0 };
  // С `--no-revive` унаследованный терминальный failed этим watch не доставляется
  // никогда: он не удерживает владение на reviveMs и не мешает достичь idle
  // (L04-04, F-04-2). Запись, ставшая failed внутри этого же запуска, остаётся
  // его собственным исходом — watch сообщает о ней честным `failed` (G12).
  const inherited = options.revive === false
    ? new Set(queue.list().filter(record => record.status === 'failed').map(record => record.event.event_id))
    : null;
  try {
    let nextReviveAt = now() + reviveMs;
    for (;;) {
      const records = await queue.process(deliver);
      result.passes += 1;
      const undelivered = records.filter(record => record.status !== 'delivered');
      result.delivered = records.length - undelivered.length;
      result.failed = undelivered.filter(record => record.status === 'failed').length;
      const actionable = inherited
        ? undelivered.filter(record => !inherited.has(record.event.event_id))
        : undelivered;
      result.pending = actionable.filter(record => record.status !== 'failed').length;
      if (!actionable.length) return { ...result, status: 'idle' };
      const waiting = actionable.filter(record => record.status !== 'failed');
      let waitMs;
      if (waiting.length) {
        const due = waiting.some(record => !record.next_attempt_at || Date.parse(record.next_attempt_at) <= now());
        waitMs = due ? 0 : Math.max(0, Math.min(...waiting.map(record => Date.parse(record.next_attempt_at))) - now());
      } else {
        waitMs = Math.max(0, nextReviveAt - now());
      }
      if (now() + waitMs > deadline) return { ...result, status: 'deadline' };
      if (waitMs > 0) await sleep(waitMs);
      if (!waiting.length) {
        // Остались только записи, отказавшие внутри этого же запуска: без
        // оживления это его собственный исход, а не бездействие.
        if (options.revive === false) return { ...result, status: 'failed' };
        // Оживление ожидается до конца: иначе владение снималось бы, пока
        // запущенная доставка ещё идёт, а её ошибка оставалась в фоне (W1).
        await queue.redeliver('failed', deliver);
        result.revives += 1;
        nextReviveAt = now() + reviveMs;
      }
    }
  } finally {
    if (hold) hold();
  }
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--watch') options.watch = true;
    else if (argv[index] === '--no-revive') options.revive = false;
    else if (argv[index] === '--max-idle-ms') options.maxIdleMs = Number(argv[++index]);
  }
  return options;
}

if (require.main === module) {
  const options = parseArgs(process.argv.slice(2));
  const report = options.watch
    ? watch(options)
    : drain().then(records => ({ status: 'drained', passes: 1, records: records.reduce((out, record) => {
      out[record.status] = (out[record.status] || 0) + 1;
      return out;
    }, {}) }));
  report.then(result => {
    process.stdout.write(JSON.stringify(result) + '\n');
  }).catch(error => {
    if (error.code === 'LOCK_TIMEOUT') {
      process.stdout.write(JSON.stringify({ status: 'busy', reason: error.message, attempts: 0 }) + '\n');
      return;
    }
    process.stderr.write(`queue worker error: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { drain, watch, acquireWorkerLock, DEFAULT_MAX_IDLE_MS };
