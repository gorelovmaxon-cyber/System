'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const REPO = path.resolve(__dirname, '..');
const { lockStatePath } = require('../ipc-lock');

function fixture(name, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 's2-' + name + '-'));
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.mkdirSync(path.join(root, '.git'), { recursive: true });
  fs.mkdirSync(path.join(root, '.claude/memory'), { recursive: true });
  const registry = options.registry || [{ project_id: 'A' }, { project_id: 'B' }];
  const example = {
    registry,
    memory_root: '.claude/memory',
    data_dir: '.local',
    integrations: { khoj: { enabled: false } },
    indexer: { retries_max: 5, timeout_ms: 1000, reindex_url: '<CONFIGURE_FROM_KHOJ_RELEASE>' },
  };
  fs.writeFileSync(path.join(root, 'config/system.example.json'), JSON.stringify(example));
  // зеркало реального репозитория: каталог данных (.local) не отслеживается git
  fs.writeFileSync(path.join(root, '.gitignore'), '.local/\n.local-*\n');
  process.env.SYSTEM2_ROOT = root;
  // Каталог владения блокировок — внутри фикстуры: прогоны тестов не делят
  // состояние в общем tmpdir и не оставляют после себя осиротевших записей.
  // Он не выводится из data_dir — иначе фикстуры с разными data_dir не
  // пересекались бы по владению (это и есть предмет регрессии G15).
  process.env.SYSTEM2_LOCK_DIR = lockDir(root);
  return root;
}

function memoryRoot(root) {
  return path.join(root, '.claude/memory');
}

function lockDir(root) {
  return path.join(root, '.locks');
}

// Путь записи владения для ресурса фикстуры (по умолчанию — её память).
function lockFile(root, resource = memoryRoot(root)) {
  return lockStatePath(resource);
}

function proposal(statement, scope = 'user', category = 'facts', extra = {}) {
  return { category, status: 'observation', scope, statement, evidence: 'synthetic fixture', source: 'test', ...extra };
}

function memoryFile(root, category = 'facts') {
  return path.join(root, '.claude/memory', category, 'writer-entries.md');
}

function mod(name) {
  return require(path.join(REPO, name));
}

module.exports = { REPO, fixture, proposal, memoryFile, memoryRoot, lockDir, lockFile, mod };
