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

// Создать изолированное окружение Git для тестов (не затрагивает пользовательский global config)
function isolatedGitEnv(root) {
  const fakeGlobalConfig = path.join(root, '.git-test-global-config');
  fs.writeFileSync(fakeGlobalConfig, '', 'utf8');
  return { GIT_CONFIG_GLOBAL: fakeGlobalConfig };
}

function initRepo(dir) {
  const env = isolatedGitEnv(dir);
  spawnSync('git', ['init', '-q'], { cwd: dir, env: { ...process.env, ...env } });
  spawnSync('git', ['config', 'user.email', 'fixture@example.invalid'], { cwd: dir, env: { ...process.env, ...env } });
  spawnSync('git', ['config', 'user.name', 'Fixture'], { cwd: dir, env: { ...process.env, ...env } });
  return env;
}

function hooksPath(dir, env = {}) {
  return spawnSync('git', ['-C', dir, 'config', '--get', 'core.hooksPath'], { encoding: 'utf8', env: { ...process.env, ...env } }).stdout.trim();
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
  const env = initRepo(root);
  withHookTemplates(root);
  const install = spawnSync(BASH, [path.join(root, '.git-hooks-templates/install-hooks.sh')], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });
  assert.equal(install.status, 0, install.stderr);
  assert.equal(hooksPath(root, env), '.git-hooks-templates');

  const uninstall = spawnSync(BASH, [path.join(root, '.git-hooks-templates/uninstall-hooks.sh')], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });
  assert.equal(uninstall.status, 0, uninstall.stderr);
  assert.equal(hooksPath(root, env), '');

  // Повтор — idempotent no-op, а не ошибка.
  const again = spawnSync(BASH, [path.join(root, '.git-hooks-templates/uninstall-hooks.sh')], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stdout, /nothing to uninstall/);
});

test('L06-04: uninstall-hooks.sh never touches a foreign hooksPath', { skip: !hasBash }, () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-l0604-foreign-'));
  const env = initRepo(root);
  withHookTemplates(root);
  const custom = path.join(root, 'custom-hooks');
  fs.mkdirSync(custom);
  fs.writeFileSync(path.join(custom, 'post-commit'), '#!/bin/sh\nprintf ok > marker.txt\n', 'utf8');
  spawnSync('git', ['config', 'core.hooksPath', custom], { cwd: root, env: { ...process.env, ...env } });

  const uninstall = spawnSync(BASH, [path.join(root, '.git-hooks-templates/uninstall-hooks.sh')], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });
  assert.equal(uninstall.status, 2, uninstall.stdout + uninstall.stderr);
  assert.match(uninstall.stderr, /left unchanged/);
  assert.equal(hooksPath(root, env), custom);
});

test('L06-04: bootstrap in core profile does not install hooks and removes its own if present, without touching Docker', async () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-l0604-bootstrap-core-'));
  const env = initRepo(root);
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
    spawnSync(BASH, [path.join(root, '.git-hooks-templates/install-hooks.sh')], { cwd: root, env: { ...process.env, ...env } });
    assert.equal(hooksPath(root, env), '.git-hooks-templates');
  }

  const { bootstrap } = require(path.join(root, 'scripts/memory/bootstrap.js'));
  await bootstrap({ root, env });

  if (hasBash) assert.equal(hooksPath(root, env), '', 'core profile must remove hooksPath it owns');

  // Повторный bootstrap — idempotent, не переустанавливает hooks.
  await bootstrap({ root, env });
  if (hasBash) assert.equal(hooksPath(root, env), '');
});

test('L06-04: bootstrap CLI exit code 0 in core profile when disabled integrations present', { skip: !hasBash }, () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-l0604-bootstrap-cli-'));
  const env = initRepo(root);
  spawnSync('git', ['remote', 'add', 'origin', 'git@example.invalid:owner/repo.git'], { cwd: root, env: { ...process.env, ...env } });
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

  const result = spawnSync(process.execPath, [path.join(root, 'scripts/memory/bootstrap.js'), '--root', root], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } });
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
  const env = initRepo(root);
  spawnSync('git', ['remote', 'add', 'origin', 'git@example.invalid:owner/repo.git'], { cwd: root, env: { ...process.env, ...env } });
  fs.writeFileSync(path.join(root, 'HANDOFF.md'), '# HANDOFF\n');

  const { diagnose } = mod('doctor');
  const checks = await diagnose({ root, env });
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
  const env = initRepo(root);
  spawnSync('git', ['remote', 'add', 'origin', 'git@example.invalid:owner/repo.git'], { cwd: root, env: { ...process.env, ...env } });
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config/system.example.json'), JSON.stringify({
    profile: 'core', memory_root: '.claude/memory', data_dir: '.local', registry: [],
    integrations: { khoj: { enabled: false }, bridge: { enabled: false } },
  }));
  fs.mkdirSync(path.join(root, '.claude/memory'), { recursive: true });
  fs.writeFileSync(path.join(root, 'HANDOFF.md'), '# HANDOFF\n');
  withHookTemplates(root);
  spawnSync(BASH, [path.join(root, '.git-hooks-templates/install-hooks.sh')], { cwd: root, env: { ...process.env, ...env } });
  assert.equal(hooksPath(root, env), '.git-hooks-templates');

  return (async () => {
    const { diagnose } = require(path.join(REPO, 'doctor.js'));
    const checks = await diagnose({ root, env });
    const hookCheck = checks.find(item => item.check.includes('local hooksPath points to System2'));
    assert.equal(hookCheck.status, 'PROBLEM');
    assert.match(hookCheck.instruction, /uninstall/);
  })();
});

