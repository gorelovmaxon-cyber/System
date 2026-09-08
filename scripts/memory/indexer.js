#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { resolvePaths } = require('./resolve-paths');
const indexerLog = require('./indexer-log');
const writerLog = require('./writer-log');

function configFor(paths) {
  const example = JSON.parse(fs.readFileSync(path.join(paths.system_root, 'config/system.example.json'), 'utf8'));
  const local = fs.existsSync(paths.localConfig) ? JSON.parse(fs.readFileSync(paths.localConfig, 'utf8')) : {};
  return { ...example, ...local, indexer: { ...(example.indexer || {}), ...(local.indexer || {}) } };
}

function normalizeFile(file, paths) {
  const candidate = path.isAbsolute(file) ? file : path.resolve(paths.system_root, file);
  const root = path.resolve(paths.memory_root);
  if (candidate !== root && !candidate.startsWith(root + path.sep)) throw new Error('indexer file escapes memory root');
  return candidate;
}

function taskId(eventId, file) {
  return 'idx_' + crypto.createHash('sha256').update(String(eventId) + '|' + file).digest('hex').slice(0, 16);
}

function queueIndex(eventId, files, options = {}) {
  const paths = options.paths || resolvePaths();
  const list = Array.isArray(files) ? files : [files];
  const queued = [];
  const current = indexerLog.records();
  for (const file of list) {
    const normalized = normalizeFile(file, paths);
    const id = taskId(eventId, normalized);
    const existing = current.get(id);
    if (existing) { queued.push(existing); continue; }
    const record = { task_id: id, event_id: String(eventId), file: path.relative(paths.system_root, normalized).replaceAll(path.sep, '/'), status: 'pending', attempts: existing?.attempts || 0 };
    indexerLog.append(record);
    queued.push(record);
  }
  return queued;
}

async function reindex(task, config, paths, options = {}) {
  const url = options.reindexUrl || process.env.KHOJ_REINDEX_URL || config.indexer?.reindex_url;
  if (!url || String(url).includes('<')) throw Object.assign(new Error('Khoj reindex mechanism is not configured'), { code: 'not-configured' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.indexer?.timeout_ms || 5000);
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ file: task.file, root: paths.memory_root }), signal: controller.signal });
    if (!response.ok) throw Object.assign(new Error('Khoj reindex HTTP ' + response.status), { status: response.status });
  } finally { clearTimeout(timer); }
}

async function run(options = {}) {
  const paths = options.paths || resolvePaths();
  const config = options.config || configFor(paths);
  const maxRetries = config.indexer?.retries_max ?? 5;
  const current = indexerLog.records();
  const tasks = [...current.values()].filter(item => item.status === 'pending' || (item.status === 'failed' && item.attempts < maxRetries));
  const results = [];
  for (const task of tasks) {
    const attempt = task.attempts + 1;
    indexerLog.append({ ...task, status: 'in-flight', attempts: attempt });
    try {
      await reindex(task, config, paths, options);
      indexerLog.append({ ...task, status: 'indexed', attempts: attempt });
      const writer = writerLog.get(task.event_id);
      if (writer) writerLog.append({ ...writer, indexed: true });
      results.push({ task_id: task.task_id, status: 'indexed' });
    } catch (error) {
      indexerLog.append({ ...task, status: 'failed', attempts: attempt, reason: error.message });
      results.push({ task_id: task.task_id, status: 'failed', reason: error.message });
    }
  }
  return results;
}

function status() {
  return [...indexerLog.records().values()];
}

function requeueFailed() {
  const tasks = status().filter(item => item.status === 'failed');
  for (const task of tasks) indexerLog.append({ ...task, status: 'pending' });
  return tasks.length;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--file') args.file = argv[++i];
    else if (argv[i] === '--event-id') args.eventId = argv[++i];
    else if (argv[i] === '--run') args.run = true;
    else if (argv[i] === '--status') args.status = true;
    else if (argv[i] === '--requeue-failed') args.requeue = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.file) process.stdout.write(JSON.stringify({ queued: queueIndex(args.eventId || 'manual', [args.file]) }) + '\n');
  else if (args.requeue) process.stdout.write(JSON.stringify({ requeued: requeueFailed() }) + '\n');
  else if (args.status) process.stdout.write(JSON.stringify({ tasks: status() }, null, 2) + '\n');
  else if (args.run) process.stdout.write(JSON.stringify({ results: await run() }, null, 2) + '\n');
  else throw new Error('use --file, --run, --status or --requeue-failed');
}

if (require.main === module) main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });

module.exports = { queueIndex, run, status, requeueFailed, normalizeFile, taskId };
