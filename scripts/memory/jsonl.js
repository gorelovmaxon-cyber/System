#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { acquireProcessLock } = require('./ipc-lock');

function authority(file) {
  return file + '.journal-authority';
}

function journalLock(file) {
  return file + '.journal.lock';
}

function writeDurable(target, data, flag) {
  const fd = fs.openSync(target, flag, 0o600);
  try {
    fs.writeFileSync(fd, data, 'utf8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

// Windows не открывает каталог как файл; там синхронизация каталога
// недоступна и остаётся best-effort.
function syncDirectory(dir) {
  let fd;
  try { fd = fs.openSync(dir, 'r'); } catch { return; }
  try { fs.fsyncSync(fd); } catch {} finally {
    try { fs.closeSync(fd); } catch {}
  }
}

// Ремонт оборванного хвоста не имеет права обнулить единственную корректную
// копию журнала (U2). Порядок операций:
//   1. оборванный хвост сохраняется durable и эксклюзивно ('wx') в sidecar;
//   2. исправленное содержимое готовится в соседнем файле и сбрасывается на диск;
//   3. канонический путь заменяется атомарным rename.
// Любой отказ до шага 3 оставляет исходный файл целиком (корректный префикс и
// оборванный хвост) — восстановимы оба. Префикс берётся срезом по последнему
// LF, поэтому переписанные байты прежних записей не меняются.
function repairTornTail(file, text) {
  const cut = text.lastIndexOf('\n');
  const prefix = cut === -1 ? '' : text.slice(0, cut + 1);
  const tail = text.slice(cut + 1);
  const hash = crypto.createHash('sha256').update(tail).digest('hex').slice(0, 12);
  const quarantine = `${file}.corrupt-tail-${Date.now()}-${process.pid}-${hash}`;
  writeDurable(quarantine, tail, 'wx');
  const tmp = `${file}.repair-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  try {
    writeDurable(tmp, prefix, 'wx');
    fs.renameSync(tmp, file);
  } catch (error) {
    try { fs.unlinkSync(tmp); } catch {}
    throw error;
  }
  syncDirectory(path.dirname(file));
  return prefix;
}

function readUnlocked(file) {
  if (!fs.existsSync(file)) return [];
  let text = fs.readFileSync(file, 'utf8');
  if (!text.endsWith('\n')) {
    const tail = text.slice(text.lastIndexOf('\n') + 1);
    let torn = false;
    if (tail.trim()) {
      try { JSON.parse(tail); } catch { torn = true; }
    }
    // Полное значение без завершающего LF — валидная запись, а не повреждение:
    // файл не переписывается, разделитель вставит следующий append.
    if (torn) text = repairTornTail(file, text);
  }
  const lines = text.split(/\r?\n/);
  if (text.endsWith('\n')) lines.pop();
  const records = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    try { records.push(JSON.parse(line)); }
    catch (error) {
      const failure = new Error(`corrupt JSONL record in the middle of ${file} at line ${index + 1}: ${error.message}`);
      failure.code = 'JSONL_CORRUPT_MIDDLE';
      throw failure;
    }
  }
  return records;
}

function endsWithNewline(file) {
  const size = fs.statSync(file).size;
  if (size === 0) return true;
  const fd = fs.openSync(file, 'r');
  try {
    const byte = Buffer.alloc(1);
    fs.readSync(fd, byte, 0, 1, size - 1);
    return byte[0] === 0x0a;
  } finally { fs.closeSync(fd); }
}

// Долговечная дозапись: 'a' + write + fsync + close. appendFileSync не сбрасывает
// содержимое на диск, поэтому обещание durability хвоста требовало отдельной
// реализации, а не только чтения.
function appendDurable(file, record) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const separator = fs.existsSync(file) && !endsWithNewline(file) ? '\n' : '';
  const fd = fs.openSync(file, 'a', 0o600);
  try {
    fs.writeFileSync(fd, separator + JSON.stringify(record) + '\n', 'utf8');
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
}

function readJsonl(file) {
  const hold = acquireProcessLock(authority(file), { metadataFile: journalLock(file), timeoutMessage: 'JSONL lock timeout' });
  try {
    hold.assertHeld();
    return readUnlocked(file);
  } finally { hold(); }
}

function appendJsonl(file, record) {
  const hold = acquireProcessLock(authority(file), { metadataFile: journalLock(file), timeoutMessage: 'JSONL lock timeout' });
  try {
    hold.assertHeld();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    readUnlocked(file);
    hold.assertHeld();
    appendDurable(file, record);
  } finally { hold(); }
}

function transactJsonl(file, callback) {
  const hold = acquireProcessLock(authority(file), { metadataFile: journalLock(file), timeoutMessage: 'JSONL lock timeout' });
  try {
    hold.assertHeld();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const records = readUnlocked(file);
    const outcome = callback(records) || {};
    for (const record of outcome.append || []) {
      hold.assertHeld();
      appendDurable(file, record);
    }
    return outcome.value;
  } finally { hold(); }
}

module.exports = { appendDurable, appendJsonl, readJsonl, transactJsonl };
