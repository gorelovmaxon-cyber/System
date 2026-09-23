#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { resolvePaths } = require('./resolve-paths');

function command(name, args, cwd) {
  const result = spawnSync(name, args, { cwd, encoding: 'utf8', timeout: 5000 });
  return result.status === 0 ? result.stdout.trim() : null;
}

async function probe(url, timeout = 1200) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try { const response = await fetch(url, { signal: controller.signal }); return response.ok; }
  catch { return false; }
  finally { clearTimeout(timer); }
}

// Неактивная интеграция — disabled, а не PROBLEM: profile core не требует
// Khoj/bridge/AP, и их отсутствие не должно выглядеть как неисправность.
// Включённая интеграция проверяется как раньше — её ошибка остаётся видимой.
function addIntegration(checks, label, enabled, ok, instruction) {
  if (!enabled) {
    checks.push({ status: 'disabled', check: label, instruction: undefined });
    return;
  }
  checks.push({ status: ok ? 'OK' : 'PROBLEM', check: label, instruction: ok ? undefined : instruction });
}

function isOurHook(content) {
  return content && content.includes('System2 portable post-commit hook');
}

function isMixedHook(hookPath, templatePath) {
  if (!fs.existsSync(hookPath)) return false;
  const content = fs.readFileSync(hookPath, 'utf8');
  if (!isOurHook(content)) return false;
  // Has our marker. Mixed = differs from canonical template.
  if (!fs.existsSync(templatePath)) return false;
  const templateContent = fs.readFileSync(templatePath, 'utf8');
  return content !== templateContent;
}

