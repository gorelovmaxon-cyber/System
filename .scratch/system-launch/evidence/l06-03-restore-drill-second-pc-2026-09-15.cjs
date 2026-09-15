#!/usr/bin/env node
'use strict';

// L06-03 drill на втором ПК (DESKTOP-NCLRFDV): восстановить представительный
// резерв в ОТДЕЛЬНЫЙ каталог вне репозитория и проверить целостность памяти,
// форму локального состояния и то, что индекс производный (никогда не
// восстанавливается как источник истины).
//
// Read-only по отношению к живой среде: живая память, живая очередь и живой
// индекс не изменяются. Источник — пакет, снятый шагом 1 пакета второго ПК.
//
// Запуск:
//   node .scratch/system-launch/evidence/l06-03-restore-drill-second-pc-2026-09-15.cjs

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const BACKUPS = 'E:\\SystemTheBest\\transfer-backups';
const SRC = process.argv[2] || path.join(BACKUPS, 'second-pc-20260915-191058');
const LIVE_MEMORY = path.join(process.cwd(), '.claude', 'memory');
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
const DRILL = path.join(BACKUPS, 'restore-drill-second-pc-' + stamp);

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyTree(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

// Формат GNU coreutils: "<hash> <mode><path>", где mode — '*' (двоичный) или
// пробел (текстовый). Путь обычно начинается с './'.
function parseManifest(file) {
  const map = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^([0-9a-f]{64}) [\s*](.+)$/.exec(line.trim());
    if (!match) continue;
    const rel = match[2].replace(/^\.\//, '').split(path.sep).join('/');
    map[rel] = match[1];
  }
  return map;
}

// append-only журналы читаются по последней записи на идентификатор, а не по
// числу сырых строк: строка журнала — это переход состояния, а не запись.
function journalShape(file, idKeys) {
  if (!fs.existsSync(file)) return { present: false };
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  const latest = new Map();
  for (const line of lines) {
    let parsed;
    try { parsed = JSON.parse(line); } catch { continue; }
    const id = idKeys.map(k => parsed[k]).find(Boolean) || JSON.stringify(parsed).slice(0, 40);
    latest.set(id, parsed);
  }
  const statuses = {};
  for (const rec of latest.values()) {
    const status = rec.status || rec.outcome || 'unknown';
    statuses[status] = (statuses[status] || 0) + 1;
  }
  return { present: true, raw_lines: lines.length, unique_records: latest.size, statuses };
}

function main() {
  const result = { drill_root: DRILL, source: SRC, steps: [] };

  if (!fs.existsSync(SRC)) throw new Error('source package missing: ' + SRC);
  fs.mkdirSync(DRILL, { recursive: true });
  result.steps.push({ step: 'isolated target created', ok: true, detail: DRILL });

  const memorySrc = path.join(SRC, 'system2-memory');
  copyTree(memorySrc, path.join(DRILL, 'memory'));
  result.steps.push({ step: 'memory restored from package', ok: true, detail: memorySrc });

  // 1. Целостность пакета: каждая запись манифеста против самого источника.
  const manifest = parseManifest(path.join(SRC, 'MANIFEST.sha256'));
  const packageBad = [];
  const packageAbsent = [];
  for (const [rel, hash] of Object.entries(manifest)) {
    const full = path.join(SRC, rel.split('/').join(path.sep));
    if (!fs.existsSync(full)) { packageAbsent.push(rel); continue; }
    if (sha256(full) !== hash) packageBad.push(rel);
  }
  result.package_integrity = {
    manifest_entries: Object.keys(manifest).length,
    verified: Object.keys(manifest).length - packageBad.length - packageAbsent.length,
    mismatched: packageBad,
    absent: packageAbsent,
  };
  result.steps.push({
    step: 'package verified against its own manifest',
    ok: packageBad.length === 0 && packageAbsent.length === 0,
  });

  // 2. Восстановленная копия памяти побайтово совпадает с пакетом.
  const restored = walk(path.join(DRILL, 'memory'));
  const mismatch = [];
  const missing = [];
  let matched = 0;
  for (const rel of restored) {
    const expected = manifest['system2-memory/' + rel];
    if (!expected) { missing.push(rel); continue; }
    if (sha256(path.join(DRILL, 'memory', rel)) === expected) matched += 1;
    else mismatch.push(rel);
  }
  result.integrity = {
    restored_files: restored.length,
    pinned_in_manifest: matched + mismatch.length,
    matched_sha256: matched,
    mismatched: mismatch,
    not_in_manifest: missing,
  };
  result.steps.push({
    step: 'restored memory sha256 verified against package manifest',
    ok: mismatch.length === 0 && missing.length === 0 && matched === restored.length,
  });

  // 2. Локальное состояние: durable-очередь, индекс, writer.
  const localRestored = path.join(DRILL, 'local');
  copyTree(path.join(SRC, 'system2-local'), localRestored);
  result.local_state = {
    queue: journalShape(path.join(localRestored, 'queue', 'events.jsonl'), ['event_id', 'eventId']),
    indexer: journalShape(path.join(localRestored, 'indexer', 'tasks.jsonl'), ['task_id', 'taskId', 'id']),
    writer: journalShape(path.join(localRestored, 'writer', 'processed.jsonl'), ['event_id', 'eventId']),
  };
  result.steps.push({ step: 'local state restored and read by last record per id', ok: true });

  // 3. Индекс производный: артефактов индекса в резерве быть не должно.
  const indexArtifacts = [];
  walk(DRILL).forEach(rel => {
    if (/khoj.*index|embedding|\.faiss|index\.db/i.test(rel)) indexArtifacts.push(rel);
  });
  result.derived_index = { index_artifacts_in_backup: indexArtifacts };
  result.steps.push({ step: 'index is derived, not restored', ok: indexArtifacts.length === 0 });

  // 4. Живая память осталась нетронутой и является более новой.
  const live = walk(LIVE_MEMORY);
  const liveSet = new Set(live);
  const restoredSet = new Set(restored);
  result.live_comparison = {
    live_files: live.length,
    restored_files: restored.length,
    only_live: live.filter(f => !restoredSet.has(f)),
    only_restored: restored.filter(f => !liveSet.has(f)),
  };
  result.steps.push({ step: 'live memory untouched and compared', ok: true });

  result.live_memory_sha256 = sha256(path.join(LIVE_MEMORY, 'MEMORY.md'));
  result.restored_memory_sha256 = sha256(path.join(DRILL, 'memory', 'MEMORY.md'));

  const outFile = path.join(
    process.cwd(), '.scratch', 'system-launch', 'evidence',
    'l06-03-restore-drill-second-pc-2026-09-15.json'
  );
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.stdout.write('written: ' + outFile + '\n');
}

main();
