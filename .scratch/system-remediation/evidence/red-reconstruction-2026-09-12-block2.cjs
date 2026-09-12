'use strict';
// Восстановление исходного (до правок блока 2) текста indexer.js и queue.js
// обратным применением правок. Проверка — sha256 из манифеста аудита
// comprehensive-source-manifest-2026-09-12.json: совпадение доказывает, что
// получен именно тот текст, на котором аудит воспроизводил G01-G04.
//
// usage: node red-reconstruction-2026-09-12-block2.cjs <dest-dir>
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const repo = path.resolve(__dirname, '..', '..', '..');
const dest = process.argv[2];
if (!dest) throw new Error('destination directory required');

const manifest = require('./comprehensive-source-manifest-2026-09-12.json');
const expected = new Map(manifest.files.map(file => [file.path.replaceAll('\\', '/'), file.sha256.toUpperCase()]));

function sha256(text) {
  return crypto.createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex').toUpperCase();
}

function edit(name, text, pairs) {
  let out = text;
  for (const [from, to] of pairs) {
    if (!out.includes(from)) throw new Error(name + ': anchor not found:\n' + from.slice(0, 120));
    if (out.split(from).length !== 2) throw new Error(name + ': anchor is not unique:\n' + from.slice(0, 120));
    out = out.replace(from, to);
  }
  return out;
}

// --- queue.js: откат к аренде, считавшейся от начала прохода, без продления ---
const queue = fs.readFileSync(path.join(repo, 'scripts/memory/queue.js'), 'utf8');
const queueReverted = edit('queue.js', queue, [
  [
    `  claim(eventId, options = {}) {
    return transactJsonl(this.file, records => {
      // Момент захвата берётся внутри транзакции: аренда, посчитанная от начала
      // прохода, к моменту захвата следующего события уже истекла бы, и живая
      // доставка выглядела бы осиротевшей (G03).
      const now = options.now ?? Date.now();
`,
    `  claim(eventId, options = {}) {
    const now = options.now ?? Date.now();
    return transactJsonl(this.file, records => {
`,
  ],
  [
    `
  // Продление аренды ограничено самой доставкой: оно идёт только пока владелец
  // держит совпадающий lease_id, и прекращается вместе с доставкой. Позднее
  // продление потерявшего аренду поколения ничего не перезаписывает (CAS).
  renew(claimed) {
    return transactJsonl(this.file, records => {
      const current = collapse(records).get(claimed.event.event_id);
      if (!current || current.status !== 'in-flight' || current.lease_id !== claimed.lease_id) return { value: false };
      const now = Date.now();
      return {
        append: [{ ...current, lease_expires_at: new Date(now + this.leaseMs).toISOString(), updated_at: new Date(now).toISOString() }],
        value: true,
      };
    });
  }

  startRenewal(claimed) {
    const period = Math.max(Math.floor(this.leaseMs / 3), 10);
    const timer = setInterval(() => {
      try { if (!this.renew(claimed)) clearInterval(timer); } catch { clearInterval(timer); }
    }, period);
    return { stop: () => clearInterval(timer) };
  }
`,
    '',
  ],
  [
    `    let processed = 0;
    for (const record of this.list()) {
      if (processed >= limit) break;
      // Отбор здесь только по статусу: решение о времени принимает claim, иначе
      // просроченная аренда считалась бы от начала прохода (G03).
      if (!['pending', 'failed'].includes(record.status)) continue;
      if (record.status === 'failed' && !options.redeliver) continue;
      const inflight = this.claim(record.event.event_id, { redeliver: options.redeliver });
      if (!inflight) continue;
      const renewal = this.startRenewal(inflight);
      try {`,
    `    const now = Date.now();
    let processed = 0;
    for (const record of this.list()) {
      if (processed >= limit || !['pending', 'failed'].includes(record.status)) continue;
      if (record.status === 'failed' && !options.redeliver) continue;
      if (record.next_attempt_at && Date.parse(record.next_attempt_at) > now && !options.redeliver) continue;
      const inflight = this.claim(record.event.event_id, { redeliver: options.redeliver, now });
      if (!inflight) continue;
      try {`,
  ],
  [
    `        // Отсчёт повтора идёт от времени результата, а не от начала прохода.
        const failedAt = Date.now();
        this.finish(inflight, {`,
    `        this.finish(inflight, {`,
  ],
  [
    `          next_attempt_at: terminal ? null : new Date(failedAt + this.backoffMs * (2 ** (attempts - 1))).toISOString(),
        });
      } finally {
        renewal.stop();
      }
      processed += 1;`,
    `          next_attempt_at: terminal ? null : new Date(Date.now() + this.backoffMs * (2 ** (attempts - 1))).toISOString(),
        });
      }
      processed += 1;`,
  ],
]);

