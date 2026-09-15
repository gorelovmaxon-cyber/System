'use strict';

// Коммит, которым writer фиксирует уже обработанную память, не должен снова
// уходить в AI: иначе цикл «запись → коммит → событие → запись» ограничен
// только ручным прекращением коммитов (измерено на живой истории: 6 `persisted`
// из 9 коммитов памяти). Признак берётся из происхождения и состава изменений,
// а не из префикса сообщения. Проверяются обе стороны: фиксация памяти
// пропускается, обычный и смешанный коммит захватываются как раньше.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { fixture, mod, REPO } = require('./helpers');

const { classify, parseSections } = mod('memory-fixation');

const BASH = 'C:\\Program Files\\Git\\usr\\bin\\bash.exe';
const hasBash = fs.existsSync(BASH);
const TEMPLATE_HOOK = fs.readFileSync(path.join(REPO, '..', '..', '.git-hooks-templates', 'post-commit'), 'utf8').replace(/\r\n/g, '\n');

const MEMORY_REL = '.claude/memory/patterns/writer-entries.md';
const CODE_REL = 'scripts/memory/queue.js';
const EVENT_ID = 'evt_0f1a2b3c4d5e';

// --- разбор диффа -----------------------------------------------------------

function section(file, options = {}) {
  const added = options.added || [];
  const removed = options.removed || [];
  return [
    `diff --git a/${file} b/${file}`,
    'index 1111111..2222222 100644',
    `--- a/${file}`,
    `+++ b/${file}`,
    `@@ -1,${1 + removed.length} +1,${1 + added.length} @@`,
    ' общий контекст',
    ...removed.map(line => '-' + line),
    ...added.map(line => '+' + line),
    '',
  ].join('\n');
}

function recordDiff(file = MEMORY_REL, eventId = EVENT_ID) {
  return section(file, {
    added: [
      '---',
      'status: observation',
      'category: patterns',
      'scope: systemqwen',
      'source: activepieces-flow',
      `event_id: ${eventId}`,
      '---',
      '',
      '## Запись, созданная writer.',
    ],
  });
}

function fixturePaths(root) {
  return { system_root: root, memory_root: path.join(root, '.claude', 'memory') };
}

function persisted(eventId = EVENT_ID, files = [MEMORY_REL]) {
  return new Map([[eventId, { event_id: eventId, status: 'persisted', written_files: files }]]);
}

// --- классификатор ----------------------------------------------------------

test('a writer memory fixation is skipped, and its paths carry no diff prefix', () => {
  const root = fixture('fixation-skip');
  const parsed = parseSections(recordDiff());
  // Регрессия: без снятия `b/` путь читался как `b/.claude/memory/...`, и ни
  // один коммит памяти не опознавался — на истории 0 распознанных из 8.
  assert.equal(parsed[0].newPath, MEMORY_REL);

  const result = classify(recordDiff(), { paths: fixturePaths(root), writerRecords: persisted() });
  assert.equal(result.skip, true);
  assert.equal(result.reason, 'writer-memory-fixation');
  assert.deepEqual(result.files, [MEMORY_REL]);
  assert.deepEqual(result.event_ids, [EVENT_ID]);
});

test('an ordinary commit is not mistaken for a memory fixation', () => {
  const root = fixture('fixation-ordinary');
  const result = classify(section(CODE_REL, { added: ['const value = 1;'] }), {
    paths: fixturePaths(root),
    writerRecords: persisted(),
  });
  assert.equal(result.skip, false);
  assert.equal(result.reason, 'touches-outside-memory');
});

test('a mixed commit that also changes code is not excluded', () => {
  const root = fixture('fixation-mixed');
  const diff = recordDiff() + section(CODE_REL, { added: ['const value = 1;'] });
  const result = classify(diff, { paths: fixturePaths(root), writerRecords: persisted() });
  assert.equal(result.skip, false);
  assert.equal(result.reason, 'touches-outside-memory');
});

test('a memory-only commit that is not a writer file is captured as usual', () => {
  const root = fixture('fixation-not-writer');
  const diff = section('.claude/memory/MEMORY.md', { added: ['- [Тема](topic.md)'] });
  const result = classify(diff, { paths: fixturePaths(root), writerRecords: persisted() });
  assert.equal(result.skip, false);
  assert.equal(result.reason, 'not-a-writer-file');
});

