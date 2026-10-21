'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync, spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'system2-tests-'));
const source = path.join(workspace, 'source');
fs.mkdirSync(source);
for (const item of ['scripts/memory', '.git-hooks-templates', '.claude/mcp-servers/figma/lib', 'config/system.example.json', 'config/system.local.example.json']) {
  fs.mkdirSync(path.dirname(path.join(source, item)), { recursive: true });
  fs.cpSync(path.join(ROOT, item), path.join(source, item), { recursive: true });
}
const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (/^(SYSTEM2_|MEMORY_|KHOJ_|OPENAI_|ANTHROPIC_|FIGMA_|GIT_)/i.test(key) || /(?:TOKEN|SECRET|API_KEY)$/i.test(key)) delete env[key];
}
const fixtures = path.join(workspace, 'fixtures');
fs.mkdirSync(fixtures);
const emptyTemplates = path.join(workspace, 'empty-templates');
fs.mkdirSync(emptyTemplates);
Object.assign(env, {
  SYSTEM2_ROOT: source, SYSTEM2_LOCK_DIR: path.join(workspace, 'locks'),
  GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
  GIT_TEMPLATE_DIR: emptyTemplates, TMP: fixtures, TEMP: fixtures, TMPDIR: fixtures,
});
const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path') || 'PATH';
if (process.platform === 'win32') {
  const gitUsr = path.join('C:', 'Program Files', 'Git', 'usr', 'bin');
  if (fs.existsSync(gitUsr)) env[pathKey] = gitUsr + path.delimiter + (env[pathKey] || '');
}
const initialized = spawnSync('git', ['init', '-q'], { cwd: source, env, encoding: 'utf8', windowsHide: true });
if (initialized.status !== 0) throw new Error(initialized.stderr || 'Could not initialize isolated fixture checkout');
const testFiles = fs.readdirSync(path.join(source, 'scripts/memory/tests')).filter(f => f.endsWith('.test.js')).map(f => path.join('scripts/memory/tests', f));
const log = path.join(workspace, 'memory.tap');
const stdout = fs.openSync(log, 'w');
const stderr = fs.openSync(path.join(workspace, 'stderr.log'), 'w');
const started = Date.now();
console.log(`Memory tests: isolated source and fixtures at ${workspace}`);
const child = spawn(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', ...testFiles], {
  cwd: source, env, windowsHide: true, stdio: ['ignore', stdout, stderr], timeout: 300000,
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('close', (code, signal) => {
  fs.closeSync(stdout); fs.closeSync(stderr);
  const text = fs.readFileSync(log, 'utf8');
  console.log(text.split('\n').filter(line => /^# (?:tests|pass|fail|skipped|duration)|^not ok/.test(line)).join('\n'));
  const result = { code, signal, seconds: (Date.now() - started) / 1000, log };
  fs.writeFileSync(path.join(workspace, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  if (code !== 0 || signal) console.error(fs.readFileSync(path.join(workspace, 'stderr.log'), 'utf8'));
  process.exitCode = code === 0 && !signal ? 0 : 1;
});
