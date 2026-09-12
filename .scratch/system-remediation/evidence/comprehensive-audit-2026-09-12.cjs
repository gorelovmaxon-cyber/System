'use strict';
// Independent probes, TEMP only, mocked HTTP. True means a defect/limitation observed.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), cp = require('node:child_process');
const repo = process.cwd();
const { fixture, proposal, memoryFile } = require(path.join(repo, 'scripts/memory/tests/helpers'));
const writer = require(path.join(repo, 'scripts/memory/writer'));
const writerLog = require(path.join(repo, 'scripts/memory/writer-log'));
const indexer = require(path.join(repo, 'scripts/memory/indexer'));
const indexLog = require(path.join(repo, 'scripts/memory/indexer-log'));
const search = require(path.join(repo, 'scripts/memory/search'));
const { DurableQueue } = require(path.join(repo, 'scripts/memory/queue'));
const { createEvent } = require(path.join(repo, 'scripts/memory/events'));
const { resolvePaths } = require(path.join(repo, 'scripts/memory/resolve-paths'));
const { initProject } = require(path.join(repo, 'scripts/memory/init-project'));
const results = [];
const oldEnv = process.env.SYSTEM2_ROOT, oldFetch = global.fetch;
const runConfig = { indexer: { reindex_url: 'http://synthetic.invalid/reindex', timeout_ms: 1000, backoff_ms: 100, lease_ms: 1000 } };
function file(root, relative, value) { const dest = path.join(root, relative); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, value); return dest; }
function event(n) { return createEvent({ kind: 'commit', project_id: 'A', sha: String(n).repeat(40), summary: 'synthetic', diff: '' }); }
async function test(id, fn) {
  const root = fixture('broad-' + id);
  const originalNow = Date.now;
  try { const detail = await fn(root); results.push({ id, root, ...detail }); }
  catch (error) { results.push({ id, root, harness_error: error.stack }); }
  finally { global.fetch = oldFetch; Date.now = originalNow; }
  console.log(id, JSON.stringify(results.at(-1)));
}
function git(root, args) { const r = cp.spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true }); if (r.status !== 0) throw new Error(r.stderr); return r.stdout.trim(); }

