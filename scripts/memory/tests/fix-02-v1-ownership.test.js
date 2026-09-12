'use strict';

// Взаимное исключение V1 + G15 (FIX-02, независимая приёмка 2026-09-12).
//
// V1: право входа устанавливает эксклюзивный OS-bind, и только его держатель
// публикует запись владения. Поэтому расписание «устаревший претендент заменяет
// guard живого владельца» невыразимо: между решением и публикацией держатель
// bind'а не меняется. Позитивные регрессии ниже проверяют наблюдаемые следствия
// этого протокола: отказ претендента ничего не разрушает, guard живого владельца
// сохраняется при смерти сторожа, а частично неудавшаяся публикация собственной
// попытки восстанавливается как осиротевшая.
//
// G15: идентичность защищаемого ресурса — канонический memory_root, а не
// data_dir. Две валидные конфигурации с разными `.local`, указывающие одну
// память, пересекаются по владению; alias-путь (junction) даёт тот же endpoint.
//
// Только TEMP-фикстуры: настоящая память, `.local` рабочей копии и HTTP-мост
// не затрагиваются.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { fixture, memoryRoot, lockDir, lockFile, memoryFile, mod } = require('./helpers');

const ipcLock = mod('ipc-lock');
const jsonl = mod('jsonl');
const CHILD = path.join(__dirname, 'fix-02-v1-child.cjs');

function childEnv(root, locks) {
  return { ...process.env, SYSTEM2_ROOT: root, SYSTEM2_LOCK_DIR: locks || lockDir(root) };
}

function runChild(env, mode, args = [], timeout = 30000) {
  return spawnSync(process.execPath, [CHILD, mode, ...args], { env, encoding: 'utf8', timeout });
}

function startChild(env, mode, args = []) {
  const child = spawn(process.execPath, [CHILD, mode, ...args], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let err = '';
  child.stderr.on('data', data => { err += data; });
  const done = new Promise(resolve => child.on('close', code => resolve({ code, err })));
  return { child, done, stderr: () => err };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function pidAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { return error.code !== 'ESRCH'; }
}

async function waitFor(predicate, timeoutMs = 15000, intervalMs = 20) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error('waitFor timed out');
}

