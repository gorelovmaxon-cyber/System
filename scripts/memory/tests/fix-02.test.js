'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { fixture, proposal, memoryFile, lockFile, mod } = require('./helpers');

const writer = mod('writer');

const HOLDER = path.join(__dirname, 'fix-02-holder.cjs');
const PAUSE = path.join(__dirname, 'fix-02-pause.cjs');
const RECLAIM_PAUSE = path.join(__dirname, 'fix-02-reclaim-pause.cjs');

function spawnPausedChild(mode, root, eventId, statement) {
  const child = spawn(process.execPath, [PAUSE, mode, eventId, statement].filter(Boolean), {
    env: { ...process.env, SYSTEM2_ROOT: root },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '', err = '';
  child.stdout.on('data', d => { out += d; });
  child.stderr.on('data', d => { err += d; });
  const done = new Promise(resolve => child.on('close', code => resolve({ code, out, err })));
  return { child, done, resume: () => fs.writeFileSync(path.join(root, 'resume'), '1') };
}

function waitForExit(done, timeoutMs = 10000) {
  return Promise.race([
    done,
    new Promise((_, reject) => setTimeout(() => reject(new Error('child exit timeout')), timeoutMs)),
  ]);
}

function writeLockFile(root, owner) {
  const file = lockFile(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(owner) + '\n', 'utf8');
}

async function waitFor(predicate, timeoutMs = 5000, intervalMs = 25) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error('waitFor timed out');
}

test('F03: empty lock (crash right after wx) does not block a new write', () => {
  const root = fixture('fix03-empty');
  writeLockFile(root, '');
  // RED on original: writeProposal throws 'writer lock timeout'
  const result = writer.writeProposal('evt_ok', [proposal('LOCK_OK')]);
  assert.equal(result.status, 'persisted');
  assert.match(fs.readFileSync(memoryFile(root), 'utf8'), /## LOCK_OK/);
});

test('F03: lock owned by a dead pid is recovered', () => {
  const root = fixture('fix03-dead');
  const gone = spawnSync(process.execPath, ['-e', ''], { encoding: 'utf8' });
  writeLockFile(root, { pid: gone.pid, hostname: os.hostname(), created: new Date().toISOString(), nonce: 'dead-nonce' });
  // RED on original: writeProposal throws 'writer lock timeout'
  const result = writer.writeProposal('evt_ok2', [proposal('LOCK_OK2')]);
  assert.equal(result.status, 'persisted');
  assert.match(fs.readFileSync(memoryFile(root), 'utf8'), /## LOCK_OK2/);
});

test('F03: lock with unparseable owner content is recovered', () => {
  const root = fixture('fix03-garbage');
  writeLockFile(root, 'not-json-at-all');
  const result = writer.writeProposal('evt_ok3', [proposal('LOCK_OK3')]);
  assert.equal(result.status, 'persisted');
  assert.match(fs.readFileSync(memoryFile(root), 'utf8'), /## LOCK_OK3/);
});

test('F03: live lock is not stolen; write times out; after holder exit write succeeds', async () => {
  const root = fixture('fix03-live');
  const child = spawn(process.execPath, [HOLDER, 'hold', '7000'], { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  let childErr = '';
  child.stderr.on('data', d => { childErr += d; });

  // дождаться, пока держатель реально записал владельца в lock-файл
  await waitFor(() => {
    try {
      const raw = fs.readFileSync(lockFile(root), 'utf8');
      const owner = JSON.parse(raw);
      return Number.isInteger(owner.pid) && owner.pid === child.pid;
    } catch {
      return false;
    }
  });

  // живой владелец: запись должна упереться в таймаут, а не снять чужую блокировку
  const b = spawnSync(process.execPath, [HOLDER, 'write'], { env: process.env, encoding: 'utf8', timeout: 8000 });
  assert.match(b.stderr, /writer lock timeout/);

  // после штатного выхода держателя запись проходит
  await new Promise(resolve => child.on('exit', resolve));
  const b2 = spawnSync(process.execPath, [HOLDER, 'write'], { env: process.env, encoding: 'utf8', timeout: 8000 });
  assert.equal(b2.status, 0, 'holder write after release must succeed: ' + b2.stderr);
  assert.match(b2.stdout, /"status":"persisted"/);
  assert.equal(childErr, '');
});

test('V1: a contender paused before entry cannot enter while a live owner holds authority, and its refusal destroys nothing', async () => {
  const root = fixture('fix02-r5-steal');
  const paused = spawnPausedChild('lock', root);
  let release;
  try {
    await waitFor(() => fs.existsSync(path.join(root, 'ready')));
    // претендент стоит до входа; родитель берёт право входа и, значит, запись
    // владельца в общем каталоге называет его поколение
    release = writer.acquireLock();
    const file = lockFile(root);
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).pid, process.pid);
    assert.equal(fs.existsSync(path.join(root, 'child-acquired')), false);
    paused.resume();
    const r = await waitForExit(paused.done);
    // RED on original: второй процесс получал release и при освобождении удалял
    // блокировку первого живого владельца
    assert.notEqual(r.code, 0, 'child must not acquire a second live lock: ' + r.err);
    assert.match(r.err, /writer lock timeout/);
    assert.equal(fs.existsSync(path.join(root, 'child-acquired')), false);
    assert.equal(
      JSON.parse(fs.readFileSync(file, 'utf8')).pid,
      process.pid,
      'child must not delete the lock of the live owner'
    );
  } finally {
    paused.resume();
    if (release) release();
    paused.child.kill();
  }
});

test('R5: release deletes only its own lock; a foreign lock is refused, not silently shared', () => {
  const root = fixture('fix02-r5-foreign');
  const release = writer.acquireLock();
  const file = lockFile(root);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).pid, process.pid);

  // другой владелец (следующее поколение) заменил lock; release старого поколения
  // не должен его трогать
  const gone = spawnSync(process.execPath, ['-e', ''], { encoding: 'utf8' });
  writeLockFile(root, { pid: gone.pid, hostname: 'other', created: new Date().toISOString(), nonce: 'foreign-nonce' });
  release();
  assert.ok(fs.existsSync(file), 'release must not delete a foreign lock');
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).pid, gone.pid);

  // Запись чужого ПК — не «мёртвый владелец»: pid на этом хосте не наблюдаем,
  // поэтому общий memory_root между машинами отклоняется явно (G15), а не
  // разделяется молча. Выход — осознанное действие оператора над записью.
  assert.throws(
    () => writer.acquireLock(),
    error => error.code === 'LOCK_TIMEOUT' && error.reason === 'foreign-owner'
  );
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).nonce, 'foreign-nonce', 'refusal destroys nothing');

  fs.unlinkSync(file);
  const release2 = writer.acquireLock();
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).pid, process.pid);
  release2();
  assert.equal(fs.existsSync(file), false);
});

