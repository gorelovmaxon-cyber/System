#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { resolvePaths } = require('./resolve-paths');
const writerLog = require('./writer-log');

// Коммит, которым фиксируется уже обработанная память, не должен снова уходить
// в AI: writer порождает запись → запись коммитится → hook захватывает коммит →
// AI снова порождает запись. Цикл ограничен только ручным прекращением коммитов.
//
// Признак автоматической фиксации берётся из проверяемых происхождения и состава
// коммита, а не из текста сообщения: сообщение `memory: …` может стоять и на
// обычном изменении, и на смешанном коммите.
//
// Состав — diff целиком (не усечённый для события): все изменённые пути лежат в
// memory root, ничего не удаляется и не переименовывается.
// Происхождение — журнал writer: каждый изменённый файл является его целью
// (`written_files`), а каждый добавленный `event_id` уже завершён `persisted`.
//
// Недостаток признаков — не повод отбросить событие: любое сомнение, ошибка
// разбора или недоступный журнал означают обычный захват.

const EVENT_ID_LINE = /^\+event_id:[ \t]*(\S+)[ \t]*$/;
const HUNK = /^@@ /;

function unquote(value) {
  // Git берёт путь в кавычки, если он содержит спецсимволы. Разбор такого пути
  // неоднозначен, поэтому кавычки — признак недостаточных данных, а не повод
  // угадывать: сомнительный коммит захватывается как обычный.
  if (value.startsWith('"') || value.endsWith('"')) return null;
  if (value === '/dev/null') return null;
  return value;
}

// Обычный `git diff` помечает стороны префиксами `a/` и `b/`. Без их снятия
// путь читается как `b/.claude/memory/...` и ни один коммит памяти не
// опознаётся: проверено на истории — 0 распознанных вместо всех `memory: …`.
function stripDiffPrefix(value, prefix) {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function memoryPrefix(paths) {
  const relative = path.relative(paths.system_root, paths.memory_root).split(path.sep).join('/');
  return relative ? relative + '/' : '';
}

// Секция diff для одного файла: путь, признак удаления/переименования и
// добавленные строки. Секция с непонятным заголовком помечается ошибкой, а не
// пропускается: пропуск секции выглядел бы как «изменений меньше».
function parseSections(diff) {
  const sections = [];
  let current = null;
  for (const line of String(diff || '').split(/\r?\n/)) {
    if (line.startsWith('diff --git ')) {
      current = { header: line, newPath: null, oldPath: null, deleted: false, renamed: false, binary: false, added: [], removed: 0, hunk: false, error: null };
      sections.push(current);
      continue;
    }
    if (!current) continue;
    if (line.startsWith('--- ')) {
      const raw = line.slice(4).trim();
      const value = unquote(raw);
      if (value === null && raw !== '/dev/null') current.error = 'unparsable-path';
      current.oldPath = value === null ? null : stripDiffPrefix(value, 'a/');
      continue;
    }
    if (line.startsWith('+++ ')) {
      const raw = line.slice(4).trim();
      if (raw === '/dev/null') { current.deleted = true; continue; }
      const value = unquote(raw);
      if (value === null) current.error = 'unparsable-path';
      current.newPath = value === null ? null : stripDiffPrefix(value, 'b/');
      continue;
    }
    if (line.startsWith('rename from ') || line.startsWith('rename to ') || line.startsWith('copy from ') || line.startsWith('copy to ')) {
      current.renamed = true;
      continue;
    }
    if (line.startsWith('Binary files ') || line.startsWith('GIT binary patch')) { current.binary = true; continue; }
    if (HUNK.test(line)) { current.hunk = true; continue; }
    if (!current.hunk) continue;
    if (line.startsWith('+')) { current.added.push(line); continue; }
    if (line.startsWith('-')) { current.removed += 1; continue; }
  }
  return sections;
}

function classify(diff, options = {}) {
  try {
    const sections = parseSections(diff);
    if (!sections.length) return { skip: false, reason: 'no-file-sections' };
    for (const section of sections) {
      if (section.error) return { skip: false, reason: section.error };
      if (section.deleted) return { skip: false, reason: 'deletes-file' };
      if (section.renamed) return { skip: false, reason: 'renames-file' };
      if (section.binary) return { skip: false, reason: 'binary-file' };
      if (!section.newPath) return { skip: false, reason: 'unparsable-path' };
      if (section.removed > 0) return { skip: false, reason: 'removes-content' };
    }

    const paths = options.paths || resolvePaths();
    const prefix = memoryPrefix(paths);
    const files = sections.map(section => section.newPath);
    for (const file of files) {
      if (!file.startsWith(prefix)) return { skip: false, reason: 'touches-outside-memory' };
    }

    const records = options.writerRecords || writerLog.records();
    const owned = new Set();
    const persisted = new Set();
    for (const record of records.values()) {
      if (record.status !== 'persisted') continue;
      persisted.add(record.event_id);
      for (const file of record.written_files || []) owned.add(file);
    }
    for (const file of files) {
      if (!owned.has(file)) return { skip: false, reason: 'not-a-writer-file' };
    }

    const eventIds = [];
    for (const section of sections) {
      for (const line of section.added) {
        const match = EVENT_ID_LINE.exec(line);
        if (match) eventIds.push(match[1]);
      }
    }
    if (!eventIds.length) return { skip: false, reason: 'no-event-id-in-added-content' };
    for (const eventId of eventIds) {
      if (!persisted.has(eventId)) return { skip: false, reason: 'event-not-yet-persisted' };
    }

    return { skip: true, reason: 'writer-memory-fixation', files, event_ids: [...new Set(eventIds)] };
  } catch (error) {
    // Отказ самой проверки не должен выглядеть как «это фиксация памяти».
    return { skip: false, reason: 'classifier-error: ' + error.message };
  }
}

module.exports = { classify, parseSections };
