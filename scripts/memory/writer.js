#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolvePaths } = require('./resolve-paths');
const writerLog = require('./writer-log');
const { queueIndex } = require('./indexer');

const CATEGORIES = ['user-profile', 'facts', 'patterns', 'decisions', 'gotchas'];
const STATUSES = ['observation', 'confirmed', 'superseded'];
const MAX_FIELD_BYTES = 20000;
let busy = false;

function lockPath() {
  return path.join(resolvePaths().data_dir, 'writer', 'memory.lock');
}

function lockOwner(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Number.isInteger(parsed.pid) ? parsed : null;
  } catch {
    return null;
  }
}

// Живой pid — только ESRCH (нет такого процесса) трактуется как мёртвый.
// EPERM/прочие ошибки доступа означают «процесс существует, но недоступен
// проверке» — блокировку не крадём (R5).
function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'ESRCH' ? false : true;
  }
}

function writeOwner(fd, owner) {
  fs.writeFileSync(fd, JSON.stringify(owner) + '\n', 'utf8');
  fs.fsyncSync(fd);
}

function sameOwner(a, owner) {
  return a !== null && a.pid === owner.pid && a.nonce === owner.nonce;
}

// Захват блокировки с безопасной публикацией владельца (R5):
// 1. wx-создание, запись владельца, закрытие, затем подтверждение, что файл
//    всё ещё наш. Если между созданием и публикацией файл удалили/заменили
//    (конкурентное восстановление «пустой» блокировки) — захват потерян:
//    чужую блокировку не удаляем, повторяем попытку.
// 2. Пустая/мусорная блокировка: несколько чтений в окне (~250 мс), прежде
//    чем считать её осиротевшей; владелец мог ещё не успеть опубликоваться.
// 3. Освобождение удаляет lock-файл только если он всё ещё принадлежит нам;
//    блокировку другого поколения не трогаем.
function acquireLock() {
  const file = lockPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const owner = {
    pid: process.pid,
    hostname: os.hostname(),
    created: new Date().toISOString(),
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let fd;
    try {
      fd = fs.openSync(file, 'wx');
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const current = lockOwner(file);
      if (current === null) {
        // Окно «файл открыт, владелец ещё не записан»: несколько перечитываний,
        // прежде чем считать блокировку осиротевшей (таймаут-пауза не является
        // доказательством смерти процесса).
        let empty = true;
        for (let i = 0; i < 5; i += 1) {
          const wait = new Int32Array(new SharedArrayBuffer(4));
          Atomics.wait(wait, 0, 0, 50);
          if (lockOwner(file) !== null) { empty = false; break; }
        }
        if (empty) {
          try { fs.unlinkSync(file); } catch {}
        }
      } else if (!pidAlive(current.pid)) {
        // Мёртвый владелец: повторное чтение перед удалением — владелец мог
        // смениться между чтениями; живой lock другого поколения не трогаем.
        const recheck = lockOwner(file);
        if (recheck !== null && recheck.pid === current.pid && !pidAlive(recheck.pid)) {
          try { fs.unlinkSync(file); } catch {}
        }
      } else {
        const wait = new Int32Array(new SharedArrayBuffer(4));
        Atomics.wait(wait, 0, 0, 10);
      }
      continue;
    }
    try {
      writeOwner(fd, owner);
      fs.closeSync(fd);
    } catch (error) {
      try { fs.closeSync(fd); } catch {}
      throw error;
    }
    if (!sameOwner(lockOwner(file), owner)) continue;
    return () => {
      const current = lockOwner(file);
      if (sameOwner(current, owner)) {
        try { fs.unlinkSync(file); } catch {}
      }
    };
  }
  throw new Error('writer lock timeout');
}

function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(field + ' must be a non-empty string');
  if (Buffer.byteLength(value, 'utf8') > MAX_FIELD_BYTES) throw new Error(field + ' is too large');
  return value.trim();
}