test('a record whose event is not persisted yet is captured rather than skipped', () => {
  const root = fixture('fixation-not-persisted');
  // Файл принадлежит writer'у по завершённой записи, но в diff добавлен
  // event_id события, которое ещё не завершилось: фиксация не доказана.
  const inFlight = 'evt_998877665544';
  const diff = recordDiff(MEMORY_REL, EVENT_ID) + recordDiff(MEMORY_REL, inFlight);
  const result = classify(diff, { paths: fixturePaths(root), writerRecords: persisted() });
  assert.equal(result.skip, false);
  assert.equal(result.reason, 'event-not-yet-persisted');
});

test('a memory commit that removes content is captured rather than skipped', () => {
  const root = fixture('fixation-removal');
  const diff = section(MEMORY_REL, { removed: ['## Старая запись'], added: ['## Новая запись'] });
  const result = classify(diff, { paths: fixturePaths(root), writerRecords: persisted() });
  assert.equal(result.skip, false);
  assert.equal(result.reason, 'removes-content');
});

test('a memory commit that deletes a file is captured rather than skipped', () => {
  const root = fixture('fixation-deletion');
  const diff = [
    `diff --git a/${MEMORY_REL} b/${MEMORY_REL}`,
    'deleted file mode 100644',
    `--- a/${MEMORY_REL}`,
    '+++ /dev/null',
    '@@ -1 +0,0 @@',
    '-# Записи',
    '',
  ].join('\n');
  const result = classify(diff, { paths: fixturePaths(root), writerRecords: persisted() });
  assert.equal(result.skip, false);
  assert.equal(result.reason, 'deletes-file');
});

test('a memory commit that renames a file is captured rather than skipped', () => {
  const root = fixture('fixation-rename');
  const diff = [
    'diff --git a/.claude/memory/facts/a.md b/.claude/memory/facts/b.md',
    'similarity index 100%',
    'rename from .claude/memory/facts/a.md',
    'rename to .claude/memory/facts/b.md',
    '',
  ].join('\n');
  const result = classify(diff, { paths: fixturePaths(root), writerRecords: persisted() });
  assert.equal(result.skip, false);
  assert.equal(result.reason, 'renames-file');
});

test('a quoted path is treated as insufficient data, not as memory', () => {
  const root = fixture('fixation-quoted');
  const diff = [
    'diff --git "a/.claude/memory/patterns/writer-entries.md" "b/.claude/memory/patterns/writer-entries.md"',
    `--- "a/${MEMORY_REL}"`,
    `+++ "b/${MEMORY_REL}"`,
    '@@ -1 +1 @@',
    '+## Запись',
    '',
  ].join('\n');
  const result = classify(diff, { paths: fixturePaths(root), writerRecords: persisted() });
  assert.equal(result.skip, false);
  assert.equal(result.reason, 'unparsable-path');
});

test('an empty diff and an empty added set are captured, not skipped', () => {
  const root = fixture('fixation-empty');
  const options = { paths: fixturePaths(root), writerRecords: persisted() };
  assert.equal(classify('', options).reason, 'no-file-sections');
  assert.equal(classify(section(CODE_REL, { added: ['x'] }), options).reason, 'touches-outside-memory');
});

test('a failure of the check itself is reported instead of read as a fixation', () => {
  const broken = { get system_root() { throw new Error('boom'); } };
  const result = classify(recordDiff(), { paths: broken, writerRecords: persisted() });
  assert.equal(result.skip, false);
  assert.match(result.reason, /^classifier-error: boom/);
});

// --- сквозной путь через hook ----------------------------------------------

function git(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
}

function installHook(project) {
  const hooks = path.join(project, 'test-hooks');
  fs.mkdirSync(hooks, { recursive: true });
  fs.writeFileSync(path.join(hooks, 'post-commit'), TEMPLATE_HOOK);
  git(project, ['config', 'core.hooksPath', hooks]);
}

