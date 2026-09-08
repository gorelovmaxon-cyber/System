#!/usr/bin/env node
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { diagnose } = require('./doctor');

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false });
  if (result.status !== 0) throw new Error(command + ' failed with exit ' + result.status);
}

async function bootstrap(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  run(process.execPath, [path.join(root, 'scripts/memory/init-local-config.js'), '--root', root], root);
  const bash = process.env.SHELL || (fs.existsSync('C:\\Program Files\\Git\\usr\\bin\\bash.exe') ? 'C:\\Program Files\\Git\\usr\\bin\\bash.exe' : 'bash');
  run(bash, [path.join(root, '.git-hooks-templates/install-hooks.sh')], root);
  if (options.startServices) run('docker', ['compose', '-f', path.join(root, 'services/activepieces/docker-compose.yml'), 'up', '-d'], root);
  if (options.rebuildIndex) run(process.execPath, [path.join(root, 'scripts/memory/indexer.js'), '--run'], root);
  return diagnose({ root });
}

async function main() {
  const argv = process.argv.slice(2);
  const rootIndex = argv.indexOf('--root');
  const root = rootIndex >= 0 ? argv[rootIndex + 1] : process.cwd();
  const checks = await bootstrap({ root, startServices: argv.includes('--start-services'), rebuildIndex: argv.includes('--rebuild-index') });
  process.stdout.write(JSON.stringify({ ok: checks.every(item => item.status === 'OK'), checks }, null, 2) + '\n');
  if (checks.some(item => item.status !== 'OK')) process.exitCode = 1;
}

if (require.main === module) main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
module.exports = { bootstrap };
