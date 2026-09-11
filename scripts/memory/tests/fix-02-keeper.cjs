#!/usr/bin/env node
'use strict';

// Фикстура аварийных регрессий U1 (FIX-02). Моделирует живого владельца,
// независимую смерть keeper'а, смерть владельца, отказ запуска keeper'а и
// штатный release. Работает только с ресурсами в TEMP-каталоге теста:
// настоящая память и рабочие пути не затрагиваются.

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const KEEPER = path.join(__dirname, '..', 'lock-keeper.cjs');
const IPC = path.join(__dirname, '..', 'ipc-lock.js');

function pause(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitForFile(file, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (!fs.existsSync(file)) {
    if (Date.now() > deadline) throw new Error('timed out waiting for ' + file);
    pause(10);
  }
}

// ipc-lock захватывает деструктурированный spawn при загрузке модуля, поэтому
// перехват ставится до require: иначе keeper не наблюдается из теста.
function loadIpc() {
  const captured = [];
  const original = cp.spawn;
  cp.spawn = function (...args) {
    const child = original.apply(this, args);
    if (String(args[1]?.[0] || '').endsWith('lock-keeper.cjs')) captured.push(child);
    return child;
  };
  try {
    delete require.cache[require.resolve(IPC)];
    return { api: require(IPC), captured };
  } finally {
    cp.spawn = original;
  }
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function report(root, name, value) {
  fs.writeFileSync(path.join(root, name), JSON.stringify(value, null, 2) + '\n');
}

const [mode, resource, root] = process.argv.slice(2);
if (!mode || !resource || !root) {
  process.stderr.write('usage: <hold|try|probe-endpoint|keeper-fail> <resource> <root> [attempts]\n');
  process.exit(64);
}

const { api, captured } = loadIpc();
const metadataFile = resource + '.lock';

if (mode === 'hold') {
  const hold = api.acquireProcessLock(resource, { metadataFile, attempts: 10 });
  report(root, 'held.json', {
    pid: process.pid,
    keeperPid: captured.at(-1)?.pid ?? null,
    metadataFile,
    owner: hold.owner,
  });
  const deadline = Date.now() + 60000;
  let asserted = false;
  while (!fs.existsSync(path.join(root, 'stop'))) {
    if (Date.now() > deadline) throw new Error('hold timeout');
    if (!asserted && fs.existsSync(path.join(root, 'probe-assert'))) {
      asserted = true;
      try {
        hold.assertHeld();
        report(root, 'assert-result.json', { ok: true });
      } catch (error) {
        report(root, 'assert-result.json', { ok: false, code: error.code, message: error.message });
      }
    }
    pause(10);
  }
  hold();
  report(root, 'released.json', { pid: process.pid });
} else if (mode === 'try') {
  const attempts = Number(process.argv[5] || 10);
  let hold;
  try {
    hold = api.acquireProcessLock(resource, { metadataFile, attempts, timeoutMessage: 'lock timeout' });
  } catch (error) {
    process.stderr.write(`REFUSED:${error.reason || error.code || error.message}\n`);
    process.exit(1);
  }
  report(root, 'try-owned.json', hold.owner);
  process.stdout.write('ACQUIRED\n');
  hold();
} else if (mode === 'probe-endpoint') {
  // Прямая проверка, что OS-endpoint ресурса свободен: собственный keeper
  // биндится или получает busy независимо от записи владения.
  const base = path.join(root, 'endpoint-probe');
  const statusFile = base + '.json';
  const keeper = cp.spawn(process.execPath, [
    KEEPER, JSON.stringify(api.endpointFor(resource)),
    String(process.pid), statusFile, base + '.release', base + '.released',
  ], { stdio: 'ignore', windowsHide: true });
  keeper.on('error', () => {});
  const deadline = Date.now() + 2000;
  let status = null;
  while (Date.now() < deadline && !(status = readJson(statusFile))) pause(5);
  try { keeper.kill(); } catch {}
  report(root, 'endpoint.json', status || { status: 'no-status' });
} else if (mode === 'keeper-fail') {
  try {
    api.acquireProcessLock(resource, { metadataFile, attempts: 2, keeperScript: path.join(root, 'missing-keeper.cjs') });
    report(root, 'keeper-fail.json', { threw: false });
    process.exitCode = 1;
  } catch (error) {
    report(root, 'keeper-fail.json', {
      threw: true,
      message: error.message,
      metadataPublished: fs.existsSync(metadataFile),
      directory: fs.readdirSync(path.dirname(metadataFile)).sort(),
    });
  }
} else {
  process.stderr.write('unknown mode: ' + mode + '\n');
  process.exit(64);
}
