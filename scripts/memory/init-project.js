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

function claudeStartAdapter() {
  return [
    '---',
    'name: start',
    'description: Start the connected System2 workflow for this project.',
    'disable-model-invocation: true',
    '---',
    '',
    '# Project entry for System2',
    '',
    'Read `.claude/system2.local.json` in this project. If it is missing or its',
    '`system_root` is unavailable, stop and tell the user to run the one-time',
    'setup from the System repository. Do not guess another System root.',
    'Read this project\'s `AGENTS.md` (if present), `CLAUDE.md`, `HANDOFF.md`,',
    'and the current task. Then read `<system_root>/CLAUDE.md`,',
    '`<system_root>/HANDOFF.md`, and `<system_root>/.claude/skills/start/SKILL.md`.',
    'Follow that canonical start workflow using the configured `project_id`.',
    'Run memory commands from `system_root`, passing `--project <project_id>` to',
    '`search.js` and `--scope <project_id>` to `save.js` when appropriate.',
    'Keep product files and System memory in their own repositories.',
    'If the client cannot read `system_root`, request directory access; do not',
    'copy System into this project or claim that start completed.',
    '',
  ].join('\n');
}

function appendIgnore(text, entry) {
  const lines = text.split(/\r?\n/);
  if (lines.includes(entry)) return text;
  return text.trimEnd() + (text.trim() ? '\n' : '') + entry + '\n';
}

function claudeSiteBuildAdapter() {
  return [
    '---',
    'name: site-build',
    'description: Build or continue a site through the connected canonical System2 site-build workflow.',
    '---',
    '',
    '# Project site entry for System2',
    '',
    'Read `.claude/system2.local.json` in this project.',
    'If it is missing or `system_root` is unavailable, report the missing connection;',
    'do not guess a root or copy the workflow into this project.',
    'Read `<system_root>/.claude/skills/site-build/SKILL.md` and follow that',
    'canonical site-build workflow using the configured `project_id`.',
    'Read the current task and this project\'s instructions and HANDOFF.',
    'Run System2 memory tools from system_root; keep project files in this project.',
    '',
  ].join('\n');
}

function initProject(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error('project root must be an existing directory: ' + root);
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

  const owner = Object.entries(localPaths).find(([id, value]) => id !== projectId && value && !String(value).startsWith('<') && samePath(value, root));
  if (owner) throw new Error(`directory is already registered to project_id ${owner[0]}; it was not registered twice`);
  let localPath = mapped && !String(mapped).startsWith('<') ? path.resolve(mapped) : null;
  const needsLocalBinding = !localPath;
  const client = options.client || null;
  if (client && client !== 'claude-code') throw new Error('unsupported client: ' + client + '; use --client claude-code or omit --client');
  let adapterFile;
  let adapterText;
  let siteAdapterFile;
  let siteAdapterText;
  let connectionFile;
  let settingsFile;
  let settingsText;
  let ignoreFile;
  let ignoreText;
  if (client === 'claude-code') {
    adapterFile = path.join(root, '.claude', 'skills', 'start', 'SKILL.md');
    adapterText = claudeStartAdapter();
    if (fs.existsSync(adapterFile) && fs.readFileSync(adapterFile, 'utf8') !== adapterText) {
      throw new Error('start skill already exists with different content; inspect it before setup: ' + adapterFile);
    }
    siteAdapterFile = path.join(root, '.claude', 'skills', 'site-build', 'SKILL.md');
    siteAdapterText = claudeSiteBuildAdapter();
    if (fs.existsSync(siteAdapterFile) && fs.readFileSync(siteAdapterFile, 'utf8') !== siteAdapterText) {
      throw new Error('site-build skill already exists with different content; inspect it before setup: ' + siteAdapterFile);
    }
    connectionFile = path.join(root, '.claude', 'system2.local.json');
    if (fs.existsSync(connectionFile)) {
      const current = JSON.parse(fs.readFileSync(connectionFile, 'utf8'));
      if (current.project_id !== projectId || !samePath(current.system_root, system.system_root)) {
        throw new Error('existing System2 client connection points elsewhere: ' + connectionFile);
      }
    }
    ignoreFile = path.join(root, '.gitignore');
    ignoreText = appendIgnore(fs.existsSync(ignoreFile) ? fs.readFileSync(ignoreFile, 'utf8') : '', '/.claude/system2.local.json');
    ignoreText = appendIgnore(ignoreText, '/.claude/settings.local.json');
    settingsFile = path.join(root, '.claude', 'settings.local.json');
    const settings = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : {};
    if (settings.permissions !== undefined && (typeof settings.permissions !== 'object' || settings.permissions === null || Array.isArray(settings.permissions))) {
      throw new Error('existing Claude local permissions must be an object: ' + settingsFile);
    }
    const permissions = { ...(settings.permissions || {}) };
    const directories = permissions.additionalDirectories || [];
    if (!Array.isArray(directories)) throw new Error('existing Claude additionalDirectories must be an array: ' + settingsFile);
    permissions.additionalDirectories = [...directories.filter(value => !samePath(value, system.system_root)), system.system_root];
    settingsText = JSON.stringify({ ...settings, permissions }, null, 2) + '\n';
  }
  if (!knownProject) {
    // Без привязки каталога зарегистрированный проект оставался неразрешимым:
    // hook не мог определить project_id и молча не сохранял событие (G14).
    const remote = remoteUrl(root);
    const registry = [...system.registry, { project_id: projectId, title: options.title, kind: options.kind, ...(remote ? { remote } : {}) }];
    localPaths[projectId] = root;
    localPath = root;
    fs.writeFileSync(system.localConfig, JSON.stringify({ ...local, registry, local_paths: localPaths }, null, 2) + '\n', 'utf8');
  } else if (needsLocalBinding) {
    localPaths[projectId] = root;
    localPath = root;
    fs.writeFileSync(system.localConfig, JSON.stringify({ ...local, local_paths: localPaths }, null, 2) + '\n', 'utf8');
  }

  fs.writeFileSync(claude, claudeNext, 'utf8');
  if (handoffNext !== null) fs.writeFileSync(handoff, handoffNext, 'utf8');
  if (client === 'claude-code') {
    fs.mkdirSync(path.dirname(adapterFile), { recursive: true });
    fs.writeFileSync(adapterFile, adapterText, 'utf8');
    fs.mkdirSync(path.dirname(siteAdapterFile), { recursive: true });
    fs.writeFileSync(siteAdapterFile, siteAdapterText, 'utf8');
    fs.writeFileSync(ignoreFile, ignoreText, 'utf8');
    fs.writeFileSync(connectionFile, JSON.stringify({ system_root: system.system_root, project_id: projectId }, null, 2) + '\n', 'utf8');
    fs.writeFileSync(settingsFile, settingsText, 'utf8');
  }
  return { root, project_id: projectId, claude, handoff, registry: knownProject ? 'existing' : 'registered-in-local-config', local_path: localPath, client, adapter: adapterFile || null, site_adapter: siteAdapterFile || null };
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
    else if (argv[i] === '--client') result.client = argv[++i];
  }
  return result;
}

if (require.main === module) {
  try { process.stdout.write(JSON.stringify(initProject(parseArgs(process.argv.slice(2))), null, 2) + '\n'); }
  catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
}

module.exports = { initProject, replaceSection, hasManagedSection, START, END };
