'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture, mod } = require('./helpers');

const { createEvent } = mod('events');
const { deliverEvent } = mod('deliver');

async function response(status, body) {
  return { ok: status >= 200 && status < 300, status, text: async () => body };
}

test('FIX-09: generic webhook 2xx is not a persistence acknowledgement', async () => {
  fixture('fix09-accepted');
  const event = createEvent({ kind: 'commit', project_id: 'A', sha: 'abcdef6', summary: 'delivery' });
  const original = global.fetch;
  global.fetch = async () => response(200, JSON.stringify({ accepted: true }));
  try {
    const result = await deliverEvent(event, { endpoint: 'http://fixture/sync' });
    assert.equal(result.ok, false);
    assert.equal(result.retryable, true);
    assert.match(result.error, /without correlated terminal confirmation/);
  } finally { global.fetch = original; }
});

test('FIX-09: only correlated persisted or no-pattern responses acknowledge delivery', async () => {
  fixture('fix09-terminal');
  const event = createEvent({ kind: 'commit', project_id: 'A', sha: 'abcdef7', summary: 'delivery' });
  const original = global.fetch;
  try {
    for (const status of ['persisted', 'no-pattern']) {
      global.fetch = async () => response(200, JSON.stringify({ event_id: event.event_id, status }));
      const result = await deliverEvent(event, { endpoint: 'http://fixture/sync' });
      assert.equal(result.ok, true);
      assert.equal(result.outcome, status);
    }
    global.fetch = async () => response(200, JSON.stringify({ event_id: 'evt_other', status: 'persisted' }));
    assert.equal((await deliverEvent(event, { endpoint: 'http://fixture/sync' })).ok, false);
  } finally { global.fetch = original; }
});

test('doctor boundary: bridge health is not ready without a configured token', async () => {
  fixture('fix09-bridge-ready');
  const bridge = mod('bridge-server').server({ token: '' });
  await new Promise(resolve => bridge.listen(0, '127.0.0.1', resolve));
  try {
    const address = bridge.address();
    const result = await fetch(`http://127.0.0.1:${address.port}/health`);
    assert.equal(result.status, 503);
    assert.equal((await result.json()).status, 'not-ready');
  } finally {
    await new Promise(resolve => bridge.close(resolve));
  }
});
