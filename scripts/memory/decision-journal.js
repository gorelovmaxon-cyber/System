#!/usr/bin/env node
'use strict';

// Project-local inbox for knowledge. Canonical memory is written only by save.js.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { projectId } = require('./project-id');
const writerLog = require('./writer-log');

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

function capture(ctx, opts) {
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
  const id = crypto.createHash('sha256').update(JSON.stringify([ctx.project_id, type, summary.toLowerCase(), supersedes])).digest('hex').slice(0, 24);
  const entry = {
    id, date: new Date().toISOString().slice(0, 10), project_id: ctx.project_id,
    type, summary, source, verification, state: 'pending', supersedes,
    memory_event_id: null, memory_files: [],
  };
  fs.mkdirSync(ctx.dir, { recursive: true });
  try {
    fs.writeFileSync(fileFor(ctx, id), JSON.stringify(entry, null, 2) + '\n', { flag: 'wx' });
    return { created: true, entry };
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const prior = read(ctx, id);
    if (prior.project_id !== ctx.project_id || prior.type !== type || prior.summary !== summary || prior.source !== source || prior.verification !== verification || prior.supersedes !== supersedes) {
      throw new Error('journal id conflict; inspect the existing entry');
    }
    return { created: false, entry: prior };
  }
}

function mark(ctx, id, getRecord = writerLog.get) {
  const entry = read(ctx, id);
  if (entry.project_id !== ctx.project_id) throw new Error('project scope mismatch');
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
  const updated = { ...entry, state: 'persisted', memory_event_id: eventId, memory_files: result.written_files };
  const target = fileFor(ctx, id);
  const temp = `${target}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temp, JSON.stringify(updated, null, 2) + '\n', { flag: 'wx' });
    fs.renameSync(temp, target);
  } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  return updated;
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
  else throw new Error('usage: decision-journal.js capture|pending|mark --project-root <root> ...');
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`ERROR: ${error.message}\n`); process.exitCode = 1; }
}

module.exports = { context, capture, list, mark };
