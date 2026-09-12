#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolvePaths } = require('./resolve-paths');
const { validateEvent } = require('./events');
const crypto = require('node:crypto');
const { appendJsonl, readJsonl, transactJsonl } = require('./jsonl');

function queueConfig() {
  const paths = resolvePaths();
  return {
    dir: path.join(paths.data_dir, 'queue'),
    retries_max: paths.config.queue?.retries_max ?? 5,
    backoff_ms: paths.config.queue?.backoff_ms ?? 1000,
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
    this.leaseMs = options.leaseMs ?? 60000;
    fs.mkdirSync(this.dir, { recursive: true });
  }

  append(record) {
    fs.mkdirSync(this.dir, { recursive: true });
    appendJsonl(this.file, record);
  }

  records() {
    if (!fs.existsSync(this.file)) return new Map();
    const current = new Map();
    for (const record of readJsonl(this.file)) {
      current.set(record.event.event_id, record);
    }
    return current;
  }

  restoreInflight() {
    const now = Date.now();
    transactJsonl(this.file, records => {
      const current = collapse(records);
      const append = [...current.values()]
        .filter(record => record.status === 'in-flight' && (!record.lease_expires_at || Date.parse(record.lease_expires_at) <= now))
        .map(record => ({ ...record, status: 'pending', lease_id: null, lease_expires_at: null, updated_at: new Date().toISOString() }));
      return { append };
    });
  }

  enqueue(event) {
    validateEvent(event);
    return transactJsonl(this.file, records => {
      const existing = collapse(records).get(event.event_id);
      if (existing && eventContent(existing.event) !== eventContent(event)) {
        throw new Error('event_id already exists with different content');
      }
      if (existing) return { value: existing };
      const now = new Date().toISOString();
      const record = { event, status: 'pending', attempts: 0, created_at: now, updated_at: now };
      return { append: [record], value: record };
    });
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

  claim(eventId, options = {}) {
    return transactJsonl(this.file, records => {
      // Момент захвата берётся внутри транзакции: аренда, посчитанная от начала
      // прохода, к моменту захвата следующего события уже истекла бы, и живая
      // доставка выглядела бы осиротевшей (G03).
      const now = options.now ?? Date.now();
      const record = collapse(records).get(eventId);
      if (!record || !['pending', 'failed'].includes(record.status)) return { value: null };
      if (record.status === 'failed' && !options.redeliver) return { value: null };
      if (record.next_attempt_at && Date.parse(record.next_attempt_at) > now && !options.redeliver) return { value: null };
      const leaseId = crypto.randomBytes(12).toString('hex');
      const claimed = {
        ...record,
        status: 'in-flight',
        lease_id: leaseId,
        lease_expires_at: new Date(now + this.leaseMs).toISOString(),
        updated_at: new Date(now).toISOString(),
      };
      return { append: [claimed], value: claimed };
    });
  }

  // Продление аренды ограничено самой доставкой: оно идёт только пока владелец
  // держит совпадающий lease_id, и прекращается вместе с доставкой. Позднее
  // продление потерявшего аренду поколения ничего не перезаписывает (CAS).
  renew(claimed) {
    return transactJsonl(this.file, records => {
      const current = collapse(records).get(claimed.event.event_id);
      if (!current || current.status !== 'in-flight' || current.lease_id !== claimed.lease_id) return { value: false };
      const now = Date.now();
      return {
        append: [{ ...current, lease_expires_at: new Date(now + this.leaseMs).toISOString(), updated_at: new Date(now).toISOString() }],
        value: true,
      };
    });
  }

  startRenewal(claimed) {
    const period = Math.max(Math.floor(this.leaseMs / 3), 10);
    const timer = setInterval(() => {
      try { if (!this.renew(claimed)) clearInterval(timer); } catch { clearInterval(timer); }
    }, period);
    return { stop: () => clearInterval(timer) };
  }

  finish(claimed, fields) {
    return transactJsonl(this.file, records => {
      const current = collapse(records).get(claimed.event.event_id);
      if (!current || current.status !== 'in-flight' || current.lease_id !== claimed.lease_id) return { value: current };
      const next = { ...current, ...fields, lease_id: null, lease_expires_at: null, updated_at: new Date().toISOString() };
      return { append: [next], value: next };
    });
  }

  async process(deliver, options = {}) {
    this.restoreInflight();
    const limit = options.limit ?? Infinity;
    let processed = 0;
    for (const record of this.list()) {
      if (processed >= limit) break;
      // Отбор здесь только по статусу: решение о времени принимает claim, иначе
      // просроченная аренда считалась бы от начала прохода (G03).
      if (!['pending', 'failed'].includes(record.status)) continue;
      if (record.status === 'failed' && !options.redeliver) continue;
      const inflight = this.claim(record.event.event_id, { redeliver: options.redeliver });
      if (!inflight) continue;
      const renewal = this.startRenewal(inflight);
      try {
        const result = await deliver(inflight.event);
        if (!result || result.ok !== true) {
          const error = new Error(result?.error || 'delivery failed');
          error.retryable = result?.retryable !== false;
          throw error;
        }
        this.finish(inflight, { status: 'delivered', delivered_at: new Date().toISOString() });
      } catch (error) {
        const attempts = (inflight.attempts || 0) + 1;
        const terminal = attempts >= this.retriesMax || error.retryable === false;
        // Отсчёт повтора идёт от времени результата, а не от начала прохода.
        const failedAt = Date.now();
        this.finish(inflight, {
          status: terminal ? 'failed' : 'pending',
          attempts,
          last_error: String(error.message || error),
          next_attempt_at: terminal ? null : new Date(failedAt + this.backoffMs * (2 ** (attempts - 1))).toISOString(),
        });
      } finally {
        renewal.stop();
      }
      processed += 1;
    }
    return this.list();
  }

  async redeliver(mode = 'failed', deliver) {
    const allowed = mode === 'all' ? ['pending', 'failed'] : [mode];
    transactJsonl(this.file, records => ({ append: [...collapse(records).values()]
      .filter(record => allowed.includes(record.status))
      .map(record => ({ ...record, status: 'pending', next_attempt_at: null, updated_at: new Date().toISOString() })) }));
    return this.process(deliver, { redeliver: true });
  }
}

function collapse(records) {
  const current = new Map();
  for (const record of records) current.set(record.event.event_id, record);
  return current;
}

function eventContent(event) {
  const { timestamp, ...stable } = event;
  return JSON.stringify(stable);
}

module.exports = { DurableQueue, queueConfig };
