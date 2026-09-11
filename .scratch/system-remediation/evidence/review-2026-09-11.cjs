'use strict';
// Independent defect probes. Exit 0 means BOTH defects reproduced, not acceptance.
// Run from repository root. Only TEMP fixtures are modified.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const { once } = require('node:events');

async function keeperDeath() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'review-sept11-keeper-'));
  const resource = path.join(root, 'resource');
  const modulePath = path.resolve('scripts/memory/ipc-lock.js');
  const originalSpawn = cp.spawn;
  let keeper;
  cp.spawn = function (...args) {
    const child = originalSpawn(...args);
    if (args[1]?.[0]?.endsWith('lock-keeper.cjs')) keeper = child;
    return child;
  };
  let acquireProcessLock;
  try {
    delete require.cache[require.resolve(modulePath)];
    ({ acquireProcessLock } = require(modulePath));
  } finally { cp.spawn = originalSpawn; }
  const release = acquireProcessLock(resource, { attempts: 3 });
  try {
    if (!keeper) throw new Error('fixture did not observe a keeper');
    const exited = once(keeper, 'exit');
    keeper.kill();
    await exited;
    const code = `const {acquireProcessLock}=require(${JSON.stringify(modulePath)}); const release=acquireProcessLock(${JSON.stringify(resource)},{attempts:3}); console.log('SECOND_OWNER_ACQUIRED'); release();`;
    const second = cp.spawnSync(process.execPath, ['-e', code], {
      encoding: 'utf8', timeout: 10000, windowsHide: true,
    });
    return {
      id: 'U1', root, firstOwnerPid: process.pid, keeperPid: keeper.pid,
      firstOwnerHasNotReleased: true,
      secondExit: second.status, stdout: second.stdout, stderr: second.stderr,
      reproduced: second.status === 0 && second.stdout.includes('SECOND_OWNER_ACQUIRED'),
    };
  } finally { release(); }
}

function repairFailure() {
  const { readJsonl } = require(path.resolve('scripts/memory/jsonl.js'));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'review-sept11-jsonl-'));
  const file = path.join(root, 'events.jsonl');
  const before = '{"event_id":"already-confirmed"}\n{"broken":';
  fs.writeFileSync(file, before);
  const originalWrite = fs.writeFileSync;
  let injected = false;
  let error;
  fs.writeFileSync = function (target, ...args) {
    if (String(target) === file && !injected) {
      injected = true;
      // writeFileSync's default 'w' opens with truncation before writing.
      // Simulate an I/O failure at that real boundary, not arbitrary deletion.
      const fd = fs.openSync(file, 'w');
      fs.closeSync(fd);
      throw Object.assign(new Error('injected EIO after opening with truncation'), { code: 'EIO' });
    }
    return originalWrite.call(fs, target, ...args);
  };
  try { readJsonl(file); }
  catch (failure) { error = failure.message; }
  finally { fs.writeFileSync = originalWrite; }
  const after = fs.readFileSync(file, 'utf8');
  const quarantine = fs.readdirSync(root).filter(x => x.includes('corrupt-tail'))
    .map(x => fs.readFileSync(path.join(root, x), 'utf8'));
  return { id: 'U2', root, injected, error, before, after, quarantine,
    reproduced: injected && !after.includes('already-confirmed') && !quarantine.some(x => x.includes('already-confirmed')) };
}

(async () => {
  const results = [await keeperDeath(), repairFailure()];
  const output = { date: '2026-09-11', baseHead: 'c0b345932ec9446de13c9d8233888adc00ccc1c8',
    reviewed: 'uncommitted working tree, not the published base', results };
  fs.writeFileSync(path.join(__dirname, 'review-2026-09-11-results.json'), JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify(output, null, 2));
  process.exitCode = results.every(result => result.reproduced) ? 0 : 1;
})().catch(error => { console.error(error); process.exitCode = 2; });
