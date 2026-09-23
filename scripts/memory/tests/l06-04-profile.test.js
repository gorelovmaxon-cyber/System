'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { fixture, mod, REPO } = require('./helpers');

const { resolvePaths } = mod('resolve-paths');
const { deepMerge } = mod('init-local-config');

const BASH = 'C:\\Program Files\\Git\\usr\\bin\\bash.exe';
const hasBash = fs.existsSync(BASH);

function initRepo(dir) {
  spawnSync('git', ['init', '-q'], { cwd: dir });
  spawnSync('git', ['config', 'user.email', 'fixture@example.invalid'], { cwd: dir });
  spawnSync('git', ['config', 'user.name', 'Fixture'], { cwd: dir });
}

function hooksPath(dir) {
  return spawnSync('git', ['-C', dir, 'config', '--get', 'core.hooksPath'], { encoding: 'utf8' }).stdout.trim();
}

function withHookTemplates(root) {
  fs.cpSync(path.join(REPO, '..', '..', '.git-hooks-templates'), path.join(root, '.git-hooks-templates'), { recursive: true });
}

test('L06-04: profile defaults to core when the field is absent from example and local config', () => {
  const root = fixture('l0604-default-profile');
  assert.equal(resolvePaths({ root }).profile, 'core');
});

test('L06-04: an old local config without a profile key migrates to core, not activepieces', () => {
  const root = fixture('l0604-migration');
  const example = JSON.parse(fs.readFileSync(path.join(root, 'config/system.example.json'), 'utf8'));
  // Пример без profile (как до этой задачи) + старый local без profile.
  delete example.profile;
  fs.writeFileSync(path.join(root, 'config/system.example.json'), JSON.stringify(example));
  fs.writeFileSync(path.join(root, 'config/system.local.json'), JSON.stringify({ local_paths: {} }));
  assert.equal(resolvePaths({ root }).profile, 'core');
});

test('L06-04: explicit activepieces profile is respected', () => {
  const root = fixture('l0604-explicit-ap');
  fs.writeFileSync(path.join(root, 'config/system.local.json'), JSON.stringify({ profile: 'activepieces' }));
  assert.equal(resolvePaths({ root }).profile, 'activepieces');
});

test('L06-04: deepMerge migration of a real old-style local config keeps core as the default profile', () => {
  const example = { profile: 'core', integrations: {} };
  const oldLocal = { system_root: 'X', local_paths: { a: '1' }, integrations: { khoj: { enabled: true } } };
  const merged = deepMerge(example, oldLocal);
  assert.equal(merged.profile, 'core');
  assert.equal(merged.system_root, 'X');
  assert.equal(merged.integrations.khoj.enabled, true);
});

test('L06-04: uninstall-hooks.sh removes our own hooksPath and is idempotent', { skip: !hasBash }, () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-l0604-uninstall-'));
  initRepo(root);
  withHookTemplates(root);
  const install = spawnSync(BASH, [path.join(root, '.git-hooks-templates/install-hooks.sh')], { cwd: root, encoding: 'utf8' });
  assert.equal(install.status, 0, install.stderr);
  assert.equal(hooksPath(root), '.git-hooks-templates');

  const uninstall = spawnSync(BASH, [path.join(root, '.git-hooks-templates/uninstall-hooks.sh')], { cwd: root, encoding: 'utf8' });
  assert.equal(uninstall.status, 0, uninstall.stderr);
  assert.equal(hooksPath(root), '');

  // Повтор — idempotent no-op, а не ошибка.
  const again = spawnSync(BASH, [path.join(root, '.git-hooks-templates/uninstall-hooks.sh')], { cwd: root, encoding: 'utf8' });
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stdout, /nothing to uninstall/);
});

test('L06-04: uninstall-hooks.sh never touches a foreign hooksPath', { skip: !hasBash }, () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-l0604-foreign-'));
  initRepo(root);
  withHookTemplates(root);
  const custom = path.join(root, 'custom-hooks');
  fs.mkdirSync(custom);
  fs.writeFileSync(path.join(custom, 'post-commit'), '#!/bin/sh\nprintf ok > marker.txt\n', 'utf8');
  spawnSync('git', ['config', 'core.hooksPath', custom], { cwd: root });

  const uninstall = spawnSync(BASH, [path.join(root, '.git-hooks-templates/uninstall-hooks.sh')], { cwd: root, encoding: 'utf8' });
  assert.equal(uninstall.status, 2, uninstall.stdout + uninstall.stderr);
  assert.match(uninstall.stderr, /left unchanged/);
  assert.equal(hooksPath(root), custom);
});

test('L06-04: bootstrap in core profile does not install hooks and removes its own if present, without touching Docker', async () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-l0604-bootstrap-core-'));
  initRepo(root);
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config/system.example.json'), JSON.stringify({
    profile: 'core', memory_root: '.claude/memory', data_dir: '.local', registry: [],
  }));
  fs.writeFileSync(path.join(root, 'config/system.local.example.json'), JSON.stringify({
    system_root: '<ABSOLUTE_SYSTEM2_ROOT>', local_paths: {}, integrations: {},
  }));
  fs.mkdirSync(path.join(root, 'scripts/memory'), { recursive: true });
  fs.cpSync(REPO, path.join(root, 'scripts/memory'), { recursive: true });
  withHookTemplates(root);
  if (hasBash) {
    spawnSync(BASH, [path.join(root, '.git-hooks-templates/install-hooks.sh')], { cwd: root });
    assert.equal(hooksPath(root), '.git-hooks-templates');
  }

  const { bootstrap } = require(path.join(root, 'scripts/memory/bootstrap.js'));
  await bootstrap({ root });

  if (hasBash) assert.equal(hooksPath(root), '', 'core profile must remove hooksPath it owns');

  // Повторный bootstrap — idempotent, не переустанавливает hooks.
  await bootstrap({ root });
  if (hasBash) assert.equal(hooksPath(root), '');
});

