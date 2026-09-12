#!/usr/bin/env node
'use strict';

// Претендент на право входа поверх мёртвой записи владельца (S1). Процесс
// стартует с мёртвой записью в общем каталоге владения и приостанавливается
// ДО входа в протокол. Прежний вариант фикстуры приостанавливался внутри
// разрушающего действия над памятью блокировки (unlinkSync канонического пути
// либо verified-карантина) — этих веток в текущем протоколе нет: устаревший
// претендент не удаляет и не переименовывает чужую authority, а живой
// владелец в записи закрывает вход. Поэтому проверяется достижимое: тест
// удерживает право входа в родителе и убеждается, что возобновлённый
// претендент не входит и не разрушает запись живого владельца.
// Управляется файлами ready/resume в корне фикстуры (SYSTEM2_ROOT);
// содержимое ready — метка режима для диагностики. Режим 'hold' —
// восстановить мёртвую запись, удерживать до release-me и отпустить.
// Используется только тестами.
const fs = require('node:fs');
const path = require('node:path');

const root = process.env.SYSTEM2_ROOT;
if (!root) throw new Error('SYSTEM2_ROOT is required');

fs.writeFileSync(path.join(root, 'ready'), process.argv[2] || 'reclaim');
const readyEnd = Date.now() + 10000;
while (!fs.existsSync(path.join(root, 'resume'))) {
  if (Date.now() > readyEnd) throw new Error('pause timeout');
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
}

const writer = require('../writer');
const mode = process.argv[2];

if (mode === 'hold') {
  // претендент, который восстановил мёртвую запись и удерживает право входа
  const release = writer.acquireLock();
  fs.writeFileSync(path.join(root, 'first-acquired'), '1');
  const end = Date.now() + 15000;
  while (!fs.existsSync(path.join(root, 'release-me'))) {
    if (Date.now() > end) throw new Error('hold timeout');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
  }
  release();
  console.log('first acquired and released');
} else {
  const release = writer.acquireLock();
  fs.writeFileSync(path.join(root, 'child-acquired'), '1');
  release();
  console.log('child acquired and released');
}
