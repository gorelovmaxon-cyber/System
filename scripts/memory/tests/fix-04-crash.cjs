#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const { validateProposal } = require('../writer');
const writerLog = require('../writer-log');

// Модель процесса, убитого в середине сохранения: записывает intent
// (как это делает writeProposal до записи файлов) и завершается с кодом 1 —
// «процесс умер до записи файла и до подтверждения».
function parseArgs(argv) {
  const values = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2).replaceAll('-', '_');
    values[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return values;
}

const values = parseArgs(process.argv);
const eventId = values.event_id || 'evt_' + crypto.randomBytes(6).toString('hex');
const proposal = validateProposal({
  category: values.category,
  statement: values.statement,
  evidence: values.evidence,
  scope: values.scope || 'user',
  status: values.status || 'observation',
  source: values.source || 'manual save',
  confidence: values.confidence === undefined ? undefined : Number(values.confidence),
  supersedes: values.supersedes,
});
const hash = crypto.createHash('sha256').update(JSON.stringify({ eventId, proposals: [proposal] })).digest('hex');
writerLog.append({ event_id: eventId, hash, status: 'intent' });
process.exit(1);
