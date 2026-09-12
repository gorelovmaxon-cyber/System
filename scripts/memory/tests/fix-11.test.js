'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { fixture, mod, REPO } = require('./helpers');

const { resolvePaths } = mod('resolve-paths');
const { initProject, START, END } = mod('init-project');
const { projectId } = mod('project-id');

test('B03: explicit root cannot be redirected by another checkout in local config', () => {
  const rootA = fixture('b03-root-a');
  const rootB = fixture('b03-root-b');
  fs.writeFileSync(path.join(rootA, 'config/system.local.json'), JSON.stringify({
    system_root: rootB,
    memory_root: '.claude/memory',
    data_dir: '.local',
  }));
  process.env.SYSTEM2_ROOT = rootA;
  const paths = resolvePaths({ root: rootA });
  assert.equal(paths.system_root, path.resolve(rootA));
  assert.equal(paths.memory_root, path.join(rootA, '.claude', 'memory'));
  assert.equal(paths.data_dir, path.join(rootA, '.local'));
});

test('B04 config merge is recursive and preserves explicit false and zero', () => {
  const root = fixture('b04-deep-merge');
  const exampleFile = path.join(root, 'config/system.example.json');
  const example = JSON.parse(fs.readFileSync(exampleFile, 'utf8'));
  example.search = { timeout_ms: 1500, result_limit: 3 };
  example.integrations.khoj = { enabled: true, base_url: 'http://default', nested: { a: 1, b: 2 } };
  fs.writeFileSync(exampleFile, JSON.stringify(example));
  fs.writeFileSync(path.join(root, 'config/system.local.json'), JSON.stringify({
    search: { timeout_ms: 0 },
    integrations: { khoj: { enabled: false, nested: { b: 0 } } },
  }));
  const config = resolvePaths({ root }).config;
  assert.deepEqual(config.search, { timeout_ms: 0, result_limit: 3 });
  assert.deepEqual(config.integrations.khoj, {
    enabled: false,
    base_url: 'http://default',
    nested: { a: 1, b: 0 },
  });
});

test('B06: repeated init-project preserves an existing managed HANDOFF state', () => {
  const system = fixture('b06-system', { registry: [{ project_id: 'proj-a' }] });
  const project = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-b06-project-'));
  initProject({ root: project, systemRoot: system, projectId: 'proj-a' });
  const handoff = path.join(project, 'HANDOFF.md');
  const saved = [START, '- **Задача:** реальная задача', '- **Следующий шаг:** продолжить отсюда', END].join('\n');
  fs.writeFileSync(handoff, '# HANDOFF\n\n' + saved + '\n\nРучной текст\n', 'utf8');
  initProject({ root: project, systemRoot: system, projectId: 'proj-a' });
  const after = fs.readFileSync(handoff, 'utf8');
  assert.match(after, /реальная задача/);
  assert.match(after, /продолжить отсюда/);
  assert.match(after, /Ручной текст/);
});

test('B06: damaged or duplicated managed markers fail closed', () => {
  const system = fixture('b06-damaged', { registry: [{ project_id: 'proj-a' }] });
  const project = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-b06-damaged-project-'));
  fs.writeFileSync(path.join(project, 'HANDOFF.md'), `# H\n${START}\n${START}\n${END}\n`, 'utf8');
  assert.throws(() => initProject({ root: project, systemRoot: system, projectId: 'proj-a' }), /damaged or duplicated/);
});

test('B13: project-id uses the merged local registry remote mapping', () => {
  const root = fixture('b13-project-id');
  spawnSync('git', ['init'], { cwd: root });
  spawnSync('git', ['remote', 'add', 'origin', 'git@example.invalid:owner/project-a.git'], { cwd: root });
  fs.writeFileSync(path.join(root, 'config/system.local.json'), JSON.stringify({
    registry: [{ project_id: 'proj-a', remote: 'https://example.invalid/owner/project-a.git' }],
  }));
  process.env.SYSTEM2_ROOT = root;
  assert.equal(projectId(root), 'proj-a');
});

test('B13: unknown connected project is not attributed to systemqwen', () => {
  const system = fixture('b13-unknown-system');
  const project = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-b13-unknown-'));
  spawnSync('git', ['init'], { cwd: project });
  process.env.SYSTEM2_ROOT = system;
  assert.throws(() => projectId(project), /cannot be determined/);
});

