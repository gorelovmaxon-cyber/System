#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { resolvePaths } = require('./resolve-paths');
const indexerLog = require('./indexer-log');
const writerLog = require('./writer-log');
const { assertSafePath } = require('./path-safety');
const { transactJsonl } = require('./jsonl');

function configFor(paths) {
  return paths.config;
}

function normalizeFile(file, paths) {
  const candidate = path.resolve(path.isAbsolute(file) ? file : path.resolve(paths.system_root, file));
  return assertSafePath(paths.memory_root, candidate, 'indexer file');
}

function fileRevision(file) {
  if (!fs.existsSync(file)) return 'missing';
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function taskId(eventId, file, revision = fileRevision(file)) {
  return 'idx_' + crypto.createHash('sha256').update(String(eventId) + '|' + file + '|' + revision).digest('hex').slice(0, 16);
}

function collapse(records) {
  const current = new Map();
  for (const record of records) current.set(record.task_id, record);
  return current;
}

function warn(message) {
  process.stderr.write(message + '\n');
}

// Срок аренды задачи индекса. Запрос переиндексации ограничен timeout_ms, поэтому
// аренда выбирается так, чтобы покрывать его по построению: продление, как в
// очереди доставки, здесь не нужно — незавершённый запрос не может пережить аренду.
function leaseFor(config) {
  const timeout = config.indexer?.timeout_ms ?? 5000;
  return Math.max(config.indexer?.lease_ms ?? 60000, timeout + 1000);
}

// Пригодность задачи к захвату. Проверяется по времени захвата и только здесь,
// чтобы предварительный отбор и сам захват не расходились.
function eligible(task, maxRetries, now) {
  if (!task) return false;
  if (task.status === 'pending') return true;
  if (task.status === 'failed') {
    return (task.attempts || 0) < maxRetries && (!task.next_attempt_at || Date.parse(task.next_attempt_at) <= now);
  }
  if (task.status === 'in-flight') {
    return !task.lease_expires_at || Date.parse(task.lease_expires_at) <= now;
  }
  return false;
}

// --- Единая модель производного состояния индекса (G01/G02/G18) ---
//
// Событие проиндексировано ровно тогда, когда для каждого файла из его
// written_files существует задача на ТЕКУЩУЮ ревизию файла и эта задача
// завершена со статусом indexed. Ревизия берётся с диска, а не из снимка задач:
// задача на прежнее содержимое текущее содержимое не подтверждает. Отсутствие
// задачи — не «проиндексировано»: его восстанавливает reconcile, а не догадка.
// Модель одна и используется в queueIndex (пересчёт вниз при новой задаче),
// в run (пересчёт после завершения задач) и в reconcile (полный проход).

function tasksByEvent() {
  const grouped = new Map();
  for (const task of indexerLog.records().values()) {
    if (!grouped.has(task.event_id)) grouped.set(task.event_id, []);
    grouped.get(task.event_id).push(task);
  }
  return grouped;
}

function currentRevision(file) {
  try { return fileRevision(file); } catch { return null; }
}

function aggregateState(record, paths, tasks) {
  const files = Array.isArray(record?.written_files) ? record.written_files : [];
  const missing = [];
  const pending = [];
  if (files.length === 0) return { indexed: false, missing, pending, reason: 'no-written-files' };
  for (const relative of files) {
    const revision = currentRevision(path.resolve(paths.system_root, relative));
    const task = tasks.find(item => item.file === relative && item.file_revision === revision);
    if (!task) { missing.push(relative); continue; }
    if (task.status !== 'indexed') pending.push({ file: relative, status: task.status, task_id: task.task_id });
  }
  return { indexed: missing.length === 0 && pending.length === 0, missing, pending };
}

// Запись агрегата идёт отдельно от доставки задачи: сбой записи не должен
// выглядеть как «доставка устарела» (G02). Сбой остаётся видимым (warn у
// вызывающего) и не разрушает состояние: агрегат остаётся прежним, а следующий
// проход повторит пересчёт.
function syncAggregate(record, paths, tasks) {
  if (!record || record.status !== 'persisted') return null;
  const state = aggregateState(record, paths, tasks);
  const result = { event_id: record.event_id, indexed: state.indexed, changed: false, error: null };
  if (Boolean(record.indexed) === state.indexed) return result;
  try {
    writerLog.append({
      ...record,
      indexed: state.indexed,
      index_state: state.indexed ? null : { missing: state.missing, pending: state.pending },
    });
    result.changed = true;
  } catch (error) {
    result.indexed = Boolean(record.indexed);
    result.error = String(error.message || error);
  }
  return result;
}

function refreshEvent(eventId, paths, options = {}) {
  const record = writerLog.get(eventId);
  if (!record) return null;
  const tasks = options.tasks || [...indexerLog.records().values()].filter(task => task.event_id === String(eventId));
  return syncAggregate(record, paths, tasks);
}

// Пересчёт агрегата для всех сохранённых событий. Событие вовсе без задач тоже
// пересчитывается: пустой набор задач не подтверждает актуальность, поэтому
// «потерянная очередь» честно снимает флаг, а восстанавливает задачи reconcile.
function refreshAggregates(paths, options = {}) {
  const grouped = options.tasks || tasksByEvent();
  const events = options.events || writerLog.records();
  const summary = { changed: 0, errors: [] };
  for (const record of events.values()) {
    const tasks = grouped.get(record.event_id) || [];
    const result = syncAggregate(record, paths, tasks);
    if (!result) continue;
    if (result.error) summary.errors.push({ event_id: result.event_id, error: result.error });
    else if (result.changed) summary.changed += 1;
  }
  return summary;
}

// Восстановление производного состояния без оригинального ответа AI: набор
// файлов события берётся из writerLog (written_files), ревизии — с диска.
// Создаёт отсутствующие задачи и приводит агрегат к факту.
function reconcile(options = {}) {
  const paths = options.paths || resolvePaths();
  const summary = { events: 0, created: 0, aggregates: 0, errors: [] };
  for (const record of writerLog.records().values()) {
    if (record.status !== 'persisted') continue;
    const files = Array.isArray(record.written_files) ? record.written_files : [];
    if (files.length === 0) continue;
    summary.events += 1;
    const beforeTasks = indexerLog.records();
    const beforeIndexed = Boolean(record.indexed);
    queueIndex(record.event_id, files.map(relative => path.resolve(paths.system_root, relative)), { paths });
    const afterTasks = indexerLog.records();
    summary.created += [...afterTasks.keys()].filter(id => !beforeTasks.has(id)).length;
    const after = writerLog.get(record.event_id);
    if (after && Boolean(after.indexed) !== beforeIndexed) summary.aggregates += 1;
    const failed = refreshEvent(record.event_id, paths, { tasks: [...afterTasks.values()].filter(task => task.event_id === record.event_id) });
    if (failed?.error) summary.errors.push({ event_id: record.event_id, error: failed.error });
  }
  return summary;
}

function queueIndex(eventId, files, options = {}) {
  const paths = options.paths || resolvePaths();
  const unique = new Map();
  for (const file of (Array.isArray(files) ? files : [files])) {
    const normalized = normalizeFile(file, paths);
    unique.set(normalized.toLowerCase(), normalized);
  }
  const queued = transactJsonl(indexerLog.logPath(), records => {
    const current = collapse(records);
    const append = [];
    const result = [];
    for (const normalized of unique.values()) {
      const revision = fileRevision(normalized);
      const id = taskId(eventId, normalized, revision);
      const existing = current.get(id);
      if (existing) { result.push(existing); continue; }
      const record = {
        task_id: id,
        event_id: String(eventId),
        file: path.relative(paths.system_root, normalized).replaceAll(path.sep, '/'),
        file_revision: revision,
        status: 'pending',
        attempts: 0,
        timestamp: new Date().toISOString(),
      };
      append.push(record);
      current.set(id, record);
      result.push(record);
    }
    return { append, value: result };
  });
  // Новая задача на новую ревизию значит, что прежнее «проиндексировано» больше
  // не подтверждено текущим содержимым файла (G01). Состояние пересчитывается той
  // же моделью, что и в run/reconcile, а не отдельной веткой сброса флага.
  if (options.refresh !== false) {
    const result = refreshEvent(eventId, paths);
    if (result?.error) warn(`index aggregate refresh failed for ${eventId}: ${result.error}`);
  }
  return queued;
}

async function reindex(task, config, paths, options = {}) {
  const url = options.reindexUrl || process.env.KHOJ_REINDEX_URL || config.indexer?.reindex_url;
  if (!url || String(url).includes('<')) throw Object.assign(new Error('Khoj reindex mechanism is not configured'), { code: 'not-configured' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.indexer?.timeout_ms || 5000);
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ file: task.file, root: paths.memory_root }), signal: controller.signal });
    if (!response.ok) throw Object.assign(new Error('Khoj reindex HTTP ' + response.status), { status: response.status });
  } finally { clearTimeout(timer); }
}

