'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolvePaths } = require('./resolve-paths');

const DEFAULTS = { limit: 3, budget: 1200, timeout: 1500 };

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function configFor(root) {
  const file = path.join(root, 'config', 'system.local.json');
  const example = path.join(root, 'config', 'system.example.json');
  return fs.existsSync(file) ? readJson(file) : readJson(example);
}

function relativeSource(memoryRoot, candidate) {
  if (typeof candidate !== 'string' || !candidate.trim()) return null;
  const normalized = candidate.replaceAll('\\', '/');
  const withoutPrefix = normalized.replace(/^\.\/??/, '').replace(/^\.claude\/memory\//, '');
  const absolute = path.resolve(memoryRoot, withoutPrefix);
  const relative = path.relative(memoryRoot, absolute);
  if (!relative || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) return null;
  return '.claude/memory/' + relative.replaceAll(path.sep, '/');
}

function parseFields(text) {
  const fields = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (match) fields[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return fields;
}

function frontmatter(text) {
  if (!text.startsWith('---')) return {};
  const end = text.indexOf('\n---', 3);
  if (end < 0) return {};
  return parseFields(text.slice(3, end));
}

// Разбивает файл памяти на записи: каждая начинается со строки '---'
// (frontmatter до закрывающего '---', затем тело). Файл без '---'
// возвращается одной записью с пустым meta — сохраняет поведение для
// ручных файлов без frontmatter.
function entries(text) {
  const parts = text.split(/^---\n(?=\S)/m);
  if (parts.length === 1) return [{ meta: {}, body: text.trim() }];
  const result = [];
  for (let i = 1; i < parts.length; i += 1) {
    const part = parts[i];
    const end = part.indexOf('\n---');
    if (end < 0) {
      result.push({ meta: parseFields(part), body: '' });
      continue;
    }
    result.push({ meta: parseFields(part.slice(0, end)), body: part.slice(end + 4).trim() });
  }
  return result;
}

function words(query) {
  return [...new Set(String(query).toLowerCase().match(/[\p{L}\p{N}_-]{2,}/gu) || [])];
}

function snippetFor(text, query, budget) {
  const maxChars = Math.max(80, Math.floor(budget * 4));
  const queryWords = words(query);
  const lower = text.toLowerCase();
  const offset = queryWords.map(word => lower.indexOf(word)).filter(index => index >= 0)[0] ?? 0;
  const start = Math.max(0, offset - Math.floor(maxChars / 3));
  const value = text.slice(start, start + maxChars).trim();
  return value.length < text.length ? value + '…' : value;
}

function localResults(query, projectId, options = {}) {
  const paths = options.paths || resolvePaths({ root: options.root });
  const limit = options.limit ?? DEFAULTS.limit;
  const budget = options.budget ?? DEFAULTS.budget;
  const queryWords = words(query);
  if (!queryWords.length) return [];
  const registry = paths.registry || configFor(paths.system_root).registry || [];
  if (projectId && !registry.some(item => item.project_id === projectId)) {
    const error = new Error('unknown project_id: ' + projectId);
    error.code = 'unknown-project';
    throw error;
  }
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.md')) files.push(full);
    }
  }
  walk(paths.memory_root);
  const results = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const record of entries(text)) {
      const meta = record.meta;
      if (projectId && meta.scope && meta.scope !== 'user' && meta.scope !== projectId) continue;
      const lower = record.body.toLowerCase();
      const hits = queryWords.filter(word => lower.includes(word)).length;
      if (!hits) continue;
      const source = relativeSource(paths.memory_root, file);
      results.push({
        snippet: snippetFor(record.body, query, budget),
        source,
        scope: meta.scope || 'unknown',
        status_hint: meta.status || 'unknown',
        relevance: Math.min(0.99, hits / queryWords.length),
      });
    }
  }
  return results.sort((a, b) => b.relevance - a.relevance || a.source.localeCompare(b.source)).slice(0, limit);
}

