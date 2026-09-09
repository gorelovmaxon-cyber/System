'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { fixture, proposal, memoryFile, mod } = require('./helpers');

const writer = mod('writer');

const HOLDER = path.join(__dirname, 'fix-02-holder.cjs');

function lockFile(root) {
  return path.join(root, '.local', 'writer', 'memory.lock');
}

function writeLockFile(root, owner) {
  const file = lockFile(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(owner) + '\n', 'utf8');
}

async function waitFor(predicate, timeoutMs = 5000, intervalMs = 25) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error('waitFor timed out');
}

test('F03: empty lock (crash right after wx) does not block a new write', () => {
  const root = fixture('fix03-empty');
  writeLockFile(root, '');
  // RED on original: writeProposal throws 'writer lock timeout'
  const result = writer.writeProposal('evt_ok', [proposal('LOCK_OK')]);
  assert.equal(result.status, 'persisted');
  assert.match(fs.readFileSync(memoryFile(root), 'utf8'), /## LOCK_OK/);
});

test('F03: lock owned by a dead pid is recovered', () => {
  const root = fixture('fix03-dead');
  const gone = spawnSync(process.execPath, ['-e', ''], { encoding: 'utf8' });
  writeLockFile(root, { pid: gone.pid, hostname: os.hostname(), created: new Date().toISOString(), nonce: 'dead-nonce' });
  // RED on original: writeProposal throws 'writer lock timeout'
  const result = writer.writeProposal('evt_ok2', [proposal('LOCK_OK2')]);
  assert.equal(result.status, 'persisted');
  assert.match(fs.readFileSync(memoryFile(root), 'utf8'), /## LOCK_OK2/);
});

test('F03: lock with unparseable owner content is recovered', () => {
  const root = fixture('fix03-garbage');
  writeLockFile(root, 'not-json-at-all');
  const result = writer.writeProposal('evt_ok3', [proposal('LOCK_OK3')]);
  assert.equal(result.status, 'persisted');
  assert.match(fs.readFileSync(memoryFile(root), 'utf8'), /## LOCK_OK3/);
});

test('F03: live lock is not stolen; write times out; after holder exit write succeeds', async () => {
  const root = fixture('fix03-live');
  const child = spawn(process.execPath, [HOLDER, 'hold', '4000'], { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  let childErr = '';
  child.stderr.on('data', d => { childErr += d; });

  // дождаться, пока держатель реально записал владельца в lock-файл
  await waitFor(() => {
    try {
      const raw = fs.readFileSync(lockFile(root), 'utf8');
      const owner = JSON.parse(raw);
      return Number.isInteger(owner.pid) && owner.pid === child.pid;
    } catch {
      return false;
    }
  });

  // живой владелец: запись должна упереться в таймаут, а не снять чужую блокировку
  const b = spawnSync(process.execPath, [HOLDER, 'write'], { env: process.env, encoding: 'utf8', timeout: 8000 });
  assert.match(b.stderr, /writer lock timeout/);

  // после штатного выхода держателя запись проходит
  await new Promise(resolve => child.on('exit', resolve));
  const b2 = spawnSync(process.execPath, [HOLDER, 'write'], { env: process.env, encoding: 'utf8', timeout: 8000 });
  assert.equal(b2.status, 0, 'holder write after release must succeed: ' + b2.stderr);
  assert.match(b2.stdout, /"status":"persisted"/);
  assert.equal(childErr, '');
});
