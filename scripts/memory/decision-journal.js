#!/usr/bin/env node
'use strict';

// Project-local inbox for knowledge. Canonical memory is written only by save.js.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { projectId } = require('./project-id');
const writerLog = require('./writer-log');
const { acquireProcessLock } = require('./ipc-lock');

const TYPES = new Set(['decision', 'correction', 'question', 'fact', 'observation']);
const VERIFICATIONS = new Set(['confirmed', 'observation', 'open']);
const UNSAFE = /(?:sk-(?:test|proj|live)-[a-z0-9_-]+|(?:api[_-]?key|secret|password|token)\s*[:=]\s*\S+)/i;

function args(argv) {
  const result = { command: argv[2] };
  for (let i = 3; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) throw new Error('unexpected argument');
    const key = argv[i].slice(2).replaceAll('-', '_');
    if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`missing ${key}`);
    result[key] = argv[++i];
  }
  return result;
}

function line(value, name) {
  if (typeof value !== 'string' || !value.trim() || /[\r\n]/.test(value) || value.length > 2000) {
    throw new Error(`${name} must be a nonempty single line of at most 2000 characters`);
  }
  if (UNSAFE.test(value)) throw new Error(`${name} may contain a credential; redact it before capture`);
  return value.trim();
}

function context(root) {
  const resolved = fs.realpathSync(path.resolve(root));
  if (!fs.existsSync(path.join(resolved, '.git'))) throw new Error('project root must be a Git checkout');
  return { root: resolved, project_id: projectId(resolved), dir: path.join(resolved, '.system2', 'decision-journal') };
}

function fileFor(ctx, id) {
  if (!/^[a-f0-9]{24}$/.test(id)) throw new Error('invalid journal id');
  return path.join(ctx.dir, `${id}.json`);
}

function read(ctx, id) { return JSON.parse(fs.readFileSync(fileFor(ctx, id), 'utf8')); }

function list(ctx) {
  if (!fs.existsSync(ctx.dir)) return [];
  return fs.readdirSync(ctx.dir).filter(name => /^[a-f0-9]{24}\.json$/.test(name))
    .map(name => read(ctx, name.slice(0, -5))).filter(item => item.project_id === ctx.project_id);
}

function locked(ctx, action) {
  const release = acquireProcessLock(ctx.dir, { attempts: 40, timeoutMessage: 'project journal lock timeout' });
  try { release.assertHeld(); return action(release); }
  finally { release(); }
}

function replaceEntry(ctx, entry, release) {
  fs.mkdirSync(ctx.dir, { recursive: true });
  const target = fileFor(ctx, entry.id);
  const temp = `${target}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`;
  try {
    const fd = fs.openSync(temp, 'wx');
    try { fs.writeFileSync(fd, JSON.stringify(entry, null, 2) + '\n'); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    if (process.env.SYSTEM2_CRASH_AT === 'journal-before-rename') process.exit(23);
    release.assertHeld();
    fs.renameSync(temp, target);
    if (process.env.SYSTEM2_CRASH_AT === 'journal-after-rename') process.exit(23);
  } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}

function capture(ctx, opts) {
  return locked(ctx, release => captureLocked(ctx, opts, release));
}

function captureLocked(ctx, opts, release) {
  const type = line(opts.type, 'type');
  if (!TYPES.has(type)) throw new Error('invalid type');
  const summary = line(opts.summary, 'summary');
  const source = line(opts.source, 'source');
  const verification = line(opts.verification, 'verification');
  if (!VERIFICATIONS.has(verification)) throw new Error('invalid verification');
  if (verification === 'confirmed' && (summary.includes('\uFFFD') || source.includes('\uFFFD'))) {
    throw new Error('damaged U+FFFD text cannot be confirmed without source repair');
  }
  const supersedes = opts.supersedes ? line(opts.supersedes, 'supersedes') : null;
  if (supersedes) {
    const previous = read(ctx, supersedes);
    if (previous.project_id !== ctx.project_id || type !== 'correction') throw new Error('invalid supersedes');
  }
  const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24);
  let id = digest([ctx.project_id, type, summary.toLowerCase(), supersedes]);
  if (fs.existsSync(fileFor(ctx, id))) {
    const legacy = read(ctx, id);
    if (legacy.project_id === ctx.project_id && legacy.type === type && legacy.supersedes === supersedes &&
        legacy.summary !== summary && legacy.summary.toLowerCase() === summary.toLowerCase()) {
      id = digest(['journal-case-v1', ctx.project_id, type, summary, supersedes]);
    }
  }
  const entry = {
    id, date: new Date().toISOString().slice(0, 10), project_id: ctx.project_id,
    type, summary, source, verification, state: 'pending', supersedes,
    memory_event_id: null, memory_files: [],
  };
  if (fs.existsSync(fileFor(ctx, id))) {
    const prior = read(ctx, id);
    if (prior.project_id !== ctx.project_id || prior.type !== type || prior.summary !== summary || prior.source !== source || prior.verification !== verification || prior.supersedes !== supersedes) {
      throw new Error('journal id conflict; inspect the existing entry');
    }
    return { created: false, entry: prior };
  }
  replaceEntry(ctx, entry, release);
  return { created: true, entry };
}

