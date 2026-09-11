#!/usr/bin/env node
'use strict';

// Процессная взаимная блокировка. Право входа (right of entry) устанавливается
// двумя фактами, проверяемыми в этом порядке:
//
//   1. собственный keeper удерживает эксклюзивный OS-endpoint ресурса (named
//      pipe в Windows, loopback-порт в POSIX). ОС освобождает endpoint при
//      смерти keeper, а keeper завершается при смерти своего writer — то есть
//      endpoint не переживает writer.
//   2. пока этот bind наш, канонический файл владения не называет другого
//      живого процесса.
//
// Ни одна из двух проверок не является authority в одиночку. Endpoint не
// является: ОС освобождает его и тогда, когда keeper убит, а writer жив (U1).
// Этот случай закрывает шаг 2 — запись владения по-прежнему называет живого
// владельца, и претендент не публикует поверх неё. Запись владения тоже не
// является authority в одиночку: её может оставить writer, погибший в любой
// точке, а шаг «прочитать → решить → опубликовать» сериализуется только
// эксклюзивным bind.
//
// Authority утрачивается, когда владелец завершился, или когда его запись
// заменена новым поколением после его release. Смерть keeper сама по себе
// authority не отзывает. hold.assertHeld() позволяет владельцу дополнительно
// требовать живость endpoint и падать fail-closed вместо записи.

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const KEEPER_SCRIPT = path.join(__dirname, 'lock-keeper.cjs');

function pause(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function ownerFrom(file) {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8').trim());
    return Number.isInteger(value.pid) ? value : null;
  } catch { return null; }
}

function sameOwner(a, b) {
  return a !== null && a.pid === b.pid && a.nonce === b.nonce;
}

// ESRCH — единственное доказательство смерти. EPERM и любая другая ошибка
// означают «жив»: блокировку нельзя снять у процесса, который не проверяется.
function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== 'ESRCH';
  }
}

function endpointFor(resource) {
  const id = crypto.createHash('sha256').update(path.resolve(resource).toLowerCase()).digest('hex').slice(0, 32);
  if (process.platform === 'win32') return `\\\\.\\pipe\\system2-lock-${id}`;
  return { host: '127.0.0.1', port: 20000 + (Number.parseInt(id.slice(0, 8), 16) % 30000) };
}

function readStatus(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function authorityLost(message) {
  const error = new Error(message);
  error.code = 'LOCK_AUTHORITY_LOST';
  return error;
}

function acquireProcessLock(resource, options = {}) {
  const metadataFile = options.metadataFile || resource + '.lock';
  const keeperScript = options.keeperScript || KEEPER_SCRIPT;
  const attempts = options.attempts ?? 100;
  fs.mkdirSync(path.dirname(metadataFile), { recursive: true });
  // Проверяется синхронно: без keeper право входа недостижимо, и это должно
  // быть видно вызывающему как ошибка, а не как таймаут через attempts попыток.
  if (!fs.existsSync(keeperScript)) throw new Error(`lock keeper script is missing: ${keeperScript}`);
  const owner = {
    pid: process.pid,
    hostname: os.hostname(),
    created: new Date().toISOString(),
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  // Причина последнего отказа: отличает «живой владелец» от «endpoint занят»
  // в ошибке таймаута (диагностика и аварийные регрессии).
  let refusal = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    // Шаг 2 (U1): записанный живой владелец сохраняет authority и тогда, когда
    // endpoint свободен. Проверка идёт до spawn, чтобы ожидание живого
    // владельца не стоило процесса keeper на каждую попытку.
    const recorded = ownerFrom(metadataFile);
    if (recorded && pidAlive(recorded.pid)) {
      refusal = 'live-owner';
      pause(10);
      continue;
    }
    const base = metadataFile + `.keeper-${process.pid}-${owner.nonce}-${attempt}`;
    const statusFile = base + '.json';
    const releaseRequest = base + '.release';
    const releaseAck = base + '.released';
    const keeper = spawn(process.execPath, [
      keeperScript, JSON.stringify(endpointFor(resource)),
      String(process.pid), statusFile, releaseRequest, releaseAck,
    ], { stdio: 'ignore', windowsHide: true });
    // Без обработчика ошибка spawn осталась бы необработанным событием и уронила
    // бы процесс позже; право входа при этом не выдаётся.
    keeper.on('error', () => {});
    if (!Number.isInteger(keeper.pid)) throw new Error('lock keeper failed to start');
    const deadline = Date.now() + 1000;
    let status;
    while (Date.now() < deadline && !(status = readStatus(statusFile))) {
      pause(5);
    }
    try { fs.unlinkSync(statusFile); } catch {}
    if (!status || status.status !== 'acquired') {
      try { keeper.kill(); } catch {}
      if (status && status.status === 'error') throw new Error(`lock keeper failed: ${status.message}`);
      refusal = status ? status.status : 'no-status';
      pause(10);
      continue;
    }
    // Повторное чтение под эксклюзивным bind: другой претендент не может
    // находиться между своей проверкой и публикацией, поэтому это решение
    // нельзя аннулировать конкурирующим acquire. Оно отвечает на смерть
    // keeper'а живого владельца — bind достался нам, но authority у него.
    const current = ownerFrom(metadataFile);
    if (current && pidAlive(current.pid)) {
      try { keeper.kill(); } catch {}
      refusal = 'live-owner';
      pause(10);
      continue;
    }
    try {
      const tmp = metadataFile + `.meta-${process.pid}-${owner.nonce}`;
      const fd = fs.openSync(tmp, 'wx');
      try {
        fs.writeFileSync(fd, JSON.stringify(owner) + '\n', 'utf8');
        fs.fsyncSync(fd);
      } finally { fs.closeSync(fd); }
      fs.renameSync(tmp, metadataFile);
    } catch (error) {
      try { keeper.kill(); } catch {}
      throw error;
    }
    // exitCode/signalCode обновляются обработчиком события, поэтому в
    // синхронном вызывающем они отстают; pidAlive проверяет ОС немедленно.
    const keeperGone = () => keeper.exitCode !== null || keeper.signalCode !== null || !pidAlive(keeper.pid);
    const hold = () => {
      if (sameOwner(ownerFrom(metadataFile), owner)) {
        try { fs.unlinkSync(metadataFile); } catch {}
      }
      // Мёртвый keeper уже освободил endpoint: подтверждения не будет и ждать
      // его не нужно, иначе release живого владельца стоил бы секунды.
      if (!keeperGone()) {
        try { fs.writeFileSync(releaseRequest, 'release', { flag: 'wx' }); } catch {}
        const releaseDeadline = Date.now() + 1000;
        while (Date.now() < releaseDeadline && !fs.existsSync(releaseAck)) {
          pause(5);
        }
      }
      try { fs.unlinkSync(releaseRequest); } catch {}
      try { fs.unlinkSync(releaseAck); } catch {}
    };
    // Проверка сужает окно, но не создаёт инвариант: инвариант несёт guard выше.
    // Нужна владельцу, который хочет падать fail-closed, а не писать по праву
    // входа, которое он больше не удерживает.
    hold.assertHeld = () => {
      if (keeperGone()) throw authorityLost('lock authority lost: the keeper holding the endpoint has exited');
      if (!sameOwner(ownerFrom(metadataFile), owner)) {
        throw authorityLost('lock authority lost: the ownership record no longer names this generation');
      }
    };
    hold.owner = owner;
    return hold;
  }
  const error = new Error(options.timeoutMessage || 'lock timeout');
  error.code = 'LOCK_TIMEOUT';
  error.reason = refusal;
  throw error;
}

module.exports = { acquireProcessLock, endpointFor };
