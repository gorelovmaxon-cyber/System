#!/usr/bin/env node
'use strict';

// L06-03 drill: restore a representative backup into a SEPARATE directory and
// verify memory integrity, local-state shape and that the search index is
// derived (never restored). Read-only with respect to the live environment.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const BACKUPS = 'D:\\SystemTheBest\\transfer-backups';
const SRC = path.join(BACKUPS, 'pre-live-cycle-20260913-221624');
const STATE_SRC = path.join(BACKUPS, 'pre-push-20260912-182546', 'runtime', '.local');
const LIVE_MEMORY = path.join(process.cwd(), '.claude', 'memory');
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
const DRILL = path.join(BACKUPS, 'restore-drill-' + stamp);

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

function main() {
  const result = { drill_root: DRILL, source: SRC, steps: [] };

  fs.mkdirSync(DRILL, { recursive: true });
  result.steps.push({ step: 'isolated target created', ok: true, detail: DRILL });

  copyTree(path.join(SRC, '.claude', 'memory'), path.join(DRILL, 'memory'));
  const localConfig = fs.readdirSync(SRC).find(name => name.startsWith('system.local.json'));
  fs.copyFileSync(path.join(SRC, localConfig), path.join(DRILL, localConfig));
  fs.copyFileSync(path.join(SRC, 'manifest.json'), path.join(DRILL, 'manifest.json'));
  result.steps.push({ step: 'memory + local config restored from package', ok: true, detail: localConfig });

  const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
  const restored = walk(path.join(DRILL, 'memory'));
  const mismatch = [];
  const missing = [];
  for (const [rel, expected] of Object.entries(manifest)) {
    const file = path.join(DRILL, 'memory', rel);
    if (!fs.existsSync(file)) { missing.push(rel); continue; }
    if (sha256(file) !== expected) mismatch.push(rel);
  }
  const extra = restored.filter(rel => !(rel in manifest));
  result.integrity = {
    manifest_entries: Object.keys(manifest).length,
    restored_files: restored.length,
    sha256_mismatch: mismatch,
    missing_from_restore: missing,
    restored_but_not_in_manifest: extra,
    verdict: mismatch.length === 0 && missing.length === 0 ? 'PASS' : 'FAIL',
  };
  result.steps.push({ step: 'sha256 of every restored file vs manifest', ok: result.integrity.verdict === 'PASS' });

  const live = walk(LIVE_MEMORY);
  result.freshness = {
    live_files: live.length,
    restored_files: restored.length,
    in_live_not_in_backup: live.filter(rel => !restored.includes(rel)).sort(),
  };
  result.steps.push({
    step: 'backup freshness vs live memory',
    ok: true,
    detail: 'restoring this package alone would not return the live memory set',
  });

  const stateFiles = fs.existsSync(STATE_SRC) ? walk(STATE_SRC) : [];
  result.local_state_package = {
    source: STATE_SRC,
    files: stateFiles,
    index_artifacts_in_memory_package: restored.filter(rel => /index|embedding|\.db$|vectors?/i.test(rel)),
  };
  result.steps.push({
    step: 'forward index is derived, not restored',
    ok: result.local_state_package.index_artifacts_in_memory_package.length === 0,
    detail: 'no index/embedding artifacts among restored memory files; the index is rebuilt from memory',
  });

  fs.writeFileSync(path.join(DRILL, 'RESTORE-DRILL-RESULT.json'), JSON.stringify(result, null, 2) + '\n');
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (result.integrity.verdict !== 'PASS') process.exitCode = 1;
}

main();
