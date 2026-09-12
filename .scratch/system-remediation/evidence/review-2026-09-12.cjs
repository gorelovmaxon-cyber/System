'use strict';
// Defect probe: exit 0 means the guard publication race reproduced.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'system2-review-sept12-'));
const resource = path.join(root, 'resource');
const metadata = resource + '.lock';
const fixture = path.resolve('scripts/memory/tests/fix-02-keeper.cjs');
const pause = () => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; } };
function wait(predicate) {
  const deadline = Date.now() + 10000;
  while (!predicate()) { if (Date.now() > deadline) throw new Error('fixture timeout'); pause(); }
}
function read(name) { try { return JSON.parse(fs.readFileSync(path.join(root, name), 'utf8')); } catch { return null; } }
const originalSpawn = cp.spawn;
let keeper;
cp.spawn = (...args) => {
  const child = originalSpawn(...args);
  if (args[1]?.[0]?.endsWith('lock-keeper.cjs')) keeper = child;
  return child;
};
const { acquireProcessLock } = require(path.resolve('scripts/memory/ipc-lock.js'));
cp.spawn = originalSpawn;
const rename = fs.renameSync;
let second, held, hold, intercepted = false;
try {
  fs.renameSync = function (from, to) {
    if (!intercepted && String(to) === metadata && String(from).includes('.meta-')) {
      intercepted = true;
      // A has read the guard and prepared its metadata, but has not published.
      keeper.kill();
      wait(() => !alive(keeper.pid));
      second = cp.spawn(process.execPath, [fixture, 'hold', resource, root], { stdio: 'ignore', windowsHide: true });
      wait(() => (held = read('held.json')) !== null);
      fs.writeFileSync(path.join(root, 'probe-assert'), '1');
      wait(() => read('assert-result.json') !== null);
      if (!read('assert-result.json').ok) throw new Error('second holder did not verify authority');
      // B is now alive inside the section, with assertHeld already passed.
    }
    return rename.call(fs, from, to);
  };
  hold = acquireProcessLock(resource, { attempts: 3 });
  fs.renameSync = rename;
  const overwritten = JSON.parse(fs.readFileSync(metadata, 'utf8'));
  let lost;
  try { hold.assertHeld(); } catch (error) { lost = error.code; }
  hold(); // normal finally path after assertHeld failed
  hold = null;
  const guardRemovedWhileSecondAlive = !fs.existsSync(metadata) && alive(second.pid);
  process.kill(held.keeperPid);
  wait(() => !alive(held.keeperPid));
  const third = cp.spawnSync(process.execPath, [fixture, 'try', resource, root, '3'], { encoding: 'utf8', timeout: 10000, windowsHide: true });
  const result = {
    id: 'V1', root, firstPid: process.pid, secondPid: second.pid,
    secondAssertPassedBeforePause: true,
    overwrittenOwnerPid: overwritten.pid, firstAssertError: lost,
    guardRemovedWhileSecondAlive,
    thirdExit: third.status, thirdStdout: third.stdout, thirdStderr: third.stderr,
    secondStillAliveAndNotReleased: alive(second.pid),
    reproduced: overwritten.pid === process.pid && guardRemovedWhileSecondAlive && third.status === 0,
  };
  fs.writeFileSync(path.join(__dirname, 'review-2026-09-12-results.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.reproduced ? 0 : 1;
} catch (error) { console.error(error); process.exitCode = 2; }
finally {
  fs.renameSync = rename;
  if (hold) hold();
  fs.writeFileSync(path.join(root, 'stop'), '1');
  if (second) { wait(() => read('released.json') !== null || !alive(second.pid)); second.kill(); }
}
