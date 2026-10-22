'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fixture, proposal, memoryFile, mod } = require('./helpers');
const writer = mod('writer');
const log = mod('writer-log');
const indexer = mod('indexer');
const indexLog = mod('indexer-log');

async function indexed() {
  const original = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ status: 'ok' }) });
  try { await indexer.run({ reindexUrl: 'http://fixture.invalid' }); }
  finally { global.fetch = original; }
}

test('C01: recovered enqueue and index success survive an identical writer retry', async () => {
  const root = fixture('core-index-retry');
  const blocked = path.join(root, '.local/indexer');
  fs.mkdirSync(path.dirname(blocked), { recursive: true });
  fs.writeFileSync(blocked, 'blocked');
  writer.writeProposal('core-retry', proposal('CORE_RETRY'));
  assert.ok(log.get('core-retry').index_error);
  fs.unlinkSync(blocked);
  indexer.reconcile();
  await indexed();
  assert.equal(log.get('core-retry').indexed, true);
  const before = fs.readFileSync(memoryFile(root), 'utf8');
  const tasks = indexer.status();
  assert.equal(writer.writeProposal('core-retry', proposal('CORE_RETRY')).idempotent, true);
  assert.equal(log.get('core-retry').indexed, true);
  assert.equal(log.get('core-retry').index_error, null);
  assert.equal(fs.readFileSync(memoryFile(root), 'utf8'), before);
  assert.deepEqual(indexer.status(), tasks);
});

test('C01: an already matching true aggregate still clears a stale index_error', async () => {
  fixture('core-index-stale-error');
  writer.writeProposal('core-error', proposal('CORE_ERROR'));
  await indexed();
  log.append({ ...log.get('core-error'), index_error: 'old enqueue failure' });
  indexer.refreshEvent('core-error', mod('resolve-paths').resolvePaths());
  assert.equal(log.get('core-error').indexed, true);
  assert.equal(log.get('core-error').index_error, null);
});

test('C01: refresh append failure remains visible on writer retry and never confirms success', async () => {
  fixture('core-index-refresh-error');
  writer.writeProposal('core-fail', proposal('CORE_FAIL'));
  const task = indexer.status()[0];
  indexLog.append({ ...task, status: 'indexed' });
  const append = log.append;
  log.append = record => {
    if (record.indexed) throw new Error('synthetic aggregate append failure');
    return append(record);
  };
  try {
    const result = writer.writeProposal('core-fail', proposal('CORE_FAIL'));
    assert.equal(result.status, 'persisted');
    assert.match(result.index_error || '', /synthetic aggregate append failure/);
    assert.equal(log.get('core-fail').indexed, false);
    assert.match(log.get('core-fail').index_error, /synthetic aggregate append failure/);
  } finally { log.append = append; }
  writer.writeProposal('core-fail', proposal('CORE_FAIL'));
  assert.equal(log.get('core-fail').indexed, true);
  assert.equal(log.get('core-fail').index_error, null);
});

test('C01: a pending or missing task keeps persisted without erasing active diagnostics', async () => {
  const root = fixture('core-index-pending');
  writer.writeProposal('core-pending', proposal('CORE_PENDING'));
  log.append({ ...log.get('core-pending'), index_error: 'active diagnostic' });
  indexer.refreshEvent('core-pending', mod('resolve-paths').resolvePaths());
  assert.equal(log.get('core-pending').index_error, 'active diagnostic');
  await indexed();
  fs.appendFileSync(memoryFile(root), '\nchanged revision\n');
  indexer.refreshEvent('core-pending', mod('resolve-paths').resolvePaths());
  assert.equal(log.get('core-pending').indexed, false);
  assert.equal(log.get('core-pending').status, 'persisted');
});
