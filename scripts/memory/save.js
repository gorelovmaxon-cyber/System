#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const { writeProposal } = require('./writer');

function parseArgs(argv) {
  const values = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2).replaceAll('-', '_');
    values[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return values;
}

function main() {
  const values = parseArgs(process.argv);
  const eventId = values.event_id || 'evt_' + crypto.randomBytes(6).toString('hex');
  const result = writeProposal(eventId, {
    category: values.category,
    statement: values.statement,
    evidence: values.evidence,
    scope: values.scope || 'user',
    status: values.status || 'observation',
    source: values.source || 'manual save',
    confidence: values.confidence === undefined ? undefined : Number(values.confidence),
    supersedes: values.supersedes,
  });
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = error.code === 'CONFLICT' ? 2 : 1;
}