test('B12: hook installer leaves an active custom hooksPath and its behavior intact', { skip: !fs.existsSync('C:\\Program Files\\Git\\usr\\bin\\bash.exe') }, () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-b12-hooks-'));
  spawnSync('git', ['init'], { cwd: root });
  fs.cpSync(path.join(REPO, '..', '..', '.git-hooks-templates'), path.join(root, '.git-hooks-templates'), { recursive: true });
  const custom = path.join(root, 'custom-hooks');
  fs.mkdirSync(custom);
  fs.writeFileSync(path.join(custom, 'post-commit'), '#!/bin/sh\nprintf ok > marker.txt\n', 'utf8');
  spawnSync('git', ['config', 'core.hooksPath', custom], { cwd: root });
  const install = spawnSync('C:\\Program Files\\Git\\usr\\bin\\bash.exe', [path.join(root, '.git-hooks-templates/install-hooks.sh')], { cwd: root, encoding: 'utf8' });
  assert.equal(install.status, 2);
  assert.equal(spawnSync('git', ['config', '--get', 'core.hooksPath'], { cwd: root, encoding: 'utf8' }).stdout.trim(), custom);
  spawnSync('git', ['config', 'user.email', 'fixture@example.invalid'], { cwd: root });
  spawnSync('git', ['config', 'user.name', 'Fixture'], { cwd: root });
  fs.writeFileSync(path.join(root, 'tracked.txt'), 'x');
  spawnSync('git', ['add', 'tracked.txt'], { cwd: root });
  const commit = spawnSync('git', ['commit', '-m', 'fixture'], { cwd: root, encoding: 'utf8' });
  assert.equal(commit.status, 0, commit.stderr);
  assert.equal(fs.readFileSync(path.join(root, 'marker.txt'), 'utf8'), 'ok');
});

test('B18: Figma extractor limits node tokens to the requested subtree', () => {
  const { extractDesignTokens } = require(path.join(REPO, '..', '..', '.claude/mcp-servers/figma/lib/extract'));
  const doc = { document: { id: '0', children: [
    { id: '1', name: 'wanted', cornerRadius: 1, children: [{ id: '1:1', name: 'child', cornerRadius: 3 }] },
    { id: '2', name: 'unwanted', cornerRadius: 2 },
  ] } };
  const result = extractDesignTokens(doc, { nodeId: '1' });
  assert.deepEqual(result.radii.map(item => item.node_id), ['1', '1:1']);
  assert.throws(() => extractDesignTokens(doc, { nodeId: 'missing' }), /not found/);
});

test('G10: reversed managed markers are rejected and the document is left untouched', () => {
  const system = fixture('g10-system', { registry: [{ project_id: 'test-project' }] });
  const project = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-g10-project-'));
  const reversed = [END, 'IMPORTANT_STATE', START].join('\n');
  fs.writeFileSync(path.join(project, 'CLAUDE.md'), reversed, 'utf8');
  fs.writeFileSync(path.join(project, 'HANDOFF.md'), reversed, 'utf8');
  assert.throws(() => initProject({ root: project, systemRoot: system, projectId: 'test-project' }), /end marker precedes the start marker/);
  assert.equal(fs.readFileSync(path.join(project, 'CLAUDE.md'), 'utf8'), reversed);
  assert.equal(fs.readFileSync(path.join(project, 'HANDOFF.md'), 'utf8'), reversed);
  assert.equal(fs.readFileSync(path.join(project, 'CLAUDE.md'), 'utf8').split(START).length - 1, 1);
});

test('G10: a corrupted HANDOFF blocks registration and leaves the registry unwritten', () => {
  const system = fixture('g10-register', { registry: [{ project_id: 'A' }] });
  const project = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-g10-register-'));
  const claudeBefore = '# CLAUDE.md\n';
  fs.writeFileSync(path.join(project, 'CLAUDE.md'), claudeBefore, 'utf8');
  fs.writeFileSync(path.join(project, 'HANDOFF.md'), [END, 'IMPORTANT_STATE', START].join('\n'), 'utf8');
  assert.throws(
    () => initProject({ root: project, systemRoot: system, projectId: 'fresh-project', register: true, title: 'Fresh', kind: 'project' }),
    /end marker precedes the start marker/,
  );
  assert.equal(fs.readFileSync(path.join(project, 'CLAUDE.md'), 'utf8'), claudeBefore);
  assert.equal(fs.existsSync(path.join(system, 'config/system.local.json')), false);
});