// --- indexer.js: откат единой модели агрегата, reconcile и захвата по времени ---
const indexer = fs.readFileSync(path.join(repo, 'scripts/memory/indexer.js'), 'utf8');
const indexerReverted = edit('indexer.js', indexer, [
  [
    `function warn(message) {
  process.stderr.write(message + '\\n');
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
`,
    '',
  ],
  [
    `
// --- Единая модель производного состояния индекса (G01/G02/G18) ---`,
    '\n@@AGGREGATE_BLOCK@@',
  ],
  [
    `@@AGGREGATE_BLOCK@@
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
`,
    '',
  ],
  [
    `  // Новая задача на новую ревизию значит, что прежнее «проиндексировано» больше
  // не подтверждено текущим содержимым файла (G01). Состояние пересчитывается той
  // же моделью, что и в run/reconcile, а не отдельной веткой сброса флага.
  if (options.refresh !== false) {
    const result = refreshEvent(eventId, paths);
    if (result?.error) warn(\`index aggregate refresh failed for \${eventId}: \${result.error}\`);
  }
  return queued;`,
    '  return queued;',
  ],
  [
    `  const leaseMs = leaseFor(config);
  // Отбор без времени: пригодность решает захват по времени захвата, поэтому
  // длинный предыдущий запрос не сокращает и не удлиняет аренду следующего (G04).
  const candidates = [...indexerLog.records().values()].filter(task => task.status !== 'indexed');
  const results = [];
  for (const candidate of candidates) {
    const claimed = transactJsonl(indexerLog.logPath(), records => {
      const now = options.now ?? Date.now();
      const latest = collapse(records).get(candidate.task_id);
      if (!eligible(latest, maxRetries, now)) return { value: null };`,
    `  const leaseMs = config.indexer?.lease_ms ?? 60000;
  const now = options.now ?? Date.now();
  const current = indexerLog.records();
  const tasks = [...current.values()].filter(item =>
    item.status === 'pending' ||
    (item.status === 'failed' && item.attempts < maxRetries && (!item.next_attempt_at || Date.parse(item.next_attempt_at) <= now)) ||
    (item.status === 'in-flight' && (!item.lease_expires_at || Date.parse(item.lease_expires_at) <= now)));
  const results = [];
  for (const task of tasks) {
    const claimed = transactJsonl(indexerLog.logPath(), records => {
      const latest = collapse(records).get(task.task_id);
      const eligible = latest && (
        latest.status === 'pending' ||
        (latest.status === 'failed' && latest.attempts < maxRetries && (!latest.next_attempt_at || Date.parse(latest.next_attempt_at) <= now)) ||
        (latest.status === 'in-flight' && (!latest.lease_expires_at || Date.parse(latest.lease_expires_at) <= now))
      );
      if (!eligible) return { value: null };`,
  ],
  [
    `    let status = 'indexed';
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
  for (const item of repair.errors) warn(\`index aggregate repair failed for \${item.event_id}: \${item.error}\`);
  return results;`,
    `    try {
      await reindex(claimed, config, paths, options);
      const accepted = finish({ status: 'indexed', indexed_at: new Date().toISOString(), reason: null, next_attempt_at: null });
      if (accepted) {
        const eventTasks = [...indexerLog.records().values()].filter(item => item.event_id === claimed.event_id);
        const writer = writerLog.get(claimed.event_id);
        if (writer && eventTasks.length && eventTasks.every(item => item.status === 'indexed')) writerLog.append({ ...writer, indexed: true });
      }
      results.push({ task_id: claimed.task_id, status: accepted ? 'indexed' : 'superseded' });
    } catch (error) {
      const nextAttempt = claimed.attempts >= maxRetries ? null : new Date(now + backoffMs * (2 ** (claimed.attempts - 1))).toISOString();
      const accepted = finish({ status: 'failed', reason: error.message, next_attempt_at: nextAttempt });
      results.push({ task_id: claimed.task_id, status: accepted ? 'failed' : 'superseded', reason: error.message });
    }
  }
  return results;`,
  ],
  [
    `    else if (argv[i] === '--requeue-failed') args.requeue = true;
    else if (argv[i] === '--reconcile') args.reconcile = true;`,
    `    else if (argv[i] === '--requeue-failed') args.requeue = true;`,
  ],
  [
    `  else if (args.reconcile) process.stdout.write(JSON.stringify({ reconcile: reconcile() }, null, 2) + '\\n');
  else if (args.status)`,
    '  else if (args.status)',
  ],
  [
    `  else throw new Error('use --file, --run, --status, --reconcile or --requeue-failed');`,
    `  else throw new Error('use --file, --run, --status or --requeue-failed');`,
  ],
  [
    `module.exports = { queueIndex, run, status, requeueFailed, reconcile, aggregateState, refreshAggregates, refreshEvent, normalizeFile, taskId };`,
    `module.exports = { queueIndex, run, status, requeueFailed, normalizeFile, taskId };`,
  ],
]);

const outputs = [
  ['scripts/memory/indexer.js', indexerReverted],
  ['scripts/memory/queue.js', queueReverted],
];

let failed = false;
for (const [relative, text] of outputs) {
  const actual = sha256(text);
  const want = expected.get(relative);
  const match = actual === want;
  if (!match) failed = true;
  console.log((match ? 'MATCH ' : 'DIFF  ') + relative + ' sha256=' + actual + ' manifest=' + want);
  if (dest) {
    const target = path.join(dest, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text, 'utf8');
  }
}
process.exitCode = failed ? 1 : 0;