function validateProposal(proposal) {
  if (!proposal || !CATEGORIES.includes(proposal.category)) throw new Error('invalid category');
  if (!STATUSES.includes(proposal.status)) throw new Error('invalid status');
  const paths = resolvePaths();
  if (proposal.scope !== 'user' && !paths.registry.some(item => item.project_id === proposal.scope)) {
    throw new Error('invalid scope');
  }
  const statement = text(proposal.statement, 'statement');
  const evidence = text(proposal.evidence, 'evidence');
  if (proposal.source !== undefined) text(String(proposal.source), 'source');
  if (proposal.confidence !== undefined && (typeof proposal.confidence !== 'number' || proposal.confidence < 0 || proposal.confidence > 1)) {
    throw new Error('confidence must be between 0 and 1');
  }
  return { ...proposal, statement, evidence };
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
    'source: ' + String(proposal.source || 'writer'),
    'evidence: ' + proposal.evidence.replaceAll('\n', ' '),
    'event_id: ' + eventId,
  ];
  if (proposal.supersedes) fields.push('supersedes: ' + String(proposal.supersedes));
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
function entryPresent(file, eventId, proposal) {
  if (!fs.existsSync(file)) return false;
  const existing = fs.readFileSync(file, 'utf8');
  const expected = entryText(eventId, proposal).trim();
  return entryBlocks(existing).some(block => block.trim() === expected);
}

function pathInsideMemory(file) {
  const root = path.resolve(resolvePaths().memory_root);
  const target = path.resolve(file);
  return target === root || target.startsWith(root + path.sep);
}

function writeAtomic(file, content) {
  if (!pathInsideMemory(file)) throw new Error('writer target escapes memory root');
  fs.mkdirSync(path.dirname(file), { recursive: true });
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
  } catch (error) {
    try { fs.unlinkSync(tmp); } catch {}
    throw error;
  }
  return fs.readFileSync(file, 'utf8');
}

function writeProposal(eventId, input) {
  if (busy) throw new Error('writer busy; retry');
  busy = true;
  let release;
  try {
    const proposals = Array.isArray(input) ? input.map(validateProposal) : [validateProposal(input)];
    const hash = proposalHash(eventId, proposals);
    const paths = resolvePaths();
    // Решение о конфликте/повторе и изменение журнала — внутри блокировки (R6):
    // проверка журнала «до» блокировки пропускала конфликт одного event_id
    // между процессами — оба возвращали persisted с разным содержимым.
    release = acquireLock();
    const previous = writerLog.get(eventId);
    if (previous && previous.hash !== hash) {
      const error = new Error('event_id already persisted with different content');
      error.code = 'CONFLICT';
      throw error;
    }
    if (previous && previous.status === 'persisted' &&
        proposals.every(proposal => entryPresent(targetFile(proposal.category), eventId, proposal))) {
      return { status: 'persisted', written_files: previous.written_files, revision: previous.revision, idempotent: true };
    }
    const files = [];
    const revisions = [];
    writerLog.append({ event_id: eventId, hash, status: 'intent', indexed: false });
    for (const proposal of proposals) {
      const file = targetFile(proposal.category);
      if (entryPresent(file, eventId, proposal)) {
        files.push(file);
        revisions.push(crypto.createHash('sha256').update(fs.readFileSync(file, 'utf8')).digest('hex').slice(0, 12));
        continue;
      }
      const content = writeAtomic(file, entryText(eventId, proposal));
      files.push(file);
      revisions.push(crypto.createHash('sha256').update(content).digest('hex').slice(0, 12));
    }
    const revision = crypto.createHash('sha256').update(revisions.join('|')).digest('hex').slice(0, 12);
    const result = { status: 'persisted', written_files: [...new Set(files.map(file => path.relative(paths.system_root, file).replaceAll(path.sep, '/')))], revision };
    try {
      queueIndex(eventId, files);
      writerLog.append({ event_id: eventId, hash, status: 'persisted', written_files: result.written_files, revision, indexed: false });
    } catch (error) {
      // Persistence must not fail because the derived index queue is unavailable.
      writerLog.append({ event_id: eventId, hash, status: 'persisted', written_files: result.written_files, revision, indexed: false, index_error: error.message });
    }
    return result;
  } finally {
    if (release) release();
    busy = false;
  }
}

module.exports = { CATEGORIES, STATUSES, validateProposal, writeProposal, acquireLock };
