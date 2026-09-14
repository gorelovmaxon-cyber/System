'use strict';

// L04-04 (F-04-2) регрессия: терминальный failed не даёт `watch --no-revive`
// достичь idle. Измерено в L04-03: окно 120 с заканчивалось `failed` за 32.4 с,
// потому что недоставленным считалось всё, кроме delivered. Hook запускает такой
// watch на каждый commit, поэтому одна failed-запись удерживала владение ~32 с.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { fixture, mod } = require('./helpers');

const { watch } = mod('queue-worker');
const { createEvent } = mod('events');
const { DurableQueue } = mod('queue');

const failing = async () => ({ ok: false, retryable: true, error: 'HTTP 408: {}' });

function durable(name, options) {
  const root = fixture(name);
  return new DurableQueue({
    dir: path.join(root, '.local/queue'), retriesMax: 1, backoffMs: 1, leaseMs: 60000, ...options,
  });
}

async function queueWithTerminalFailure(name, sha) {
  const queue = durable(name);
  queue.enqueue(createEvent({ kind: 'commit', project_id: 'A', sha, summary: 'terminal failure' }));
  await queue.process(failing);
  assert.equal(queue.list()[0].status, 'failed', 'the stand must leave a terminal record');
  return queue;
}

test('L04-04: watch --no-revive reaches idle with a terminal failed record', async () => {
  const queue = await queueWithTerminalFailure('l04-04-watch-idle', 'b0000001');

  const started = Date.now();
  const result = await watch({ queue, deliver: failing, revive: false, maxIdleMs: 5000, lock: false });
  assert.equal(result.status, 'idle');
  assert.equal(result.failed, 1, 'the terminal record stays visible in the report');
  assert.equal(result.revives, 0);
  assert.ok(Date.now() - started < 2000, 'idle must not be deferred by reviveMs');
  assert.equal(queue.list()[0].status, 'failed', 'idle must not revive or redeliver anything');
});

test('L04-04: with revive enabled the same terminal record still holds the watch', async () => {
  const queue = await queueWithTerminalFailure('l04-04-watch-revive', 'b0000002');

  const result = await watch({ queue, deliver: failing, maxIdleMs: 1200, reviveMs: 50, lock: false });
  assert.notEqual(result.status, 'idle', 'reviving mode must stay bounded, not return idle');
  assert.ok(result.revives >= 1, 'the record is revived while revive is enabled');
  assert.equal(result.failed, 1);
});

test('L04-04: --no-revive still waits for a record that is merely not due yet', async () => {
  const queue = durable('l04-04-watch-pending', { retriesMax: 5 });
  queue.enqueue(createEvent({ kind: 'commit', project_id: 'A', sha: 'b0000003', summary: 'backoff pending' }));
  const record = queue.list()[0];
  queue.mark(record, {
    status: 'pending',
    attempts: 1,
    next_attempt_at: new Date(Date.now() + 60000).toISOString(),
  });

  const result = await watch({ queue, deliver: failing, revive: false, maxIdleMs: 50, lock: false });
  assert.equal(result.status, 'deadline', 'an undelivered record is not idle');
  assert.equal(result.failed, 0);
  assert.equal(result.pending, 1);
});