(async () => {
  await test('G01', async root => {
    const p = proposal('shared original'); writer.writeProposal('first', p);
    global.fetch = async () => ({ ok: true });
    await indexer.run({ config: runConfig });
    const before = writerLog.get('first').indexed;
    writer.writeProposal('second', proposal('new shared entry'));
    writer.writeProposal('first', p);
    const pending = indexer.status().filter(x => x.event_id === 'first' && x.status === 'pending').length;
    const after = writerLog.get('first').indexed;
    return { before, after, pending, reproduced: before && after && pending > 0 };
  });
  await test('G02', async root => {
    writer.writeProposal('completion-gap', proposal('completion gap'));
    global.fetch = async () => ({ ok: true });
    const append = writerLog.append; let injected = false;
    writerLog.append = record => { if (record.indexed === true && !injected) { injected = true; throw new Error('synthetic writer-log write failure'); } return append(record); };
    let first;
    try { first = await indexer.run({ config: runConfig }); } finally { writerLog.append = append; }
    const retry = await indexer.run({ config: runConfig });
    const persisted = writerLog.get('completion-gap');
    return { injected, first, retry, indexedTasks: indexer.status().map(x => x.status), writerIndexed: persisted.indexed,
      reproduced: injected && retry.length === 0 && persisted.indexed === false };
  });
  await test('G03', async root => {
    const q = new DurableQueue({ leaseMs: 1000 }); q.enqueue(event(1)); q.enqueue(event(2));
    const actual = Date.now; let now = actual(); Date.now = () => now;
    let calls = 0, overlapping = false, leaseExpiry;
    await q.process(async e => {
      calls++;
      if (calls === 1) now += 5000;
      else {
        leaseExpiry = q.records().get(e.event_id).lease_expires_at;
        const other = new DurableQueue({ leaseMs: 1000 }); other.restoreInflight();
        overlapping = Boolean(other.claim(e.event_id, { now }));
      }
      return { ok: true };
    });
    return { calls, leaseExpiry, now: new Date(now).toISOString(), overlapping, reproduced: overlapping };
  });
  await test('G04', async root => {
    writer.writeProposal('time', [proposal('one'), proposal('two', 'user', 'decisions')]);
    const actual = Date.now; let now = actual(); Date.now = () => now;
    let calls = 0, expiredOnStart = false;
    global.fetch = async () => {
      calls++;
      if (calls === 1) now += 5000;
      else expiredOnStart = indexer.status().some(x => x.status === 'in-flight' && Date.parse(x.lease_expires_at) <= now);
      return { ok: true };
    };
    await indexer.run({ config: runConfig });
    return { calls, expiredOnStart, reproduced: expiredOnStart };
  });
  await test('G05', async root => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'broad-outside-'));
    file(outside, 'outside.md', '---\nscope: user\nstatus: confirmed\n---\n\nOUTSIDE_SECRET_MARKER\n');
    fs.symlinkSync(outside, path.join(root, '.claude/memory/linked'), 'junction');
    global.fetch = async url => ({ ok: true, text: async () => JSON.stringify(String(url).includes('/health') ? {} : { results: [{ source: '.claude/memory/linked/outside.md', snippet: 'OUTSIDE_SECRET_MARKER' }] }) });
    const response = await search.searchKhoj('OUTSIDE_SECRET_MARKER', 'A', { force: true });
    return { outside, response, reproduced: response.results?.some(x => x.snippet.includes('OUTSIDE_SECRET_MARKER')) === true };
  });
  await test('G06', async root => {
    const f = file(root, '.claude/memory/facts/task.md', 'synthetic');
    indexer.queueIndex('path', [f]);
    const task = indexer.status()[0];
    // persisted tasks can come from old versions/restore; execution must revalidate.
    indexLog.append({ ...task, file: '../../outside.md' });
    let sent;
    global.fetch = async (url, init) => { sent = JSON.parse(init.body); return { ok: true }; };
    await indexer.run({ config: runConfig });
    return { sent, reproduced: sent?.file === '../../outside.md' };
  });
  await test('G07', async root => {
    const p = proposal('same semantic input'); writer.writeProposal('order', p);
    const reordered = Object.fromEntries(Object.entries(p).reverse());
    let error;
    try { writer.writeProposal('order', reordered); } catch (e) { error = e.code; }
    return { error, reproduced: error === 'CONFLICT' };
  });
  await test('G08', async root => {
    const e = createEvent({ kind: 'session-summary', project_id: 'A', session_id: 'test', revision: 1, summary: 'decision capture', decisions: 'KEEP_THIS_DECISION' });
    return { inputDecisions: 'KEEP_THIS_DECISION', outputDecisions: e.decisions, reproduced: e.decisions.length === 0 };
  });
  await test('G09', async root => {
    file(root, '.claude/memory/facts/ghost.md', '---\nscope: ghost-project\nstatus: confirmed\n---\n\nGHOST_MARKER');
    global.fetch = async url => ({ ok: true, text: async () => JSON.stringify(String(url).includes('/health') ? {} : { results: [{ source: 'facts/ghost.md', snippet: 'GHOST_MARKER' }] }) });
    const remote = await search.searchKhoj('GHOST_MARKER', 'ghost-project', { force: true });
    let localError; try { search.localResults('GHOST_MARKER', 'ghost-project'); } catch (e) { localError = e.code; }
    return { remote, localError, reproduced: remote.results?.length === 1 && localError === 'unknown-project' };
  });
  await test('G10', async root => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'broad-init-'));
    const paths = resolvePaths(); paths.config.registry = [{ project_id: 'test-project' }];
    fs.writeFileSync(path.join(root, 'config/system.example.json'), JSON.stringify(paths.config));
    const reversed = '<!-- systemqwen:end -->\nIMPORTANT_STATE\n<!-- systemqwen:start -->';
    file(project, 'HANDOFF.md', reversed); file(project, 'CLAUDE.md', reversed);
    let error; try { initProject({ root: project, projectId: 'test-project', systemRoot: root }); } catch (e) { error = e.message; }
    const claude = fs.readFileSync(path.join(project, 'CLAUDE.md'), 'utf8');
    return { error, startCount: claude.split('<!-- systemqwen:start -->').length - 1, reproduced: !error && claude.split('<!-- systemqwen:start -->').length - 1 > 1 };
  });
  await test('G11', async root => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'broad-hooks-worktree-'));
    const work = base + '-worktree';
    git(base, ['init', '-q']); git(base, ['config', 'user.email', 'synthetic@example.invalid']); git(base, ['config', 'user.name', 'Synthetic']);
    for (const name of ['post-commit', 'install-hooks.sh']) file(base, '.git-hooks-templates/' + name, fs.readFileSync(path.join(repo, '.git-hooks-templates', name)));
    git(base, ['add', '.git-hooks-templates']);
    const empty = path.join(base, 'empty-hooks'); fs.mkdirSync(empty);
    git(base, ['-c', 'core.hooksPath=' + empty, 'commit', '-qm', 'fixture']);
    git(base, ['worktree', 'add', '-qb', 'fixture-work', work]);
    file(base, '.git/hooks/post-commit', '#!/usr/bin/env bash\necho USER_HOOK\n');
    const bash = 'C:\\Program Files\\Git\\bin\\bash.exe';
    const result = cp.spawnSync(bash, ['.git-hooks-templates/install-hooks.sh'], { cwd: work, encoding: 'utf8', windowsHide: true });
    const configured = cp.spawnSync('git', ['-C', work, 'config', '--get', 'core.hooksPath'], { encoding: 'utf8' }).stdout.trim();
    return { base, work, exit: result.status, stdout: result.stdout, stderr: result.stderr, configured, reproduced: result.status === 0 && configured.includes('.git-hooks-templates') };
  });
  await test('G12', async root => {
    const { drain } = require(path.join(repo, 'scripts/memory/queue-worker'));
    const q = new DurableQueue({ backoffMs: 100 }); q.enqueue(event(3));
    let calls = 0;
    const records = await drain({ queue: q, deliver: async () => { calls++; return { ok: false, retryable: true, error: 'temporary outage' }; } });
    return { calls, statusAfterWorkerReturned: records[0].status, nextAttempt: records[0].next_attempt_at, reproduced: calls === 1 && records[0].status === 'pending', classification: 'one-shot worker; autonomous scheduling is an integration gap' };
  });
  const output = { date: '2026-09-12', head: git(repo, ['rev-parse', 'HEAD']), dirtyTree: true, results };
  fs.writeFileSync(path.join(__dirname, 'comprehensive-audit-2026-09-12-results.json'), JSON.stringify(output, null, 2) + '\n');
  if (oldEnv === undefined) delete process.env.SYSTEM2_ROOT; else process.env.SYSTEM2_ROOT = oldEnv;
  global.fetch = oldFetch;
  process.exitCode = results.some(x => x.harness_error) ? 2 : results.every(x => x.reproduced) ? 0 : 1;
})().catch(error => { console.error(error); process.exitCode = 2; });