async function diagnose(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const checks = [];
  const add = (ok, label, instruction) => checks.push({ status: ok ? 'OK' : 'PROBLEM', check: label, instruction: ok ? undefined : instruction });
  const addUnchecked = (label, reason) => checks.push({ status: 'unchecked', check: label, instruction: reason });
  add(Boolean(command('git', ['--version'], root)), 'git', 'Install Git and reopen the terminal.');
  add(Boolean(command('git', ['remote', 'get-url', 'origin'], root)), 'git/remote origin', 'Configure origin for this clone.');
  add(Boolean(command('git', ['branch', '--show-current'], root)), 'git/branch', 'Checkout a named synchronization branch.');
  add(Boolean(process.versions.node), 'node ' + process.versions.node, 'Install Node.js 24 LTS or compatible LTS.');
  let paths;
  try { paths = resolvePaths({ root }); add(true, 'resolve-paths and system root', ''); }
  catch (error) { add(false, 'resolve-paths', error.message); return checks; }
  add(fs.existsSync(paths.localConfig), 'config/system.local.json', 'Run node scripts/memory/init-local-config.js --root <root>.');
  add(fs.existsSync(path.join(root, 'HANDOFF.md')), 'project HANDOFF.md', 'Run node scripts/memory/init-project.js for the connected project.');

  const profile = paths.profile;
  const expectedHooks = path.join(root, '.git-hooks-templates');

  // Проверить все источники hooks: global, local hooksPath, эффективный hook, прямой .git/hooks/post-commit
  const globalHooksPath = command('git', ['config', '--global', '--get', 'core.hooksPath'], root);
  const localHooksPath = command('git', ['config', '--local', '--get', 'core.hooksPath'], root);

  // Получить effective hooksPath (откуда Git реально читает hooks)
  const effectiveHooksDir = command('git', ['rev-parse', '--git-path', 'hooks'], root);
  // Относительный путь разрешаем относительно репозитория, не cwd процесса
  const effectiveHooksDirAbsolute = effectiveHooksDir ? path.resolve(root, effectiveHooksDir) : null;
  const effectivePostCommit = effectiveHooksDirAbsolute ? path.join(effectiveHooksDirAbsolute, 'post-commit') : null;
  const effectiveHookExists = effectivePostCommit && fs.existsSync(effectivePostCommit);
  const effectiveHookContent = effectiveHookExists ? fs.readFileSync(effectivePostCommit, 'utf8') : null;
  const effectiveIsOurs = isOurHook(effectiveHookContent);

  const directHookPath = path.join(root, '.git/hooks/post-commit');
  const directHookExists = fs.existsSync(directHookPath);
  const directHookContent = directHookExists ? fs.readFileSync(directHookPath, 'utf8') : null;

  const globalIsOurs = globalHooksPath && (globalHooksPath === '.git-hooks-templates' || path.resolve(root, globalHooksPath) === expectedHooks);
  const localIsOurs = localHooksPath && (localHooksPath === '.git-hooks-templates' || path.resolve(root, localHooksPath) === expectedHooks);
  const directIsOurs = isOurHook(directHookContent);

  const anyOurHooks = globalIsOurs || localIsOurs || directIsOurs || effectiveIsOurs;

  if (profile === 'activepieces') {
    add(localIsOurs, 'portable hooksPath', 'Run bash .git-hooks-templates/install-hooks.sh.');
    if (globalIsOurs) add(false, 'global hooksPath conflicts with local', 'Unset git config --global core.hooksPath or ensure local overrides it.');
    if (directIsOurs) add(false, 'direct .git/hooks/post-commit conflicts', 'Remove .git/hooks/post-commit to use hooksPath.');
  } else {
    // core: старый захват не должен быть активен. Проверяем все источники.
    if (globalIsOurs) {
      add(false, 'global hooksPath points to System2 (core profile)', 'Run git config --global --unset core.hooksPath.');
    }
    if (localIsOurs) {
      add(false, 'local hooksPath points to System2 (core profile)', 'Run bash .git-hooks-templates/uninstall-hooks.sh.');
    }
    if (directIsOurs) {
      const templatePath = path.join(expectedHooks, 'post-commit');
      if (isMixedHook(directHookPath, templatePath)) {
        add(false, 'direct .git/hooks/post-commit is mixed (System2 + user code, core profile)',
            'Manual cleanup required: preserve user code, remove System2 portion.');
      } else {
        add(false, 'direct .git/hooks/post-commit is System2 (core profile)', 'Remove .git/hooks/post-commit.');
      }
    }
    // Проверить effective hook, если он наш, но не обнаружен через global/local/direct
    if (effectiveIsOurs && !globalIsOurs && !localIsOurs && !directIsOurs) {
      add(false, 'System2 hook active at arbitrary effective hooksPath (core profile)',
          `Effective hook location: ${effectiveHooksDirAbsolute}. Check git config core.hooksPath and remove System2 hook.`);
    }
    if (directHookExists && !directIsOurs) {
      addUnchecked('direct .git/hooks/post-commit exists (foreign)', 'Manual inspection required: not recognized as System2.');
    }
    if (!anyOurHooks) {
      add(true, 'legacy capture hooks disabled (core profile)', '');
    }
  }

  add(fs.existsSync(path.join(root, '.claude/memory')), 'shared memory root', 'Restore .claude/memory from Git.');

  // Проверить hooks в привязанных проектах (только для реально подключённых путей)
  const localPaths = paths.config.local_paths || {};
  const connectedProjects = [];
  const unavailableProjects = [];

  for (const [projectId, projectPath] of Object.entries(localPaths)) {
    if (projectPath && !projectPath.startsWith('<') && fs.existsSync(projectPath)) {
      const projectGitDir = path.join(projectPath, '.git');
      if (fs.existsSync(projectGitDir)) {
        connectedProjects.push({ projectId, projectPath });
        const projectLocalHooks = command('git', ['config', '--local', '--get', 'core.hooksPath'], projectPath);
        const projectDirectHook = path.join(projectPath, '.git/hooks/post-commit');
        const projectDirectExists = fs.existsSync(projectDirectHook);
        const projectDirectContent = projectDirectExists ? fs.readFileSync(projectDirectHook, 'utf8') : null;

        const projectLocalIsOurs = projectLocalHooks && (projectLocalHooks === '.git-hooks-templates' || path.resolve(projectPath, projectLocalHooks) === expectedHooks);
        const projectDirectIsOurs = isOurHook(projectDirectContent);

        if (profile === 'core' && (projectLocalIsOurs || projectDirectIsOurs)) {
          add(false, `project ${projectId} has System2 hooks (core profile)`, `Remove hooks from ${projectPath}.`);
        }
        if (profile === 'activepieces' && !projectLocalIsOurs && !projectDirectIsOurs) {
          addUnchecked(`project ${projectId} hooks status`, `Check hooks in ${projectPath}.`);
        }
      }
    } else if (projectPath && !projectPath.startsWith('<')) {
      unavailableProjects.push({ projectId, projectPath });
    }
  }

  if (unavailableProjects.length > 0) {
    const projectList = unavailableProjects.map(p => `${p.projectId}: ${p.projectPath}`).join('; ');
    addUnchecked('unavailable project paths', `Cannot check hooks: ${projectList}`);
  }

  const khoj = paths.config.integrations?.khoj || {};
  const bridge = paths.config.integrations?.bridge || {};
  const activepieces = paths.config.integrations?.activepieces || {};

  addIntegration(checks, 'Khoj health', khoj.enabled === true,
    khoj.enabled === true && await probe(new URL(khoj.health_path || '/api/health', khoj.base_url || 'http://127.0.0.1:42110')),
    'Install/start the verified Khoj release and configure its local index.');
  addIntegration(checks, 'memory bridge ready', bridge.enabled === true,
    bridge.enabled === true && await probe(new URL(bridge.health_path || '/health', bridge.base_url || 'http://127.0.0.1:8643')),
    'Start node scripts/memory/bridge-server.js with a local token; health must report ready.');
  addIntegration(checks, 'Activepieces health', profile === 'activepieces',
    profile === 'activepieces' && await probe(new URL('/api/v1/health', activepieces.base_url || 'http://127.0.0.1:8642')),
    'Start services/activepieces with Docker Compose.');

  add(true, fs.existsSync(path.join(root, '.local/queue/events.jsonl')) ? 'local event queue available' : 'local event queue not created (valid)', '');
  return checks;
}

async function main() {
  const checks = await diagnose({ root: process.argv.includes('--root') ? process.argv[process.argv.indexOf('--root') + 1] : undefined });
  const problems = checks.filter(item => item.status !== 'OK' && item.status !== 'disabled');
  if (process.argv.includes('--json')) process.stdout.write(JSON.stringify({ ok: problems.length === 0, checks }, null, 2) + '\n');
  else for (const item of checks) process.stdout.write(item.status + ' ' + item.check + (item.instruction ? ' → ' + item.instruction : '') + '\n');
  process.exitCode = problems.length ? 1 : 0;
}

if (require.main === module) main();
module.exports = { diagnose, probe };
