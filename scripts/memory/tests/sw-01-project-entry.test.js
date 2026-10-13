'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { fixture, mod } = require('./helpers');
const { initProject, START } = mod('init-project');

function project(name) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `sw-01-${name}-`));
  fs.writeFileSync(path.join(root, 'AGENTS.md'), 'Keep my rules.\n');
  fs.writeFileSync(path.join(root, 'HANDOFF.md'), '# Existing handoff\n\nKeep my state.\n');
  return root;
}

test('SW-01: known ID with placeholder gets one local binding and minimal Claude start adapter', () => {
  const system = fixture('sw-01-known', { registry: [{ project_id: 'site-portfolio' }] });
  const root = project('Сайт с пробелами');
  fs.writeFileSync(path.join(system, 'config/system.local.json'), JSON.stringify({ local_paths: { 'site-portfolio': '<ABSOLUTE_SITE_ROOT>' } }));

  const first = initProject({ root, systemRoot: system, projectId: 'site-portfolio', client: 'claude-code' });
  const second = initProject({ root, systemRoot: system, projectId: 'site-portfolio', client: 'claude-code' });
  assert.equal(first.local_path, root);
  assert.equal(second.local_path, root);
  assert.equal(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), 'Keep my rules.\n');
  assert.match(fs.readFileSync(path.join(root, 'HANDOFF.md'), 'utf8'), /Keep my state/);
  assert.equal(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8').split(START).length - 1, 1);
  assert.equal(fs.readFileSync(path.join(root, 'HANDOFF.md'), 'utf8').split(START).length - 1, 1);
  assert.match(fs.readFileSync(first.adapter, 'utf8'), /canonical start workflow/);
  assert.equal(first.site_adapter, second.site_adapter);
  assert.match(fs.readFileSync(first.site_adapter, 'utf8'), /canonical site-build workflow/);
  assert.match(fs.readFileSync(path.join(root, '.gitignore'), 'utf8'), /\/\.claude\/system2\.local\.json/);
  assert.match(fs.readFileSync(path.join(root, '.gitignore'), 'utf8'), /\/\.claude\/settings\.local\.json/);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, '.claude', 'settings.local.json'), 'utf8')).permissions.additionalDirectories, [system]);
  const local = JSON.parse(fs.readFileSync(path.join(system, 'config/system.local.json'), 'utf8'));
  assert.equal(local.local_paths['site-portfolio'], root);
  assert.equal(fs.existsSync(path.join(root, '.system-memory')), false);
});

test('SW-01: wrong path, conflicting adapter, and absent System fail without changing project files', () => {
  const system = fixture('sw-01-conflicts', { registry: [{ project_id: 'site-portfolio' }] });
  const root = project('conflict');
  const other = project('other');
  fs.writeFileSync(path.join(system, 'config/system.local.json'), JSON.stringify({ local_paths: { 'site-portfolio': other } }));
  assert.throws(() => initProject({ root, systemRoot: system, projectId: 'site-portfolio', client: 'claude-code' }), /already registered/);
  assert.equal(fs.existsSync(path.join(root, 'CLAUDE.md')), false);
  assert.equal(fs.readFileSync(path.join(root, 'HANDOFF.md'), 'utf8'), '# Existing handoff\n\nKeep my state.\n');
  assert.throws(() => initProject({ root, systemRoot: path.join(root, 'missing'), projectId: 'site-portfolio', client: 'claude-code' }), /System2 root not found/);
  assert.throws(() => initProject({ root: path.join(root, 'missing'), systemRoot: system, projectId: 'site-portfolio' }), /existing directory/);
});

test('SW-01: unknown ID remains local until registry is explicitly published', () => {
  const system = fixture('sw-01-new', { registry: [{ project_id: 'systemqwen' }] });
  const root = project('new');
  assert.throws(() => initProject({ root, systemRoot: system, projectId: 'new-site', client: 'claude-code' }), /--register/);
  const result = initProject({ root, systemRoot: system, projectId: 'new-site', register: true, title: 'New site', kind: 'client-site', client: 'claude-code' });
  assert.equal(result.registry, 'registered-in-local-config');
  const local = JSON.parse(fs.readFileSync(path.join(system, 'config/system.local.json'), 'utf8'));
  assert.equal(local.registry.some(item => item.project_id === 'new-site'), true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(system, 'config/system.example.json'), 'utf8')).registry.some(item => item.project_id === 'new-site'), false);
});

test('site-build adapter conflicts fail before any bootstrap or registry mutation', () => {
  const system = fixture('site-build-conflict', { registry: [{ project_id: 'site-portfolio' }] });
  const root = project('site-build-conflict');
  const adapter = path.join(root, '.claude/skills/site-build/SKILL.md');
  fs.mkdirSync(path.dirname(adapter), { recursive: true });
  fs.writeFileSync(adapter, '# User-owned site command\n');
  const before = fs.existsSync(path.join(system, 'config/system.local.json'))
    ? fs.readFileSync(path.join(system, 'config/system.local.json'), 'utf8') : null;
  assert.throws(() => initProject({ root, systemRoot: system, projectId: 'site-portfolio', client: 'claude-code' }), /site-build skill already exists/);
  assert.equal(fs.readFileSync(adapter, 'utf8'), '# User-owned site command\n');
  assert.equal(fs.existsSync(path.join(root, 'CLAUDE.md')), false);
  assert.equal(fs.existsSync(path.join(root, '.claude/skills/start/SKILL.md')), false);
  assert.equal(fs.readFileSync(path.join(root, 'HANDOFF.md'), 'utf8'), '# Existing handoff\n\nKeep my state.\n');
  assert.equal(fs.existsSync(path.join(system, 'config/system.local.json'))
    ? fs.readFileSync(path.join(system, 'config/system.local.json'), 'utf8') : null, before);
});
