'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const { fixture, REPO } = require('./helpers');

function cli(script, args, env) {
  return spawnSync(process.execPath, [path.join(REPO, script), ...args], {
    cwd: REPO, env, encoding: 'utf8', timeout: 15000,
  });
}

test('SW-04: isolated Cyrillic checkpoint persists, is searchable, retries once, and rejects a changed claim', () => {
  const root = fixture('sw-04-checkpoint', { registry: [{ project_id: 'demo-site' }] });
  const env = { ...process.env, SYSTEM2_ROOT: root };
  const args = [
    '--category', 'facts', '--statement', 'Проверена ссылка на изображение сайта',
    '--evidence', 'fixture: file exists', '--source', 'demo task 2026-09-23',
    '--scope', 'demo-site', '--status', 'confirmed', '--event-id', 'evt_sw04_demo_asset',
  ];
  const first = cli('save.js', args, env);
  assert.equal(first.status, 0, first.stderr);
  const second = cli('save.js', args, env);
  assert.equal(second.status, 0, second.stderr);
  const secondResult = JSON.parse(second.stdout);
  assert.equal(secondResult.status, 'persisted');
  assert.equal(secondResult.idempotent, true);
  const search = cli('search.js', ['--query', 'изображение сайта', '--project', 'demo-site'], env);
  assert.equal(search.status, 0, search.stderr);
  const result = JSON.parse(search.stdout);
  const hits = result.ok ? result.results : result.fallback_results;
  assert.equal(hits.length, 1);
  assert.match(hits[0].snippet, /Проверена ссылка/);
  assert.equal(hits[0].scope, 'demo-site');
  assert.equal(hits[0].status_hint, 'confirmed');
  assert.equal(hits[0].record_source, 'demo task 2026-09-23');
  const conflict = cli('save.js', [...args.slice(0, 3), 'Другая запись', ...args.slice(4)], env);
  assert.equal(conflict.status, 2);
  assert.match(conflict.stderr, /already persisted with different content/);
});

test('SW-04: failed publication leaves a local commit and reports the failure', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-04-offline-'));
  fs.mkdirSync(path.join(root, 'config'));
  fs.mkdirSync(path.join(root, '.claude', 'memory'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config', 'system.example.json'), JSON.stringify({ registry: [{ project_id: 'demo-site' }] }));
  const env = {
    ...process.env, SYSTEM2_ROOT: root, GIT_CONFIG_GLOBAL: path.join(root, 'isolated-global.gitconfig'),
    GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0',
  };
  function git(args) {
    const result = spawnSync('git', ['-C', root, ...args], { env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }
  git(['init', '-q']);
  git(['config', 'user.email', 'fixture@example.invalid']);
  git(['config', 'user.name', 'Fixture']);
  fs.mkdirSync(path.join(root, 'empty-hooks'));
  git(['config', 'core.hooksPath', path.join(root, 'empty-hooks')]);
  fs.writeFileSync(path.join(root, 'HANDOFF.md'), 'Local checkpoint remains.\n');
  git(['add', 'HANDOFF.md']);
  git(['commit', '-qm', 'fixture checkpoint']);
  git(['remote', 'add', 'origin', path.join(root, 'missing-remote.git')]);
  const before = git(['rev-parse', 'HEAD']);
  const failed = cli('sync.js', ['--push', '--branch', 'main'], env);
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /sync error:/);
  assert.equal(git(['rev-parse', 'HEAD']), before);
  assert.match(fs.readFileSync(path.join(root, 'HANDOFF.md'), 'utf8'), /Local checkpoint remains/);
});