function httpJson(url, init, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...init, signal: controller.signal }).then(async response => {
    const text = await response.text();
    if (!response.ok) {
      const error = new Error('HTTP ' + response.status);
      error.status = response.status;
      throw error;
    }
    try { return JSON.parse(text); } catch { throw Object.assign(new Error('invalid JSON response'), { code: 'invalid-response' }); }
  }).finally(() => clearTimeout(timer));
}

function classify(error) {
  if (error.code === 'invalid-response') return 'invalid-response';
  if (error.name === 'AbortError') return 'timeout';
  if (error.status === 401 || error.status === 403) return 'unauthorized';
  return 'khoj-unavailable';
}

async function searchKhoj(query, projectId, options = {}) {
  const paths = options.paths || resolvePaths({ root: options.root });
  const config = options.config || configFor(paths.system_root);
  const khoj = config.integrations?.khoj || {};
  const baseUrl = options.baseUrl || khoj.base_url || 'http://127.0.0.1:42110';
  const timeout = options.timeout ?? config.search?.timeout_ms ?? DEFAULTS.timeout;
  const limit = options.limit ?? config.search?.result_limit ?? DEFAULTS.limit;
  const budget = options.budget ?? (config.search?.budget_tokens_per_item ?? DEFAULTS.budget);
  if (khoj.enabled === false && !options.force) {
    return { ok: false, error: 'khoj-unavailable', message: 'Khoj integration is disabled', fallback: 'local', fallback_results: localResults(query, projectId, { paths, limit, budget }) };
  }
  try {
    await httpJson(new URL(khoj.health_path || '/health', baseUrl), {}, timeout);
    const payload = await httpJson(new URL(khoj.search_path || '/api/search', baseUrl), {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: query, n: limit }),
    }, timeout);
    if (!Array.isArray(payload.results)) throw Object.assign(new Error('results must be an array'), { code: 'invalid-response' });
    const results = payload.results.map(item => {
      const source = relativeSource(paths.memory_root, item.source || item.file || item.path);
      if (!source) return null;
      const localFile = path.join(paths.system_root, source.replace(/^\.claude[\\/]memory[\\/]/, '.claude/memory' + path.sep));
      const text = fs.existsSync(localFile) ? fs.readFileSync(localFile, 'utf8') : String(item.snippet || item.text || '');
      // Khoj индексирует файл целиком; для фильтрации используем meta первой записи файла (документированное ограничение).
      const meta = (entries(text)[0] || {}).meta || {};
      if (projectId && meta.scope && meta.scope !== 'user' && meta.scope !== projectId) return null;
      return { snippet: snippetFor(item.snippet || item.text || text, query, budget), source, scope: meta.scope || projectId || 'unknown', status_hint: meta.status || 'unknown', relevance: Number(item.score ?? item.relevance ?? 0) };
    }).filter(Boolean).slice(0, limit);
    return { ok: true, results };
  } catch (error) {
    let fallbackResults = [];
    try { fallbackResults = localResults(query, projectId, { paths, limit, budget }); } catch { /* keep the service error primary */ }
    return { ok: false, error: classify(error), message: error.message, fallback: 'local', fallback_results: fallbackResults };
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2).replaceAll('-', '_');
    args[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.query || typeof args.query !== 'string') throw new Error('--query is required');
  const result = await searchKhoj(args.query, args.project, {
    limit: args.limit ? Number(args.limit) : undefined,
    budget: args.budget ? Number(args.budget) : undefined,
    timeout: args.timeout ? Number(args.timeout) : undefined,
    baseUrl: args.base_url,
    force: args.force === true,
  });
  process.stdout.write(JSON.stringify(result) + '\n');
}

if (require.main === module) main().catch(error => {
  process.stdout.write(JSON.stringify({ ok: false, error: error.code || 'invalid-request', message: error.message, fallback: 'local' }) + '\n');
  process.exitCode = 0;
});

module.exports = { searchKhoj, localResults, relativeSource, snippetFor, frontmatter, entries };
