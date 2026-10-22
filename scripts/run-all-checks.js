'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { python } = require('./check');
const root = path.resolve(__dirname, '..');
const steps = [
  [process.execPath, ['scripts/check.js']],
  [python(), ['-B', 'services/khoj/test_run_local.py', '-v']],
  [process.execPath, ['scripts/run-figma-tests.js']],
  [process.execPath, ['scripts/run-memory-tests.js']],
];
for (const [command, args] of steps) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', windowsHide: true, timeout: 360000, env: { ...process.env, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1' } });
  if (result.status !== 0) {
    if (result.error) console.error(result.error.message);
    process.exitCode = 1;
    break;
  }
}
