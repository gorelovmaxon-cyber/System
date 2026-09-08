#!/usr/bin/env node
'use strict';

const { DurableQueue } = require('./queue');
const { deliverEvent } = require('./deliver');

async function main() {
  const args = process.argv.slice(2);
  const redeliverIndex = args.indexOf('--redeliver');
  const mode = redeliverIndex >= 0 ? (args[redeliverIndex + 1] || 'failed') : null;
  const queue = new DurableQueue();
  if (mode) await queue.redeliver(mode, deliverEvent);
  const records = queue.list();
  process.stdout.write(JSON.stringify({
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
      attempts: item.attempts,
      last_error: item.last_error || null,
    })),
  }, null, 2) + '\n');
}

main().catch(error => {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
});

