'use strict';

// L04-04 (F-04-1) регрессия: повторная доставка уже сохранённого события не может
// завершиться успешно. Writer идемпотентен по event_id + хешу содержимого и на
// другое содержимое отвечает 409; шаг write ронял run, flow-response не рождался,
// платформа отдавала отправителю 408, и очередь повторяла: 5 живых прогонов AI на
// одно событие и ложный терминальный failed. Принятое решение — конфликт это
// отдельный коррелированный терминальный статус `conflict`, отличный от
// `persisted`, а не молчаливое подтверждение успеха.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { fixture, mod } = require('./helpers');

const { deliverEvent } = mod('deliver');
const { createEvent } = mod('events');
const { DurableQueue } = mod('queue');

function reply(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(body);
}

async function stand(handler) {
  const server = http.createServer((req, res) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => handler(JSON.parse(body || '{}'), res));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}/sync`,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

async function withEndpoint(webhook, run) {
  const previous = process.env.MEMORY_DELIVERY_ENDPOINT;
  process.env.MEMORY_DELIVERY_ENDPOINT = webhook.url;
  try { return await run(); } finally {
    if (previous === undefined) delete process.env.MEMORY_DELIVERY_ENDPOINT;
    else process.env.MEMORY_DELIVERY_ENDPOINT = previous;
  }
}

test('L04-04: a correlated conflict is terminal, not another retry', async () => {
  fixture('l04-04-conflict-deliver');
  const webhook = await stand((payload, res) => reply(res, 200, JSON.stringify({
    event_id: payload.event_id, status: 'conflict',
  })));
  try {
    const event = createEvent({ kind: 'commit', project_id: 'A', sha: 'c0000001', summary: 'lost ack' });
    const result = await deliverEvent(event, { endpoint: webhook.url });
    assert.equal(result.ok, true);
    assert.equal(result.outcome, 'conflict');
  } finally { await webhook.close(); }
});

test('L04-04: an unknown correlated status stays retryable', async () => {
  fixture('l04-04-unknown-status');
  const webhook = await stand((payload, res) => reply(res, 200, JSON.stringify({
    event_id: payload.event_id, status: 'unknown',
  })));
  try {
    const event = createEvent({ kind: 'commit', project_id: 'A', sha: 'c0000002', summary: 'unclassified' });
    const result = await deliverEvent(event, { endpoint: webhook.url });
    assert.equal(result.ok, false);
    assert.equal(result.retryable, true);
  } finally { await webhook.close(); }
});

test('L04-04: the queue records the conflict outcome and stops retrying', async () => {
  const root = fixture('l04-04-conflict-queue');
  let calls = 0;
  const webhook = await stand((payload, res) => {
    calls += 1;
    return reply(res, 200, JSON.stringify({ event_id: payload.event_id, status: 'conflict' }));
  });
  try {
    await withEndpoint(webhook, async () => {
      const event = createEvent({ kind: 'commit', project_id: 'A', sha: 'c0000003', summary: 'replay after lost ack' });
      const queue = new DurableQueue({
        dir: path.join(root, '.local/queue'), retriesMax: 5, backoffMs: 1, leaseMs: 60000,
      });
      queue.enqueue(event);
      const records = await queue.process(deliverEvent);
      const record = records.find(item => item.event.event_id === event.event_id);
      assert.equal(record.status, 'delivered');
      assert.equal(record.outcome, 'conflict', 'the outcome must stay visible in the queue');
      assert.equal(record.attempts, 0, 'the conflict was confirmed on the first attempt');
      assert.equal(calls, 1);

      await new Promise(resolve => setTimeout(resolve, 20));
      const again = await queue.process(deliverEvent);
      assert.equal(calls, 1, 'a delivered conflict is not redelivered');
      assert.equal(again.find(item => item.event.event_id === event.event_id).status, 'delivered');
    });
  } finally { await webhook.close(); }
});