// Память, каталог данных и репозиторий — один корень, как в рабочей копии:
// hook и capture.js видят один и тот же SYSTEM2_ROOT.
function projectSystem(name) {
  const root = fixture(name, { registry: [{ project_id: 'A' }] });
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.cpSync(REPO, path.join(root, 'scripts', 'memory'), { recursive: true });
  git(root, ['init', '-q']);
  git(root, ['config', 'user.email', 'fixture@example.invalid']);
  git(root, ['config', 'user.name', 'Fixture']);
  const memory = path.join(root, MEMORY_REL);
  fs.mkdirSync(path.dirname(memory), { recursive: true });
  fs.writeFileSync(memory, '# Записи writer\n');
  const writerDir = path.join(root, '.local', 'writer');
  fs.mkdirSync(writerDir, { recursive: true });
  fs.appendFileSync(path.join(writerDir, 'processed.jsonl'), JSON.stringify({
    indexed: true, event_id: EVENT_ID, status: 'persisted', written_files: [MEMORY_REL],
  }) + '\n');
  git(root, ['add', '.claude/memory/patterns/writer-entries.md']);
  git(root, ['commit', '-qm', 'base']);
  installHook(root);
  return root;
}

function commitEvents(system) {
  const file = path.join(system, '.local', 'queue', 'events.jsonl');
  if (!fs.existsSync(file)) return [];
  const current = new Map();
  for (const record of mod('jsonl').readJsonl(file)) current.set(record.event.event_id, record);
  return [...current.values()].filter(record => record.event.kind === 'commit');
}

async function waitForCommits(system, count, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const commits = commitEvents(system);
    if (commits.length >= count || Date.now() > deadline) return commits;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

// Пути перечисляются явно: `git add -A` подхватывает транзитные файлы владения
// из `.locks/` и падает, если такой файл исчез между сканированием и индексацией.
function commitAll(project, message, paths) {
  git(project, ['add', ...paths]);
  const result = spawnSync('git', ['-C', project, 'commit', '-qm', message], {
    env: { ...process.env, SYSTEM2_ROOT: project, SYSTEM2_PROJECT_ID: 'A' },
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30000,
  });
  assert.equal(result.status, 0, result.stderr);
}

test('an ordinary commit is still captured through the hook', { skip: !hasBash }, async () => {
  const system = projectSystem('fixation-hook-ordinary');
  fs.writeFileSync(path.join(system, 'ordinary.txt'), 'ORDINARY_MARKER');
  commitAll(system, 'L06: обычный коммит с кодом', ['ordinary.txt']);
  const commits = await waitForCommits(system, 1);
  assert.equal(commits.length, 1);
  assert.match(commits[0].event.diff, /ORDINARY_MARKER/);
});

test('a mixed commit with code changes is still captured through the hook', { skip: !hasBash }, async () => {
  const system = projectSystem('fixation-hook-mixed');
  fs.appendFileSync(path.join(system, MEMORY_REL), [
    '---', 'status: observation', `event_id: ${EVENT_ID}`, '---', '', '## Запись writer.', '',
  ].join('\n'));
  fs.writeFileSync(path.join(system, 'code.txt'), 'MIXED_MARKER');
  commitAll(system, 'L06: смешанный коммит — память и код', [MEMORY_REL, 'code.txt']);
  const commits = await waitForCommits(system, 1);
  assert.equal(commits.length, 1);
  assert.match(commits[0].event.diff, /MIXED_MARKER/);
});

test('a writer memory fixation produces no event and does not continue the cycle', { skip: !hasBash }, async () => {
  const system = projectSystem('fixation-hook-memory');
  // Положительный контроль в той же фикстуре: hook вообще срабатывает.
  fs.writeFileSync(path.join(system, 'control.txt'), 'CONTROL_MARKER');
  commitAll(system, 'L06: контрольный обычный коммит', ['control.txt']);
  assert.equal((await waitForCommits(system, 1)).length, 1);

  fs.appendFileSync(path.join(system, MEMORY_REL), [
    '---', 'status: observation', `event_id: ${EVENT_ID}`, '---', '', '## Запись writer.', '',
  ].join('\n'));
  commitAll(system, 'memory: фиксация уже обработанной памяти', [MEMORY_REL]);

  // Цикл продолжается только новым событием, поэтому ожидание ограничено:
  // отсутствие события и есть проверяемый факт.
  await new Promise(resolve => setTimeout(resolve, 1500));
  assert.equal(commitEvents(system).length, 1);
});