async function run(options = {}) {
  const paths = options.paths || resolvePaths();
  const config = options.config || configFor(paths);
  const maxRetries = config.indexer?.retries_max ?? 5;
  const backoffMs = config.indexer?.backoff_ms ?? 1000;
  const leaseMs = leaseFor(config);
  // Отбор без времени: пригодность решает захват по времени захвата, поэтому
  // длинный предыдущий запрос не сокращает и не удлиняет аренду следующего (G04).
  const candidates = [...indexerLog.records().values()].filter(task => task.status !== 'indexed');
  const results = [];
  for (const candidate of candidates) {
    const claimed = transactJsonl(indexerLog.logPath(), records => {
      const now = options.now ?? Date.now();
      const latest = collapse(records).get(candidate.task_id);
      if (!eligible(latest, maxRetries, now)) return { value: null };
      const next = {
        ...latest,
        status: 'in-flight',
        attempts: (latest.attempts || 0) + 1,
        lease_id: crypto.randomBytes(12).toString('hex'),
        lease_expires_at: new Date(now + leaseMs).toISOString(),
        timestamp: new Date(now).toISOString(),
      };
      return { append: [next], value: next };
    });
    if (!claimed) continue;
    const finish = fields => transactJsonl(indexerLog.logPath(), records => {
      const latest = collapse(records).get(claimed.task_id);
      if (!latest || latest.status !== 'in-flight' || latest.lease_id !== claimed.lease_id) return { value: false };
      return { append: [{ ...latest, ...fields, lease_id: null, lease_expires_at: null, timestamp: new Date().toISOString() }], value: true };
    });
    let status = 'indexed';
    let reason = null;
    try {
      await reindex(claimed, config, paths, options);
    } catch (error) {
      status = 'failed';
      reason = String(error.message || error);
    }
    // Повтор отсчитывается от времени результата, а не от начала прохода.
    const completedAt = options.now ?? Date.now();
    const fields = status === 'indexed'
      ? { status: 'indexed', indexed_at: new Date(completedAt).toISOString(), reason: null, next_attempt_at: null }
      : {
        status: 'failed',
        reason,
        next_attempt_at: claimed.attempts >= maxRetries ? null : new Date(completedAt + backoffMs * (2 ** (claimed.attempts - 1))).toISOString(),
      };
    const accepted = finish(fields);
    results.push({ task_id: claimed.task_id, status: accepted ? fields.status : 'superseded', reason: fields.reason ?? null });
  }
  // Пересборка агрегата после прохода: сбой между завершением задачи и записью
  // агрегата иначе остаётся невидимым, потому что задача уже не пригодна к захвату.
  const repair = refreshAggregates(paths);
  for (const item of repair.errors) warn(`index aggregate repair failed for ${item.event_id}: ${item.error}`);
  return results;
}

