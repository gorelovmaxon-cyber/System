#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolvePaths } = require('./resolve-paths');

const START = '<!-- systemqwen:start -->';
const END = '<!-- systemqwen:end -->';

function replaceSection(text, section) {
  const starts = text.split(START).length - 1;
  const ends = text.split(END).length - 1;
  if (starts !== ends || starts > 1) throw new Error('managed System2 section is damaged or duplicated');
  const start = text.indexOf(START);
  const end = text.indexOf(END, start + START.length);
  if (start >= 0 && end >= 0) return text.slice(0, start) + section + text.slice(end + END.length);
  return text.trimEnd() + '\n\n' + section + '\n';
}

function hasManagedSection(text) {
  const starts = text.split(START).length - 1;
  const ends = text.split(END).length - 1;
  if (starts !== ends || starts > 1) throw new Error('managed System2 section is damaged or duplicated');
  return starts === 1;
}

function initProject(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const projectId = options.projectId;
  if (!projectId || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(projectId)) throw new Error('--project is required and must be a stable kebab-case id');
  const system = resolvePaths({ root: options.systemRoot });
  const knownProject = system.registry.some(item => item.project_id === projectId);
  if (!knownProject && !options.register) {
    throw new Error('project_id is not in the registry; confirm explicitly with --register --title <title> --kind <kind>');
  }
  if (!knownProject) {
    if (!options.title || !options.kind) throw new Error('--register also requires --title and --kind');
    const local = fs.existsSync(system.localConfig) ? JSON.parse(fs.readFileSync(system.localConfig, 'utf8')) : {};
    const registry = [...system.registry, { project_id: projectId, title: options.title, kind: options.kind }];
    fs.writeFileSync(system.localConfig, JSON.stringify({ ...local, registry }, null, 2) + '\n', 'utf8');
  }
  const claude = path.join(root, 'CLAUDE.md');
  const handoff = path.join(root, 'HANDOFF.md');
  const claudeText = fs.existsSync(claude) ? fs.readFileSync(claude, 'utf8') : '# CLAUDE.md\n';
  const section = [START, '## System2 project integration', '- project_id: ' + projectId, '- shared_memory: <SYSTEM2_ROOT>/.claude/memory', '- HANDOFF: HANDOFF.md', END].join('\n');
  fs.writeFileSync(claude, replaceSection(claudeText, section), 'utf8');
  const handoffText = fs.existsSync(handoff) ? fs.readFileSync(handoff, 'utf8') : '# HANDOFF — ' + projectId + '\n';
  const handoffSection = [START, '- **Задача:** не указана', '- **Выполнено:** bootstrap проекта подключён к общей памяти', '- **Текущие изменения/коммит:** проверить `git status` (НЕ ЗАКОММИЧЕНО: если есть изменения)', '- **Подтверждённые решения:** см. CLAUDE.md и memory contract', '- **Результаты проверок:** bootstrap выполнен локально', '- **Незавершённое:** заполнить перед остановкой сессии', '- **Следующий шаг:** указать конкретное продолжение', END].join('\n');
  if (!hasManagedSection(handoffText)) fs.writeFileSync(handoff, replaceSection(handoffText, handoffSection), 'utf8');
  return { root, project_id: projectId, claude, handoff, registry: knownProject ? 'existing' : 'registered-in-local-config' };
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') result.root = argv[++i];
    else if (argv[i] === '--system-root') result.systemRoot = argv[++i];
    else if (argv[i] === '--project') result.projectId = argv[++i];
    else if (argv[i] === '--register') result.register = true;
    else if (argv[i] === '--title') result.title = argv[++i];
    else if (argv[i] === '--kind') result.kind = argv[++i];
  }
  return result;
}

if (require.main === module) {
  try { process.stdout.write(JSON.stringify(initProject(parseArgs(process.argv.slice(2))), null, 2) + '\n'); }
  catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
}

module.exports = { initProject, replaceSection, hasManagedSection, START, END };
