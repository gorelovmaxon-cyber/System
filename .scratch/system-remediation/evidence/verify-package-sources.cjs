'use strict';
// Сверка файлов, от которых зависит проверенный аудитом пакет, с хэшами
// манифеста аудита. Совпадение доказывает, что в Git попадает именно проверенный
// текст, а не позднейший черновик.
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

const repo = path.resolve(__dirname, '..', '..', '..');
const manifest = require('./comprehensive-source-manifest-2026-09-12.json');
const expected = new Map(manifest.files.map(file => [file.path.replaceAll('\\', '/'), file.sha256.toUpperCase()]));

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

const targets = process.argv.slice(2);
if (targets.length === 0) throw new Error('usage: node verify-package-sources.cjs <relative-path>...');
let mismatched = 0;
for (const relative of targets) {
  const absolute = path.join(repo, relative);
  const want = expected.get(relative.replaceAll('\\', '/'));
  if (want === undefined) {
    console.log('NOT-IN-MANIFEST  ' + relative);
    continue;
  }
  const actual = sha256(absolute);
  const match = actual === want;
  if (!match) mismatched += 1;
  console.log((match ? 'MATCH' : 'DIFF ') + '  ' + relative + '  sha256=' + actual + ' manifest=' + want);
}
process.exitCode = mismatched ? 1 : 0;
