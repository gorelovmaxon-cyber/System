#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolvePaths } = require('./resolve-paths');

function logPath() {
  return path.join(resolvePaths().data_dir, 'indexer', 'tasks.jsonl');
}

function records() {
  const file = logPath();
  const result = new Map();
  if (!fs.existsSync(file)) return result;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const record = JSON.parse(line);
    result.set(record.task_id, record);
  }
  return result;
}

function append(record) {
  const file = logPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify({ ...record, timestamp: new Date().toISOString() }) + '\n', 'utf8');
}

module.exports = { append, logPath, records };
