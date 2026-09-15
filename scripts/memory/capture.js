#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { createEvent, parseJsonFile } = require('./events');
const { DurableQueue } = require('./queue');
const { deliverEvent } = require('./deliver');
const { classify } = require('./memory-fixation');

function args(argv) {
  const [kind, ...rest] = argv.slice(2);
  const values = {};
  for (let i = 0; i < rest.length; i += 1) {
    const key = rest[i];
    if (!key.startsWith('--')) continue;
    const name = key.slice(2).replaceAll('-', '_');
    values[name] = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true;
  }
  return { kind, values };
}

function list(value) {
  return value ? String(value).split('|').filter(Boolean) : [];
}

async function main() {
  const { kind, values } = args(process.argv);
  if (!['commit', 'session-summary'].includes(kind)) throw new Error('usage: capture.js commit|session-summary ...');
  let input = {
    kind,
    project_id: values.project,
    sha: values.sha,
    session_id: values.session,
    revision: values.revision,
    summary: values.message || values.summary || '',
    decisions: list(values.decisions),
    user_corrections: list(values.user_corrections || values.corrections),
    checks: list(values.checks),
    next_action: values.next_action || '',
  };
  if (values.diff) input.diff = fs.readFileSync(values.diff, 'utf8');
  if (values.file) input = { ...input, ...parseJsonFile(values.file) };
  if (values.text && !input.summary) input.summary = values.text;
  const event = createEvent(input);
  // Коммит, которым writer фиксирует уже обработанную память, не уходит в
  // очередь: иначе его захватывает тот же hook, AI снова порождает запись, и
  // цикл ограничен только ручным прекращением коммитов. Признак считается по
  // происхождению и составу изменений (memory-fixation.js), а не по префиксу
  // сообщения: обычный и смешанный коммит не должен теряться.
  const fixation = classify(input.diff || '');
  if (fixation.skip) {
    process.stdout.write(JSON.stringify({
      event_id: event.event_id,
      skipped: fixation.reason,
      files: fixation.files,
      event_ids: fixation.event_ids,
    }) + '\n');
    return;
  }
  const queue = new DurableQueue();
  const record = queue.enqueue(event);
  if (values.enqueue_only === true) {
    process.stdout.write(JSON.stringify({ event, status: record.status, attempts: record.attempts }, null, 2) + '\n');
    return;
  }
  const records = await queue.process(deliverEvent, { limit: 1 });
  const latest = records.find(item => item.event.event_id === event.event_id) || record;
  process.stdout.write(JSON.stringify({ event, status: latest.status, attempts: latest.attempts }, null, 2) + '\n');
}

main().catch(error => {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
});

