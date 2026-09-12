#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolvePaths } = require('./resolve-paths');
const writerLog = require('./writer-log');
const { queueIndex } = require('./indexer');
const { assertSafePath } = require('./path-safety');
const { acquireProcessLock, lockStatePath } = require('./ipc-lock');

const CATEGORIES = ['user-profile', 'facts', 'patterns', 'decisions', 'gotchas'];
const STATUSES = ['observation', 'confirmed', 'superseded'];
const MAX_FIELD_BYTES = 20000;
let busy = false;

// Идентичность защищаемого ресурса — сама память (канонический memory_root),
// а не data_dir: две валидные конфигурации на одном ПК, указывающие один и тот
// же memory_root, имеют разные стандартные `.local` и без общего владения
// теряли бы записи друг друга молча (G15). Общий каталог состояния выводится
// из канонического пути памяти, поэтому вторая копия и custom root попадают в
// тот же владелец.
//
// Право входа даёт эксклюзивный OS bind сторожа, и запись владения публикует
// только держатель bind'а: публикация не может опереться на уже утраченный
// bind (V1). Живой владелец в записи закрывает вход и тогда, когда endpoint
// освободился из-за смерти сторожа (U1). assertHeld() позволяет пути записи
// упасть fail-closed, если владение больше не наше.
function lockPath() {
  return lockStatePath(resolvePaths().memory_root);
}

function acquireLock() {
  const paths = resolvePaths();
  return acquireProcessLock(paths.memory_root, {
    metadataFile: lockStatePath(paths.memory_root),
    attempts: 20,
    timeoutMessage: 'writer lock timeout',
  });
}

function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(field + ' must be a non-empty string');
  if (Buffer.byteLength(value, 'utf8') > MAX_FIELD_BYTES) throw new Error(field + ' is too large');
  return value.trim();
}

function singleLine(value, field) {
  const line = text(value, field);
  if (/[\r\n]/.test(line)) throw new Error(field + ' must be a single line (no CR/LF)');
  return line;
}

function validateEventId(eventId) {
  if (typeof eventId !== 'string' || !eventId.trim()) throw new Error('event_id must be a non-empty string');
  if (/[\r\n]/.test(eventId)) throw new Error('event_id must be a single line (no CR/LF)');
  return eventId;
}

// Валидация возвращает нормализованные значения (S2/S3): frontmatter-поля
// однострочные, statement нормализован к LF и не содержит границ записей.
// Hash считается по нормализованным предложениям — LF и CRLF формы одного
// содержимого дают один hash (идемпотентный повтор, не CONFLICT).
function validateProposal(proposal) {
  if (!proposal || !CATEGORIES.includes(proposal.category)) throw new Error('invalid category');
  if (!STATUSES.includes(proposal.status)) throw new Error('invalid status');
  const paths = resolvePaths();
  if (proposal.scope !== 'user' && !paths.registry.some(item => item.project_id === proposal.scope)) {
    throw new Error('invalid scope');
  }
  const statement = normalizeEol(text(proposal.statement, 'statement'));
  if (statement.split('\n').some(line => line.startsWith('---'))) {
    throw new Error('statement must not contain a line starting with ---');
  }
  const evidence = singleLine(proposal.evidence, 'evidence');
  const source = proposal.source === undefined ? undefined : singleLine(proposal.source, 'source');
  const supersedes = proposal.supersedes === undefined ? undefined : singleLine(proposal.supersedes, 'supersedes');
  if (proposal.confidence !== undefined && (typeof proposal.confidence !== 'number' || proposal.confidence < 0 || proposal.confidence > 1)) {
    throw new Error('confidence must be between 0 and 1');
  }
  return { ...proposal, statement, evidence, source, supersedes };
}

function proposalHash(eventId, proposals) {
  return crypto.createHash('sha256').update(JSON.stringify({ eventId, proposals })).digest('hex');
}

function targetFile(category) {
  return path.join(resolvePaths().memory_root, category, 'writer-entries.md');
}

function entryText(eventId, proposal) {
  const fields = [
    '---',
    'status: ' + proposal.status,
    'category: ' + proposal.category,
    'scope: ' + proposal.scope,
    'source: ' + (proposal.source === undefined ? 'writer' : proposal.source),
    'evidence: ' + proposal.evidence,
    'event_id: ' + eventId,
  ];
  if (proposal.supersedes !== undefined) fields.push('supersedes: ' + proposal.supersedes);
  if (proposal.confidence !== undefined) fields.push('confidence: ' + proposal.confidence);
  fields.push('---', '', '## ' + proposal.statement, '');
  return fields.join('\n');
}

function normalizeEol(text) {
  return text.replace(/\r\n/g, '\n');
}

function entryBlocks(text) {
  return normalizeEol(text).split(/\n(?=---\n(?!\n))/).filter(block => block.trim().length > 0);
}

