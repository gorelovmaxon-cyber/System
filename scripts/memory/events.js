#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const { resolvePaths } = require('./resolve-paths');

const MAX_EVENT_BYTES = 100000;
const DEFAULT_MAX_DIFF_BYTES = 20000;
const KINDS = new Set(['commit', 'session-summary']);

function configValue(name, fallback) {
  try {
    const paths = resolvePaths();
    const example = JSON.parse(fs.readFileSync(require('node:path').join(paths.system_root, 'config/system.example.json'), 'utf8'));
    const local = fs.existsSync(paths.localConfig) ? JSON.parse(fs.readFileSync(paths.localConfig, 'utf8')) : {};
    return local.events?.[name] ?? example.events?.[name] ?? fallback;
  } catch {
    return fallback;
  }
}

function eventIdFor(kind, source, projectId = '') {
  const key = kind === 'commit'
    ? projectId + '|' + source.sha
    : projectId + '|' + source.session_id + '|' + String(source.revision);
  return 'evt_' + crypto.createHash('sha256').update(key).digest('hex').slice(0, 12);
}

function truncateUtf8(value, maxBytes) {
  const input = String(value || '');
  const bytes = Buffer.from(input, 'utf8');
  if (bytes.length <= maxBytes) return input;
  return Buffer.concat([bytes.subarray(0, Math.max(0, maxBytes - 3)), Buffer.from('...')]).toString('utf8');
}

function validateEvent(event) {
  if (!event || event.schema_version !== '1') throw new Error('schema_version must be "1"');
  if (!KINDS.has(event.kind)) throw new Error('kind must be commit or session-summary');
  if (!event.project_id || typeof event.project_id !== 'string') throw new Error('project_id is required');
  const registry = resolvePaths().registry;
  if (registry.length && !registry.some(item => item.project_id === event.project_id)) {
    throw new Error('unknown project_id: ' + event.project_id);
  }
  if (!event.source || typeof event.source !== 'object') throw new Error('source is required');
  if (!event.timestamp || Number.isNaN(Date.parse(event.timestamp))) throw new Error('timestamp must be ISO UTC');
  if (typeof event.summary !== 'string') throw new Error('summary is required');
  if (event.kind === 'commit' && (!event.source.sha || !/^[0-9a-f]{7,64}$/i.test(event.source.sha))) {
    throw new Error('commit source.sha must be a hexadecimal Git SHA');
  }
  if (event.kind === 'session-summary' && (!event.source.session_id || !Number.isInteger(event.source.revision))) {
    throw new Error('session source.session_id and integer revision are required');
  }
  if (Buffer.byteLength(JSON.stringify(event), 'utf8') > MAX_EVENT_BYTES) throw new Error('event exceeds size limit');
  return event;
}

function createEvent(input) {
  const kind = input.kind;
  const source = kind === 'commit'
    ? { sha: String(input.sha || '') }
    : { session_id: String(input.session_id || ''), revision: Number(input.revision || 1) };
  const event = {
    schema_version: '1',
    event_id: eventIdFor(kind, source, String(input.project_id || '')),
    project_id: String(input.project_id || ''),
    kind,
    timestamp: input.timestamp || new Date().toISOString(),
    source,
    summary: String(input.summary || ''),
    decisions: Array.isArray(input.decisions) ? input.decisions : [],
    user_corrections: Array.isArray(input.user_corrections) ? input.user_corrections : [],
    checks: Array.isArray(input.checks) ? input.checks : [],
    next_action: input.next_action ? String(input.next_action) : '',
  };
  if (kind === 'commit') {
    event.diff = truncateUtf8(input.diff || '', Number(configValue('max_diff_bytes', DEFAULT_MAX_DIFF_BYTES)));
  }
  return validateEvent(event);
}

function parseJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

module.exports = {
  MAX_EVENT_BYTES,
  createEvent,
  eventIdFor,
  parseJsonFile,
  truncateUtf8,
  validateEvent,
};
