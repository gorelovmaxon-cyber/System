#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolvePaths } = require('./resolve-paths');
const { remoteUrl } = require('./project-id');

const START = '<!-- systemqwen:start -->';
const END = '<!-- systemqwen:end -->';

// Проверяется не только количество маркеров, но и их порядок: документ с END
// перед START — повреждение, а не готовая секция. Раньше такой файл считался
// валидным, к нему дописывалась вторая секция, и в документе оказывалось два
// START (G10).
function assertMarkers(text) {
  const starts = text.split(START).length - 1;
  const ends = text.split(END).length - 1;
  if (starts !== ends || starts > 1) throw new Error('managed System2 section is damaged or duplicated');
  if (starts === 1 && text.indexOf(END) < text.indexOf(START)) {
    throw new Error('managed System2 section is damaged: the end marker precedes the start marker');
  }
}

function replaceSection(text, section) {
  assertMarkers(text);
  const start = text.indexOf(START);
  const end = text.indexOf(END, start + START.length);
  if (start >= 0 && end >= 0) return text.slice(0, start) + section + text.slice(end + END.length);
  return text.trimEnd() + '\n\n' + section + '\n';
}

function hasManagedSection(text) {
  assertMarkers(text);
  return text.includes(START);
}

function samePath(left, right) {
  const norm = value => {
    try { return fs.realpathSync.native(value).toLowerCase(); } catch { return path.resolve(value).toLowerCase(); }
  };
  return norm(left) === norm(right);
}

function handoffSection(projectId) {
  return [
    START,
    '- **Задача:** не указана',
    '- **Выполнено:** bootstrap проекта подключён к общей памяти',
    '- **Текущие изменения/коммит:** проверить `git status` (НЕ ЗАКОММИЧЕНО: если есть изменения)',
    '- **Подтверждённые решения:** см. CLAUDE.md и memory contract',
    '- **Результаты проверок:** bootstrap выполнен локально',
    '- **Незавершённое:** заполнить перед остановкой сессии',
    '- **Следующий шаг:** указать конкретное продолжение',
    END,
  ].join('\n');
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
  if (!knownProject && (!options.title || !options.kind)) throw new Error('--register also requires --title and --kind');

  const claude = path.join(root, 'CLAUDE.md');
  const handoff = path.join(root, 'HANDOFF.md');
  const claudeText = fs.existsSync(claude) ? fs.readFileSync(claude, 'utf8') : '# CLAUDE.md\n';
  const handoffText = fs.existsSync(handoff) ? fs.readFileSync(handoff, 'utf8') : '# HANDOFF — ' + projectId + '\n';
  // Оба документа проверяются и собираются до первой записи: иначе повреждённый
  // HANDOFF обнаруживался бы уже после того, как реестр и CLAUDE.md изменены,
  // то есть в частично применённом состоянии (G10).
  const section = [START, '## System2 project integration', '- project_id: ' + projectId, '- shared_memory: <SYSTEM2_ROOT>/.claude/memory', '- HANDOFF: HANDOFF.md', END].join('\n');
  const claudeNext = replaceSection(claudeText, section);
  const handoffNext = hasManagedSection(handoffText) ? null : replaceSection(handoffText, handoffSection(projectId));

  const local = fs.existsSync(system.localConfig) ? JSON.parse(fs.readFileSync(system.localConfig, 'utf8')) : {};
  const localPaths = { ...(local.local_paths || {}) };
  const mapped = localPaths[projectId];
  // Проверка привязки не зависит от того, известен ли проект: иначе повторный
  // init из другого каталога выдал бы этому каталогу секцию с project_id,
  // который никогда не разрешится в нём (G14).
  if (mapped && !String(mapped).startsWith('<') && !samePath(mapped, root)) {
    throw new Error(`project_id ${projectId} is already registered to another directory: ${mapped}`);
  }

  let localPath = mapped ? path.resolve(mapped) : null;
  if (!knownProject) {
    const owner = Object.entries(localPaths).find(([id, value]) => id !== projectId && value && !String(value).startsWith('<') && samePath(value, root));
    if (owner) throw new Error(`directory is already registered to project_id ${owner[0]}; it was not registered twice`);
    // Без привязки каталога зарегистрированный проект оставался неразрешимым:
    // hook не мог определить project_id и молча не сохранял событие (G14).
    localPaths[projectId] = root;
    localPath = root;
    const remote = remoteUrl(root);
    const registry = [...system.registry, { project_id: projectId, title: options.title, kind: options.kind, ...(remote ? { remote } : {}) }];
    fs.writeFileSync(system.localConfig, JSON.stringify({ ...local, registry, local_paths: localPaths }, null, 2) + '\n', 'utf8');
  }

  fs.writeFileSync(claude, claudeNext, 'utf8');
  if (handoffNext !== null) fs.writeFileSync(handoff, handoffNext, 'utf8');
  return { root, project_id: projectId, claude, handoff, registry: knownProject ? 'existing' : 'registered-in-local-config', local_path: localPath };
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
