'use strict';

// L04-00 регрессия: таймаут отправителя против таймаута синхронного webhook.
// Воспроизведение: run падает — Activepieces отдаёт 408 без тела, очередь
// объявляла событие окончательно failed с первой попытки; run успешен, но
// длиннее таймаута отправителя — подтверждение не доходило никогда, очередь
// оставалась failed, хотя запись в памяти уже была, а каждый повтор порождал
// ещё один параллельный run.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { fixture, mod } = require('./helpers');

const { deliverEvent, DEFAULT_TIMEOUT_MS } = mod('deliver');
const { createEvent } = mod('events');
const { DurableQueue } = mod('queue');

function configure(root, patch) {
  const file = path.join(root, 'config', 'system.example.json');
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, JSON.stringify({ ...config, ...patch }));
}

async function stand(handler) {
  const diagnostics = { requests: 0, clientErrors: [] };
  const server = http.createServer((req, res) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      diagnostics.requests += 1;
      handler(JSON.parse(body || '{}'), res);
    });
  });
  server.on('clientError', (error, socket) => {
    diagnostics.clientErrors.push(error.code || error.message);
    socket.destroy();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}/sync`,
    diagnostics,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

function reply(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(body);
}

test('L04-00: HTTP 408 from the synchronous webhook is retryable, not terminal', async () => {
  fixture('l04-00-408');
  const webhook = await stand((event, res) => reply(res, 408, ''));
  try {
    const event = createEvent({ kind: 'commit', project_id: 'A', sha: 'aaaaaaa1', summary: 'ap timeout' });
    const result = await deliverEvent(event, { endpoint: webhook.url });
    assert.equal(result.ok, false);
    assert.equal(result.retryable, true);
    assert.match(result.error, /HTTP 408/);
  } finally { await webhook.close(); }
});

test('L04-00: a 408 keeps the event retryable in the durable queue instead of failing it', async () => {
  const root = fixture('l04-00-queue-408');
  const webhook = await stand((event, res) => reply(res, 408, ''));
  const previous = process.env.MEMORY_DELIVERY_ENDPOINT;
  process.env.MEMORY_DELIVERY_ENDPOINT = webhook.url;
  try {
    const event = createEvent({ kind: 'commit', project_id: 'A', sha: 'aaaaaaa2', summary: 'queue retry on 408' });
    const queue = new DurableQueue({ dir: path.join(root, '.local/queue'), retriesMax: 3, backoffMs: 1, leaseMs: 60000 });
    queue.enqueue(event);
    const records = await queue.process(deliverEvent);
    const record = records.find(item => item.event.event_id === event.event_id);
    assert.equal(record.status, 'pending');
    assert.equal(record.attempts, 1);
    assert.ok(record.next_attempt_at, 'a retry must be scheduled');
    assert.match(record.last_error, /HTTP 408/, JSON.stringify({ record, server: webhook.diagnostics }));
  } finally {
    if (previous === undefined) delete process.env.MEMORY_DELIVERY_ENDPOINT;
    else process.env.MEMORY_DELIVERY_ENDPOINT = previous;
    await webhook.close();
  }
});

test('transport failure preserves its cause in the durable queue and does not retry inside deliver', async () => {
  const root = fixture('l04-00-transport-cause');
  const previousFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    const cause = Object.assign(new Error('synthetic socket closure'), { code: 'ECONNRESET' });
    throw new TypeError('fetch failed', { cause });
  };
  try {
    const event = createEvent({ kind: 'commit', project_id: 'A', sha: 'abc12345', summary: 'transport diagnostic' });
    const queue = new DurableQueue({ dir: path.join(root, '.local/queue'), retriesMax: 3, backoffMs: 1 });
    queue.enqueue(event);
    const records = await queue.process(item => deliverEvent(item, { endpoint: 'http://fixture.invalid/sync' }));
    const record = records.find(item => item.event.event_id === event.event_id);
    assert.equal(record.status, 'pending');
    assert.equal(record.attempts, 1);
    assert.match(record.last_error, /fetch failed.*ECONNRESET/);
    assert.equal(calls, 1, 'no hidden automatic delivery retry');
  } finally {
    global.fetch = previousFetch;
  }
});

test('L04-00: a 408 is retried until the flow answers with a correlated terminal status', async () => {
  const root = fixture('l04-00-408-then-persisted');
  let calls = 0;
  let event;
  const webhook = await stand((payload, res) => {
    calls += 1;
    if (calls === 1) return reply(res, 408, '');
    return reply(res, 200, JSON.stringify({ event_id: payload.event_id, status: 'persisted' }));
  });
  const previous = process.env.MEMORY_DELIVERY_ENDPOINT;
  process.env.MEMORY_DELIVERY_ENDPOINT = webhook.url;
  try {
    event = createEvent({ kind: 'commit', project_id: 'A', sha: 'aaaaaaa3', summary: 'recovery after 408' });
    const queue = new DurableQueue({ dir: path.join(root, '.local/queue'), retriesMax: 3, backoffMs: 1, leaseMs: 60000 });
    queue.enqueue(event);
    await queue.process(deliverEvent);
    await new Promise(resolve => setTimeout(resolve, 20));
    const records = await queue.process(deliverEvent);
    const record = records.find(item => item.event.event_id === event.event_id);
    assert.equal(calls, 2);
    assert.equal(record.status, 'delivered');
    assert.equal(record.attempts, 1, 'the failed attempt stays counted, the successful one does not');
  } finally {
    if (previous === undefined) delete process.env.MEMORY_DELIVERY_ENDPOINT;
    else process.env.MEMORY_DELIVERY_ENDPOINT = previous;
    await webhook.close();
  }
});

test('L04-00: a non-timeout 4xx stays terminal', async () => {
  fixture('l04-00-401');
  const webhook = await stand((event, res) => reply(res, 401, JSON.stringify({ error: 'unauthorized' })));
  try {
    const event = createEvent({ kind: 'commit', project_id: 'A', sha: 'aaaaaaa4', summary: 'unauthorized' });
    const result = await deliverEvent(event, { endpoint: webhook.url });
    assert.equal(result.ok, false);
    assert.equal(result.retryable, false);
  } finally { await webhook.close(); }
});

test('L04-00: the sender waits the configured delivery timeout instead of a fixed short one', async () => {
  const root = fixture('l04-00-config-timeout');
  const event = createEvent({ kind: 'commit', project_id: 'A', sha: 'aaaaaaa5', summary: 'slow run' });
  // Стенд отвечает корреляцией позже старого фиксированного таймаута (5 с),
  // но внутри поставляемого значения: так проверяется, что отправитель ждёт
  // детерминированный ответ платформы, а не обрывает длинный успешный run.
  const webhook = await stand((payload, res) => {
    setTimeout(() => reply(res, 200, JSON.stringify({ event_id: payload.event_id, status: 'persisted' })), 300);
  });
  try {
    configure(root, { delivery: { timeout_ms: 100 } });
    const aborted = await deliverEvent(event, { endpoint: webhook.url });
    assert.equal(aborted.ok, false);
    assert.equal(aborted.retryable, true);
    assert.equal(aborted.error, 'request timeout');

    configure(root, { delivery: { timeout_ms: 3000 } });
    const delivered = await deliverEvent(event, { endpoint: webhook.url });
    assert.equal(delivered.ok, true);
    assert.equal(delivered.outcome, 'persisted');

    const explicit = await deliverEvent(event, { endpoint: webhook.url, timeout_ms: 100 });
    assert.equal(explicit.error, 'request timeout');
  } finally { await webhook.close(); }
});

test('L04-00: the shipped default sender timeout outlasts the platform sync timeout', () => {
  assert.ok(
    DEFAULT_TIMEOUT_MS > 30000,
    `default sender timeout ${DEFAULT_TIMEOUT_MS} ms must exceed Activepieces WEBHOOK_TIMEOUT_SECONDS (30 s)`,
  );
});