test('G14: --register links the project directory so project_id resolves without an environment override', () => {
  const system = fixture('g14-system', { registry: [{ project_id: 'A' }] });
  const project = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-g14-project-'));
  const result = initProject({ root: project, systemRoot: system, projectId: 'new-project', register: true, title: 'New', kind: 'project' });
  assert.equal(result.registry, 'registered-in-local-config');
  assert.equal(result.local_path, path.resolve(project));
  const saved = JSON.parse(fs.readFileSync(path.join(system, 'config/system.local.json'), 'utf8'));
  assert.equal(path.resolve(saved.local_paths['new-project']), path.resolve(project));
  assert.equal(saved.registry.some(item => item.project_id === 'new-project'), true);
  delete process.env.SYSTEM2_PROJECT_ID;
  assert.equal(projectId(project), 'new-project');
});

test('G14: registration refuses a second project for the same directory or a remapped project', () => {
  const system = fixture('g14-conflict', { registry: [{ project_id: 'A' }] });
  const project = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-g14-conflict-'));
  initProject({ root: project, systemRoot: system, projectId: 'new-project', register: true, title: 'New', kind: 'project' });
  assert.throws(
    () => initProject({ root: project, systemRoot: system, projectId: 'other-project', register: true, title: 'Other', kind: 'project' }),
    /already registered to project_id new-project/,
  );
  const elsewhere = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-g14-elsewhere-'));
  assert.throws(
    () => initProject({ root: elsewhere, systemRoot: system, projectId: 'new-project', register: true, title: 'New', kind: 'project' }),
    /already registered to another directory/,
  );
  const saved = JSON.parse(fs.readFileSync(path.join(system, 'config/system.local.json'), 'utf8'));
  assert.equal(path.resolve(saved.local_paths['new-project']), path.resolve(project));
});

const BASH = 'C:\\Program Files\\Git\\usr\\bin\\bash.exe';
const hasBash = fs.existsSync(BASH);

function installer(dir, args = []) {
  return spawnSync(BASH, [path.join(dir, '.git-hooks-templates/install-hooks.sh'), ...args], {
    cwd: dir, encoding: 'utf8', windowsHide: true, timeout: 30000,
  });
}

function hooksPath(dir) {
  return spawnSync('git', ['-C', dir, 'config', '--get', 'core.hooksPath'], { encoding: 'utf8' }).stdout.trim();
}

function initRepo(dir) {
  spawnSync('git', ['init', '-q'], { cwd: dir });
  spawnSync('git', ['config', 'user.email', 'fixture@example.invalid'], { cwd: dir });
  spawnSync('git', ['config', 'user.name', 'Fixture'], { cwd: dir });
}

