#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolvePaths } = require('./resolve-paths');

function logPath() {
  return path.join(resolvePaths().data_dir, 'writer', 'processed.jsonl');
}

function records() {
  const file = logPath();
  if (!fs.existsSync(file)) return new Map();
  const result = new Map();
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const record = JSON.parse(line);
    result.set(record.event_id, record.indexed === undefined ? { ...record, indexed: false } : record);
  }
  return result;
}

function append(record) {
  const file = logPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const value = record.event_id ? { indexed: false, ...record } : record;
  fs.appendFileSync(file, JSON.stringify({ ...value, timestamp: new Date().toISOString() }) + '\n', 'utf8');
}

function get(eventId) {
  return records().get(eventId);
}

module.exports = { append, get, logPath, records };
