#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { findSystemRoot, resolvePaths } = require('./resolve-paths');

function parseArgs(argv) {
  const args = argv.slice(2);
  const rootIndex = args.indexOf('--root');
  const root = rootIndex >= 0 ? args[rootIndex + 1] : undefined;
  if (rootIndex >= 0 && !root) throw new Error('--root requires a path');
  return { root: root ? path.resolve(root) : undefined, print: args.includes('--print') };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function deepMerge(base, override) {
  return {
    ...base,
    ...override,
    local_paths: { ...(base.local_paths || {}), ...(override.local_paths || {}) },
    integrations: { ...(base.integrations || {}), ...(override.integrations || {}) },
  };
}

function getRoot(rootArg) {
  if (rootArg) return rootArg;
  const discovered = findSystemRoot(process.cwd());
  if (!discovered) {
    throw new Error(
      'System2 root not found. Pass --root <path> pointing to a checkout ' +
      'or run this command from inside System2.'
    );
  }
  return discovered;
}

function main() {
  const options = parseArgs(process.argv);
  const root = getRoot(options.root);
  const configDir = path.join(root, 'config');
  const examplePath = path.join(configDir, 'system.local.example.json');
  const localPath = path.join(configDir, 'system.local.json');

  if (!fs.existsSync(examplePath)) {
    throw new Error(`Missing ${examplePath}; restore system.local.example.json first.`);
  }

  if (!options.print) {
    fs.mkdirSync(configDir, { recursive: true });
    const example = readJson(examplePath);
    const existing = fs.existsSync(localPath) ? readJson(localPath) : {};
    const local = deepMerge(example, existing);
    local.system_root = root;
    fs.writeFileSync(localPath, JSON.stringify(local, null, 2) + '\n', 'utf8');
    process.stdout.write(`Created ${localPath}\n`);
  }

  const resolved = resolvePaths({ root });
  process.stdout.write(JSON.stringify(resolved, null, 2) + '\n');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { parseArgs, deepMerge };

