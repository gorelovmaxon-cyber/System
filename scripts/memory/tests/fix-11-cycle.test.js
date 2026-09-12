'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { fixture, mod, REPO } = require('./helpers');

const { DurableQueue } = mod('queue');
const { watch, acquireWorkerLock } = mod('queue-worker');
const { createEvent } = mod('events');
const { lockStatePath } = mod('ipc-lock');

const BASH = 'C:\\Program Files\\Git\\usr\\bin\\bash.exe';
const hasBash = fs.existsSync(BASH);
const TEMPLATE_HOOK = fs.readFileSync(path.join(REPO, '..', '..', '.git-hooks-templates', 'post-commit'), 'utf8').replace(/\r\n/g, '\n');

function git(root, args, options = {}) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true, ...options });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
}

function initRepo(root) {
  git(root, ['init', '-q']);
  git(root, ['config', 'user.email', 'fixture@example.invalid']);
  git(root, ['config', 'user.name', 'Fixture']);
}

function installHook(project) {
  const hooks = path.join(project, 'test-hooks');
  fs.mkdirSync(hooks, { recursive: true });
  fs.writeFileSync(path.join(hooks, 'post-commit'), TEMPLATE_HOOK);
  git(project, ['config', 'core.hooksPath', hooks]);
}

// Журнал очереди — append-only: одна строка на переход состояния. Текущее
// состояние события — последняя строка с его event_id.
function queueRecords(system) {
  const current = new Map();
  for (const record of mod('jsonl').readJsonl(path.join(system, '.local', 'queue', 'events.jsonl'))) {
    current.set(record.event.event_id, record);
  }
  return [...current.values()].sort((left, right) => left.created_at.localeCompare(right.created_at));
}

// Hook ставит повторную доставку в фон, поэтому журнал дописывается и после
// возврата commit: ожидание ведётся по событиям, а не по строкам журнала.
async function waitForCommits(system, count) {
  const deadline = Date.now() + 15000;
  for (;;) {
    let commits = [];
    try { commits = queueRecords(system).filter(record => record.event.kind === 'commit'); } catch {}
    if (commits.length >= count || Date.now() > deadline) return commits;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

function event(sha = 'a'.repeat(40)) {
  return createEvent({ kind: 'commit', project_id: 'A', sha, summary: 'synthetic', diff: '' });
}

function systemRoot(name) {
  const root = fixture(name, { registry: [{ project_id: 'A' }] });
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.cpSync(REPO, path.join(root, 'scripts', 'memory'), { recursive: true });
  return root;
}

// G19: у первого commit нет HEAD^, поэтому жёсткий `git diff HEAD^ HEAD`
// завершался ошибкой, ошибка подавлялась, и событие сохранялось с пустым diff.
test('G19: the first commit of a repository is captured with a real diff', { skip: !hasBash }, async () => {
  const system = systemRoot('g19-system');
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 's2-g19-project-'));
  initRepo(project);
  installHook(project);
  const env = { ...process.env, SYSTEM2_ROOT: system, SYSTEM2_PROJECT_ID: 'A' };
  fs.writeFileSync(path.join(project, 'initial.txt'), 'INITIAL_DIFF_MARKER');
  git(project, ['add', 'initial.txt']);
  const commit = spawnSync('git', ['-C', project, 'commit', '-qm', 'initial commit'], { env, encoding: 'utf8', windowsHide: true, timeout: 30000 });
  assert.equal(commit.status, 0, commit.stderr);
  const records = await waitForCommits(system, 1);
  assert.equal(records.length, 1);
  assert.match(records[0].event.diff, /INITIAL_DIFF_MARKER/);

  fs.writeFileSync(path.join(project, 'initial.txt'), 'SECOND_DIFF_MARKER');
  git(project, ['add', 'initial.txt']);
  const second = spawnSync('git', ['-C', project, 'commit', '-qm', 'second commit'], { env, encoding: 'utf8', windowsHide: true, timeout: 30000 });
  assert.equal(second.status, 0, second.stderr);
  const after = await waitForCommits(system, 2);
  assert.equal(after.length, 2);
  assert.match(after[1].event.diff, /SECOND_DIFF_MARKER/);
  assert.match(after[1].event.diff, /INITIAL_DIFF_MARKER/);
});

