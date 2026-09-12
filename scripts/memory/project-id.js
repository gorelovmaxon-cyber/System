#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { resolvePaths } = require('./resolve-paths');

function remoteUrl(root) {
  try { return execFileSync('git', ['-C', root, 'remote', 'get-url', 'origin'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; }
}

function normalizedRemote(value) {
  return String(value || '').trim().toLowerCase()
    .replace(/^ssh:\/\/git@/, '')
    .replace(/^git@([^:]+):/, '$1/')
    .replace(/^https?:\/\//, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '');
}

function projectId(root = resolvePaths().system_root) {
  if (process.env.SYSTEM2_PROJECT_ID) return process.env.SYSTEM2_PROJECT_ID;
  const paths = resolvePaths();
  const config = paths.config;
  const resolvedRoot = path.resolve(root);
  const localMatch = Object.entries(config.local_paths || {}).find(([, localRoot]) => {
    if (!localRoot || String(localRoot).startsWith('<')) return false;
    return path.resolve(localRoot) === resolvedRoot;
  });
  if (localMatch && paths.registry.some(item => item.project_id === localMatch[0])) return localMatch[0];
  const remote = normalizedRemote(remoteUrl(root));
  const match = paths.registry.find(item => {
    if (item.remote && remote && remote === normalizedRemote(item.remote)) return true;
    return item.project_id === 'systemqwen' && /github\.com\/gorelovmaxon-cyber\/system$/.test(remote);
  });
  if (match) return match.project_id;
  if (resolvedRoot === path.resolve(paths.system_root) && paths.registry.some(item => item.project_id === 'systemqwen')) return 'systemqwen';
  throw new Error('project_id cannot be determined; register the project or set SYSTEM2_PROJECT_ID');
}

if (require.main === module) {
  try { process.stdout.write(projectId(process.argv[2] || process.cwd()) + '\n'); }
  catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
}

module.exports = { projectId, remoteUrl, normalizedRemote };
