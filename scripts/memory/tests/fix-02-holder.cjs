#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const writer = require('../writer');

// Модель процесса, удерживающего фактическую authority текущего протокола.
const mode = process.argv[2];

if (mode === 'hold') {
  const ms = Number(process.argv[3] || 1000);
  const release = writer.acquireLock();
  process.stdout.write('lock-acquired\n');
  setTimeout(() => {
    release();
  }, ms);
} else if (mode === 'write') {
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