// Политика merge-commit: сравнение с первым родителем — оговорённый выбор, а не
// молчаливое «изменений нет». Merge оформляется через `git commit`, потому что
// `git merge` сам post-commit не вызывает (проверено на Git 2.55): у merge-commit
// hook срабатывает тогда, когда его коммитит человек — в том числе после
// разрешения конфликта.
test('G19: a merge commit is captured against its first parent', { skip: !hasBash }, async () => {
  const system = systemRoot('g19-merge-system');
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 's2-g19-merge-'));
  initRepo(project);
  installHook(project);
  const env = { ...process.env, SYSTEM2_ROOT: system, SYSTEM2_PROJECT_ID: 'A' };
  fs.writeFileSync(path.join(project, 'file.txt'), 'base');
  git(project, ['add', 'file.txt']);
  git(project, ['commit', '-qm', 'base']);
  git(project, ['branch', '-M', 'main']);
  git(project, ['checkout', '-qb', 'side']);
  fs.writeFileSync(path.join(project, 'side.txt'), 'SIDE_MARKER');
  git(project, ['add', 'side.txt']);
  git(project, ['commit', '-qm', 'side']);
  git(project, ['checkout', '-q', 'main']);
  fs.writeFileSync(path.join(project, 'main.txt'), 'MAIN_MARKER');
  git(project, ['add', 'main.txt']);
  git(project, ['commit', '-qm', 'main']);
  git(project, ['merge', '--no-commit', '--no-ff', 'side']);
  const merge = spawnSync('git', ['-C', project, 'commit', '-qm', 'merge side'], { env, encoding: 'utf8', windowsHide: true, timeout: 30000 });
  assert.equal(merge.status, 0, merge.stderr);
  const parents = git(project, ['rev-list', '--parents', '-n', '1', 'HEAD']).split(' ').slice(1);
  assert.equal(parents.length, 2);
  const records = await waitForCommits(system, 1);
  assert.equal(records.length, 1);
  assert.match(records[0].event.diff, /SIDE_MARKER/);
  assert.doesNotMatch(records[0].event.diff, /MAIN_MARKER/);
});

// Ошибка получения diff не выдаётся за корректный пустой diff: иначе
// недоступность diff выглядела бы как commit без изменений. Недоступность
// создаётся штатным способом — сломанным textconv-фильтром в атрибутах.
test('G19: a diff that cannot be computed is reported instead of passed off as empty', { skip: !hasBash }, async () => {
  const system = systemRoot('g19-fail-system');
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 's2-g19-fail-'));
  initRepo(project);
  installHook(project);
  fs.writeFileSync(path.join(project, 'file.txt'), 'base');
  git(project, ['add', 'file.txt']);
  git(project, ['commit', '-qm', 'base']);
  fs.writeFileSync(path.join(project, '.gitattributes'), 'file.txt diff=broken\n');
  git(project, ['config', 'diff.broken.textconv', 'textconv-that-does-not-exist']);
  fs.writeFileSync(path.join(project, 'file.txt'), 'next');
  git(project, ['add', 'file.txt']);
  const env = { ...process.env, SYSTEM2_ROOT: system, SYSTEM2_PROJECT_ID: 'A' };
  const commit = spawnSync('git', ['-C', project, 'commit', '-qm', 'second'], { env, encoding: 'utf8', windowsHide: true, timeout: 30000 });
  assert.equal(commit.status, 0, commit.stderr);
  const head = git(project, ['rev-parse', 'HEAD']);
  const records = await waitForCommits(system, 1);
  assert.equal(records.length, 1);
  assert.notEqual(records[0].event.diff.trim(), '');
  assert.match(records[0].event.diff, /could not be computed/);
  assert.match(records[0].event.diff, new RegExp(head));
});

// G12: один проход drain оставлял pending до следующего commit. Проверяется
// критерий аудита: сервис недоступен → событие durable → сервис доступен →
// событие завершилось без нового commit и без ручного capture.
test('G12: a durable event completes after the service returns, without a new commit', async () => {
  const root = fixture('g12-watch');
  const queue = new DurableQueue({ dir: path.join(root, '.local', 'queue'), retriesMax: 5, backoffMs: 50 });
  queue.enqueue(event());
  let calls = 0;
  const deliver = async () => {
    calls += 1;
    if (calls <= 2) return { ok: false, retryable: true, error: 'service down' };
    return { ok: true };
  };
  const snapshot = fs.readFileSync(queue.file, 'utf8');
  const result = await watch({ queue, deliver, maxIdleMs: 30000 });
  assert.equal(result.status, 'idle');
  assert.equal(result.delivered, 1);
  assert.equal(calls, 3);
  assert.equal(queue.list()[0].status, 'delivered');
  assert.equal(queue.list()[0].attempts, 2);
  // Новый commit или повторный capture не выполнялись: журнал очереди вырос
  // только записями о доставке.
  assert.equal(fs.readFileSync(queue.file, 'utf8').startsWith(snapshot), true);
});

