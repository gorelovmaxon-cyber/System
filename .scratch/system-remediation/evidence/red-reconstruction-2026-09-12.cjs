'use strict';

// RED-подтверждение для V1/G15 (общий независимый аудит 2026-09-12).
//
// До-фиксовая ревизия этих трёх файлов существует в git (ece1b24, коммит
// U1-раунда), поэтому реконструкция не текстовыми правками, а восстановлением
// исторических файлов из git в TEMP-копию дерева. Рабочее дерево не изменяется.
//
// Восстанавливаются:
//   scripts/memory/ipc-lock.js   — владелец публикует запись сам, идентичность
//                                  ресурса берётся из переданного пути;
//   scripts/memory/lock-keeper.cjs — процедура bind без публикации записи;
//   scripts/memory/writer.js     — lockPath() = <data_dir>/writer/memory.lock (G15).
//
// Затем на копии запускаются:
//   1. неподделанная проба рецензента review-2026-09-12.cjs → ожидается exit 0
//      (V1 воспроизведён). На текущем дереве та же проба завершается ошибкой
//      harness'а (exit 2), потому что точки «публикация владельцем» больше нет —
//      это фиксируется отдельным наблюдением, а не выдаётся за успех;
//   2. новые позитивные регрессии V1/G15 → ожидаются падения.
//
// Запуск: node .scratch/system-remediation/evidence/red-reconstruction-2026-09-12.cjs

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');

const EVIDENCE = __dirname;
const REPO = path.resolve(EVIDENCE, '..', '..', '..');
const PRE_V1 = 'ece1b24';

const RESTORED = [
  ['scripts/memory/ipc-lock.js', 'ipc-lock.js'],
  ['scripts/memory/lock-keeper.cjs', 'lock-keeper.cjs'],
  ['scripts/memory/writer.js', 'writer.js'],
];

// Историческая ревизия не содержала ни канонизации пути, ни вывода файла владения из
// канонической идентичности — идентичностью служил сам переданный путь, а writer-блок
// лежал в data_dir. Чтобы новые регрессии падали на ПОВЕДЕНИИ, а не на отсутствии
// экспорта, эти два факта восстанавливаются явно: canonicalPath только приводит путь
// к абсолютному (junction и регистр не разворачиваются), lockStatePath указывает на
// data_dir текущей конфигурации.
const IDENTITY_EMULATION = [
  '',
  '// RED-реконструкция идентичности до V1/G15.',
  'function redCanonicalPath(target) { return path.resolve(String(target)); }',
  "function redLockStateDir() { return path.join(require('./resolve-paths').resolvePaths().data_dir, 'writer'); }",
  "function redLockStatePath() { return path.join(redLockStateDir(), 'memory.lock'); }",
  'module.exports = {',
  '  acquireProcessLock,',
  '  endpointFor,',
  '  canonicalPath: redCanonicalPath,',
  '  lockStateDir: redLockStateDir,',
  '  lockStatePath: redLockStatePath,',
  '};',
  '',
].join('\n');

function gitShow(revision, file) {
  const result = cp.spawnSync('git', ['show', `${revision}:${file}`], { cwd: REPO, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git show ${revision}:${file} failed: ${result.stderr}`);
  return result.stdout;
}

function reconstruct(root) {
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.cpSync(path.join(REPO, 'scripts', 'memory'), path.join(root, 'scripts', 'memory'), { recursive: true });
  fs.mkdirSync(path.join(root, 'evidence'), { recursive: true });
  for (const [repoPath, name] of RESTORED) {
    fs.writeFileSync(path.join(root, 'scripts', 'memory', name), gitShow(PRE_V1, repoPath), 'utf8');
  }
  const lock = path.join(root, 'scripts', 'memory', 'ipc-lock.js');
  fs.writeFileSync(lock, fs.readFileSync(lock, 'utf8') + IDENTITY_EMULATION, 'utf8');
  fs.copyFileSync(
    path.join(EVIDENCE, 'review-2026-09-12.cjs'),
    path.join(root, 'evidence', 'review-2026-09-12.cjs'),
  );
  return root;
}

function runNode(args, cwd) {
  return cp.spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 300000, env: process.env });
}

function failureNames(stdout) {
  return [...new Set([...stdout.matchAll(/^✖ (.+)$/gm)].map(match => match[1].trim()))];
}

function main() {
  if (!fs.existsSync(path.join(REPO, 'scripts', 'memory', 'ipc-lock.js'))) {
    throw new Error('run from the repository root: ' + REPO);
  }
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'red-2026-09-12-'));
  reconstruct(root);

  // 1. Проба рецензента против до-фиксовой ревизии: V1 обязан воспроизвестись.
  const probe = runNode([path.join(root, 'evidence', 'review-2026-09-12.cjs')], root);
  if (probe.status !== 0) {
    throw new Error(`the reconstructed pre-V1 tree did not reproduce V1 (exit ${probe.status})\n${probe.stdout}\n${probe.stderr}`);
  }
  const preFix = JSON.parse(fs.readFileSync(path.join(root, 'evidence', 'review-2026-09-12-results.json'), 'utf8'));
  preFix.reconstructed = true;
  preFix.revision = PRE_V1;
  preFix.note = 'Получено прогоном неподделанной пробы рецензента против TEMP-копии scripts/memory с историческими ipc-lock.js, lock-keeper.cjs и writer.js из ревизии ' + PRE_V1 + ' (red-reconstruction-2026-09-12.cjs).';
  fs.writeFileSync(path.join(EVIDENCE, 'review-2026-09-12-results.reconstructed-pre-fix.json'), JSON.stringify(preFix, null, 2) + '\n');

  // 2. Новые регрессии против до-фиксовой ревизии: обязаны падать.
  const red = runNode(
    ['--test', path.join(root, 'scripts', 'memory', 'tests', 'fix-02-v1-ownership.test.js')],
    root,
  );
  const failed = failureNames(red.stdout);
  const log = [
    '# RED: позитивные регрессии V1/G15 против до-фиксовой реконструкции',
    '',
    `восстановленная ревизия: ${PRE_V1}`,
    `дерево: ${root}`,
    `код выхода прогона: ${red.status}`,
    '',
    'Проба рецензента на этой же копии: exit 0, V1 репроизведён (см. review-2026-09-12-results.reconstructed-pre-fix.json).',
    '',
    red.stdout,
    red.stderr,
  ].join('\n');
  fs.writeFileSync(path.join(EVIDENCE, 'red-2026-09-12-v1-g15.txt'), log);

  if (red.status === 0) {
    throw new Error('the new regressions are not defect-sensitive: the pre-V1 tree passes them');
  }
  const v1 = failed.filter(name => name.startsWith('V1:'));
  const g15 = failed.filter(name => name.startsWith('G15:'));
  if (v1.length === 0 || g15.length === 0) {
    throw new Error(`the new regressions do not cover both defects (V1 failures: ${v1.length}, G15 failures: ${g15.length})\n${red.stdout}\n${red.stderr}`);
  }
  process.stdout.write(`pre-V1 probe: exit ${probe.status}, V1 reproduced\n`);
  process.stdout.write(`RED regressions failing on the pre-V1 tree: V1 ${v1.length}, G15 ${g15.length}\n`);
  for (const name of [...v1, ...g15]) process.stdout.write('  - ' + name + '\n');
  process.stdout.write('written: review-2026-09-12-results.reconstructed-pre-fix.json, red-2026-09-12-v1-g15.txt\n');
}

main();
