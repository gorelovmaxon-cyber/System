#!/usr/bin/env node
'use strict';

// Детерминированная пауза на границе файловой операции writer для проверки
// гонок (R5: окно openSync(memory.lock,'wx') -> запись владельца; R6: пауза
// перед созданием блокировки). Управляется файлами ready/resume в корне
// фикстуры (SYSTEM2_ROOT). Используется только тестами; в проде не запускается.
const fs = require('node:fs');
const path = require('node:path');

const root = process.env.SYSTEM2_ROOT;
if (!root) throw new Error('SYSTEM2_ROOT is required');
const mode = process.argv[2];
const eventId = process.argv[3] || 'evt_race';
const statement = process.argv[4] || 'CHILD_CONTENT';

const original = fs.openSync;
let intercepted = false;
fs.openSync = function (file, flags, ...args) {
  if (!intercepted && flags === 'wx' && String(file).endsWith('memory.lock')) {
    intercepted = true;
    const fd = mode === 'pause-after-open' ? original(file, flags, ...args) : undefined;
    fs.writeFileSync(path.join(root, 'ready'), '1');
    const end = Date.now() + 10000;
    while (!fs.existsSync(path.join(root, 'resume'))) {
      if (Date.now() > end) throw new Error('pause timeout');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
    return fd === undefined ? original(file, flags, ...args) : fd;
  }
  return original(file, flags, ...args);
};

const writer = require('../writer');

if (mode === 'pause-after-open') {
  const release = writer.acquireLock();
  fs.writeFileSync(path.join(root, 'child-acquired'), '1');
  release();
  console.log('child acquired and released');
} else if (mode === 'pause-before-open') {
  const result = writer.writeProposal(eventId, {
    category: 'facts',
    status: 'observation',
    scope: 'user',
    statement,
    evidence: 'synthetic fixture',
    source: 'test',
  });
  console.log(JSON.stringify(result));
} else {
  throw new Error('unknown mode: ' + mode);
}
