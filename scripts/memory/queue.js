#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolvePaths } = require('./resolve-paths');

function queueConfig() {
  const paths = resolvePaths();
  const read = file => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const example = read(path.join(paths.system_root, 'config/system.example.json'));
  const local = read(paths.localConfig);
  return {
    dir: path.join(paths.data_dir, 'queue'),
    retries_max: local.queue?.retries_max ?? example.queue?.retries_max ?? 5,
    backoff_ms: local.queue?.backoff_ms ?? example.queue?.backoff_ms ?? 1000,
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class DurableQueue {
  constructor(options = {}) {
    const config = queueConfig();
    this.dir = options.dir || config.dir;
    this.file = path.join(this.dir, 'events.jsonl');
    this.retriesMax = options.retriesMax ?? config.retries_max;
    this.backoffMs = options.backoffMs ?? config.backoff_ms;
    fs.mkdirSync(this.dir, { recursive: true });
    this.restoreInflight();
  }

  append(record) {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.appendFileSync(this.file, JSON.stringify(record) + '\n', 'utf8');
  }

  records() {
    if (!fs.existsSync(this.file)) return new Map();
    const current = new Map();
    for (const line of fs.readFileSync(this.file, 'utf8').split(/\r?\n/)) {
      if (!line.trim()) continue;
      const record = JSON.parse(line);
      current.set(record.event.event_id, record);
    }
    return current;
  }

  restoreInflight() {
    for (const record of this.records().values()) {
      if (record.status === 'in-flight') {
        this.append({ ...record, status: 'pending', updated_at: new Date().toISOString() });
      }
    }
  }

  enqueue(event) {
    const existing = this.records().get(event.event_id);
    if (existing && JSON.stringify(existing.event) !== JSON.stringify(event)) {
      throw new Error('event_id already exists with different content');
    }
    if (existing) return existing;
    const record = {
      event,
      status: 'pending',
      attempts: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.append(record);
    return record;
  }

  list() {
    return [...this.records().values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  statusCounts() {
    return this.list().reduce((counts, item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
      return counts;
    }, {});
  }

  mark(record, fields) {
    const next = { ...record, ...fields, updated_at: new Date().toISOString() };
    this.append(next);
    return next;
  }

  async process(deliver, options = {}) {
    const limit = options.limit ?? Infinity;
    const now = Date.now();
    let processed = 0;
    for (const record of this.list()) {
      if (processed >= limit || !['pending', 'failed'].includes(record.status)) continue;
      if (record.status === 'failed' && !options.redeliver) continue;
      if (record.next_attempt_at && Date.parse(record.next_attempt_at) > now && !options.redeliver) continue;
      const inflight = this.mark(record, { status: 'in-flight' });
      try {
        const result = await deliver(inflight.event);
        if (!result || result.ok !== true) {
          const error = new Error(result?.error || 'delivery failed');
          error.retryable = result?.retryable !== false;
          throw error;
        }
        this.mark(inflight, { status: 'delivered', delivered_at: new Date().toISOString() });
      } catch (error) {
        const attempts = (inflight.attempts || 0) + 1;
        const terminal = attempts >= this.retriesMax || error.retryable === false;
        this.mark(inflight, {
          status: terminal ? 'failed' : 'pending',
          attempts,
          last_error: String(error.message || error),
          next_attempt_at: terminal ? null : new Date(Date.now() + this.backoffMs * (2 ** (attempts - 1))).toISOString(),
        });
      }
      processed += 1;
    }
    return this.list();
  }

  async redeliver(mode = 'failed', deliver) {
    const allowed = mode === 'all' ? ['pending', 'failed'] : [mode];
    for (const record of this.list()) {
      if (allowed.includes(record.status)) this.mark(record, { status: 'pending', next_attempt_at: null });
    }
    return this.process(deliver, { redeliver: true });
  }
}

module.exports = { DurableQueue, queueConfig };
