#!/usr/bin/env node
'use strict';

// Контролируемая доставка ровно одного события из очереди — проверка
// восстановленной цепочки без массового прогона. Очередь не изменяется:
// читается текущая запись по идентификатору и отправляется через deliverEvent.
// Состояние события в очереди остаётся прежним до явного
// `queue-status.js --redeliver failed`; повтор идемпотентен по event_id на writer.

const fs = require('fs');
const path = require('path');
const { deliverEvent } = require(path.join(process.cwd(), 'scripts', 'memory', 'deliver.js'));

const QUEUE = path.join(process.cwd(), '.local', 'queue', 'events.jsonl');

function parseArgs(argv) {
  const options = { dryRun: false, sha: null, event: null, oldest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--sha') options.sha = argv[++index];
    else if (arg === '--event') options.event = argv[++index];
    else if (arg === '--oldest') options.oldest = true;
    else if (arg === '--help') options.help = true;
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  process.stdout.write('usage: node queue-single-delivery.cjs [--sha <prefix> | --event <id> | --oldest] [--dry-run]\n');
  process.exit(0);
}

const current = new Map();
for (const line of fs.readFileSync(QUEUE, 'utf8').split('\n').filter(Boolean)) {
  const record = JSON.parse(line);
  current.set(record.event.event_id, record);
}

const failed = [...current.values()].filter(record => record.status === 'failed');
if (!failed.length) {
  process.stdout.write(JSON.stringify({ undelivered: 0, note: 'нет событий в терминальном failed' }, null, 2) + '\n');
  process.exit(0);
}

let target = failed[0];
if (options.event) target = failed.find(record => record.event.event_id === options.event) || null;
else if (options.sha) target = failed.find(record => record.event.source.sha.startsWith(options.sha)) || null;
else if (options.oldest) target = failed.slice().sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))[0];

if (!target) {
  process.stderr.write('ERROR: подходящее failed-событие не найдено\n');
  process.exit(1);
}

const meta = {
  event_id: target.event.event_id,
  sha: target.event.source.sha,
  first_line: String(target.event.summary || '').split('\n')[0],
  attempts: target.attempts,
  last_error: target.last_error || null,
  created_at: target.created_at,
  candidates_failed: failed.length,
};

if (options.dryRun) {
  process.stdout.write(JSON.stringify({ dry_run: true, target: meta, queue_untouched: true }, null, 2) + '\n');
  process.exit(0);
}

deliverEvent(target.event)
  .then(result => {
    process.stdout.write(JSON.stringify({
      delivered_one: true,
      target: meta,
      result,
      queue_untouched: true,
      next: 'remaining: node scripts/memory/queue-status.js --redeliver failed (идемпотентно по event_id)',
    }, null, 2) + '\n');
  })
  .catch(error => {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = 1;
  });
