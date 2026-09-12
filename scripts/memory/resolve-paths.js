#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT_MARKERS = [
  path.join('config', 'system.example.json'),
  '.git',
];

function isDirectory(candidate) {
  try {
    return fs.statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

function isFile(candidate) {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function isSystemRoot(candidate) {
  return isFile(path.join(candidate, PROJECT_ROOT_MARKERS[0])) &&
    (isDirectory(path.join(candidate, '.git')) ||
      isFile(path.join(candidate, '.git')));
}

function findSystemRoot(startCwd = process.cwd()) {
  let current = path.resolve(startCwd);
  while (true) {
    if (isSystemRoot(current)) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read JSON config ${filePath}: ${error.message}`);
  }
}

function assertRoot(root, source) {
  const resolved = path.resolve(root);
  if (!isSystemRoot(resolved)) {
    throw new Error(
      `System2 root not found via ${source}: ${resolved}. ` +
      'Set SYSTEM2_ROOT to a System2 checkout or run scripts/memory/init-local-config.js.'
    );
  }
  return resolved;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeConfig(base, override) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    result[key] = isPlainObject(value) && isPlainObject(base?.[key])
      ? mergeConfig(base[key], value)
      : value;
  }
  return result;
}

function loadConfig(root) {
  const examplePath = path.join(root, 'config', 'system.example.json');
  const localConfigPath = path.join(root, 'config', 'system.local.json');
  const example = readJson(examplePath);
  const local = isFile(localConfigPath) ? readJson(localConfigPath) : {};
  return { config: mergeConfig(example, local), localConfigPath };
}

function resolvePaths(options = {}) {
  const cwd = path.resolve(options.cwd || process.cwd());
  let root;
  let localConfigPath = null;

  const selectedExplicitly = Boolean(options.root || process.env.SYSTEM2_ROOT);
  if (selectedExplicitly) {
    root = assertRoot(options.root || process.env.SYSTEM2_ROOT, 'SYSTEM2_ROOT');
  } else {
    const discovered = findSystemRoot(cwd);
    if (!discovered) {
      throw new Error(
        `System2 root not found from ${cwd}. ` +
        'Set SYSTEM2_ROOT or run scripts/memory/init-local-config.js.'
      );
    }
    root = discovered;
  }

  let loaded = loadConfig(root);
  let config = loaded.config;
  localConfigPath = loaded.localConfigPath;

  const configuredRoot = config.system_root;
  if (!selectedExplicitly && configuredRoot && !String(configuredRoot).startsWith('<')) {
    const configuredAbsolute = path.isAbsolute(configuredRoot)
      ? configuredRoot
      : path.resolve(root, configuredRoot);
    if (path.resolve(configuredAbsolute) !== root) {
      root = assertRoot(configuredAbsolute, 'config/system.local.json');
      loaded = loadConfig(root);
      config = loaded.config;
      localConfigPath = loaded.localConfigPath;
    }
  }

  const memoryRoot = path.resolve(root, config.memory_root || '.claude/memory');
  const dataDir = path.resolve(root, config.data_dir || '.local');

  return {
    system_root: root,
    memory_root: memoryRoot,
    data_dir: dataDir,
    localConfig: localConfigPath,
    registry: Array.isArray(config.registry) ? config.registry : [],
    config,
  };
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    const rootIndex = args.indexOf('--root');
    const root = rootIndex >= 0 ? args[rootIndex + 1] : undefined;
    if (rootIndex >= 0 && !root) throw new Error('--root requires a path');
    process.stdout.write(JSON.stringify(resolvePaths({ root }), null, 2) + '\n');
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  findSystemRoot,
  loadConfig,
  mergeConfig,
  resolvePaths,
};

