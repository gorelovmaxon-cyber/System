'use strict';

// Аварийные регрессии U1 (независимая проверка 2026-09-11, FIX-02): право входа
// при независимой смерти keeper'а и writer'а, пауза живого владельца, отказ
// запуска keeper'а и штатный release. Только TEMP-ресурсы, настоящая память не
// затрагивается.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { mod } = require('./helpers');

const ipcLock = mod('ipc-lock');
const FIXTURE = path.join(__dirname, 'fix-02-keeper.cjs');

function root(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 's2-' + name + '-'));
}

function pidAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { return error.code !== 'ESRCH'; }
}

async function waitFor(predicate, timeoutMs = 15000, intervalMs = 20) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error('waitFor timed out');
}

function runFixture(mode, ...args) {
  return spawnSync(process.execPath, [FIXTURE, mode, ...args], { env: process.env, encoding: 'utf8', timeout: 60000 });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function startHolder(resource, dir) {
  const child = spawn(process.execPath, [FIXTURE, 'hold', resource, dir], { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  let err = '';
  child.stderr.on('data', data => { err += data; });
  const done = new Promise(resolve => child.on('close', code => resolve({ code, err })));
  return { child, done, stderr: () => err };
}

test('U1: a killed keeper does not admit a second owner while the writer lives', async () => {
  const dir = root('u1-keeper-death');
  const resource = path.join(dir, 'memory-lock');
  const metadataFile = resource + '.lock';
  const holder = startHolder(resource, dir);
  try {
    await waitFor(() => fs.existsSync(path.join(dir, 'held.json')));
    const held = readJson(path.join(dir, 'held.json'));
    assert.equal(held.pid, holder.child.pid);
    assert.equal(pidAlive(held.pid), true, 'owner must be alive');
    assert.ok(Number.isInteger(held.keeperPid), 'fixture must observe the keeper');

    process.kill(held.keeperPid);
    await waitFor(() => !pidAlive(held.keeperPid));

    // Право входа должно быть закрыто именно владением, а не занятым endpoint:
    // проверяем, что OS-endpoint ресурса в этот момент свободен.
    const probe = runFixture('probe-endpoint', resource, dir);
    assert.equal(probe.status, 0, probe.stderr);
    assert.equal(readJson(path.join(dir, 'endpoint.json')).status, 'acquired', 'endpoint must be free after the keeper died');

    // RED до правки: второй процесс получал право входа при живом владельце.
    const second = runFixture('try', resource, dir, '10');
    assert.notEqual(second.status, 0, 'a second owner must not be admitted: ' + second.stdout);
    assert.equal(second.stdout.includes('ACQUIRED'), false);
    assert.match(second.stderr, /REFUSED:live-owner/);
    assert.equal(readJson(metadataFile).pid, held.pid, 'the live owner keeps the ownership record');
    assert.equal(pidAlive(held.pid), true, 'the first owner is still alive and has not released');

    // Владелец не продолжает работу по утраченному праву входа: путь записи
    // проверяет authority и падает fail-closed, а не пишет.
    fs.writeFileSync(path.join(dir, 'probe-assert'), '1');
    await waitFor(() => fs.existsSync(path.join(dir, 'assert-result.json')));
    const assertion = readJson(path.join(dir, 'assert-result.json'));
    assert.equal(assertion.ok, false);
    assert.equal(assertion.code, 'LOCK_AUTHORITY_LOST');

    // Штатный release живого владельца освобождает ресурс для следующего.
    fs.writeFileSync(path.join(dir, 'stop'), '1');
    const exited = await holder.done;
    assert.equal(exited.code, 0, exited.err);
    assert.equal(fs.existsSync(metadataFile), false, 'release removes the ownership record');
    const third = runFixture('try', resource, dir, '10');
    assert.equal(third.status, 0, third.stderr);
    assert.match(third.stdout, /ACQUIRED/);
  } finally {
    fs.writeFileSync(path.join(dir, 'stop'), '1');
    holder.child.kill();
    await holder.done;
  }
});

test('U1: a paused live owner keeps authority for the whole critical section', async () => {
  const dir = root('u1-paused-owner');
  const resource = path.join(dir, 'memory-lock');
  const holder = startHolder(resource, dir);
  try {
    await waitFor(() => fs.existsSync(path.join(dir, 'held.json')));
    const held = readJson(path.join(dir, 'held.json'));
    // Владелец приостановлен внутри критической секции: жив, не выполняется,
    // release не вызван. Планировщик может остановить writer в любой точке.
    const before = readJson(resource + '.lock');
    const second = runFixture('try', resource, dir, '10');
    assert.notEqual(second.status, 0, 'a paused owner must not be displaced: ' + second.stdout);
    assert.equal(second.stdout.includes('ACQUIRED'), false);
    assert.match(second.stderr, /REFUSED:(live-owner|busy)/);
    assert.equal(readJson(resource + '.lock').nonce, before.nonce, 'the ownership record is untouched');
    assert.equal(pidAlive(held.pid), true);

    fs.writeFileSync(path.join(dir, 'stop'), '1');
    const exited = await holder.done;
    assert.equal(exited.code, 0, exited.err);
    const third = runFixture('try', resource, dir, '10');
    assert.equal(third.status, 0, third.stderr);
    assert.match(third.stdout, /ACQUIRED/);
  } finally {
    fs.writeFileSync(path.join(dir, 'stop'), '1');
    holder.child.kill();
    await holder.done;
  }
});

test('U1: the death of the writer releases authority for the next owner', async () => {
  const dir = root('u1-writer-death');
  const resource = path.join(dir, 'memory-lock');
  const metadataFile = resource + '.lock';
  const holder = startHolder(resource, dir);
  await waitFor(() => fs.existsSync(path.join(dir, 'held.json')));
  const held = readJson(path.join(dir, 'held.json'));
  assert.equal(pidAlive(held.pid), true);

  // Независимая смерть владельца: keeper замечает её и освобождает endpoint.
  holder.child.kill();
  await holder.done;
  await waitFor(() => !pidAlive(held.pid));
  assert.equal(readJson(metadataFile).pid, held.pid, 'the stale record survives the owner');

  const next = runFixture('try', resource, dir, '20');
  assert.equal(next.status, 0, next.stderr);
  assert.match(next.stdout, /ACQUIRED/);
  const owner = readJson(path.join(dir, 'try-owned.json'));
  assert.equal(owner.pid, next.pid, 'the next owner publishes its own generation');
  assert.notEqual(owner.pid, held.pid, 'a new generation takes over the resource');
});

test('U1: a keeper that cannot start fails closed without publishing ownership', () => {
  const dir = root('u1-keeper-fail');
  const resource = path.join(dir, 'memory-lock');
  const metadataFile = resource + '.lock';
  const result = runFixture('keeper-fail', resource, dir);
  assert.equal(result.status, 0, result.stderr);
  const report = readJson(path.join(dir, 'keeper-fail.json'));
  assert.equal(report.threw, true);
  assert.match(report.message, /lock keeper script is missing/);
  assert.equal(report.metadataPublished, false, 'no ownership may be published without an endpoint');
  assert.deepEqual(report.directory, [], 'no keeper or ownership leftovers');

  // Никакого отравленного состояния: обычный захват после отказа проходит.
  const hold = ipcLock.acquireProcessLock(resource, { metadataFile, attempts: 10 });
  assert.equal(readJson(metadataFile).pid, process.pid);
  hold();
  assert.equal(fs.existsSync(metadataFile), false);
});

test('U1: assertHeld rejects a replaced ownership record', () => {
  const dir = root('u1-assert-generation');
  const resource = path.join(dir, 'memory-lock');
  const metadataFile = resource + '.lock';
  const hold = ipcLock.acquireProcessLock(resource, { metadataFile, attempts: 10 });
  try {
    hold.assertHeld();
    fs.writeFileSync(metadataFile, JSON.stringify({ pid: process.pid, nonce: 'other-generation' }) + '\n');
    assert.throws(() => hold.assertHeld(), error => error.code === 'LOCK_AUTHORITY_LOST');
  } finally {
    hold();
  }
});

test('U1: a normal release hands the resource to the next owner', async () => {
  const dir = root('u1-normal-release');
  const resource = path.join(dir, 'memory-lock');
  const metadataFile = resource + '.lock';
  const holder = startHolder(resource, dir);
  await waitFor(() => fs.existsSync(path.join(dir, 'held.json')));
  fs.writeFileSync(path.join(dir, 'stop'), '1');
  const exited = await holder.done;
  assert.equal(exited.code, 0, exited.err);
  assert.ok(fs.existsSync(path.join(dir, 'released.json')), 'the holder completed its release');
  assert.equal(fs.existsSync(metadataFile), false);

  const next = runFixture('try', resource, dir, '10');
  assert.equal(next.status, 0, next.stderr);
  assert.match(next.stdout, /ACQUIRED/);
});
