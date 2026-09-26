'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const journal = require('../decision-journal');

function setup(id) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'system2-journal-'));
  fs.mkdirSync(path.join(root, '.git'));
  return { root, project_id: id, dir: path.join(root, '.system2', 'decision-journal') };
}

function add(ctx, type = 'decision', summary = 'Use choice questions', extra = {}) {
  return journal.capture(ctx, { type, summary, source: 'conversation 2026-09-26, summary', verification: 'confirmed', ...extra });
}

test('capture, exact repeat, correction and no-op', () => {
  const ctx = setup('alpha');
  try {
    assert.deepEqual(journal.list(ctx), []);
    const first = add(ctx);
    assert.equal(first.created, true);
    assert.equal(add(ctx).created, false);
    assert.equal(journal.list(ctx).length, 1);
    const correction = add(ctx, 'correction', 'Use choice questions when suitable', { supersedes: first.entry.id });
    assert.equal(correction.entry.supersedes, first.entry.id);
    assert.equal(journal.list(ctx).length, 2);
    assert.equal(journal.list(ctx).find(x => x.id === first.entry.id).state, 'pending');
  } finally { fs.rmSync(ctx.root, { recursive: true, force: true }); }
});

test('promotion requires writer proof and repeat after crash stays one entry', () => {
  const ctx = setup('alpha');
  try {
    const entry = add(ctx).entry;
    assert.throws(() => journal.mark(ctx, entry.id, () => undefined), /not persisted/);
    const event = `journal_alpha_${entry.id}`;
    const proof = id => id === event ? { status: 'persisted', written_files: ['.claude/memory/decisions/example.md'] } : undefined;
    const marked = journal.mark(ctx, entry.id, proof);
    assert.equal(marked.memory_event_id, event);
    assert.equal(journal.mark(ctx, entry.id, proof).state, 'persisted');
    assert.equal(journal.list(ctx).length, 1);
  } finally { fs.rmSync(ctx.root, { recursive: true, force: true }); }
});

test('open question and unverified observation cannot become confirmed by journal', () => {
  const ctx = setup('alpha');
  try {
    const question = add(ctx, 'question', 'Which plan?', { verification: 'open' }).entry;
    assert.throws(() => journal.mark(ctx, question.id, () => ({ status: 'persisted', written_files: ['x'] })), /open question/);
    const observation = add(ctx, 'observation', 'Maybe prefers blue', { verification: 'observation' }).entry;
    assert.equal(observation.verification, 'observation');
    assert.equal(journal.list(ctx).length, 2);
  } finally { fs.rmSync(ctx.root, { recursive: true, force: true }); }
});

test('project journal filters scope and rejects credential marker', () => {
  const ctx = setup('alpha');
  try {
    const foreign = { ...add(ctx).entry, project_id: 'beta' };
    fs.writeFileSync(path.join(ctx.dir, foreign.id + '.json'), JSON.stringify(foreign));
    assert.deepEqual(journal.list(ctx), []);
    const marker = ['sk', 'test', 'REDACTED'].join('-');
    assert.throws(() => add(ctx, 'fact', `token=${marker}`), /credential/);
    assert.throws(() => add(ctx, 'fact', 'broken \uFFFD text'), /U\+FFFD/);
    assert.equal(fs.readdirSync(ctx.dir).length, 1);
  } finally { fs.rmSync(ctx.root, { recursive: true, force: true }); }
});

test('CLI uses its System checkout when called from a connected project', () => {
  const ctx = setup('alpha');
  try {
    fs.mkdirSync(path.join(ctx.root, 'config'));
    fs.writeFileSync(path.join(ctx.root, 'config', 'system.example.json'), '{invalid legacy config}');
    const result = spawnSync(process.execPath, [path.join(__dirname, '..', 'decision-journal.js'), 'pending', '--project-root', ctx.root], {
      cwd: ctx.root, encoding: 'utf8', env: { ...process.env, SYSTEM2_PROJECT_ID: 'alpha' },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), []);
  } finally { fs.rmSync(ctx.root, { recursive: true, force: true }); }
});
