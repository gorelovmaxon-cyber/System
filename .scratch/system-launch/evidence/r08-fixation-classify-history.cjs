#!/usr/bin/env node
'use strict';

// Проверка правила на реальной истории: какие коммиты распознаются как
// автоматическая фиксация уже обработанной памяти, а какие — нет.
// Только чтение: git diff по родителю, очередь и журналы не изменяются.

const { execFileSync } = require('node:child_process');
const { classify } = require('../../../scripts/memory/memory-fixation');

const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const LIMIT = Number(process.argv[2] || 0);

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

const shas = git(['log', '--format=%H']).split('\n').filter(Boolean);
const selected = LIMIT ? shas.slice(0, LIMIT) : shas;
const rows = [];
for (const sha of selected) {
  const parents = git(['rev-list', '--parents', '-n', '1', sha]).trim().split(' ').slice(1);
  const base = parents[0] || EMPTY_TREE;
  const diff = git(['diff', base, sha]);
  const message = git(['log', '-1', '--format=%s', sha]).trim();
  const result = classify(diff);
  rows.push({ sha: sha.slice(0, 7), message: message.slice(0, 70), skip: result.skip, reason: result.reason, files: result.files || null });
}

const skipped = rows.filter(r => r.skip);
console.log('commits:', rows.length, '| skipped as fixation:', skipped.length);
console.log('\n=== распознаны как фиксация памяти ===');
for (const row of skipped) console.log(row.sha, '|', row.reason, '|', (row.files || []).join(','), '|', row.message);
console.log('\n=== НЕ распознаны (уйдут в AI) — только те, что похожи на память ===');
for (const row of rows.filter(r => !r.skip && /memory|writer-entries/.test(r.message))) console.log(row.sha, '|', row.reason, '|', row.message);
console.log('\n=== сводка причин ===');
const byReason = {};
for (const row of rows) byReason[row.reason] = (byReason[row.reason] || 0) + 1;
for (const [reason, count] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) console.log(String(count).padStart(4), reason);