test('L06-04: bootstrap CLI exit code 0 in core profile when disabled integrations present', { skip: !hasBash }, () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-l0604-bootstrap-cli-'));
  initRepo(root);
  spawnSync('git', ['remote', 'add', 'origin', 'git@example.invalid:owner/repo.git'], { cwd: root });
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config/system.example.json'), JSON.stringify({
    profile: 'core', memory_root: '.claude/memory', data_dir: '.local', registry: [],
    integrations: { khoj: { enabled: false }, bridge: { enabled: false } },
  }));
  fs.writeFileSync(path.join(root, 'config/system.local.example.json'), JSON.stringify({
    system_root: '<ABSOLUTE_SYSTEM2_ROOT>', local_paths: {}, integrations: {},
  }));
  fs.mkdirSync(path.join(root, '.claude/memory'), { recursive: true });
  fs.writeFileSync(path.join(root, 'HANDOFF.md'), '# HANDOFF\n');
  fs.mkdirSync(path.join(root, 'scripts/memory'), { recursive: true });
  fs.cpSync(REPO, path.join(root, 'scripts/memory'), { recursive: true });
  withHookTemplates(root);

  const result = spawnSync(process.execPath, [path.join(root, 'scripts/memory/bootstrap.js'), '--root', root], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const combinedOutput = result.stdout + result.stderr;
  const jsonMatch = combinedOutput.match(/\{[\s\S]*\}/);
  assert.ok(jsonMatch, 'bootstrap must output JSON: ' + combinedOutput);
  const output = JSON.parse(jsonMatch[0]);
  assert.equal(result.status, 0, 'bootstrap CLI must exit 0 when only disabled integrations present: ' + combinedOutput);
  assert.equal(output.ok, true, 'bootstrap ok must be true when disabled integrations present');
  const khoj = output.checks.find(c => c.check === 'Khoj health');
  const ap = output.checks.find(c => c.check === 'Activepieces health');
  assert.equal(khoj?.status, 'disabled');
  assert.equal(ap?.status, 'disabled');
});

test('L06-04: doctor reports disabled (not PROBLEM) for an integration turned off in core profile', async () => {
  const root = fixture('l0604-doctor-disabled');
  const example = JSON.parse(fs.readFileSync(path.join(root, 'config/system.example.json'), 'utf8'));
  example.integrations = { khoj: { enabled: false }, bridge: { enabled: false } };
  fs.writeFileSync(path.join(root, 'config/system.example.json'), JSON.stringify(example));
  fs.writeFileSync(path.join(root, 'config/system.local.json'), JSON.stringify({ local_paths: {} }));
  initRepo(root);
  spawnSync('git', ['remote', 'add', 'origin', 'git@example.invalid:owner/repo.git'], { cwd: root });
  fs.writeFileSync(path.join(root, 'HANDOFF.md'), '# HANDOFF\n');

  const { diagnose } = mod('doctor');
  const checks = await diagnose({ root });
  const khoj = checks.find(item => item.check === 'Khoj health');
  const bridge = checks.find(item => item.check === 'memory bridge ready');
  const ap = checks.find(item => item.check === 'Activepieces health');
  assert.equal(khoj.status, 'disabled');
  assert.equal(bridge.status, 'disabled');
  assert.equal(ap.status, 'disabled');
  // disabled не считается PROBLEM для итогового ok.
  assert.equal(checks.some(item => item.status === 'PROBLEM'), false, JSON.stringify(checks));
});

test('L06-04: doctor flags an active legacy hooksPath as PROBLEM in core profile', { skip: !hasBash }, () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-l0604-doctor-hooks-'));
  initRepo(root);
  spawnSync('git', ['remote', 'add', 'origin', 'git@example.invalid:owner/repo.git'], { cwd: root });
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config/system.example.json'), JSON.stringify({
    profile: 'core', memory_root: '.claude/memory', data_dir: '.local', registry: [],
    integrations: { khoj: { enabled: false }, bridge: { enabled: false } },
  }));
  fs.mkdirSync(path.join(root, '.claude/memory'), { recursive: true });
  fs.writeFileSync(path.join(root, 'HANDOFF.md'), '# HANDOFF\n');
  withHookTemplates(root);
  spawnSync(BASH, [path.join(root, '.git-hooks-templates/install-hooks.sh')], { cwd: root });
  assert.equal(hooksPath(root), '.git-hooks-templates');

  return (async () => {
    const { diagnose } = require(path.join(REPO, 'doctor.js'));
    const checks = await diagnose({ root });
    const hookCheck = checks.find(item => item.check === 'legacy capture hooks disabled (core profile)');
    assert.equal(hookCheck.status, 'PROBLEM');
    assert.match(hookCheck.instruction, /uninstall-hooks\.sh/);
  })();
});
