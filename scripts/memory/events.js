#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const { resolvePaths } = require('./resolve-paths');

const MAX_EVENT_BYTES = 100000;
const DEFAULT_MAX_DIFF_BYTES = 20000;
const KINDS = new Set(['commit', 'session-summary']);
// Молчаливая нормализация стирала содержательный вход: строка вместо массива
// превращалась в [], и validateEvent уже не видел исходного значения (G08).
// Поэтому типы проверяются на исходном input до нормализации, а не после неё.
const LIST_FIELDS = ['decisions', 'user_corrections', 'checks'];
const STRING_FIELDS = ['project_id', 'summary', 'next_action', 'timestamp', 'sha', 'session_id', 'diff'];

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
  if (!Number.isInteger(maxBytes) || maxBytes < 0) throw new Error('maxBytes must be a non-negative integer');
  if (Buffer.byteLength(input, 'utf8') <= maxBytes) return input;
  const suffix = '.'.repeat(Math.min(3, maxBytes));
  const budget = maxBytes - Buffer.byteLength(suffix, 'utf8');
  let output = '';
  let used = 0;
  for (const character of input) {
    const size = Buffer.byteLength(character, 'utf8');
    if (used + size > budget) break;
    output += character;
    used += size;
  }
  return output + suffix;
}

function validateEvent(event) {
  if (!event || event.schema_version !== '1') throw new Error('schema_version must be "1"');
  if (!KINDS.has(event.kind)) throw new Error('kind must be commit or session-summary');
  if (typeof event.event_id !== 'string' || !/^evt_[0-9a-f]{12}$/.test(event.event_id)) throw new Error('event_id is required');
  if (!event.project_id || typeof event.project_id !== 'string') throw new Error('project_id is required');
  const registry = resolvePaths().registry;
  if (registry.length && !registry.some(item => item.project_id === event.project_id)) {
    throw new Error('unknown project_id: ' + event.project_id);
  }
  if (!event.source || typeof event.source !== 'object' || Array.isArray(event.source)) throw new Error('source is required');
  if (typeof event.timestamp !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(event.timestamp) || Number.isNaN(Date.parse(event.timestamp))) throw new Error('timestamp must be ISO UTC');
  if (typeof event.summary !== 'string') throw new Error('summary is required');
  for (const field of ['decisions', 'user_corrections', 'checks']) {
    if (!Array.isArray(event[field]) || !event[field].every(item => typeof item === 'string')) {
      throw new Error(`${field} must be an array of strings`);
    }
  }
  if (typeof event.next_action !== 'string') throw new Error('next_action must be a string');
  if (event.kind === 'commit' && (!event.source.sha || !/^[0-9a-f]{7,64}$/i.test(event.source.sha))) {
    throw new Error('commit source.sha must be a hexadecimal Git SHA');
  }
  if (event.kind === 'session-summary' && (!event.source.session_id || !Number.isInteger(event.source.revision))) {
    throw new Error('session source.session_id and integer revision are required');
  }
  if (event.event_id !== eventIdFor(event.kind, event.source, event.project_id)) {
    throw new Error('event_id does not match deterministic event identity');
  }
  if (event.kind === 'commit' && typeof event.diff !== 'string') throw new Error('commit diff must be a string');
  if (Buffer.byteLength(JSON.stringify(event), 'utf8') > MAX_EVENT_BYTES) throw new Error('event exceeds size limit');
  return event;
}

// Проверка исходного входа до нормализации (G08). Отсутствующее необязательное
// поле допустимо и означает пустое значение; присутствующее поле неверного типа
// отклоняется явно, а не подменяется пустым — иначе решение, коррекция или
// проверка исчезали бы незаметно, и validateEvent видел бы уже очищенный объект.
function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('event input must be an object');
  for (const field of LIST_FIELDS) {
    const value = input[field];
    if (value === undefined || value === null) continue;
    if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
      throw new Error(`${field} must be an array of strings`);
    }
  }
  for (const field of STRING_FIELDS) {
    const value = input[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string') throw new Error(`${field} must be a string`);
  }
  // CLI передаёт revision строкой, JSON-файл — числом; содержательным является
  // целое значение, а не его запись.
  if (input.revision !== undefined && input.revision !== null && !Number.isInteger(Number(input.revision))) {
    throw new Error('revision must be an integer');
  }
  return input;
}

function createEvent(input) {
  validateInput(input);
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
