#!/usr/bin/env node
'use strict';

const { DurableQueue } = require('./queue');
const { deliverEvent } = require('./deliver');

async function drain(options = {}) {
  const queue = options.queue || new DurableQueue();
  return queue.process(options.deliver || deliverEvent, { limit: options.limit ?? Infinity });
}

if (require.main === module) {
  drain().then(records => {
    process.stdout.write(JSON.stringify({ status: 'drained', counts: records.reduce((out, record) => {
      out[record.status] = (out[record.status] || 0) + 1;
      return out;
    }, {}) }) + '\n');
  }).catch(error => {
    process.stderr.write(`queue worker error: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { drain };