function status() {
  return [...indexerLog.records().values()];
}

function requeueFailed() {
  return transactJsonl(indexerLog.logPath(), records => {
    const tasks = [...collapse(records).values()].filter(item => item.status === 'failed' || (item.status === 'in-flight' && (!item.lease_expires_at || Date.parse(item.lease_expires_at) <= Date.now())));
    return {
      append: tasks.map(task => ({ ...task, status: 'pending', lease_id: null, lease_expires_at: null, next_attempt_at: null, timestamp: new Date().toISOString() })),
      value: tasks.length,
    };
  });
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--file') args.file = argv[++i];
    else if (argv[i] === '--event-id') args.eventId = argv[++i];
    else if (argv[i] === '--run') args.run = true;
    else if (argv[i] === '--status') args.status = true;
    else if (argv[i] === '--requeue-failed') args.requeue = true;
    else if (argv[i] === '--reconcile') args.reconcile = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.file) process.stdout.write(JSON.stringify({ queued: queueIndex(args.eventId || 'manual', [args.file]) }) + '\n');
  else if (args.requeue) process.stdout.write(JSON.stringify({ requeued: requeueFailed() }) + '\n');
  else if (args.reconcile) process.stdout.write(JSON.stringify({ reconcile: reconcile() }, null, 2) + '\n');
  else if (args.status) process.stdout.write(JSON.stringify({ tasks: status() }, null, 2) + '\n');
  else if (args.run) process.stdout.write(JSON.stringify({ results: await run() }, null, 2) + '\n');
  else throw new Error('use --file, --run, --status, --reconcile or --requeue-failed');
}

if (require.main === module) main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });

module.exports = { queueIndex, run, status, requeueFailed, reconcile, aggregateState, refreshAggregates, refreshEvent, normalizeFile, taskId };