test('L06-04: doctor detects global hooksPath pointing to System2 in core profile', { skip: !hasBash }, () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-l0604-global-hooks-'));
  const env = initRepo(root);
  spawnSync('git', ['remote', 'add', 'origin', 'git@example.invalid:owner/repo.git'], { cwd: root, env: { ...process.env, ...env } });
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config/system.example.json'), JSON.stringify({
    profile: 'core', memory_root: '.claude/memory', data_dir: '.local', registry: [],
  }));
  fs.writeFileSync(path.join(root, 'config/system.local.json'), JSON.stringify({ local_paths: {} }));
  fs.mkdirSync(path.join(root, '.claude/memory'), { recursive: true });
  fs.writeFileSync(path.join(root, 'HANDOFF.md'), '# HANDOFF\n');
  withHookTemplates(root);

  // Используем изолированный global config
  const globalBefore = spawnSync('git', ['config', '--global', '--get', 'core.hooksPath'], { encoding: 'utf8', env: { ...process.env, ...env } }).stdout.trim();
  spawnSync('git', ['config', '--global', 'core.hooksPath', path.join(root, '.git-hooks-templates')], { cwd: root, env: { ...process.env, ...env } });

  return (async () => {
    try {
      const { diagnose } = require(path.join(REPO, 'doctor.js'));
      const checks = await diagnose({ root, env });
      const hookCheck = checks.find(item => item.check.includes('global hooksPath'));
      assert.ok(hookCheck, 'global hooksPath check must exist');
      assert.equal(hookCheck.status, 'PROBLEM');
      assert.match(hookCheck.instruction, /global --unset/);
    } finally {
      if (globalBefore) spawnSync('git', ['config', '--global', 'core.hooksPath', globalBefore], { env: { ...process.env, ...env } });
      else spawnSync('git', ['config', '--global', '--unset', 'core.hooksPath'], { env: { ...process.env, ...env } });
    }
  })();
});

test('L06-04: doctor detects direct .git/hooks/post-commit with System2 marker in core profile', { skip: !hasBash }, () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-l0604-direct-hook-'));
  const env = initRepo(root);
  spawnSync('git', ['remote', 'add', 'origin', 'git@example.invalid:owner/repo.git'], { cwd: root, env: { ...process.env, ...env } });
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config/system.example.json'), JSON.stringify({
    profile: 'core', memory_root: '.claude/memory', data_dir: '.local', registry: [],
  }));
  fs.writeFileSync(path.join(root, 'config/system.local.json'), JSON.stringify({ local_paths: {} }));
  fs.mkdirSync(path.join(root, '.claude/memory'), { recursive: true });
  fs.writeFileSync(path.join(root, 'HANDOFF.md'), '# HANDOFF\n');

  fs.mkdirSync(path.join(root, '.git/hooks'), { recursive: true });
  fs.copyFileSync(path.join(REPO, '..', '..', '.git-hooks-templates', 'post-commit'), path.join(root, '.git/hooks/post-commit'));

  return (async () => {
    const { diagnose } = require(path.join(REPO, 'doctor.js'));
    const checks = await diagnose({ root, env });
    const hookCheck = checks.find(item => item.check.includes('direct .git/hooks/post-commit is System2'));
    assert.ok(hookCheck, 'direct hook check must exist');
    assert.equal(hookCheck.status, 'PROBLEM');
    assert.match(hookCheck.instruction, /Remove/);
  })();
});

