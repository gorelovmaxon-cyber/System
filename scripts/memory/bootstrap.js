#!/usr/bin/env node
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { diagnose } = require('./doctor');
const { resolvePaths } = require('./resolve-paths');

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false });
  if (result.status !== 0) throw new Error(command + ' failed with exit ' + result.status);
}

// Тихий прогон (без stdio: 'inherit'): используется только для необязательного
// снятия захвата, где ненулевой код 2 ("чужой hooksPath") — штатный, ожидаемый
// исход, а не сбой bootstrap.
function runQuiet(command, args, cwd) {
  return spawnSync(command, args, { cwd, encoding: 'utf8', shell: false });
}

function bashPath() {
  return process.env.SHELL || (fs.existsSync('C:\\Program Files\\Git\\usr\\bin\\bash.exe') ? 'C:\\Program Files\\Git\\usr\\bin\\bash.exe' : 'bash');
}

async function bootstrap(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  run(process.execPath, [path.join(root, 'scripts/memory/init-local-config.js'), '--root', root], root);
  const profile = resolvePaths({ root }).profile;
  const bash = bashPath();

  if (profile === 'activepieces') {
    run(bash, [path.join(root, '.git-hooks-templates/install-hooks.sh')], root);
    if (options.startServices) run('docker', ['compose', '-f', path.join(root, 'services/activepieces/docker-compose.yml'), 'up', '-d'], root);
  } else {
    // core: bootstrap не устанавливает старый захват очереди и не поднимает
    // Docker. Если этот репозиторий сам раньше включил свой hooksPath (на этой
    // же машине, до перехода на core), снимаем только его — чужой hooksPath
    // uninstall-hooks.sh не трогает (см. .git-hooks-templates/uninstall-hooks.sh).
    // Повторный bootstrap в core — idempotent no-op здесь: если hooksPath уже
    // не наш (снят или никогда не был установлен), скрипт молча завершится 0/2.
    const result = runQuiet(bash, [path.join(root, '.git-hooks-templates/uninstall-hooks.sh')], root);
    if (result.status !== 0 && result.status !== 2) {
      throw new Error('uninstall-hooks.sh failed with exit ' + result.status + ': ' + (result.stderr || result.stdout));
    }
  }
  if (options.rebuildIndex) run(process.execPath, [path.join(root, 'scripts/memory/indexer.js'), '--run'], root);
  return diagnose({ root });
}

async function main() {
  const argv = process.argv.slice(2);
  const rootIndex = argv.indexOf('--root');
  const root = rootIndex >= 0 ? argv[rootIndex + 1] : process.cwd();
  const checks = await bootstrap({ root, startServices: argv.includes('--start-services'), rebuildIndex: argv.includes('--rebuild-index') });
  const problems = checks.filter(item => item.status !== 'OK' && item.status !== 'disabled');
  process.stdout.write(JSON.stringify({ ok: problems.length === 0, checks }, null, 2) + '\n');
  if (problems.length > 0) process.exitCode = 1;
}

if (require.main === module) main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
module.exports = { bootstrap };
