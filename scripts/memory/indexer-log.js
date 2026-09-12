#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolvePaths } = require('./resolve-paths');
const { appendJsonl, readJsonl } = require('./jsonl');

function logPath() {
  return path.join(resolvePaths().data_dir, 'indexer', 'tasks.jsonl');
}

function records() {
  const file = logPath();
  const result = new Map();
  if (!fs.existsSync(file)) return result;
  for (const record of readJsonl(file)) {
    result.set(record.task_id, record);
  }
  return result;
}

function append(record) {
  const file = logPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  appendJsonl(file, { ...record, timestamp: new Date().toISOString() });
}

module.exports = { append, logPath, records };
