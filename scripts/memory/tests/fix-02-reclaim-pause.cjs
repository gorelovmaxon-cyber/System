#!/usr/bin/env node
'use strict';

// Детерминированная пауза реклаймера блокировки (S1): процесс-реклаймер
// приостанавливается непосредственно перед своим разрушающим действием над
// memory.lock. На старой реализации это unlinkSync канонического пути
// (окно «повторное чтение мёртвого владельца -> удаление»); после
// quarantine-rename это unlinkSync verified-карантина. Управляется файлами
// ready/resume в корне фикстуры (SYSTEM2_ROOT). Используется только тестами.
const fs = require('node:fs');
const path = require('node:path');

const root = process.env.SYSTEM2_ROOT;
if (!root) throw new Error('SYSTEM2_ROOT is required');

const orig = fs.unlinkSync;
let paused = false;
fs.unlinkSync = function (file, ...args) {
  if (!paused && String(file).includes('memory.lock')) {
    paused = true;
    fs.writeFileSync(path.join(root, 'ready'), '1');
    const end = Date.now() + 10000;
    while (!fs.existsSync(path.join(root, 'resume'))) {
      if (Date.now() > end) throw new Error('pause timeout');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
  return orig(file, ...args);
};

const writer = require('../writer');
const mode = process.argv[2];

if (mode === 'hold') {
  // реклаймер, который восстановил мёртвый lock и удерживает его до release-me
  const release = writer.acquireLock();
  fs.writeFileSync(path.join(root, 'first-acquired'), '1');
  const end = Date.now() + 15000;
  while (!fs.existsSync(path.join(root, 'release-me'))) {
    if (Date.now() > end) throw new Error('hold timeout');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
  }
  release();
  console.log('first acquired and released');
} else {
  const release = writer.acquireLock();
  fs.writeFileSync(path.join(root, 'child-acquired'), '1');
  release();
  console.log('child acquired and released');
}
