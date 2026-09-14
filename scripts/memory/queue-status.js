#!/usr/bin/env node
'use strict';

const { DurableQueue } = require('./queue');
const { deliverEvent } = require('./deliver');
const jsonl = require('./jsonl');
const writerLog = require('./writer-log');
const indexerLog = require('./indexer-log');

async function main() {
  const args = process.argv.slice(2);
  const redeliverIndex = args.indexOf('--redeliver');
  const mode = redeliverIndex >= 0 ? (args[redeliverIndex + 1] || 'failed') : null;
  const queue = new DurableQueue();
  const files = { queue: queue.file, writer: writerLog.logPath(), indexer: indexerLog.logPath() };

  // Счётчик снимается до list()/redeliver()/quarantine: чтение журнала чинит
  // оборванный хвост, поэтому после него повреждений уже не видно.
  const corrupt = {};
  for (const [name, file] of Object.entries(files)) {
    const report = jsonl.inspectJsonl(file);
    corrupt[name] = { corrupt_count: report.corrupt_count, torn_tail: report.torn_tail, records: report.records };
  }

  // --quarantine запускает восстановление явно и сообщает, что в него попало.
  // Повреждение в середине остаётся fail-closed: причина видна, файл не изменён.
  let quarantine = null;
  if (args.includes('--quarantine')) {
    quarantine = {};
    for (const [name, file] of Object.entries(files)) {
      try { quarantine[name] = jsonl.quarantineJsonl(file); }
      catch (error) { quarantine[name] = { error: error.message }; }
    }
  }

  if (mode) await queue.redeliver(mode, deliverEvent);
  const records = queue.list();
  process.stdout.write(JSON.stringify({
    corrupt_count: Object.values(corrupt).reduce((sum, item) => sum + item.corrupt_count, 0),
    corrupt,
    quarantine,
    counts: queue.statusCounts(),
    recent_failed: records.filter(item => item.status === 'failed').slice(-10).map(item => ({
      event_id: item.event.event_id,
      attempts: item.attempts,
      error: item.last_error,
    })),
    events: records.map(item => ({
      event_id: item.event.event_id,
      kind: item.event.kind,
      project_id: item.event.project_id,
      status: item.status,
      outcome: item.outcome || null,
      attempts: item.attempts,
      last_error: item.last_error || null,
    })),
  }, null, 2) + '\n');
}

main().catch(error => {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
});
