#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');
const path = require('node:path');
const { resolvePaths } = require('../resolve-paths');

// Модель «процесс держит блокировку»: создаёт memory.lock как это делает
// writer (openSync 'wx' + запись владельца + fsync), держит его --hold мс,
// затем корректно снимает. Не зависит от реализации acquireLock.
const mode = process.argv[2];

function lockFile() {
  return path.join(resolvePaths().data_dir, 'writer', 'memory.lock');
}

if (mode === 'hold') {
  const ms = Number(process.argv[3] || 1000);
  const file = lockFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fs.openSync(file, 'wx');
  fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, hostname: os.hostname(), created: new Date().toISOString(), nonce: crypto.randomBytes(8).toString('hex') }) + '\n', 'utf8');
  fs.fsyncSync(fd);
  process.stdout.write('lock-acquired\n');
  setTimeout(() => {
    try { fs.closeSync(fd); } catch {}
    try { fs.unlinkSync(file); } catch {}
  }, ms);
} else if (mode === 'write') {
  const writer = require('../writer');
  const result = writer.writeProposal('evt_holder', {
    category: 'facts',
    status: 'observation',
    scope: 'user',
    statement: 'HOLDER_WRITE',
    evidence: 'holder fixture',
    source: 'holder',
  });
  process.stdout.write(JSON.stringify(result) + '\n');
} else {
  process.stderr.write('usage: hold <ms> | write\n');
  process.exitCode = 2;
}
