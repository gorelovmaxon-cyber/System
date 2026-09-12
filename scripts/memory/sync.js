#!/usr/bin/env node
'use strict';

const { execFileSync, spawnSync } = require('node:child_process');
const { resolvePaths } = require('./resolve-paths');

function git(args, options = {}) {
  const result = spawnSync('git', ['-C', resolvePaths().system_root, ...args], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024, ...options });
  if (result.error) throw result.error;
  return result;
}

function status() {
  const branch = git(['branch', '--show-current']).stdout.trim();
  const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']).stdout.trim();
  let ahead = null; let behind = null;
  if (upstream) {
    const counts = git(['rev-list', '--left-right', '--count', '@{upstream}...HEAD']).stdout.trim().split(/\s+/).map(Number);
    behind = counts[0]; ahead = counts[1];
  }
  const memory = git(['status', '--short', '--', '.claude/memory', 'config']).stdout.trim().split(/\r?\n/).filter(Boolean);
  const worktree = git(['status', '--short']).stdout.trim().split(/\r?\n/).filter(Boolean);
  return {
    branch,
    upstream: upstream || null,
    ahead,
    behind,
    memory_changes: memory,
    worktree_changes: worktree,
    clean: worktree.length === 0,
    remote_freshness: 'not-fetched-by-status',
  };
}

function upstreamRef() {
  const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']).stdout.trim();
  if (!upstream) return null;
  const separator = upstream.indexOf('/');
  if (separator < 1) return null;
  return { remote: upstream.slice(0, separator), branch: upstream.slice(separator + 1), name: upstream };
}

// Пункт назначения — upstream ветка, а не имя локальной ветки: раньше push без
// аргументов отправлял `origin <local-branch>`, создавая на remote ветку с
// другим именем и оставляя настоящую ветку синхронизации без изменений —
// сообщая при этом об успехе (G17). Явное --branch означает ровно это
// назначение и о нём сообщается в ответе.
function push(branch) {
  const current = status();
  const upstream = upstreamRef();
  const destination = branch || upstream?.branch || null;
  if (!destination) {
    throw new Error('cannot push: there is no upstream branch to sync with; pass --branch <destination> explicitly (nothing was pushed)');
  }
  const remote = upstream?.remote || 'origin';
  if (current.upstream && current.behind > 0 && current.ahead > 0) {
    throw new Error('branch diverged; merge/pull first, preserving both versions (no force push)');
  }
  if (current.behind > 0) throw new Error('branch is behind upstream; fetch and merge first (no force push)');
  const head = git(['rev-parse', 'HEAD']).stdout.trim();
  const refspec = `HEAD:refs/heads/${destination}`;
  const result = git(['push', remote, refspec]);
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || 'git push failed').trim());
  const remoteRef = git(['ls-remote', remote, `refs/heads/${destination}`]).stdout.trim().split(/\s+/)[0] || null;
  return {
    pushed: true,
    remote,
    branch: destination,
    local_branch: current.branch || null,
    upstream: upstream?.name || null,
    refspec,
    head,
    destination_sha: remoteRef,
    verified: remoteRef === head,
    output: result.stdout.trim(),
  };
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--status') result.status = true;
    else if (argv[i] === '--push') result.push = true;
    else if (argv[i] === '--branch') result.branch = argv[++i];
  }
  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.push) process.stdout.write(JSON.stringify(push(args.branch), null, 2) + '\n');
  else if (args.status || Object.keys(args).length === 0) process.stdout.write(JSON.stringify(status(), null, 2) + '\n');
  else throw new Error('use --status or explicit --push [--branch <name>]');
}

try { main(); } catch (error) { process.stderr.write('sync error: ' + error.message + '\n'); process.exitCode = 1; }

module.exports = { status, push };
