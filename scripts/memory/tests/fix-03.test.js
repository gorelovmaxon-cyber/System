'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fixture, mod } = require('./helpers');

const { localResults, searchKhoj } = mod('search');

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

test('F04: hand-written single-entry file without frontmatter still found', () => {
  const root = fixture('fix03-hand');
  const file = path.join(root, '.claude/memory/user-profile/note.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '# Personal note\nHAND_NOTE_MARKER body', 'utf8');

  const res = localResults('HAND_NOTE_MARKER', 'A');
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
