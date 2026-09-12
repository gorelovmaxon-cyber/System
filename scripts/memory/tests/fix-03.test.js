'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { fixture, mod } = require('./helpers');

const { localResults, searchKhoj, relativeSource } = mod('search');

function stubKhoj(resultsPayload) {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (String(url).includes('/health')) return { ok: true, text: async () => '{}' };
    return { ok: true, text: async () => JSON.stringify({ results: resultsPayload }) };
  };
  return () => { global.fetch = originalFetch; };
}

function entry(scope, status, statement) {
  return '---\nstatus: ' + status + '\ncategory: facts\nscope: ' + scope + '\nsource: test\nevidence: synthetic\nevent_id: evt_' + statement + '\n---\n\n## ' + statement + '\n';
}

function writeMemory(root, content) {
  const file = path.join(root, '.claude/memory/facts/writer-entries.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

test('F04: entry of project B in a shared file is not visible from project A', () => {
  const root = fixture('fix03-isolation');
  writeMemory(root, entry('user', 'observation', 'PUBLIC_MARKER') + entry('B', 'confirmed', 'PRIVATE_B_MARKER'));

  // RED on original: whole-file scope is the first entry (user) -> leak
  assert.equal(localResults('PRIVATE_B_MARKER', 'A').length, 0);
  const fromB = localResults('PRIVATE_B_MARKER', 'B');
  assert.equal(fromB.length, 1);
  assert.equal(fromB[0].scope, 'B');
  assert.equal(fromB[0].status_hint, 'confirmed');

  assert.equal(localResults('PUBLIC_MARKER', 'A').length, 1);
  assert.equal(localResults('PUBLIC_MARKER', 'B').length, 1);
});

test('F04: isolation holds with reversed order (project entry written first)', () => {
  const root = fixture('fix03-reversed');
  writeMemory(root, entry('B', 'observation', 'PRIVATE_FIRST') + entry('user', 'observation', 'PUBLIC_LATER'));

  // RED on original: whole-file scope is B -> shared entry invisible from A
  assert.equal(localResults('PRIVATE_FIRST', 'A').length, 0);
  assert.equal(localResults('PRIVATE_FIRST', 'B').length, 1);
  assert.equal(localResults('PUBLIC_LATER', 'A').length, 1);
  assert.equal(localResults('PUBLIC_LATER', 'B').length, 1);
});

test('R3: hand-written single-entry file without frontmatter is visible only at user level', () => {
  const root = fixture('fix03-hand');
  const file = path.join(root, '.claude/memory/user-profile/note.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '# Personal note\nHAND_NOTE_MARKER body', 'utf8');

  // RED on original: неизвестный scope открывался любому проекту
  assert.equal(localResults('HAND_NOTE_MARKER', 'A').length, 0);
  const res = localResults('HAND_NOTE_MARKER');
  assert.equal(res.length, 1);
  assert.equal(res[0].scope, 'unknown');
  assert.equal(res[0].source, '.claude/memory/user-profile/note.md');
});

test('F04: status_hint and scope come from the matching entry, not the file first entry', () => {
  const root = fixture('fix03-meta');
  writeMemory(root, entry('user', 'observation', 'FIRST_ENTRY') + entry('B', 'superseded', 'SECOND_ENTRY'));

  // RED on original: meta of first entry leaks into the second entry result
  const res = localResults('SECOND_ENTRY', 'B');
  assert.equal(res.length, 1);
  assert.equal(res[0].status_hint, 'superseded');
  assert.equal(res[0].scope, 'B');
});

test('F04: one file with several entries can yield several results; limit applies', () => {
  const root = fixture('fix03-limit');
  writeMemory(root,
    entry('user', 'observation', 'LIMIT_HIT_ONE') +
    entry('user', 'observation', 'LIMIT_HIT_TWO') +
    entry('user', 'observation', 'LIMIT_HIT_THREE') +
    entry('user', 'observation', 'LIMIT_HIT_FOUR'));

  // RED on original: whole-file search returns a single result for the file
  const res = localResults('LIMIT_HIT', 'A', { limit: 2 });
  assert.equal(res.length, 2);
  assert.ok(res.every(item => item.source === '.claude/memory/facts/writer-entries.md'));
});

test('F04: searchKhoj local fallback is isolated per project', async () => {
  const root = fixture('fix03-fallback');
  writeMemory(root, entry('user', 'observation', 'PUBLIC_FB') + entry('B', 'observation', 'PRIVATE_FB'));

  // RED on original: fallback leaks PRIVATE_FB into project A results
  const fromA = await searchKhoj('PRIVATE_FB', 'A');
  assert.equal(fromA.ok, false);
  assert.equal(fromA.fallback_results.length, 0);

  const fromB = await searchKhoj('PRIVATE_FB', 'B');
  assert.equal(fromB.fallback_results.length, 1);
  assert.equal(fromB.fallback_results[0].scope, 'B');
});

test('R2: Khoj positive path attributes each hit to the local entry and keeps project isolation', async () => {
  const root = fixture('fix03-r2-khoj');
  writeMemory(root, entry('user', 'observation', 'PUBLIC_KHOJ') + entry('B', 'confirmed', 'PRIVATE_B'));
  const restore = stubKhoj([
    { source: 'facts/writer-entries.md', snippet: 'PRIVATE_B', score: 0.9 },
  ]);
  try {
    // RED on original: snippet брался из сервиса, scope — первой записи файла (user)
    const fromA = await searchKhoj('PRIVATE_B', 'A', { force: true });
    assert.equal(fromA.ok, true, JSON.stringify(fromA));
    assert.equal(fromA.results.length, 0, 'project A must not see B entry: ' + JSON.stringify(fromA));

    const fromB = await searchKhoj('PRIVATE_B', 'B', { force: true });
    assert.equal(fromB.ok, true, JSON.stringify(fromB));
    assert.equal(fromB.results.length, 1);
    assert.equal(fromB.results[0].scope, 'B');
    assert.equal(fromB.results[0].status_hint, 'confirmed');
    assert.match(fromB.results[0].snippet, /PRIVATE_B/);
  } finally {
    restore();
  }
});

test('R2: all allowed source forms resolve to the same local file', async () => {
  const root = fixture('fix03-r2-forms');
  writeMemory(root, entry('user', 'observation', 'FORM_ENTRY'));
  const restore = stubKhoj([
    { source: '.claude/memory/facts/writer-entries.md', snippet: 'FORM_ENTRY', score: 0.8 },
    { source: './facts/writer-entries.md', snippet: 'FORM_ENTRY', score: 0.8 },
    { source: './.claude/memory/facts/writer-entries.md', snippet: 'FORM_ENTRY', score: 0.8 },
    { source: 'facts/writer-entries.md', snippet: 'FORM_ENTRY', score: 0.8 },
  ]);
  try {
    const r = await searchKhoj('FORM_ENTRY', 'A', { force: true, limit: 10 });
    assert.equal(r.ok, true, JSON.stringify(r));
    // RED on original: './.claude/...' не нормализовался, файл не читался
    assert.equal(r.results.length, 4);
    assert.ok(r.results.every(x => x.source === '.claude/memory/facts/writer-entries.md'));
  } finally {
    restore();
  }
});

test('R2: hit whose local file is missing is dropped; service text is not trusted', async () => {
  const root = fixture('fix03-r2-missing');
  writeMemory(root, entry('user', 'observation', 'PRESENT_ENTRY'));
  const restore = stubKhoj([
    { source: 'facts/writer-entries.md', snippet: 'PRESENT_ENTRY', score: 0.9 },
    { source: 'patterns/missing.md', snippet: 'GHOST_MARKER', score: 0.9 },
  ]);
  try {
    const r = await searchKhoj('GHOST_MARKER', 'A', { force: true, limit: 10 });
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(r.results.length, 0, 'missing local file must not produce results');
  } finally {
    restore();
  }
});

test('R2: hit not confirmed by any local entry is dropped', async () => {
  const root = fixture('fix03-r2-unattrib');
  writeMemory(root, entry('user', 'observation', 'REAL_ENTRY'));
  const restore = stubKhoj([
    { source: 'facts/writer-entries.md', snippet: 'GHOST_MARKER', score: 0.9 },
  ]);
  try {
    const r = await searchKhoj('GHOST_MARKER', 'A', { force: true });
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(r.results.length, 0, 'unconfirmed hit must be dropped');
  } finally {
    restore();
  }
});

test('R2: hit with unknown scope is hidden from projects, visible at user level', async () => {
  const root = fixture('fix03-r2-unknown-scope');
  const file = path.join(root, '.claude/memory/patterns/manual.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '# manual\nUNKNOWN_SCOPE_MARKER body', 'utf8');
  const restore = stubKhoj([
    { source: 'patterns/manual.md', snippet: 'UNKNOWN_SCOPE_MARKER', score: 0.9 },
  ]);
  try {
    const fromA = await searchKhoj('UNKNOWN_SCOPE_MARKER', 'A', { force: true });
    assert.equal(fromA.ok, true, JSON.stringify(fromA));
    assert.equal(fromA.results.length, 0, 'unknown scope must not open to a project');

    const user = await searchKhoj('UNKNOWN_SCOPE_MARKER', undefined, { force: true });
    assert.equal(user.ok, true, JSON.stringify(user));
    assert.equal(user.results.length, 1);
    assert.equal(user.results[0].scope, 'unknown');
  } finally {
    restore();
  }
});

test('R3: CRLF file does not break entry splitting nor project isolation', () => {
  const root = fixture('fix03-r3-crlf');
  const file = path.join(root, '.claude/memory/facts/writer-entries.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, (entry('user', 'observation', 'PUBLIC_CRLF') + entry('B', 'observation', 'PRIVATE_B_CRLF')).replace(/\n/g, '\r\n'), 'utf8');

  // RED on original: LF-only разделитель видел CRLF-файл одной записью без meta
  assert.equal(localResults('PRIVATE_B_CRLF', 'A').length, 0);
  const fromB = localResults('PRIVATE_B_CRLF', 'B');
  assert.equal(fromB.length, 1);
  assert.equal(fromB[0].scope, 'B');
  assert.equal(localResults('PUBLIC_CRLF', 'A').length, 1);
});

test('R3: relativeSource normalizes all allowed forms', () => {
  const root = fixture('fix03-r3-relative');
  const memoryRoot = path.join(root, '.claude/memory');
  const want = '.claude/memory/facts/writer-entries.md';
  // RED on original: /^\.\/??/ съедал ведущую точку '.claude/...'
  assert.equal(relativeSource(memoryRoot, '.claude/memory/facts/writer-entries.md'), want);
  assert.equal(relativeSource(memoryRoot, 'facts/writer-entries.md'), want);
  assert.equal(relativeSource(memoryRoot, './facts/writer-entries.md'), want);
  assert.equal(relativeSource(memoryRoot, './.claude/memory/facts/writer-entries.md'), want);
  assert.equal(relativeSource(memoryRoot, 'C:/outside/memory.md'), null);
  assert.equal(relativeSource(memoryRoot, '..\\..\\evil.md'), null);
});

test('S2: duplicate scope in a record is fail-closed (hidden from every project; user level sees unknown)', () => {
  const root = fixture('fix03-s2-dup-scope');
  // повреждённый/ручной файл: две строки scope (B и user). Последнее значение
  // не выигрывает — scope двусмыслен и не выводится наружу (запись не
  // открывается ни одному проекту).
  writeMemory(root, '---\nstatus: observation\ncategory: facts\nscope: B\nscope: user\nsource: test\nevidence: synthetic\nevent_id: evt_dup\n---\n\n## DUP_SCOPE_MARKER\n');
  // RED on original: last-wins 'user' открывал запись проекту A
  assert.equal(localResults('DUP_SCOPE_MARKER', 'A').length, 0);
  assert.equal(localResults('DUP_SCOPE_MARKER', 'B').length, 0);
  const user = localResults('DUP_SCOPE_MARKER');
  assert.equal(user.length, 1);
  assert.equal(user[0].scope, 'unknown');
});

test('S2: duplicate status in a record is fail-closed (status_hint unknown)', () => {
  const root = fixture('fix03-s2-dup-status');
  writeMemory(root, '---\nstatus: observation\nstatus: confirmed\ncategory: facts\nscope: user\nsource: test\nevidence: synthetic\nevent_id: evt_ds\n---\n\n## DUP_STATUS_MARKER\n');
  const res = localResults('DUP_STATUS_MARKER', 'A');
  assert.equal(res.length, 1);
  // RED on original: last-wins 'confirmed' выдавался наружу как подтверждённый
  assert.equal(res[0].status_hint, 'unknown');
  assert.equal(res[0].scope, 'user');
});

test('B04: minimal local config preserves nested search and Khoj defaults', async () => {
  const root = fixture('b04-config-merge');
  fs.writeFileSync(path.join(root, 'config/system.local.json'), JSON.stringify({ local_paths: {} }));
  let calls = 0;
  const originalFetch = global.fetch;
  global.fetch = async () => { calls += 1; throw new Error('must not call disabled Khoj'); };
  try {
    const result = await searchKhoj('anything', 'A');
    assert.equal(result.error, 'khoj-unavailable');
    assert.equal(calls, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test('B05: Khoj hit resolves against a configured custom memory root', async () => {
  const root = fixture('b05-custom-memory');
  fs.writeFileSync(path.join(root, 'config/system.local.json'), JSON.stringify({ memory_root: 'custom-memory' }));
  const file = path.join(root, 'custom-memory', 'facts', 'writer-entries.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, entry('A', 'confirmed', 'CUSTOM_MEMORY_HIT'));
  const restore = stubKhoj([{ source: file, snippet: 'CUSTOM_MEMORY_HIT', score: 0.8 }]);
  try {
    const result = await searchKhoj('CUSTOM_MEMORY_HIT', 'A', { force: true });
    assert.equal(result.ok, true);
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].scope, 'A');
  } finally { restore(); }
});

test('B14: an allowed record is selected before a better forbidden record', async () => {
  const root = fixture('b14-allowed-candidate');
  writeMemory(root,
    entry('B', 'confirmed', 'SHARED_QUERY private private private') +
    entry('A', 'observation', 'SHARED_QUERY allowed details'));
  const restore = stubKhoj([{ source: 'facts/writer-entries.md', snippet: 'SHARED_QUERY private', score: 0.9 }]);
  try {
    const result = await searchKhoj('SHARED_QUERY', 'A', { force: true });
    assert.equal(result.ok, true);
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].scope, 'A');
    assert.match(result.results[0].snippet, /allowed details/);
  } finally { restore(); }
});

function countingKhoj(payload, counter) {
  const original = global.fetch;
  global.fetch = async (url) => {
    counter.calls += 1;
    if (String(url).includes('/health')) return { ok: true, text: async () => '{}' };
    return { ok: true, text: async () => JSON.stringify({ results: payload }) };
  };
  return () => { global.fetch = original; };
}

function junctionInto(root, name, target) {
  const link = path.join(root, '.claude/memory', name);
  fs.mkdirSync(path.dirname(link), { recursive: true });
  fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
  return link;
}

test('G05: a Khoj hit through a junction inside memory root is not read outside it', async () => {
  const root = fixture('g05-junction-khoj');
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 's2-g05-outside-'));
  fs.writeFileSync(path.join(outside, 'outside.md'), entry('user', 'observation', 'OUTSIDE_SECRET_MARKER'), 'utf8');
  junctionInto(root, 'linked', outside);
  const counter = { calls: 0 };
  const restore = countingKhoj([{ source: '.claude/memory/linked/outside.md', snippet: 'OUTSIDE_SECRET_MARKER', score: 0.9 }], counter);
  try {
    const result = await searchKhoj('OUTSIDE_SECRET_MARKER', undefined, { force: true });
    // RED on original: файл читался и выдавался как обычный источник памяти
    assert.equal(result.ok, true);
    assert.deepEqual(result.results, []);
    assert.equal(JSON.stringify(result).includes('OUTSIDE_SECRET_MARKER'), false);
    assert.equal(counter.calls > 0, true);
  } finally { restore(); }
});

test('G05: the local walk does not descend into a junction inside memory root', () => {
  const root = fixture('g05-junction-walk');
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 's2-g05-walk-outside-'));
  fs.writeFileSync(path.join(outside, 'note.md'), '# outside\nOUTSIDE_WALK_MARKER body', 'utf8');
  const link = junctionInto(root, 'linked', outside);
  // Позитивный страж, а не воспроизведение: readdir с withFileTypes отдаёт
  // junction как isSymbolicLink и не как каталог, поэтому прежний обход его и
  // так не раскрывал. Явная проверка фиксирует это как намерение, а не как
  // побочный эффект платформы.
  assert.equal(fs.lstatSync(link).isSymbolicLink(), true);
  assert.deepEqual(localResults('OUTSIDE_WALK_MARKER'), []);
});

test('G09: an unregistered project_id is rejected on the positive Khoj path, before HTTP', async () => {
  const root = fixture('g09-ghost-project');
  writeMemory(root, entry('ghost-project', 'observation', 'GHOST_MARKER'));
  const counter = { calls: 0 };
  const restore = countingKhoj([{ source: 'facts/writer-entries.md', snippet: 'GHOST_MARKER', score: 0.9 }], counter);
  try {
    // RED on original: с force сервис отвечал ok, и незарегистрированный проект
    // получал запись; проверка стояла только на локальном пути.
    await assert.rejects(() => searchKhoj('GHOST_MARKER', 'ghost-project', { force: true }), /unknown project_id: ghost-project/);
    assert.equal(counter.calls, 0, 'запрос не доходит до сервиса');
  } finally { restore(); }
});

test('G09: the verdict for an unknown project does not depend on Khoj availability', async () => {
  const root = fixture('g09-ghost-offline');
  writeMemory(root, entry('ghost-project', 'observation', 'GHOST_OFFLINE_MARKER'));
  // Khoj выключен в конфигурации фикстуры. Оба пути — выключенный сервис и
  // доступный (force) — обязаны давать один и тот же отказ: допустимость
  // запроса не зависит от доступности зависимости.
  await assert.rejects(() => searchKhoj('GHOST_OFFLINE_MARKER', 'ghost-project'), /unknown project_id/);
  await assert.rejects(() => searchKhoj('GHOST_OFFLINE_MARKER', 'ghost-project', { force: true }), /unknown project_id/);
  // зарегистрированный проект продолжает работать на обоих путях
  const known = await searchKhoj('GHOST_OFFLINE_MARKER', 'A');
  assert.equal(known.ok, false);
  assert.equal(known.error, 'khoj-unavailable');
  assert.deepEqual(known.fallback_results, []);
});