test('L06-04: doctor shows unchecked status for foreign direct .git/hooks/post-commit', { skip: !hasBash }, () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-l0604-foreign-direct-'));
  const env = initRepo(root);
  spawnSync('git', ['remote', 'add', 'origin', 'git@example.invalid:owner/repo.git'], { cwd: root, env: { ...process.env, ...env } });
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config/system.example.json'), JSON.stringify({
    profile: 'core', memory_root: '.claude/memory', data_dir: '.local', registry: [],
  }));
  fs.writeFileSync(path.join(root, 'config/system.local.json'), JSON.stringify({ local_paths: {} }));
  fs.mkdirSync(path.join(root, '.claude/memory'), { recursive: true });
  fs.writeFileSync(path.join(root, 'HANDOFF.md'), '# HANDOFF\n');

  fs.mkdirSync(path.join(root, '.git/hooks'), { recursive: true });
  fs.writeFileSync(path.join(root, '.git/hooks/post-commit'), '#!/bin/sh\n# Foreign hook\necho foreign\n', 'utf8');

  return (async () => {
    const { diagnose } = require(path.join(REPO, 'doctor.js'));
    const checks = await diagnose({ root, env });
    const hookCheck = checks.find(item => item.check.includes('direct .git/hooks/post-commit exists (foreign)'));
    assert.ok(hookCheck, 'foreign hook check must exist');
    assert.equal(hookCheck.status, 'unchecked');
    assert.match(hookCheck.instruction, /Manual inspection/);
  })();
});

test('L06-04: uninstall-all-hooks.sh removes System2 hooks from all sources', { skip: !hasBash }, () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-l0604-uninstall-all-'));
  const env = initRepo(root);
  withHookTemplates(root);

  // Установить local hooksPath
  spawnSync(BASH, [path.join(root, '.git-hooks-templates/install-hooks.sh')], { cwd: root, env: { ...process.env, ...env } });
  assert.equal(hooksPath(root, env), '.git-hooks-templates');

  // Добавить direct hook (чистый System2, без примесей)
  fs.mkdirSync(path.join(root, '.git/hooks'), { recursive: true });
  fs.copyFileSync(path.join(root, '.git-hooks-templates/post-commit'), path.join(root, '.git/hooks/post-commit'));

  // Используем изолированный global config для теста
  const globalBefore = spawnSync('git', ['config', '--global', '--get', 'core.hooksPath'], { encoding: 'utf8', env: { ...process.env, ...env } }).stdout.trim();
  spawnSync('git', ['config', '--global', 'core.hooksPath', path.join(root, '.git-hooks-templates')], { cwd: root, env: { ...process.env, ...env } });

  try {
    // Bash-скрипт запускаем с изолированным env
    const uninstall = spawnSync(BASH, [path.join(root, '.git-hooks-templates/uninstall-all-hooks.sh')], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });
    assert.equal(uninstall.status, 0, uninstall.stderr);

    // После защиты global: ожидаем предупреждение в stderr, но не автоматическое удаление
    assert.match(uninstall.stderr, /WARNING.*global core\.hooksPath/, 'global hooksPath должен вызвать предупреждение');
    assert.match(uninstall.stdout, /Removed 2 System2 hook/, 'local и direct должны быть удалены');

    const localHooksPath = spawnSync('git', ['config', '--local', '--get', 'core.hooksPath'], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } }).stdout.trim();
    assert.equal(localHooksPath, '', 'local hooksPath must be removed');
    assert.equal(fs.existsSync(path.join(root, '.git/hooks/post-commit')), false, 'direct hook must be removed');

    const globalAfter = spawnSync('git', ['config', '--global', '--get', 'core.hooksPath'], { encoding: 'utf8', env: { ...process.env, ...env } }).stdout.trim();
    assert.notEqual(globalAfter, '', 'global hooksPath не должен быть удалён автоматически');

    // Вручную очистим global для теста idempotency
    spawnSync('git', ['config', '--global', '--unset', 'core.hooksPath'], { env: { ...process.env, ...env } });

    // Повтор — idempotent
    const again = spawnSync(BASH, [path.join(root, '.git-hooks-templates/uninstall-all-hooks.sh')], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });
    assert.equal(again.status, 0, again.stderr);
    assert.match(again.stdout, /No System2 hooks found/);
  } finally {
    if (globalBefore) spawnSync('git', ['config', '--global', 'core.hooksPath', globalBefore], { env: { ...process.env, ...env } });
    else spawnSync('git', ['config', '--global', '--unset', 'core.hooksPath'], { env: { ...process.env, ...env } });
  }
});

test('L06-04: uninstall-all-hooks.sh preserves foreign direct hook', { skip: !hasBash }, () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-l0604-preserve-foreign-'));
  const env = initRepo(root);
  withHookTemplates(root);

  fs.mkdirSync(path.join(root, '.git/hooks'), { recursive: true });
  const foreignContent = '#!/bin/sh\n# Foreign hook\necho foreign\n';
  fs.writeFileSync(path.join(root, '.git/hooks/post-commit'), foreignContent, 'utf8');

  const uninstall = spawnSync(BASH, [path.join(root, '.git-hooks-templates/uninstall-all-hooks.sh')], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });
  assert.equal(uninstall.status, 0, uninstall.stderr);

  assert.equal(fs.existsSync(path.join(root, '.git/hooks/post-commit')), true, 'foreign hook must be preserved');
  const content = fs.readFileSync(path.join(root, '.git/hooks/post-commit'), 'utf8');
  assert.equal(content, foreignContent, 'foreign hook content must be unchanged');
});

