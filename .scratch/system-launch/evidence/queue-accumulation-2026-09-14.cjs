#!/usr/bin/env node
'use strict';

// Диагностика накопления очереди: только чтение — ничего не доставляется,
// не удаляется и не повторяется. Журналы очереди/indexer/writer дописываются
// на каждый переход состояния, поэтому число строк не равно числу событий.
// Текущее состояние берётся последней записью по идентификатору — так же, как
// это делает DurableQueue.list() (см. scripts/memory/queue.js).

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const LOGS = {
  queue: { file: path.join(ROOT, '.local', 'queue', 'events.jsonl'), id: record => record.event.event_id },
  indexer: { file: path.join(ROOT, '.local', 'indexer', 'tasks.jsonl'), id: record => record.task_id },
  writer: { file: path.join(ROOT, '.local', 'writer', 'processed.jsonl'), id: record => record.event_id },
};

function countBy(items, keyFn) {
  const out = {};
  for (const item of items) {
    const key = keyFn(item);
    out[key] = (out[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
}

function readLog(spec) {
  if (!fs.existsSync(spec.file)) return { raw: [], current: new Map() };
  const raw = fs
    .readFileSync(spec.file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
  const current = new Map();
  for (const record of raw) current.set(spec.id(record), record);
  return { raw, current };
}

const logs = {};
const currentById = {};
for (const [name, spec] of Object.entries(LOGS)) {
  const { raw, current } = readLog(spec);
  currentById[name] = current;
  logs[name] = {
    raw_lines: raw.length,
    distinct: current.size,
    status_counts: countBy([...current.values()], record => record.status),
    transitions_per_event: raw.length && current.size ? Number((raw.length / current.size).toFixed(2)) : null,
  };
}

const events = [...currentById.queue.values()]
  .map(record => ({
    event_id: record.event.event_id,
    status: record.status,
    attempts: record.attempts || 0,
    last_error: record.last_error || null,
    created_at: record.created_at,
    last_update: record.updated_at,
    kind: record.event.kind,
    project_id: record.event.project_id,
    sha: (record.event.source && record.event.source.sha) || null,
    first_line: String(record.event.summary || '').split('\n')[0],
  }))
  .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

// Коммиты самого конвейера памяти ("memory: ...") — их порождает writer,
// и они снова проходят через hook: это и есть доля самонаведённых событий.
const isSelfEcho = item => /^memory[: ]/i.test(item.first_line);
const selfEcho = events.filter(isSelfEcho);
const work = events.filter(item => !isSelfEcho(item));

const failed = events.filter(item => item.status === 'failed');
const undelivered = events.filter(item => item.status !== 'delivered');

const report = {
  read_only: true,
  note: 'Текущее состояние — последняя запись по идентификатору; сырые строки журнала включают все переходы.',
  logs,
  queue_events: {
    distinct: events.length,
    status_counts: countBy(events, item => item.status),
    by_day: countBy(events, item => String(item.created_at).slice(0, 10)),
    distinct_commits: new Set(events.map(item => item.sha).filter(Boolean)).size,
    kinds: countBy(events, item => item.kind),
  },
  self_echo: {
    definition: 'первая строка summary начинается с "memory:" — коммит, созданный самим конвейером памяти',
    events: selfEcho.length,
    share_of_events: events.length ? `${selfEcho.length}/${events.length}` : null,
    status_counts: countBy(selfEcho, item => item.status),
    commits: selfEcho.map(item => ({ sha: item.sha ? item.sha.slice(0, 8) : null, status: item.status, first_line: item.first_line })),
  },
  work_commits: {
    events: work.length,
    status_counts: countBy(work, item => item.status),
    distinct_commits: new Set(work.map(item => item.sha).filter(Boolean)).size,
  },
  outstanding: {
    definition: 'события не в терминальном delivered',
    events: undelivered.length,
    list: undelivered.map(item => ({
      event_id: item.event_id,
      sha: item.sha ? item.sha.slice(0, 8) : null,
      status: item.status,
      attempts: item.attempts,
      last_error: item.last_error,
      first_line: item.first_line,
      created_at: item.created_at,
    })),
    auto_replay: 'post-commit hook запускает queue-worker с --no-revive, поэтому терминальный failed сам не оживает; повтор — только явный --redeliver failed.',
  },
  failed_commits_not_in_memory: failed.length,
};

process.stdout.write(JSON.stringify(report, null, 2) + '\n');
