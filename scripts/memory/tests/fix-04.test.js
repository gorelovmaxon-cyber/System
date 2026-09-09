'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { fixture, proposal, memoryFile, mod, REPO } = require('./helpers');

const writer = mod('writer');
const writerLog = mod('writer-log');
const indexerLog = mod('indexer-log');
const SAVE = path.join(REPO, 'save.js');
const SEARCH = path.join(REPO, 'search.js');
const SYNC = path.join(REPO, 'sync.js');
const CRASH = path.join(__dirname, 'fix-04-crash.cjs');

function runSave(args) {
  return spawnSync(process.execPath, [SAVE, ...args], { env: process.env, encoding: 'utf8' });
}

function runGit(dir, args, options = {}) {
  const result = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', ...options });
  return result;
}

test('F04: CLI save without services persists; a new process finds the record', () => {
  const root = fixture('fix04-cli');
  const args = ['--event-id', 'evt_imm', '--statement', 'IMMEDIATE_MARKER', '--category', 'facts', '--evidence', 'fixture', '--scope', 'A'];

  const r = runSave(args);
  assert.equal(r.status, 0, r.stderr);
  const result = JSON.parse(r.stdout);
  assert.equal(result.status, 'persisted');
  assert.ok(fs.existsSync(memoryFile(root)));

  // «перезапуск»: отдельный процесс search находит запись через локальный fallback
  const s = spawnSync(process.execPath, [SEARCH, '--query', 'IMMEDIATE_MARKER', '--project', 'A'], { env: process.env, encoding: 'utf8' });
  const out = JSON.parse(s.stdout);
  const hits = out.ok ? out.results : out.fallback_results;
  assert.equal(hits.length, 1);
  assert.equal(hits[0].scope, 'A');
  assert.equal(hits[0].source, '.claude/memory/facts/writer-entries.md');
});

test('F04: interrupted save (intent only, process died) is recovered, not falsely persisted', () => {
  const root = fixture('fix04-crash');
  const args = ['--event-id', 'evt_interrupted', '--statement', 'NEVER_PERSISTED_FOR_REAL', '--category', 'facts', '--evidence', 'fixture'];

  const crash = spawnSync(process.execPath, [CRASH, ...args], { env: process.env, encoding: 'utf8' });
  assert.equal(crash.status, 1);

  // RED on original: repeat reports persisted while no memory file exists
  const r = runSave(args);
  assert.equal(r.status, 0, r.stderr);
  const result = JSON.parse(r.stdout);
  assert.equal(result.status, 'persisted');
  assert.ok(fs.existsSync(memoryFile(root)));
  assert.match(fs.readFileSync(memoryFile(root), 'utf8'), /NEVER_PERSISTED_FOR_REAL/);

  const r2 = runSave(args);
  assert.equal(JSON.parse(r2.stdout).idempotent, true);
  const text = fs.readFileSync(memoryFile(root), 'utf8');
  assert.equal((text.match(/NEVER_PERSISTED_FOR_REAL/g) || []).length, 1);
});

