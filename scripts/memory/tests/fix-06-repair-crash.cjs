#!/usr/bin/env node
'use strict';

// Фикстура аварийных регрессий U2 (FIX-06): отказ и смерть процесса на
// границах ремонта оборванного хвоста журнала. Работает только с файлом,
// переданным аргументом (TEMP-каталог теста); настоящая память не затрагивается.
//
// Границы:
//   quarantine-write-fail  — отказ записи карантина (шаг 1)
//   repair-copy-write-fail — отказ записи исправленной копии (шаг 2)
//   rename-fail            — отказ атомарной замены (шаг 3)
//   death-after-quarantine — смерть процесса сразу после закрытия карантина
//   death-before-replace   — смерть процесса после сброшенной копии, до замены

const fs = require('node:fs');
const path = require('node:path');

const [file, stage] = process.argv.slice(2);
if (!file || !stage) {
  process.stderr.write('usage: fix-06-repair-crash.cjs <file> <stage>\n');
  process.exit(64);
}

const jsonl = require(path.join(__dirname, '..', 'jsonl.js'));

const isQuarantine = target => typeof target === 'string' && target.includes('.corrupt-tail-');
const isRepairCopy = target => typeof target === 'string' && target.includes('.repair-');

function injected() {
  const error = new Error('injected failure at ' + stage);
  error.code = 'EIO';
  return error;
}

// Отказ открытия моделирует невозможность записать файл на данной границе.
function failToOpen(predicate) {
  const openSync = fs.openSync;
  fs.openSync = function (target, ...rest) {
    if (predicate(target)) throw injected();
    return openSync.call(fs, target, ...rest);
  };
}

// Смерть процесса сразу после закрытия файла: к этому моменту запись завершена
// и, для writeDurable, уже сброшена на диск.
function dieAfterClose(predicate) {
  const openSync = fs.openSync;
  const closeSync = fs.closeSync;
  const doomed = new Set();
  fs.openSync = function (target, ...rest) {
    const fd = openSync.call(fs, target, ...rest);
    if (predicate(target)) doomed.add(fd);
    return fd;
  };
  fs.closeSync = function (fd) {
    const result = closeSync.call(fs, fd);
    if (doomed.delete(fd)) process.exit(23);
    return result;
  };
}

function failRename() {
  const renameSync = fs.renameSync;
  const canonical = path.resolve(file);
  fs.renameSync = function (from, to) {
    if (path.resolve(String(to)) === canonical) throw injected();
    return renameSync.call(fs, from, to);
  };
}

if (stage === 'quarantine-write-fail') failToOpen(isQuarantine);
else if (stage === 'repair-copy-write-fail') failToOpen(isRepairCopy);
else if (stage === 'rename-fail') failRename();
else if (stage === 'death-after-quarantine') dieAfterClose(isQuarantine);
else if (stage === 'death-before-replace') dieAfterClose(isRepairCopy);
else {
  process.stderr.write('unknown stage: ' + stage + '\n');
  process.exit(64);
}

try {
  const records = jsonl.readJsonl(file);
  process.stdout.write(JSON.stringify({ threw: false, records }) + '\n');
} catch (error) {
  process.stdout.write(JSON.stringify({ threw: true, code: error.code, message: error.message }) + '\n');
}
