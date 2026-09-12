#!/usr/bin/env node
'use strict';

// Фикстура блока V1/G15 (FIX-02): живой владелец памяти, претендент-писатель,
// долгая транзакция журнала через alias-путь. Все ресурсы — TEMP-фикстуры
// теста; настоящая память и рабочие пути не затрагиваются.

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const { resolvePaths } = require('../resolve-paths');

const root = process.env.SYSTEM2_ROOT;
if (!root) throw new Error('SYSTEM2_ROOT is required');
const mode = process.argv[2];

function pause(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function report(name, value) {
  fs.writeFileSync(path.join(root, name), JSON.stringify(value, null, 2) + '\n');
}

function waitForFile(file, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (!fs.existsSync(file)) {
    if (Date.now() > deadline) throw new Error('timed out waiting for ' + file);
    pause(10);
  }
}

// ipc-lock захватывает деструктурированный spawn при загрузке модуля, поэтому
// перехват ставится до его require: иначе сторож не наблюдается из теста.
// Кэш обоих модулей сбрасывается, чтобы писатель получил экземпляр ipc-lock,
// загруженный под перехватом.
function loadWithKeeperCapture(target) {
  const captured = [];
  const original = cp.spawn;
  cp.spawn = function (...args) {
    const child = original.apply(this, args);
    if (String(args[1]?.[0] || '').endsWith('lock-keeper.cjs')) captured.push(child);
    return child;
  };
  try {
    const resolved = path.resolve(__dirname, target);
    delete require.cache[require.resolve(resolved)];
    delete require.cache[require.resolve(path.resolve(__dirname, '../ipc-lock'))];
    return { api: require(resolved), captured };
  } finally {
    cp.spawn = original;
  }
}

function identity() {
  const paths = resolvePaths();
  return {
    memory_root: paths.memory_root,
    data_dir: paths.data_dir,
    lock_path: require('../ipc-lock').lockStatePath(paths.memory_root),
    endpoint: require('../ipc-lock').endpointFor(paths.memory_root),
  };
}

if (mode === 'identity') {
  const value = identity();
  report('identity.json', value);
  process.stdout.write(JSON.stringify(value) + '\n');
} else if (mode === 'writer-hold') {
  const { api, captured } = loadWithKeeperCapture('../writer');
  const hold = api.acquireLock();
  report('held.json', {
    pid: process.pid,
    nonce: hold.owner.nonce,
    keeperPid: captured.at(-1)?.pid ?? null,
    ...identity(),
  });
  waitForFile(path.join(root, 'stop'));
  hold();
  report('released.json', { pid: process.pid });
} else if (mode === 'writer-write') {
  const writer = require('../writer');
  try {
    const result = writer.writeProposal(process.argv[3], {
      category: 'facts',
      status: 'observation',
      scope: 'user',
      statement: process.argv[4],
      evidence: 'synthetic fixture',
      source: 'test',
    });
    process.stdout.write(JSON.stringify(result) + '\n');
  } catch (error) {
    process.stderr.write('REFUSED:' + (error.code || 'ERROR') + ':' + (error.reason || error.message) + '\n');
    process.exit(1);
  }
} else if (mode === 'journal-txn') {
  const jsonl = require('../jsonl');
  const file = process.argv[3];
  jsonl.transactJsonl(file, () => {
    report('ready', { journal: file, pid: process.pid });
    waitForFile(path.join(root, 'resume'));
    return {};
  });
  report('done.json', { journal: file });
} else {
  process.stderr.write('unknown mode: ' + mode + '\n');
  process.exit(64);
}