function link(target, linkPath) {
  fs.symlinkSync(target, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
}

test('V1: a refused contender neither replaces nor removes the ownership of a live owner', async () => {
  const root = fixture('v1-abc');
  const locks = lockDir(root);
  const lock = lockFile(root);
  const holder = startChild(childEnv(root), 'writer-hold');
  let stopped = false;
  try {
    await waitFor(() => fs.existsSync(path.join(root, 'held.json')));
    const held = readJson(path.join(root, 'held.json'));
    assert.equal(held.pid, holder.child.pid, 'B is the live owner of the memory');
    assert.equal(pidAlive(held.pid), true);
    assert.equal(held.memory_root, memoryRoot(root));
    assert.equal(held.lock_path, lock);

    const record = fs.readFileSync(lock, 'utf8');
    const state = fs.readdirSync(locks).sort();

    // A — устаревший претендент. Он не входит, не заменяет и не удаляет запись
    // живого владельца B и не оставляет после себя состояния владения.
    const a = runChild(childEnv(root), 'writer-write', ['evt_a', 'A_CONTENT']);
    assert.notEqual(a.status, 0, 'A must be refused: ' + a.stdout);
    assert.match(a.stderr, /REFUSED:LOCK_TIMEOUT:live-owner/);
    assert.equal(fs.readFileSync(lock, 'utf8'), record, 'A must not touch the live ownership record');
    assert.deepEqual(fs.readdirSync(locks).sort(), state, 'A must not leave lock state behind');

    // C не входит до завершения секции B.
    const c = runChild(childEnv(root), 'writer-write', ['evt_c', 'C_CONTENT']);
    assert.notEqual(c.status, 0, 'C must not enter before B releases: ' + c.stdout);
    assert.match(c.stderr, /REFUSED:LOCK_TIMEOUT:live-owner/);
    assert.equal(pidAlive(held.pid), true, 'B is alive and has not released');
    assert.equal(fs.existsSync(memoryFile(root)), false, 'no contender may write while B holds the section');

    // Освобождение B передаёт ресурс следующему поколению целиком.
    fs.writeFileSync(path.join(root, 'stop'), '1');
    stopped = true;
    const exited = await holder.done;
    assert.equal(exited.code, 0, exited.err);
    assert.equal(fs.existsSync(lock), false, 'release removes the ownership record');
    assert.deepEqual(fs.readdirSync(locks), [], 'release leaves no lock state behind');

    const d = runChild(childEnv(root), 'writer-write', ['evt_d', 'D_CONTENT']);
    assert.equal(d.status, 0, d.stderr);
    assert.match(fs.readFileSync(memoryFile(root), 'utf8'), /## D_CONTENT/);
  } finally {
    if (!stopped) fs.writeFileSync(path.join(root, 'stop'), '1');
    holder.child.kill();
    await holder.done;
  }
});

test('V1: the death of a keeper does not admit a contender while the owner is in its section', async () => {
  const root = fixture('v1-keeper-death');
  const lock = lockFile(root);
  const holder = startChild(childEnv(root), 'writer-hold');
  let stopped = false;
  try {
    await waitFor(() => fs.existsSync(path.join(root, 'held.json')));
    const held = readJson(path.join(root, 'held.json'));
    assert.ok(Number.isInteger(held.keeperPid), 'the fixture observes the keeper');

    process.kill(held.keeperPid);
    await waitFor(() => !pidAlive(held.keeperPid));

    // Endpoint освобождён смертью сторожа, но владение удерживает живой процесс:
    // следующий претендент обязан отказаться, а не заменить запись.
    const before = fs.readFileSync(lock, 'utf8');
    const contender = runChild(childEnv(root), 'writer-write', ['evt_x', 'X_CONTENT']);
    assert.notEqual(contender.status, 0, 'the contender must not enter after the keeper died: ' + contender.stdout);
    assert.match(contender.stderr, /REFUSED:LOCK_TIMEOUT:live-owner/);
    assert.equal(fs.readFileSync(lock, 'utf8'), before, 'the ownership record of the live owner is untouched');
    assert.equal(pidAlive(held.pid), true);
    assert.equal(fs.existsSync(memoryFile(root)), false);

    // Владелец завершает секцию штатно и снимает собственную запись.
    fs.writeFileSync(path.join(root, 'stop'), '1');
    stopped = true;
    const exited = await holder.done;
    assert.equal(exited.code, 0, exited.err);
    assert.equal(fs.existsSync(lock), false, 'the owner removes its own record on release');
    assert.deepEqual(fs.readdirSync(lockDir(root)), []);
  } finally {
    if (!stopped) fs.writeFileSync(path.join(root, 'stop'), '1');
    holder.child.kill();
    await holder.done;
  }
});

test('V1: an orphaned publication of this very process is taken over; release leaves no state', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's2-v1-orphan-'));
  const resource = path.join(dir, 'memory-lock');
  const metadataFile = resource + '.lock';
  // Состояние частично неудавшегося acquire: сторож успел опубликовать запись
  // от нашего pid, но не успел сообщить результат (иной nonce). Владения у
  // процесса нет — иначе он не пытался бы снова.
  fs.writeFileSync(metadataFile, JSON.stringify({
    pid: process.pid, hostname: os.hostname(), created: new Date().toISOString(), nonce: 'orphan-of-this-process',
  }) + '\n', 'utf8');

  const hold = ipcLock.acquireProcessLock(resource, { metadataFile, attempts: 5 });
  try {
    assert.notEqual(hold.owner.nonce, 'orphan-of-this-process');
    assert.equal(readJson(metadataFile).nonce, hold.owner.nonce, 'the new generation owns the resource');
    hold.assertHeld();
  } finally {
    hold();
  }
  assert.deepEqual(fs.readdirSync(dir), [], 'release leaves no keeper or publish leftovers');
});

test('V1: a foreign-host ownership record is an explicit refusal, never a shared memory', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's2-v1-foreign-'));
  const resource = path.join(dir, 'memory-lock');
  const metadataFile = resource + '.lock';
  // pid чужого ПК на этом хосте не наблюдаем: молчаливое разделение памяти
  // между машинами запрещено контрактом, поэтому вход отклоняется явно.
  fs.writeFileSync(metadataFile, JSON.stringify({
    pid: 4, hostname: 'other-host', created: new Date().toISOString(), nonce: 'foreign',
  }) + '\n', 'utf8');

  assert.throws(
    () => ipcLock.acquireProcessLock(resource, { metadataFile, attempts: 3 }),
    error => error.code === 'LOCK_TIMEOUT' && error.reason === 'foreign-owner'
  );
  assert.equal(readJson(metadataFile).nonce, 'foreign', 'the refusal destroys nothing');
});