test('G12: watch stops with an honest status instead of retrying forever', async () => {
  const root = fixture('g12-bounded');
  const queue = new DurableQueue({ dir: path.join(root, '.local', 'queue'), retriesMax: 2, backoffMs: 10 });
  queue.enqueue(event());
  let calls = 0;
  const result = await watch({ queue, deliver: async () => { calls += 1; return { ok: false, retryable: true, error: 'endpoint down' }; }, revive: false, maxIdleMs: 5000 });
  assert.equal(result.status, 'failed');
  assert.equal(result.failed, 1);
  assert.equal(calls, 2);
  assert.equal(queue.list()[0].status, 'failed');
  assert.equal(queue.list()[0].last_error, 'endpoint down');
});

test('G12: only one worker owns the queue at a time', async () => {
  const root = fixture('g12-single');
  const queue = new DurableQueue({ dir: path.join(root, '.local', 'queue') });
  const hold = acquireWorkerLock(queue, { attempts: 1 });
  try {
    await assert.rejects(
      () => watch({ queue, deliver: async () => ({ ok: true }), maxIdleMs: 1000 }),
      /another queue worker is already running/,
    );
  } finally {
    hold();
  }
  assert.equal(fs.existsSync(lockStatePath(queue.dir)), false);
  const result = await watch({ queue, deliver: async () => ({ ok: true }), maxIdleMs: 1000 });
  assert.equal(result.status, 'idle');
});

// G17: push без аргументов отправлял локальное имя ветки (`origin local-work`),
// создавая на remote новую ветку и оставляя ветку синхронизации без изменений.
test('G17: sync --push publishes the upstream destination, not the local branch name', () => {
  const root = fixture('g17-sync');
  initRepo(root);
  fs.writeFileSync(path.join(root, 'file.txt'), 'base');
  git(root, ['add', 'file.txt']);
  git(root, ['commit', '-qm', 'base']);
  git(root, ['branch', '-M', 'main']);
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), 's2-g17-bare-'));
  git(bare, ['init', '--bare', '-q']);
  git(root, ['remote', 'add', 'origin', bare]);
  git(root, ['push', '-qu', 'origin', 'main']);
  const before = git(bare, ['rev-parse', 'refs/heads/main']);
  git(root, ['checkout', '-qb', 'local-work']);
  git(root, ['branch', '--set-upstream-to=origin/main']);
  fs.appendFileSync(path.join(root, 'file.txt'), 'new');
  git(root, ['add', 'file.txt']);
  git(root, ['commit', '-qm', 'new']);
  const result = spawnSync(process.execPath, [path.join(REPO, 'sync.js'), '--push'], {
    cwd: root, env: { ...process.env, SYSTEM2_ROOT: root }, encoding: 'utf8', windowsHide: true, timeout: 30000,
  });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.pushed, true);
  assert.equal(report.remote, 'origin');
  assert.equal(report.branch, 'main');
  assert.equal(report.local_branch, 'local-work');
  assert.equal(report.refspec, 'HEAD:refs/heads/main');
  assert.equal(report.verified, true);
  const after = git(bare, ['rev-parse', 'refs/heads/main']);
  assert.notEqual(after, before);
  assert.equal(after, git(root, ['rev-parse', 'HEAD']));
  const other = spawnSync('git', ['-C', bare, 'rev-parse', 'refs/heads/local-work'], { encoding: 'utf8', windowsHide: true });
  assert.notEqual(other.status, 0);
});

test('G17: an explicit --branch names the destination, and no upstream means no push', () => {
  const root = fixture('g17-explicit');
  initRepo(root);
  fs.writeFileSync(path.join(root, 'file.txt'), 'base');
  git(root, ['add', 'file.txt']);
  git(root, ['commit', '-qm', 'base']);
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), 's2-g17-explicit-bare-'));
  git(bare, ['init', '--bare', '-q']);
  git(root, ['remote', 'add', 'origin', bare]);
  const implicit = spawnSync(process.execPath, [path.join(REPO, 'sync.js'), '--push'], {
    cwd: root, env: { ...process.env, SYSTEM2_ROOT: root }, encoding: 'utf8', windowsHide: true, timeout: 30000,
  });
  assert.equal(implicit.status, 1);
  assert.match(implicit.stderr, /no upstream branch to sync with/);
  const refs = git(bare, ['for-each-ref', '--format=%(refname)', 'refs/heads']);
  assert.equal(refs, '');
  const explicit = spawnSync(process.execPath, [path.join(REPO, 'sync.js'), '--push', '--branch', 'published'], {
    cwd: root, env: { ...process.env, SYSTEM2_ROOT: root }, encoding: 'utf8', windowsHide: true, timeout: 30000,
  });
  assert.equal(explicit.status, 0, explicit.stderr);
  const report = JSON.parse(explicit.stdout);
  assert.equal(report.branch, 'published');
  assert.equal(report.verified, true);
  assert.equal(git(bare, ['rev-parse', 'refs/heads/published']), git(root, ['rev-parse', 'HEAD']));
});