// Идентичность записи — полное содержимое записи, которое создаёт writer
// (event_id, категория, scope, status, source, evidence, supersedes,
// confidence и statement): предложения с одинаковым statement, но разным
// scope/evidence и т.п. — разные записи и сохраняются все (R1). CRLF
// нормализуется, поэтому повтор после LF->CRLF идемпотентен (R4).
function entryPresent(file, eventId, proposal, legacyProposal) {
  if (!fs.existsSync(file)) return false;
  const existing = fs.readFileSync(file, 'utf8');
  const expected = normalizeEol(entryText(eventId, proposal)).trim();
  const legacyExpected = legacyProposal ? normalizeEol(entryText(eventId, legacyProposal)).trim() : null;
  return entryBlocks(existing).some(block => block.trim() === expected || (legacyExpected !== null && block.trim() === legacyExpected));
}

function writeAtomic(file, content) {
  const memoryRoot = resolvePaths().memory_root;
  assertSafePath(memoryRoot, file, 'writer target');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Recheck after creating missing parents so a pre-existing junction cannot
  // hide below the first missing component.
  assertSafePath(memoryRoot, file, 'writer target');
  const tmp = file + '.tmp-' + process.pid + '-' + Date.now();
  const previous = fs.existsSync(file) ? normalizeEol(fs.readFileSync(file, 'utf8')) : '';
  const next = previous + (previous && !previous.endsWith('\n') ? '\n' : '') + content;
  try {
    const fd = fs.openSync(tmp, 'w');
    try {
      fs.writeFileSync(fd, next, 'utf8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmp, file);
    assertSafePath(memoryRoot, file, 'writer target');
  } catch (error) {
    try { fs.unlinkSync(tmp); } catch {}
    throw error;
  }
  return fs.readFileSync(file, 'utf8');
}

function crashPoint(stage) {
  if (process.env.SYSTEM2_CRASH_AT === stage) process.exit(23);
}

function writeProposal(eventId, input) {
  if (busy) throw new Error('writer busy; retry');
  busy = true;
  let release;
  try {
    validateEventId(eventId);
    if (Array.isArray(input) && input.length === 0) throw new Error('proposals must be a non-empty array');
    const legacyProposals = Array.isArray(input) ? input : [input];
    const proposals = legacyProposals.map(validateProposal);
    const hash = proposalHash(eventId, proposals);
    // Before S2/S3, the intent hash was calculated from the validated but
    // unnormalised request. Accept that exact legacy identity during recovery,
    // then publish the canonical hash. This is not a wildcard: any substantive
    // request difference still conflicts.
    const legacyHash = proposalHash(eventId, legacyProposals);
    const paths = resolvePaths();
    // Решение о конфликте/повторе и изменение журнала — внутри блокировки (R6):
    // проверка журнала «до» блокировки пропускала конфликт одного event_id
    // между процессами — оба возвращали persisted с разным содержимым.
    release = acquireLock();
    crashPoint('after-lock');
    release.assertHeld();
    const previous = writerLog.get(eventId);
    if (previous && previous.hash !== hash && previous.hash !== legacyHash) {
      const error = new Error('event_id already persisted with different content');
      error.code = 'CONFLICT';
      throw error;
    }
    if (previous && previous.status === 'persisted' &&
        proposals.every((proposal, index) => entryPresent(targetFile(proposal.category), eventId, proposal, legacyProposals[index]))) {
      // Index tasks are derived state. Reconcile them on every idempotent
      // writer retry so a prior enqueue failure cannot lose persisted data.
      const existingFiles = proposals.map(proposal => targetFile(proposal.category));
      try {
        queueIndex(eventId, existingFiles);
        if (previous.index_error) writerLog.append({ ...previous, hash, indexed: false, index_error: null });
      } catch (error) {
        writerLog.append({ ...previous, hash, indexed: false, index_error: error.message });
      }
      return { status: 'persisted', written_files: previous.written_files, revision: previous.revision, idempotent: true };
    }
    const files = [];
    const revisions = [];
    writerLog.append({ event_id: eventId, hash, status: 'intent', indexed: false });
    crashPoint('after-intent');
    for (const [index, proposal] of proposals.entries()) {
      const file = targetFile(proposal.category);
      if (entryPresent(file, eventId, proposal, legacyProposals[index])) {
        files.push(file);
        revisions.push(crypto.createHash('sha256').update(fs.readFileSync(file, 'utf8')).digest('hex').slice(0, 12));
        continue;
      }
      release.assertHeld();
      const content = writeAtomic(file, entryText(eventId, proposal));
      files.push(file);
      revisions.push(crypto.createHash('sha256').update(content).digest('hex').slice(0, 12));
    }
    crashPoint('after-write');
    release.assertHeld();
    const revision = crypto.createHash('sha256').update(revisions.join('|')).digest('hex').slice(0, 12);
    const result = { status: 'persisted', written_files: [...new Set(files.map(file => path.relative(paths.system_root, file).replaceAll(path.sep, '/')))], revision };
    try {
      queueIndex(eventId, files);
      writerLog.append({ event_id: eventId, hash, status: 'persisted', written_files: result.written_files, revision, indexed: false });
    } catch (error) {
      // Persistence must not fail because the derived index queue is unavailable.
      writerLog.append({ event_id: eventId, hash, status: 'persisted', written_files: result.written_files, revision, indexed: false, index_error: error.message });
    }
    crashPoint('after-persisted');
    return result;
  } finally {
    if (release) release();
    busy = false;
  }
}

module.exports = { CATEGORIES, STATUSES, validateProposal, writeProposal, acquireLock };
