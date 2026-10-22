'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const journal = require('../decision-journal');
const MODULE = path.resolve(__dirname, '../decision-journal.js');
const make = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-journal-'));
  fs.mkdirSync(path.join(root, '.git'));
  return { root, project_id: 'alpha', dir: path.join(root, '.system2/decision-journal') };
};
const options = (summary, extra = {}) => ({ type: 'decision', summary, source: 'fixture conversation', verification: 'confirmed', ...extra });
const file = (ctx, id) => path.join(ctx.dir, id + '.json');
const closure = (extra = {}) => ({ disposition: 'resolved', reason: 'Answered in fixture', evidence: 'fixture result section 1', ...extra });
function child(ctx, expression, env = {}) {
  return new Promise(resolve => {
    const p = spawn(process.execPath, ['-e', `const j=require(${JSON.stringify(MODULE)}),ctx=${JSON.stringify(ctx)};try{${expression}}catch(e){console.error(e.message);process.exitCode=1}`], { env: { ...process.env, ...env }, windowsHide: true });
    let stderr = '';
    p.stderr.on('data', data => { stderr += data; });
    p.on('close', code => resolve({ code, stderr }));
  });
}

test('C03: case-sensitive capture retains legacy ids, exact repeats and payload conflicts', async () => {
  const ctx = make();
  const first = journal.capture(ctx, options('Alpha')).entry;
  const second = journal.capture(ctx, options('alpha')).entry;
  assert.notEqual(first.id, second.id);
  for (const [text, id] of [['Alpha', first.id], ['alpha', second.id]]) {
    assert.equal(journal.capture(ctx, options(text)).entry.id, id);
    assert.throws(() => journal.capture(ctx, options(text, { source: 'different source' })), /conflict/);
    assert.throws(() => journal.capture(ctx, options(text, { verification: 'observation' })), /conflict/);
  }
  const results = await Promise.all([child(ctx, `j.capture(ctx,${JSON.stringify(options('ALPHA'))})`), child(ctx, `j.capture(ctx,${JSON.stringify(options('ALPHA'))})`)]);
  assert.ok(results.every(r => r.code === 0), JSON.stringify(results));
  assert.equal(journal.list(ctx).length, 3);
  assert.equal(journal.capture(ctx, options('correction', { type: 'correction', supersedes: first.id })).entry.supersedes, first.id);
});

test('C03: close preserves verification, validates correction/scope and is idempotent', () => {
  const ctx = make();
  const question = journal.capture(ctx, options('Which?', { type: 'question', verification: 'open' })).entry;
  const closed = journal.close(ctx, question.id, closure());
  assert.equal(closed.state, 'closed');
  assert.equal(closed.verification, 'open');
  assert.equal(closed.memory_event_id, null);
  assert.deepEqual(journal.close(ctx, question.id, closure()), closed);
  assert.throws(() => journal.close(ctx, question.id, closure({ reason: 'incompatible' })), /conflict/);
  assert.throws(() => journal.mark(ctx, question.id), /closed/);
  assert.equal(journal.list(ctx).filter(r => r.state === 'pending').length, 0);
  const obs = journal.capture(ctx, options('Maybe', { type: 'observation', verification: 'observation' })).entry;
  assert.equal(journal.close(ctx, obs.id, closure({ disposition: 'dismissed' })).verification, 'observation');
  const old = journal.capture(ctx, options('Old')).entry;
  const correction = journal.capture(ctx, options('New', { type: 'correction', supersedes: old.id })).entry;
  const before = fs.readFileSync(file(ctx, old.id), 'utf8');
  for (const invalid of [closure({ disposition: 'superseded' }), closure({ evidence: '' }), closure({ correction_id: correction.id }), closure({ disposition: 'unknown' }), closure({ disposition: 'superseded', correction_id: question.id })]) {
    assert.throws(() => journal.close(ctx, old.id, invalid));
    assert.equal(fs.readFileSync(file(ctx, old.id), 'utf8'), before);
  }
  assert.throws(() => journal.close({ ...ctx, project_id: 'beta' }, old.id, closure()), /scope/);
  journal.close(ctx, old.id, closure({ disposition: 'superseded', correction_id: correction.id }));
  const persisted = journal.mark(ctx, correction.id, () => ({ status: 'persisted', written_files: ['fixture.md'] }));
  assert.throws(() => journal.close(ctx, persisted.id, closure()), /persisted/);
  assert.equal(JSON.parse(fs.readFileSync(file(ctx, persisted.id))).state, 'persisted');
});

test('C03: concurrent close/mark and interrupted replacement preserve one terminal transition', async () => {
  const ctx = make();
  const entry = journal.capture(ctx, options('Race')).entry;
  const a = `j.close(ctx,${JSON.stringify(entry.id)},${JSON.stringify(closure())})`;
  const b = `j.mark(ctx,${JSON.stringify(entry.id)},()=>({status:'persisted',written_files:['fixture.md']}))`;
  const results = await Promise.all([child(ctx, a), child(ctx, b)]);
  assert.equal(results.filter(r => r.code === 0).length, 1, JSON.stringify(results));
  const winner = fs.readFileSync(file(ctx, entry.id), 'utf8');
  assert.ok(['closed', 'persisted'].includes(JSON.parse(winner).state));
  assert.equal(journal.capture(ctx, options('Race')).created, false);
  assert.equal(fs.readFileSync(file(ctx, entry.id), 'utf8'), winner);
  const interrupted = journal.capture(ctx, options('Interrupted')).entry;
  const expr = `const j=require(${JSON.stringify(MODULE)});j.close(${JSON.stringify(ctx)},${JSON.stringify(interrupted.id)},${JSON.stringify(closure())})`;
  const before = fs.readFileSync(file(ctx, interrupted.id), 'utf8');
  const killed = spawnSync(process.execPath, ['-e', expr], { env: { ...process.env, SYSTEM2_CRASH_AT: 'journal-before-rename' } });
  assert.equal(killed.status, 23);
  assert.equal(fs.readFileSync(file(ctx, interrupted.id), 'utf8'), before);
  const afterRename = spawnSync(process.execPath, ['-e', expr], { env: { ...process.env, SYSTEM2_CRASH_AT: 'journal-after-rename' } });
  assert.equal(afterRename.status, 23);
  const recovered = journal.close(ctx, interrupted.id, closure());
  assert.equal(recovered.state, 'closed');
  assert.equal(journal.list(ctx).find(e => e.id === interrupted.id).state, 'closed');
});