test('R6: conflict decision is made under the lock; racing process gets CONFLICT', async () => {
  const root = fixture('fix02-r6-race');
  const paused = spawnPausedChild('write', root);
  try {
    await waitFor(() => fs.existsSync(path.join(root, 'ready')));
    // родитель сохраняет первым, пока ребёнок ещё не вошёл в протокол
    const parent = writer.writeProposal('evt_race', [proposal('PARENT_CONTENT')]);
    assert.equal(parent.status, 'persisted');
    paused.resume();
    const r = await waitForExit(paused.done);
    // RED on original: журнал не перечитывался под блокировкой — оба процесса
    // возвращали persisted с разным содержимым одного event_id
    assert.notEqual(r.code, 0, 'child must fail with CONFLICT: ' + r.out);
    assert.match(r.err, /different content/);
    const text = fs.readFileSync(memoryFile(root), 'utf8');
    assert.match(text, /## PARENT_CONTENT/);
    assert.equal((text.match(/## CHILD_CONTENT/g) || []).length, 0);
  } finally {
    paused.resume();
    paused.child.kill();
  }
});

test('R6: sequential write of different content to same event_id in another process conflicts', async () => {
  const root = fixture('fix02-r6-seq');
  writer.writeProposal('evt_seq', [proposal('SEQ_PARENT')]);
  // без гонки: ребёнок стартует после завершённой записи родителя
  const paused = spawnPausedChild('write', root, 'evt_seq');
  paused.resume();
  const r = await waitForExit(paused.done);
  assert.notEqual(r.code, 0, 'child must fail with CONFLICT: ' + r.out);
  assert.match(r.err, /different content/);
  const text = fs.readFileSync(memoryFile(root), 'utf8');
  assert.equal((text.match(/## CHILD_CONTENT/g) || []).length, 0);
  paused.child.kill();
});

test('R6: exact repeat of the same event_id in another process is idempotent', async () => {
  const root = fixture('fix02-r6-idem');
  writer.writeProposal('evt_idem', [proposal('IDEM_CONTENT')]);
  const paused = spawnPausedChild('write', root, 'evt_idem', 'IDEM_CONTENT');
  paused.resume();
  const r = await waitForExit(paused.done);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /"idempotent":true/);
  const text = fs.readFileSync(memoryFile(root), 'utf8');
  assert.equal((text.match(/## IDEM_CONTENT/g) || []).length, 1);
  paused.child.kill();
});

test('V1: a contender that started over a stale owner record cannot displace the live owner who took it over', async () => {
  const root = fixture('fix02-s1-reclaim');
  const gone = spawnSync(process.execPath, ['-e', ''], { encoding: 'utf8' });
  writeLockFile(root, { pid: gone.pid, hostname: os.hostname(), created: new Date().toISOString(), nonce: 'dead-nonce' });
  const contender = spawn(process.execPath, [RECLAIM_PAUSE], {
    env: { ...process.env, SYSTEM2_ROOT: root },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let err = '';
  contender.stderr.on('data', d => { err += d; });
  const done = new Promise(resolve => contender.on('close', code => resolve({ code, err })));
  let release;
  try {
    await waitFor(() => fs.existsSync(path.join(root, 'ready')));
    // пока претендент стоит до входа, другой процесс штатно восстанавливает
    // мёртвую запись и публикует своё поколение
    release = writer.acquireLock();
    const file = lockFile(root);
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).pid, process.pid);
    fs.writeFileSync(path.join(root, 'resume'), '1');
    const r = await waitForExit(done);
    // RED on original: устаревший претендент по пути удалял живой lock нового
    // поколения и входил в критическую секцию при неосвобождённой блокировке
    assert.equal(fs.existsSync(path.join(root, 'child-acquired')), false, r.err);
    assert.equal(
      JSON.parse(fs.readFileSync(file, 'utf8')).pid,
      process.pid,
      'a stale contender must not delete the live ownership record of the new generation'
    );
  } finally {
    fs.writeFileSync(path.join(root, 'resume'), '1');
    if (release) release();
    contender.kill();
  }
});

test('V1: a second contender cannot enter the critical section while the first holder owns it', async () => {
  const root = fixture('fix02-s1-second-contender');
  const gone = spawnSync(process.execPath, ['-e', ''], { encoding: 'utf8' });
  writeLockFile(root, { pid: gone.pid, hostname: os.hostname(), created: new Date().toISOString(), nonce: 'dead-nonce' });
  // первый претендент восстанавливает мёртвую запись и удерживает право входа до release-me
  const first = spawn(process.execPath, [RECLAIM_PAUSE, 'hold'], {
    env: { ...process.env, SYSTEM2_ROOT: root },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    // претендент приостановлен до входа — отпускаем его, чтобы он завершил восстановление
    await waitFor(() => fs.existsSync(path.join(root, 'ready')));
    fs.writeFileSync(path.join(root, 'resume'), '1');
    await waitFor(() => fs.existsSync(path.join(root, 'first-acquired')));
    // второй претендент на ту же мёртвую запись стартует, пока первый держит право входа
    const second = spawn(process.execPath, [RECLAIM_PAUSE], {
      env: { ...process.env, SYSTEM2_ROOT: root },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let err = '';
    second.stderr.on('data', d => { err += d; });
    const done = new Promise(resolve => second.on('close', code => resolve({ code, err })));
    try {
      const r = await waitForExit(done);
      assert.notEqual(r.code, 0, 'a second contender must not acquire: ' + r.err);
      assert.match(r.err, /writer lock timeout/);
      assert.equal(fs.existsSync(path.join(root, 'child-acquired')), false);
      assert.equal(
        JSON.parse(fs.readFileSync(lockFile(root), 'utf8')).pid,
        first.pid,
        'first holder lock must survive'
      );
    } finally {
      second.kill();
    }
  } finally {
    fs.writeFileSync(path.join(root, 'resume'), '1');
    fs.writeFileSync(path.join(root, 'release-me'), '1');
    await waitForExit(new Promise(resolve => first.on('close', code => resolve({ code, err: '' }))));
  }
  assert.equal(fs.existsSync(lockFile(root)), false, 'lock is removed after the holder releases');
});

test('S1: takeover of a dead owner leaves no quarantine or keeper leftovers', () => {
  const root = fixture('fix02-s1-clean');
  const gone = spawnSync(process.execPath, ['-e', ''], { encoding: 'utf8' });
  writeLockFile(root, { pid: gone.pid, hostname: os.hostname(), created: new Date().toISOString(), nonce: 'dead-nonce' });
  const release = writer.acquireLock();
  const dir = path.dirname(lockFile(root));
  // Ни карантина прежнего протокола, ни осиротевших файлов сторожа: в общем
  // каталоге владения остаётся ровно одна запись текущего поколения.
  assert.deepEqual(fs.readdirSync(dir), [path.basename(lockFile(root))]);
  assert.equal(JSON.parse(fs.readFileSync(lockFile(root), 'utf8')).pid, process.pid);
  release();
  assert.deepEqual(fs.readdirSync(dir), []);
});

test('T1: changing diagnostic metadata never frees authority for a third process', () => {
  const root = fixture('t1-os-authority');
  const release = writer.acquireLock();
  const file = lockFile(root);
  const moved = file + '.old-metadata';
  fs.renameSync(file, moved);
  fs.writeFileSync(file, JSON.stringify({ pid: 999999, hostname: os.hostname(), nonce: 'stale-view' }));
  const third = spawnSync(process.execPath, [HOLDER, 'write'], {
    env: { ...process.env, SYSTEM2_ROOT: root }, encoding: 'utf8', timeout: 15000,
  });
  assert.notEqual(third.status, 0, 'third process must not enter while authority is held');
  assert.match(third.stderr, /writer lock timeout/);
  release();
  try { fs.unlinkSync(moved); } catch {}
  const after = spawnSync(process.execPath, [HOLDER, 'write'], {
    env: { ...process.env, SYSTEM2_ROOT: root }, encoding: 'utf8', timeout: 15000,
  });
  assert.equal(after.status, 0, after.stderr);
});
