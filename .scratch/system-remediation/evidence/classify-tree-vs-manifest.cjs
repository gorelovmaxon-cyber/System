'use strict';
// Классификация рабочего дерева относительно манифеста аудита 2026-09-12:
// какие изменённые/новые файлы являются проверенным аудитом содержимым (хэш совпал),
// а какие появились позже. Секреты не читаются и не печатаются.
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const repo = path.resolve(__dirname, '..', '..', '..');
const manifest = require('./comprehensive-source-manifest-2026-09-12.json');
const expected = new Map(
  manifest.files.map(file => [file.path.replaceAll('\\', '/'), file.sha256.toUpperCase()])
);

const status = execFileSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean);

function sha256(relative) {
  const absolute = path.join(repo, relative);
  if (!fs.existsSync(absolute)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex').toUpperCase();
}

const buckets = { match: [], diff: [], untrackedMatch: [], untrackedNew: [], absent: [] };
for (const line of status) {
  const code = line.slice(0, 2);
  const relative = line.slice(3).replace(/^"|"$/g, '');
  if (code.includes('D')) continue;
  const want = expected.get(relative.replaceAll('\\', '/'));
  const actual = sha256(relative);
  if (want === undefined) {
    if (code === '??') buckets.untrackedNew.push(relative);
    else buckets.absent.push(relative);
    continue;
  }
  if (actual === want) buckets[code === '??' ? 'untrackedMatch' : 'match'].push(relative);
  else buckets[code === '??' ? 'untrackedNew' : 'diff'].push(relative);
}

for (const [name, list] of Object.entries(buckets)) {
  console.log(`-- ${name} (${list.length}) --`);
  for (const item of list.sort()) console.log('   ' + item);
}
