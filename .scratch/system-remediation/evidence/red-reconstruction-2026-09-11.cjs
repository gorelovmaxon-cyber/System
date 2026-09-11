'use strict';

// RED-подтверждение для U1/U2 (независимая проверка 2026-09-11).
//
// Рабочее дерево на момент проверки содержало до-фиксовые ipc-lock.js и jsonl.js
// как неотслеживаемые файлы, поэтому историческую ревизию нельзя получить из git.
// Скрипт восстанавливает её поведение в TEMP-копии: правит только копию, реальные
// файлы не читает на запись и не меняет.
//
// Что делается в копии (минимальные точечные изменения, каждое проверяется):
//   ipc-lock.js — отключены шаг 2 (guard живого владельца), проверка наличия
//                 keeper-скрипта и hold.assertHeld();
//   jsonl.js    — repair снова переписывает канонический файл на месте усекающим
//                 флагом 'w' (карантин хвоста при этом пишется, как и требует
//                 B09), добавление LF к целому JSON без LF тоже на месте,
//                 append идёт через appendFileSync без fsync.
//
// Затем на копии запускаются:
//   1. неподделанная проба рецензента → ожидается exit 0 (оба дефекта воспроизведены);
//   2. новые аварийные регрессии U1/U2 → ожидаются падения (тесты чувствительны к дефекту).
//
// Запуск: node .scratch/system-remediation/evidence/red-reconstruction-2026-09-11.cjs

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');

const EVIDENCE = __dirname;
const REPO = path.resolve(EVIDENCE, '..', '..', '..');

function replaceOnce(file, needle, replacement) {
  const text = fs.readFileSync(file, 'utf8');
  const parts = text.split(needle);
  if (parts.length !== 2) {
    throw new Error(`expected exactly one occurrence of ${JSON.stringify(needle.slice(0, 60))} in ${file}, found ${parts.length - 1}`);
  }
  fs.writeFileSync(file, parts.join(replacement), 'utf8');
}

function reconstruct(root) {
  const scripts = path.join(root, 'scripts');
  fs.mkdirSync(scripts, { recursive: true });
  fs.cpSync(path.join(REPO, 'scripts', 'memory'), path.join(scripts, 'memory'), { recursive: true });
  fs.mkdirSync(path.join(root, 'evidence'), { recursive: true });
  fs.copyFileSync(
    path.join(EVIDENCE, 'review-2026-09-11.cjs'),
    path.join(root, 'evidence', 'review-2026-09-11.cjs'),
  );

  const lock = path.join(scripts, 'memory', 'ipc-lock.js');
  replaceOnce(lock, 'if (recorded && pidAlive(recorded.pid)) {', 'if (false && recorded && pidAlive(recorded.pid)) {');
  replaceOnce(lock, 'if (current && pidAlive(current.pid)) {', 'if (false && current && pidAlive(current.pid)) {');
  replaceOnce(
    lock,
    'if (!fs.existsSync(keeperScript)) throw new Error(`lock keeper script is missing: ${keeperScript}`);',
    "if (false) throw new Error('pre-fix: no keeper presence check');",
  );
  replaceOnce(lock, 'hold.assertHeld = () => {', 'hold.assertHeld = () => { return;');

  const jsonl = path.join(scripts, 'memory', 'jsonl.js');
  replaceOnce(
    jsonl,
    'if (torn) text = repairTornTail(file, text);',
    "if (torn) text = repairTornTail(file, text);\n    else if (tail.trim()) { fs.writeFileSync(file, text + '\\n', 'utf8'); text += '\\n'; }",
  );
  replaceOnce(
    jsonl,
    'module.exports = { appendDurable, appendJsonl, readJsonl, transactJsonl };',
    [
      '// RED-реконструкция до-фиксового поведения.',
      'repairTornTail = function (file, text) {',
      "  const cut = text.lastIndexOf('\\n');",
      "  const prefix = cut === -1 ? '' : text.slice(0, cut + 1);",
      '  const tail = text.slice(cut + 1);',
      "  const hash = crypto.createHash('sha256').update(tail).digest('hex').slice(0, 12);",
      '  const quarantine = `${file}.corrupt-tail-${Date.now()}-${process.pid}-${hash}`;',
      "  writeDurable(quarantine, tail, 'wx');",
      "  fs.writeFileSync(file, prefix, 'utf8');",
      '  return prefix;',
      '};',
      'appendDurable = function (file, record) {',
      '  fs.mkdirSync(path.dirname(file), { recursive: true });',
      "  const separator = fs.existsSync(file) && !endsWithNewline(file) ? '\\n' : '';",
      "  fs.appendFileSync(file, separator + JSON.stringify(record) + '\\n', 'utf8');",
      '};',
      'module.exports = { appendDurable, appendJsonl, readJsonl, transactJsonl };',
    ].join('\n'),
  );
}

function runNode(args, cwd) {
  return cp.spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 300000, env: process.env });
}

function main() {
  if (!fs.existsSync(path.join(REPO, 'scripts', 'memory', 'ipc-lock.js'))) {
    throw new Error('run from the repository root: ' + REPO);
  }
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'red-reconstruction-'));
  reconstruct(root);

  const probe = runNode([path.join(root, 'evidence', 'review-2026-09-11.cjs')], root);
  if (probe.status !== 0) {
    throw new Error(`the reconstructed pre-fix tree did not reproduce the defects (exit ${probe.status})\n${probe.stdout}\n${probe.stderr}`);
  }
  const preFix = JSON.parse(probe.stdout);
  preFix.reconstructed = true;
  preFix.note = 'Получено прогоном неподделанной пробы против TEMP-копии scripts/memory с восстановленным до-фиксовым поведением (red-reconstruction-2026-09-11.cjs). Исторический прогон до правки был перезаписан при повторном запуске пробы.';
  fs.writeFileSync(
    path.join(EVIDENCE, 'review-2026-09-11-results.pre-fix.json'),
    JSON.stringify(preFix, null, 2) + '\n',
  );

  const tests = [
    path.join(root, 'scripts', 'memory', 'tests', 'fix-02-keeper.test.js'),
    path.join(root, 'scripts', 'memory', 'tests', 'fix-06.test.js'),
  ];
  const red = runNode(['--test', ...tests], root);
  const output = ['# RED: новые регрессии U1/U2 против до-фиксовой реконструкции', '', `reconstructed tree: ${root}`, '', red.stdout, red.stderr].join('\n');
  fs.writeFileSync(path.join(EVIDENCE, 'red-2026-09-11-u1-u2.txt'), output);

  const failed = [...new Set([...red.stdout.matchAll(/^✖ (.+)$/gm)].map(match => match[1].trim()))];
  const u1 = failed.filter(name => name.startsWith('U1:'));
  const u2 = failed.filter(name => name.startsWith('U2:'));
  if (u1.length === 0 || u2.length === 0) {
    throw new Error(`the new regressions are not defect-sensitive (U1 failures: ${u1.length}, U2 failures: ${u2.length})\n${red.stdout}\n${red.stderr}`);
  }
  process.stdout.write(`pre-fix probe: exit ${probe.status}, both defects reproduced\n`);
  process.stdout.write(`RED regressions failing on the pre-fix tree: U1 ${u1.length}, U2 ${u2.length}\n`);
  for (const name of [...u1, ...u2]) process.stdout.write('  - ' + name + '\n');
  process.stdout.write('written: review-2026-09-11-results.pre-fix.json, red-2026-09-11-u1-u2.txt\n');
}

main();