test('F04: kill mid-save then repeat never yields false persisted or duplicates', async () => {
  for (const delay of [0, 10, 30, 60]) {
    const root = fixture('fix04-kill-' + delay);
    const eventId = 'evt_kill_' + delay;
    const args = ['--event-id', eventId, '--statement', 'KILL_MARKER_' + delay, '--category', 'facts', '--evidence', 'fixture'];

    const child = spawn(process.execPath, [SAVE, ...args], { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise(resolve => setTimeout(resolve, delay));
    child.kill();
    await new Promise(resolve => child.on('exit', resolve));

    const r = runSave(args);
    assert.equal(r.status, 0, r.stderr);
    const result = JSON.parse(r.stdout);
    if (result.status === 'persisted') {
      assert.ok(fs.existsSync(memoryFile(root)), 'no false persisted without file (delay ' + delay + ')');
      const text = fs.readFileSync(memoryFile(root), 'utf8');
      assert.equal((text.match(new RegExp('KILL_MARKER_' + delay, 'g')) || []).length, 1);
    }
  }
});

test('F04: deterministic crash at each write stage is recovered by the real writer', () => {
  const stages = ['after-lock', 'after-intent', 'after-write', 'after-persisted'];
  for (const stage of stages) {
    const root = fixture('fix04-stage-' + stage);
    const eventId = 'evt_stage_' + stage;
    const args = ['--event-id', eventId, '--statement', 'STAGE_MARKER_' + stage, '--category', 'facts', '--evidence', 'fixture', '--scope', 'A'];
    const env = { ...process.env, SYSTEM2_CRASH_AT: stage };

    // реальный save.js падает в заданной точке writeProposal (exit 23), lock остаётся
    const crash = spawnSync(process.execPath, [SAVE, ...args], { env, encoding: 'utf8' });
    assert.equal(crash.status, 23, 'crash point ' + stage + ' must fire');
    assert.ok(fs.existsSync(path.join(root, '.local', 'writer', 'memory.lock')), 'lock survives crash at ' + stage);

    // следующий запуск восстанавливает lock мёртвого владельца и завершает запись
    const r = runSave(args);
    assert.equal(r.status, 0, 'stage ' + stage + ': ' + r.stderr);
    assert.equal(JSON.parse(r.stdout).status, 'persisted', 'stage ' + stage);
    const text = fs.readFileSync(memoryFile(root), 'utf8');
    assert.equal((text.match(new RegExp('STAGE_MARKER_' + stage, 'g')) || []).length, 1, 'no duplicates at stage ' + stage);

    const r2 = runSave(args);
    assert.equal(JSON.parse(r2.stdout).idempotent, true, 'repeat idempotent at stage ' + stage);
    assert.equal((fs.readFileSync(memoryFile(root), 'utf8').match(new RegExp('STAGE_MARKER_' + stage, 'g')) || []).length, 1);
  }
});

test('F04: index queue failure keeps write persisted and records a visible cause', () => {
  const root = fixture('fix04-index-fail');
  // .local/indexer превращаем в файл — очередь индекса не сможет создать каталог
  fs.mkdirSync(path.join(root, '.local'), { recursive: true });
  fs.writeFileSync(path.join(root, '.local', 'indexer'), 'not a directory', 'utf8');

  const result = writer.writeProposal('evt_idx_fail', [proposal('INDEX_FAIL_MARKER')]);
  assert.equal(result.status, 'persisted');
  assert.match(fs.readFileSync(memoryFile(root), 'utf8'), /INDEX_FAIL_MARKER/);

  // RED on original: причина сбоя очереди не записывается (пустой catch)
  const record = writerLog.get('evt_idx_fail');
  assert.match(record.index_error || '', /ENOTDIR|EEXIST|ENOENT|not a directory/i);
  assert.equal([...indexerLog.records().values()].length, 0);
});

test('F04: writeAtomic cleans up its temp file when the rename fails', () => {
  const root = fixture('fix04-tmp');
  const originalRename = fs.renameSync;
  // детерминированный сбой rename ПОСЛЕ создания tmp: на исходной реализации
  // writeAtomic tmp остаётся (RED), после фикса — подчищается (GREEN)
  fs.renameSync = () => { throw new Error('simulated rename failure'); };
  try {
    assert.throws(() => writer.writeProposal('evt_tmp', [proposal('TMP_FAIL')]), /simulated rename failure/);
  } finally {
    fs.renameSync = originalRename;
  }
  const leftovers = fs.readdirSync(path.join(root, '.claude/memory/facts')).filter(name => name.includes('.tmp-'));
  assert.equal(leftovers.length, 0);
});

test('F04: divergence on the same memory file conflicts on pull; resolution keeps both versions', () => {
  const root = fixture('fix04-remote');
  const remoteRoot = fs.mkdtempSync(path.join(os.tmpdir(), 's2-remote-'));
  const remotePath = path.join(remoteRoot, 'origin.git');
  assert.equal(runGit(root, ['init', '--bare', remotePath]).status, 0);

  runGit(root, ['init', '-b', 'master']);
  runGit(root, ['config', 'user.email', 'test@example.com']);
  runGit(root, ['config', 'user.name', 'Test']);
  runGit(root, ['add', '.']);
  runGit(root, ['commit', '-m', 'base']);
  runGit(root, ['remote', 'add', 'origin', remotePath]);
  assert.equal(runGit(root, ['push', '-u', 'origin', 'master']).status, 0);

  // A: запись памяти без push — persisted != synced
  const r = runSave(['--event-id', 'evt_remote_a', '--statement', 'REMOTE_A_MARKER', '--category', 'facts', '--evidence', 'fixture', '--scope', 'A']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).status, 'persisted');
  const s = spawnSync(process.execPath, [SYNC, '--status'], { env: process.env, encoding: 'utf8' });
  const status = JSON.parse(s.stdout);
  assert.ok(status.memory_changes.length > 0);
  assert.equal(status.clean, false);

  // A коммитит, но НЕ пушит — создаём расхождение с remote
  runGit(root, ['add', '.']);
  assert.equal(runGit(root, ['commit', '-m', 'memory from A']).status, 0);

  // B (копия с базы) пишет в ТОТ ЖЕ файл facts, коммитит и пушит
  const other = path.join(remoteRoot, 'other');
  assert.equal(runGit(remoteRoot, ['clone', remotePath, other]).status, 0);
  runGit(other, ['config', 'user.email', 'test2@example.com']);
  runGit(other, ['config', 'user.name', 'Test2']);
  const envB = { ...process.env, SYSTEM2_ROOT: other };
  const b = spawnSync(process.execPath, [SAVE, '--event-id', 'evt_remote_b', '--statement', 'REMOTE_B_MARKER', '--category', 'facts', '--evidence', 'fixture', '--scope', 'B'], { env: envB, encoding: 'utf8' });
  assert.equal(b.status, 0, b.stderr);
  runGit(other, ['add', '.']);
  assert.equal(runGit(other, ['commit', '-m', 'memory from B']).status, 0);
  assert.equal(runGit(other, ['push', 'origin', 'master']).status, 0);

  // pull в A даёт настоящий content-конфликт в общем файле (оба добавляли в конец)
  const pull = runGit(root, ['pull', 'origin', 'master']);
  assert.notEqual(pull.status, 0, 'pull must conflict on the shared file: ' + pull.stdout + pull.stderr);

  const facts = path.join(root, '.claude/memory/facts/writer-entries.md');
  const conflicted = fs.readFileSync(facts, 'utf8');
  assert.match(conflicted, /<<<<<<</, 'conflict markers must be present');

  // разрешение: обе стороны конфликта сохраняются в файле
  fs.writeFileSync(facts,
    conflicted.replace(/^<<<<<<< .*\n/gm, '').replace(/^=======\n/gm, '').replace(/^>>>>>>> .*\n/gm, ''),
    'utf8');
  runGit(root, ['add', '.']);
  assert.equal(runGit(root, ['commit', '-m', 'merge: keep both sides']).status, 0);

  const text = fs.readFileSync(facts, 'utf8');
  assert.match(text, /REMOTE_A_MARKER/);
  assert.match(text, /REMOTE_B_MARKER/);

  // явный push после разрешения конфликта
  const pushed = spawnSync(process.execPath, [SYNC, '--push'], { env: process.env, encoding: 'utf8' });
  assert.equal(pushed.status, 0, pushed.stderr);
  assert.match(pushed.stdout, /"pushed"\s*:\s*true/);
});
