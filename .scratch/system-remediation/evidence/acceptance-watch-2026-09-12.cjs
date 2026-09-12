'use strict';
// Independent, synthetic-only acceptance. Optional control patches a TEMP copy.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const repo = path.resolve(__dirname, '../../..');
const scripts = path.join(repo, 'scripts/memory');
if (!process.argv.includes('--child')) {
  const results = [];
  for (const mode of ['submitted', 'await-control']) {
    const child = spawnSync(process.execPath, [__filename, '--child', mode], { encoding: 'utf8', timeout: 20000 });
    results.push({ mode, exit: child.status, error: child.error?.message, stdout: child.stdout, stderr: child.stderr });
  }
  const output = JSON.stringify({ revision: 'a904185', results }, null, 2);
  fs.writeFileSync(path.join(__dirname, 'acceptance-watch-2026-09-12-results.json'), output + '\n');
  console.log(output);
} else {
  const mode = process.argv[3];
  const { fixture } = require(path.join(scripts, 'tests/helpers'));
  const root = fixture('independent-watch-revive');
  const { DurableQueue } = require(path.join(scripts, 'queue'));
  const { createEvent } = require(path.join(scripts, 'events'));
  let worker;
  if (mode === 'await-control') {
    const copy = fs.mkdtempSync(path.join(os.tmpdir(), 's2-watch-control-'));
    for (const file of fs.readdirSync(scripts).filter(f => /\.(js|cjs)$/.test(f))) fs.copyFileSync(path.join(scripts, file), path.join(copy, file));
    const file = path.join(copy, 'queue-worker.js');
    const original = fs.readFileSync(file, 'utf8');
    const changed = original.replace("        queue.redeliver('failed', deliver);", "        await queue.redeliver('failed', deliver);");
    if (original === changed) throw new Error('control patch did not match');
    fs.writeFileSync(file, changed);
    worker = require(file);
  } else worker = require(path.join(scripts, 'queue-worker'));
  const queue = new DurableQueue({ dir: path.join(root, '.local/queue'), retriesMax: 1, backoffMs: 10 });
  queue.enqueue(createEvent({ kind: 'session-summary', project_id: 'A', session_id: 'acceptance', revision: 1, summary: 'synthetic recovery' }));
  let calls = 0, completed = false, delayMs = null;
  const deliver = async () => {
    if (++calls === 1) return { ok: false, retryable: true, error: 'service temporarily unavailable' };
    const started = Date.now();
    await new Promise(resolve => setTimeout(resolve, 50));
    delayMs = Date.now() - started;
    completed = true;
    return { ok: true };
  };
  worker.watch({ queue, deliver, reviveMs: 10, maxIdleMs: 5000 }).then(async result => {
    const atReturn = { result, calls, completed, recordStatus: queue.list()[0].status };
    await new Promise(resolve => setTimeout(resolve, 250));
    console.log(JSON.stringify({ mode, root, atReturn, later: { completed, delayMs, recordStatus: queue.list()[0].status } }));
  }).catch(error => { console.error(error); process.exitCode = 1; });
}