test('L06-04: uninstall-all-hooks.sh preserves mixed hook (System2 + user code)', { skip: !hasBash }, () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-l0604-mixed-hook-'));
  const env = initRepo(root);
  withHookTemplates(root);

  fs.mkdirSync(path.join(root, '.git/hooks'), { recursive: true });
  // Смешанный hook: System2 marker + пользовательский код
  const mixedContent = '#!/bin/sh\n# System2 portable post-commit hook: capture only; never push.\necho "user code here"\n';
  fs.writeFileSync(path.join(root, '.git/hooks/post-commit'), mixedContent, 'utf8');

  const uninstall = spawnSync(BASH, [path.join(root, '.git-hooks-templates/uninstall-all-hooks.sh')], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });
  assert.equal(uninstall.status, 0, uninstall.stderr);
  assert.match(uninstall.stderr, /WARNING.*mixed hook/, 'должно быть предупреждение о смешанном hook');
  assert.match(uninstall.stderr, /Manual cleanup required/, 'должна быть инструкция для ручной очистки');

  // Смешанный hook должен быть сохранён
  assert.equal(fs.existsSync(path.join(root, '.git/hooks/post-commit')), true, 'mixed hook must be preserved');
  const content = fs.readFileSync(path.join(root, '.git/hooks/post-commit'), 'utf8');
  assert.equal(content, mixedContent, 'mixed hook content must be unchanged');
});

test('L06-04: doctor detects System2 hook at arbitrary effective hooksPath in core profile', { skip: !hasBash }, () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-l0604-arbitrary-hooks-'));
  const env = initRepo(root);
  spawnSync('git', ['remote', 'add', 'origin', 'git@example.invalid:owner/repo.git'], { cwd: root, env: { ...process.env, ...env } });
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config/system.example.json'), JSON.stringify({
    profile: 'core', memory_root: '.claude/memory', data_dir: '.local', registry: [],
  }));
  fs.writeFileSync(path.join(root, 'config/system.local.json'), JSON.stringify({ local_paths: {} }));
  fs.mkdirSync(path.join(root, '.claude/memory'), { recursive: true });
  fs.writeFileSync(path.join(root, 'HANDOFF.md'), '# HANDOFF\n');

  // Создать произвольный каталог с System2 hook
  const arbitraryHooksDir = path.join(root, 'custom-hooks-location');
  fs.mkdirSync(arbitraryHooksDir, { recursive: true });
  fs.copyFileSync(path.join(REPO, '..', '..', '.git-hooks-templates', 'post-commit'), path.join(arbitraryHooksDir, 'post-commit'));

  // Установить local hooksPath на произвольный каталог
  spawnSync('git', ['config', '--local', 'core.hooksPath', arbitraryHooksDir], { cwd: root, env: { ...process.env, ...env } });

  return (async () => {
    const { diagnose } = require(path.join(REPO, 'doctor.js'));
    const checks = await diagnose({ root, env });
    const hookCheck = checks.find(item => item.check.includes('arbitrary effective hooksPath'));
    assert.ok(hookCheck, 'arbitrary effective hooksPath check must exist');
    assert.equal(hookCheck.status, 'PROBLEM');
    assert.match(hookCheck.instruction, /Check git config core\.hooksPath/);
  })();
});

test('L06-04: uninstall-hooks.sh works in connected local project', { skip: !hasBash }, () => {
  // Создать подключённый проект (имитация local_paths в System2)
  const connectedProject = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-l0604-connected-proj-'));
  const env = initRepo(connectedProject);
  withHookTemplates(connectedProject);

  // Установить hooks в подключённом проекте
  spawnSync(BASH, [path.join(connectedProject, '.git-hooks-templates/install-hooks.sh')], { cwd: connectedProject, env: { ...process.env, ...env } });
  assert.equal(hooksPath(connectedProject, env), '.git-hooks-templates', 'connected project должен иметь hooks');

  // Отключить hooks в подключённом проекте
  const uninstall = spawnSync(BASH, [path.join(connectedProject, '.git-hooks-templates/uninstall-hooks.sh')], { cwd: connectedProject, encoding: 'utf8', env: { ...process.env, ...env } });
  assert.equal(uninstall.status, 0, 'uninstall должен успешно завершиться');

  // Проверить, что hooks отключены
  const hooksAfter = hooksPath(connectedProject, env);
  assert.equal(hooksAfter, '', 'connected project hooks должны быть отключены после uninstall');
});
