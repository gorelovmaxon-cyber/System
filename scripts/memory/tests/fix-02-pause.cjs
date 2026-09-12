#!/usr/bin/env node
'use strict';

// Детерминированная пауза претендента на право входа в writer. Процесс
// останавливается ДО обращения к протоколу: право входа даёт эксклюзивный
// OS-bind сторожа, и запись владения публикует только его держатель, поэтому
// окна «openSync(memory.lock) -> публикация владельца», которое проверял
// прежний вариант фикстуры, в коде больше нет — пауза внутри протокола
// проверяла бы недостижимое состояние. Проверяется достижимое: пока живой
// владелец удерживает право входа, возобновлённый претендент не входит и
// ничего не разрушает (R5), а после завершённой записи владельца его ход
// даёт обычный конфликт или идемпотентный повтор (R6).
// Режимы: 'lock' — взять и сразу отпустить право входа, 'write' — записать
// предложение. Пауза управляется файлами ready/resume в корне фикстуры
// (SYSTEM2_ROOT), содержимое ready — метка режима для диагностики.
// Используется только тестами; в проде не запускается.
const fs = require('node:fs');
const path = require('node:path');

const root = process.env.SYSTEM2_ROOT;
if (!root) throw new Error('SYSTEM2_ROOT is required');
const mode = process.argv[2];
const eventId = process.argv[3] || 'evt_race';
const statement = process.argv[4] || 'CHILD_CONTENT';

fs.writeFileSync(path.join(root, 'ready'), mode || 'contender');
const end = Date.now() + 10000;
while (!fs.existsSync(path.join(root, 'resume'))) {
  if (Date.now() > end) throw new Error('pause timeout');
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
}

const writer = require('../writer');

if (mode === 'lock') {
  const release = writer.acquireLock();
  fs.writeFileSync(path.join(root, 'child-acquired'), '1');
  release();
  console.log('child acquired and released');
} else if (mode === 'write') {
  const result = writer.writeProposal(eventId, {
    category: 'facts',
    status: 'observation',
    scope: 'user',
    statement,
    evidence: 'synthetic fixture',
    source: 'test',
  });
  console.log(JSON.stringify(result));
} else {
  throw new Error('unknown mode: ' + mode);
}
