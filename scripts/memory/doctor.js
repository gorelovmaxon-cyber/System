#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { resolvePaths } = require('./resolve-paths');

function command(name, args, cwd) {
  const result = spawnSync(name, args, { cwd, encoding: 'utf8', timeout: 5000 });
  return result.status === 0 ? result.stdout.trim() : null;
}

async function probe(url, timeout = 1200) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try { const response = await fetch(url, { signal: controller.signal }); return response.ok; }
  catch { return false; }
  finally { clearTimeout(timer); }
}

async function diagnose(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const checks = [];
  const add = (ok, label, instruction) => checks.push({ status: ok ? 'OK' : 'PROBLEM', check: label, instruction: ok ? undefined : instruction });
  add(Boolean(command('git', ['--version'], root)), 'git', 'Install Git and reopen the terminal.');
  add(Boolean(command('git', ['remote', 'get-url', 'origin'], root)), 'git/remote origin', 'Configure origin for this clone.');
  add(Boolean(command('git', ['branch', '--show-current'], root)), 'git/branch', 'Checkout a named synchronization branch.');
  add(Boolean(process.versions.node), 'node ' + process.versions.node, 'Install Node.js 24 LTS or compatible LTS.');
  let paths;
  try { paths = resolvePaths({ root }); add(true, 'resolve-paths and system root', ''); }
  catch (error) { add(false, 'resolve-paths', error.message); return checks; }
  add(fs.existsSync(paths.localConfig), 'config/system.local.json', 'Run node scripts/memory/init-local-config.js --root <root>.');
  add(fs.existsSync(path.join(root, 'HANDOFF.md')), 'project HANDOFF.md', 'Run node scripts/memory/init-project.js for the connected project.');
  add(command('git', ['config', '--get', 'core.hooksPath'], root) === '.git-hooks-templates', 'portable hooksPath', 'Run bash .git-hooks-templates/install-hooks.sh.');
  add(fs.existsSync(path.join(root, '.claude/memory')), 'shared memory root', 'Restore .claude/memory from Git.');
  add(await probe('http://127.0.0.1:42110/health'), 'Khoj health', 'Install/start the verified Khoj release and configure its local index.');
  add(await probe('http://127.0.0.1:8643/health'), 'memory bridge health', 'Start node scripts/memory/bridge-server.js with a local token.');
  add(await probe('http://127.0.0.1:8642/api/v1/health'), 'Activepieces health', 'Start services/activepieces with Docker Compose.');
  add(true, fs.existsSync(path.join(root, '.local/queue/events.jsonl')) ? 'local event queue available' : 'local event queue not created (valid)', '');
  return checks;
}

async function main() {
  const checks = await diagnose({ root: process.argv.includes('--root') ? process.argv[process.argv.indexOf('--root') + 1] : undefined });
  const problems = checks.filter(item => item.status !== 'OK');
  if (process.argv.includes('--json')) process.stdout.write(JSON.stringify({ ok: problems.length === 0, checks }, null, 2) + '\n');
  else for (const item of checks) process.stdout.write(item.status + ' ' + item.check + (item.instruction ? ' → ' + item.instruction : '') + '\n');
  process.exitCode = problems.length ? 1 : 0;
}

if (require.main === module) main();
module.exports = { diagnose, probe };