function mark(ctx, id, getRecord = writerLog.get) {
  return locked(ctx, release => markLocked(ctx, id, getRecord, release));
}

function markLocked(ctx, id, getRecord, release) {
  const entry = read(ctx, id);
  if (entry.project_id !== ctx.project_id) throw new Error('project scope mismatch');
  if (entry.state === 'closed') throw new Error('closed journal entry cannot be promoted');
  if (entry.type === 'question' || entry.verification === 'open') throw new Error('open question cannot be promoted');
  const eventId = `journal_${ctx.project_id}_${id}`;
  const result = getRecord(eventId);
  if (!result || result.status !== 'persisted' || !Array.isArray(result.written_files) || !result.written_files.length) {
    throw new Error(`memory not persisted for ${eventId}; run save.js first`);
  }
  if (entry.state === 'persisted') {
    if (entry.memory_event_id !== eventId) throw new Error('memory event mismatch');
    return entry;
  }
  if (entry.state !== 'pending') throw new Error('invalid journal state for mark');
  const updated = { ...entry, state: 'persisted', memory_event_id: eventId, memory_files: result.written_files };
  replaceEntry(ctx, updated, release);
  return updated;
}

function close(ctx, id, opts) {
  const disposition = line(opts.disposition, 'disposition');
  if (!['resolved', 'dismissed', 'superseded'].includes(disposition)) throw new Error('invalid disposition');
  const closure = { disposition, reason: line(opts.reason, 'reason'), evidence: line(opts.evidence, 'evidence') };
  if (disposition === 'superseded') closure.correction_id = line(opts.correction_id, 'correction_id');
  else if (opts.correction_id !== undefined) throw new Error('correction_id requires superseded disposition');
  return locked(ctx, release => {
    const entry = read(ctx, id);
    if (entry.project_id !== ctx.project_id) throw new Error('project scope mismatch');
    if (entry.state === 'persisted') throw new Error('persisted entry cannot be closed');
    if (closure.correction_id) {
      const correction = read(ctx, closure.correction_id);
      if (correction.project_id !== ctx.project_id || correction.type !== 'correction' || correction.supersedes !== id) {
        throw new Error('superseded requires a same-project correction referencing this id');
      }
    }
    if (entry.state === 'closed') {
      if (JSON.stringify(entry.closure) !== JSON.stringify(closure)) throw new Error('journal closure conflict');
      return entry;
    }
    if (entry.state !== 'pending') throw new Error('only pending entries may be closed');
    const updated = { ...entry, state: 'closed', closure, closed_at: new Date().toISOString() };
    replaceEntry(ctx, updated, release);
    return updated;
  });
}

function main() {
  const opts = args(process.argv);
  const invocationRoot = process.cwd();
  // projectId and writerLog resolve System2 from cwd. A connected project may
  // itself contain a legacy config/system.example.json; keep the writer rooted
  // in this script's System2 checkout even when invoked from that project.
  process.chdir(path.resolve(__dirname, '..', '..'));
  const ctx = context(opts.project_root || invocationRoot);
  let result;
  if (opts.command === 'capture') result = capture(ctx, opts);
  else if (opts.command === 'pending') result = list(ctx).filter(item => item.state === 'pending');
  else if (opts.command === 'mark') result = mark(ctx, opts.id);
  else if (opts.command === 'close') result = close(ctx, opts.id, opts);
  else throw new Error('usage: decision-journal.js capture|pending|mark|close --project-root <root> ...');
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`ERROR: ${error.message}\n`); process.exitCode = 1; }
}

module.exports = { context, capture, list, mark, close };