test('V1: contenders on one memory terminate in bounded time without corrupting it', async () => {
  const root = fixture('v1-bounded');
  const started = Date.now();
  const children = [];
  for (let index = 0; index < 6; index += 1) {
    children.push(startChild(childEnv(root), 'writer-write', ['evt_par_' + index, 'PAR_CONTENT_' + index]));
  }
  const results = await Promise.all(children.map(child => child.done));
  const elapsed = Date.now() - started;

  // Право входа — не очередь: конкурент либо входит, либо получает явный отказ,
  // и оба исхода обязаны наступить за ограниченное время. Зависшая блокировка в
  // пути записи делает систему нерабочей, поэтому время здесь — проверяемый
  // инвариант, а не деталь реализации.
  assert.ok(elapsed < 60000, `contenders must terminate in bounded time, took ${elapsed}ms`);
  for (const [index, result] of results.entries()) {
    assert.ok(
      result.code === 0 || /REFUSED:LOCK_TIMEOUT:(live-owner|busy|no-status)/.test(result.err),
      `contender ${index} must persist or be refused explicitly: code=${result.code} err=${result.err}`
    );
  }

  // Отказ не теряет и не дублирует содержимое: у каждого участника ровно одна
  // запись, если он её опубликовал.
  const text = fs.existsSync(memoryFile(root)) ? fs.readFileSync(memoryFile(root), 'utf8') : '';
  for (const [index, result] of results.entries()) {
    const seen = (text.match(new RegExp('PAR_CONTENT_' + index + '\\b', 'g')) || []).length;
    assert.equal(seen, result.code === 0 ? 1 : 0, `contender ${index} published ${seen} entries`);
  }
  assert.ok(text === '' || text.endsWith('\n'), 'the memory file must not keep a torn tail');

  // Ни один участник не оставляет за собой ни владения, ни файлов состояния.
  assert.deepEqual(fs.readdirSync(lockDir(root)), [], 'no lock state may outlive the contenders');
  const published = results.filter(result => result.code === 0).length;
  assert.equal((text.match(/^## /gm) || []).length, published, 'every persisted contender owns exactly one complete entry');
});

test('G15: two configurations with different data_dir serialize on one shared memory root', async () => {
  const sharedMemory = fs.mkdtempSync(path.join(os.tmpdir(), 's2-g15-memory-'));
  const sharedLocks = fs.mkdtempSync(path.join(os.tmpdir(), 's2-g15-locks-'));
  const rootA = fixture('g15-a');
  const rootB = fixture('g15-b');
  for (const [root, dataDir] of [[rootA, '.local'], [rootB, '.local-b']]) {
    const file = path.join(root, 'config/system.example.json');
    const config = JSON.parse(fs.readFileSync(file, 'utf8'));
    config.memory_root = sharedMemory;
    config.data_dir = dataDir;
    fs.writeFileSync(file, JSON.stringify(config));
  }
  const memory = path.join(sharedMemory, 'facts', 'writer-entries.md');

  const idA = JSON.parse(runChild(childEnv(rootA, sharedLocks), 'identity').stdout);
  const idB = JSON.parse(runChild(childEnv(rootB, sharedLocks), 'identity').stdout);
  assert.notEqual(idA.data_dir, idB.data_dir, 'the two configurations keep separate local state dirs');
  assert.equal(idA.memory_root, idB.memory_root);
  assert.equal(idA.lock_path, idB.lock_path, 'one ownership record for one memory');
  assert.deepEqual(idA.endpoint, idB.endpoint, 'one exclusive endpoint for one memory');

  const holder = startChild(childEnv(rootB, sharedLocks), 'writer-hold');
  let stopped = false;
  try {
    await waitFor(() => fs.existsSync(path.join(rootB, 'held.json')));
    const held = readJson(path.join(rootB, 'held.json'));
    assert.equal(held.pid, holder.child.pid);

    // RED на исходном дереве: вторая конфигурация имела собственный `.local` и
    // возвращала persisted, после чего запись B исчезала молча.
    const a = runChild(childEnv(rootA, sharedLocks), 'writer-write', ['evt_shared_a', 'SHARED_A']);
    assert.notEqual(a.status, 0, 'the second configuration must be refused: ' + a.stdout);
    assert.match(a.stderr, /REFUSED:LOCK_TIMEOUT:live-owner/);
    assert.equal(fs.existsSync(memory), false, 'no silent write from the second configuration');

    fs.writeFileSync(path.join(rootB, 'stop'), '1');
    stopped = true;
    assert.equal((await holder.done).code, 0);

    // Штатный последовательный доступ к общей памяти работает.
    const again = runChild(childEnv(rootA, sharedLocks), 'writer-write', ['evt_shared_a', 'SHARED_A']);
    assert.equal(again.status, 0, again.stderr);
    assert.match(fs.readFileSync(memory, 'utf8'), /## SHARED_A/);
  } finally {
    if (!stopped) fs.writeFileSync(path.join(rootB, 'stop'), '1');
    holder.child.kill();
    await holder.done;
  }
});

test('G15: one memory reached through a junction has one lock identity', async () => {
  const root = fixture('g15-junction');
  const real = memoryRoot(root);
  const alias = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 's2-g15-alias-')), 'memory');
  link(real, alias);

  assert.equal(ipcLock.canonicalPath(alias), ipcLock.canonicalPath(real));
  assert.equal(ipcLock.lockStatePath(alias), ipcLock.lockStatePath(real));
  assert.deepEqual(ipcLock.endpointFor(alias), ipcLock.endpointFor(real));

  // Блокировка, взятая по alias-пути, закрывает канонический путь для другого
  // процесса: иначе alias был бы обходом взаимного исключения.
  const hold = ipcLock.acquireProcessLock(alias, {
    metadataFile: ipcLock.lockStatePath(alias),
    attempts: 5,
    timeoutMessage: 'writer lock timeout',
  });
  try {
    assert.equal(readJson(lockFile(root)).pid, process.pid);
    const contender = runChild(childEnv(root), 'writer-write', ['evt_alias', 'ALIAS_CONTENT']);
    assert.notEqual(contender.status, 0, 'the canonical path must be closed while alias holds: ' + contender.stdout);
    assert.match(contender.stderr, /REFUSED:LOCK_TIMEOUT:live-owner/);
    assert.equal(fs.existsSync(memoryFile(root)), false);
  } finally {
    hold();
  }
  assert.equal(fs.existsSync(lockFile(root)), false);
});

test('G15: a journal transaction through a junction alias closes the canonical journal path', async () => {
  const root = fixture('g15-journal-alias');
  const realJournal = path.join(root, '.local', 'writer', 'log.jsonl');
  fs.mkdirSync(path.dirname(realJournal), { recursive: true });
  const alias = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 's2-g15-jalias-')), 'repo');
  link(root, alias);
  const aliasJournal = path.join(alias, '.local', 'writer', 'log.jsonl');

  const child = startChild(childEnv(root), 'journal-txn', [aliasJournal]);
  try {
    await waitFor(() => fs.existsSync(path.join(root, 'ready')));
    // Транзакция идёт через другой путь к тому же журналу. Канонический путь
    // должен быть закрыт: журнал использует тот же примитив владения.
    assert.throws(
      () => jsonl.appendJsonl(realJournal, { via: 'canonical' }),
      error => error.code === 'LOCK_TIMEOUT'
    );
    assert.equal(fs.existsSync(realJournal), false, 'the refused append must not create the journal');

    fs.writeFileSync(path.join(root, 'resume'), '1');
    const done = await child.done;
    assert.equal(done.code, 0, done.err);
    assert.ok(fs.existsSync(path.join(root, 'done.json')), 'the transaction completed');

    jsonl.appendJsonl(realJournal, { via: 'canonical' });
    assert.match(fs.readFileSync(realJournal, 'utf8'), /canonical/);
  } finally {
    fs.writeFileSync(path.join(root, 'resume'), '1');
    child.child.kill();
    await child.done;
  }
});
