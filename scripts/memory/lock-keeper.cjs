#!/usr/bin/env node
'use strict';

// Сторож держит эксклюзивный OS-endpoint ресурса и является единственным
// писателем записи владения. Публикация выполняется под уже установленным
// bind'ом, поэтому решение «нет живого владельца» не может устареть между
// проверкой и записью: bind не переходит к другому процессу, пока этот жив
// (V1). Смерть сторожа отменяет публикацию целиком — незавершённой записи
// владения не остаётся, и чужое владение не заменяется.
//
// Запись владения снимает тот же держатель bind'а: при release, при смерти
// родителя и при закрытии endpoint. Осиротевшая запись (сторож убит до
// публикации/сообщения) не является владением: претендент видит в ней либо
// мёртвого владельца, либо собственную попытку и забирает ресурс сам.
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');

const endpoint = JSON.parse(process.argv[2]);
const parentPid = Number(process.argv[3]);
const statusFile = process.argv[4];
const releaseRequest = process.argv[5];
const releaseAck = process.argv[6];
// Без metadataFile сторож только проверяет занятость endpoint (диагностика).
const metadataFile = process.argv[7] || null;
const owner = process.argv[8] ? JSON.parse(process.argv[8]) : null;
if (!endpoint || !Number.isInteger(parentPid) || !statusFile || !releaseRequest || !releaseAck) process.exit(64);
if ((metadataFile === null) !== (owner === null)) process.exit(64);

let keeperPid = process.pid;

function publishStatus(value) {
  try { fs.writeFileSync(statusFile, JSON.stringify(value), { flag: 'wx' }); } catch {}
}

function readRecord() {
  if (!metadataFile) return null;
  try {
    const value = JSON.parse(fs.readFileSync(metadataFile, 'utf8').trim());
    return value && Number.isInteger(value.pid) ? value : null;
  } catch { return null; }
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== 'ESRCH';
  }
}

// Решение принимается под эксклюзивным bind'ом и потому не может быть
// аннулировано конкурирующим acquire: конкурент получит bind только после
// смерти этого сторожа, а тогда этой публикации уже не будет.
function decide() {
  const record = readRecord();
  if (!record) return { ok: true };
  if (record.hostname !== os.hostname()) return { ok: false, reason: 'foreign-owner' };
  if (!alive(record.pid)) return { ok: true };
  // Живой владелец. Единственное исключение — осиротевшая публикация нашей же
  // попытки: тот же pid, другой nonce, и результата acquire владелец не
  // получил (иначе он бы не пытался снова). Чужое владение не заменяется.
  if (record.pid === parentPid && record.nonce !== owner.nonce) return { ok: true, reason: 'own-orphan' };
  return { ok: false, reason: 'live-owner' };
}

function recordIsMine() {
  const record = readRecord();
  return Boolean(record) && record.pid === owner.pid && record.nonce === owner.nonce && record.keeperPid === keeperPid;
}

function writeRecord() {
  const tmp = metadataFile + '.publish-' + keeperPid;
  try { fs.unlinkSync(tmp); } catch {}
  const fd = fs.openSync(tmp, 'wx', 0o600);
  try {
    const record = { ...owner, keeperPid, keeper_started: new Date().toISOString() };
    fs.writeFileSync(fd, JSON.stringify(record) + '\n', 'utf8');
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, metadataFile);
}

function removeRecord() {
  if (!metadataFile) return;
  if (!owner) return;
  // Снимается только своё владение: чужую запись держатель bind'а не трогает.
  if (recordIsMine()) {
    try { fs.unlinkSync(metadataFile); } catch {}
  }
}

function parentAlive() {
  try {
    process.kill(parentPid, 0);
    return true;
  } catch (error) {
    return error.code === 'ESRCH' ? false : true;
  }
}

const server = net.createServer();
let closing = false;
function close(code = 0, acknowledge = true) {
  if (closing) return;
  closing = true;
  server.close(() => {
    if (acknowledge) {
      try { fs.writeFileSync(releaseAck, 'released', { flag: 'wx' }); } catch {}
    }
    process.exit(code);
  });
  setTimeout(() => process.exit(code), 250).unref();
}

server.on('error', error => {
  publishStatus({ status: error.code === 'EADDRINUSE' ? 'busy' : 'error', code: error.code, message: error.message });
  process.exit(error.code === 'EADDRINUSE' ? 2 : 1);
});

server.listen(endpoint, () => {
  if (!metadataFile) {
    publishStatus({ status: 'acquired', pid: keeperPid });
    return;
  }
  const decision = decide();
  if (!decision.ok) {
    publishStatus({ status: 'refused', reason: decision.reason });
    // Отказ не удерживает endpoint: закрываемся, не снимая чужую запись.
    return close(3, false);
  }
  try {
    writeRecord();
  } catch (error) {
    publishStatus({ status: 'error', code: 'PUBLISH_FAILED', message: error.message });
    return close(4, false);
  }
  publishStatus({ status: 'acquired', pid: keeperPid });
});

setInterval(() => {
  if (fs.existsSync(releaseRequest)) {
    removeRecord();
    close(0);
  } else if (!parentAlive()) {
    // Владелец умер: держатель bind'а снимает своё владение и освобождает
    // endpoint, иначе осиротевшая запись задерживала бы следующего владельца.
    removeRecord();
    close(0, false);
  }
}, 10).unref();
