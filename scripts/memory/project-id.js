#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { resolvePaths } = require('./resolve-paths');

function remoteUrl(root) {
  try { return execFileSync('git', ['-C', root, 'remote', 'get-url', 'origin'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; }
}

function projectId(root = resolvePaths().system_root) {
  if (process.env.SYSTEM2_PROJECT_ID) return process.env.SYSTEM2_PROJECT_ID;
  const config = JSON.parse(fs.readFileSync(path.join(root, 'config/system.example.json'), 'utf8'));
  const remote = remoteUrl(root).toLowerCase().replace(/\.git$/, '').replace(/\/$/, '');
  const match = (config.registry || []).find(item => {
    if (item.remote && remote === String(item.remote).toLowerCase().replace(/\.git$/, '')) return true;
    return item.project_id === 'systemqwen' && /github\.com\/gorelovmaxon-cyber\/system$/.test(remote);
  });
  return match?.project_id || 'systemqwen';
}

if (require.main === module) process.stdout.write(projectId() + '\n');

module.exports = { projectId, remoteUrl };