// G11: в linked worktree каталог `.git` — файл, а действующий hooks каталог
// общий для всех деревьев. Установщик, собиравший путь руками, пользовательский
// hook не находил, возвращал 0 и молча переключал hooksPath на наши шаблоны.
test('G11: installer in a linked worktree does not silently disable the shared user hook', { skip: !hasBash }, () => {
  const base = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-g11-base-'));
  const work = base + '-worktree';
  initRepo(base);
  fs.cpSync(path.join(REPO, '..', '..', '.git-hooks-templates'), path.join(base, '.git-hooks-templates'), { recursive: true });
  spawnSync('git', ['add', '.git-hooks-templates'], { cwd: base });
  const empty = path.join(base, 'empty-hooks');
  fs.mkdirSync(empty);
  spawnSync('git', ['-c', 'core.hooksPath=' + empty, 'commit', '-qm', 'fixture'], { cwd: base });
  assert.equal(spawnSync('git', ['worktree', 'add', '-qb', 'fixture-work', work], { cwd: base, encoding: 'utf8' }).status, 0);
  const sharedHook = path.join(base, '.git', 'hooks', 'post-commit');
  const userHookSource = '#!/usr/bin/env bash\necho USER_HOOK\n';
  fs.writeFileSync(sharedHook, userHookSource, 'utf8');

  const refused = installer(work);
  assert.equal(refused.status, 2, refused.stdout + refused.stderr);
  assert.match(refused.stderr, /Existing user hook found/);
  assert.equal(hooksPath(work), '');
  assert.equal(fs.readFileSync(sharedHook, 'utf8'), userHookSource);

  const marker = '#!/usr/bin/env bash\nprintf ran > hook-marker.txt\n';
  fs.writeFileSync(path.join(work, '.git-hooks-templates', 'post-commit'), marker, 'utf8');
  const forced = installer(work, ['--force']);
  assert.equal(forced.status, 0, forced.stdout + forced.stderr);
  assert.match(forced.stdout, /Backed up existing hook to/);
  const configured = hooksPath(work);
  assert.equal(configured, '.git-hooks-templates');
  assert.equal(path.isAbsolute(configured), false);
  const backups = fs.readdirSync(path.join(base, '.git', 'hooks')).filter(name => name.startsWith('post-commit.backup-'));
  assert.equal(backups.length, 1);
  assert.equal(fs.readFileSync(path.join(base, '.git', 'hooks', backups[0]), 'utf8'), userHookSource);

  fs.writeFileSync(path.join(work, 'tracked.txt'), 'x');
  spawnSync('git', ['add', 'tracked.txt'], { cwd: work });
  const commit = spawnSync('git', ['commit', '-qm', 'worktree fixture'], { cwd: work, encoding: 'utf8' });
  assert.equal(commit.status, 0, commit.stderr);
  assert.equal(fs.readFileSync(path.join(work, 'hook-marker.txt'), 'utf8'), 'ran');

  const again = installer(work);
  assert.equal(again.status, 0, again.stdout + again.stderr);
  assert.match(again.stdout, /already points to/);

  spawnSync('git', ['-C', work, 'config', 'core.hooksPath', path.join(work, '.git-hooks-templates')]);
  const legacy = installer(work);
  assert.equal(legacy.status, 0, legacy.stdout + legacy.stderr);
  assert.match(legacy.stdout, /already points to/);
});

test('G11: a missing hook template is reported instead of configuring a dead hooks path', { skip: !hasBash }, () => {
  const source = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-g11-source-'));
  initRepo(source);
  fs.cpSync(path.join(REPO, '..', '..', '.git-hooks-templates'), path.join(source, '.git-hooks-templates'), { recursive: true });
  const target = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-g11-target-'));
  initRepo(target);
  const result = spawnSync(BASH, [path.join(source, '.git-hooks-templates', 'install-hooks.sh')], { cwd: target, encoding: 'utf8', windowsHide: true, timeout: 30000 });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /Hook template is missing/);
  assert.equal(hooksPath(target), '');
});

test('FIX-11: init --register then an ordinary commit produces the right project_id', async () => {
  const system = fixture('fix11-connected-system', { registry: [{ project_id: 'other' }] });
  fs.mkdirSync(path.join(system, 'scripts'), { recursive: true });
  fs.cpSync(REPO, path.join(system, 'scripts', 'memory'), { recursive: true });
  const project = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-fix11-connected-'));
  spawnSync('git', ['init'], { cwd: project });
  spawnSync('git', ['config', 'user.email', 'fixture@example.invalid'], { cwd: project });
  spawnSync('git', ['config', 'user.name', 'Fixture'], { cwd: project });
  fs.cpSync(path.join(REPO, '..', '..', '.git-hooks-templates'), path.join(project, '.git-hooks-templates'), { recursive: true });
  initProject({ root: project, systemRoot: system, projectId: 'proj-a', register: true, title: 'Proj A', kind: 'project' });
  const install = spawnSync(BASH, [path.join(project, '.git-hooks-templates/install-hooks.sh')], { cwd: project, encoding: 'utf8' });
  assert.equal(install.status, 0, install.stderr);
  delete process.env.SYSTEM2_PROJECT_ID;
  fs.writeFileSync(path.join(project, 'tracked.txt'), 'connected');
  spawnSync('git', ['add', 'tracked.txt'], { cwd: project });
  const commit = spawnSync('git', ['commit', '-m', 'connected fixture'], {
    cwd: project,
    env: { ...process.env, SYSTEM2_ROOT: system },
    encoding: 'utf8',
    timeout: 15000,
  });
  assert.equal(commit.status, 0, commit.stderr);
  const queueFile = path.join(system, '.local', 'queue', 'events.jsonl');
  const deadline = Date.now() + 5000;
  while (!fs.existsSync(queueFile) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(fs.existsSync(queueFile), true);
  const records = mod('jsonl').readJsonl(queueFile);
  assert.equal(records.length >= 1, true);
  assert.equal(records.at(-1).event.project_id, 'proj-a');
});
