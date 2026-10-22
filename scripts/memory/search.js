'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolvePaths, loadConfig } = require('./resolve-paths');
const { assertSafePath } = require('./path-safety');

const DEFAULTS = { limit: 3, budget: 1200, timeout: 1500 };

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function configFor(root) {
  return loadConfig(root).config;
}

function relativeSource(memoryRoot, candidate) {
  if (typeof candidate !== 'string' || !candidate.trim()) return null;
  const normalized = candidate.replaceAll('\\', '/');
  // только префикс './'; /^\.\/??/ съедал ведущую точку у '.claude/memory/...'
  const withoutPrefix = normalized.replace(/^\.\//, '').replace(/^\.claude\/memory\//, '');
  const absolute = path.resolve(memoryRoot, withoutPrefix);
  const relative = path.relative(memoryRoot, absolute);
  if (!relative || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) return null;
  return '.claude/memory/' + relative.replaceAll(path.sep, '/');
}

function sourceFile(memoryRoot, source) {
  if (typeof source !== 'string') return null;
  const stripped = source.replaceAll('\\', '/').replace(/^\.\//, '').replace(/^\.claude\/memory\//, '');
  const candidate = path.resolve(memoryRoot, stripped);
  const relative = path.relative(path.resolve(memoryRoot), candidate);
  if (!relative || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) return null;
  return candidate;
}

// Источник, который разрешено читать. Лексическая проверка пути недостаточна:
// junction/symlink внутри памяти уводит чтение за настоящий корень, а имя при
// этом остаётся «внутренним» (G05). Граница корня проверяется здесь, на чтении,
// тем же примитивом, что и при записи.
function readableSource(memoryRoot, source) {
  const candidate = sourceFile(memoryRoot, source);
  if (!candidate) return null;
  try { return assertSafePath(memoryRoot, candidate, 'search source'); } catch { return null; }
}

// project_id проверяется на общей входной границе, до HTTP и до fallback (G09):
// иначе допустимость запроса зависела бы от доступности Khoj — незарегистрированный
// проект получал бы результаты с положительного пути сервиса.
function assertKnownProject(paths, projectId) {
  if (!projectId) return;
  const registry = paths.registry || configFor(paths.system_root).registry || [];
  if (registry.some(item => item.project_id === projectId)) return;
  const error = new Error('unknown project_id: ' + projectId);
  error.code = 'unknown-project';
  throw error;
}

// Дубликат ключа — двусмысленность (S2): значение не выбирается (fail-closed),
// ключ удаляется из fields и фиксируется в duplicated. Writer дубликаты не
// создаёт (валидация S2 в FIX-01); защита — для ручных/повреждённых файлов:
// дубликат scope/status не выводится наружу (проект запись не получает,
// пользовательский уровень видит 'unknown').
function parseFields(text) {
  const fields = {};
  const counts = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    const count = (counts.get(key) || 0) + 1;
    counts.set(key, count);
    if (count === 1) fields[key] = match[2].replace(/^['"]|['"]$/g, '');
  }
  for (const [key, count] of counts) {
    if (count > 1) delete fields[key];
  }
  return { fields, duplicated: [...counts].filter(([, count]) => count > 1).map(([key]) => key) };
}

function frontmatter(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---')) return { fields: {}, duplicated: [] };
  const end = normalized.indexOf('\n---', 3);
  if (end < 0) return { fields: {}, duplicated: [] };
  return parseFields(normalized.slice(3, end));
}

// Разбивает файл памяти на записи: каждая начинается со строки '---'
// (frontmatter до закрывающего '---', затем тело). Файл без '---'
// возвращается одной записью с пустым meta — сохраняет поведение для
// ручных файлов без frontmatter. CRLF нормализуется, поэтому разделитель
// не зависит от окончаний строк (R3).
function entries(text) {
  const parts = text.replace(/\r\n/g, '\n').split(/^---\n(?=\S)/m);
  if (parts.length === 1) return [{ meta: {}, duplicated: [], body: text.trim() }];
  const result = [];
  for (let i = 1; i < parts.length; i += 1) {
    const part = parts[i];
    const end = part.indexOf('\n---');
    if (end < 0) {
      const parsed = parseFields(part);
      result.push({ meta: parsed.fields, duplicated: parsed.duplicated, body: '' });
      continue;
    }
    const parsed = parseFields(part.slice(0, end));
    result.push({ meta: parsed.fields, duplicated: parsed.duplicated, body: part.slice(end + 4).trim() });
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

const SEARCH_FIELDS = ['event_id', 'evidence', 'source', 'supersedes'];
function queryMatch(record, query) {
  const queryWords = words(query);
  const body = record.body.toLowerCase();
  const ambiguous = (record.duplicated || []).some(key => key === 'scope' || key === 'status');
  const fields = ambiguous ? [] : SEARCH_FIELDS.filter(key => typeof record.meta[key] === 'string');
  const lower = [record.body, ...fields.map(key => record.meta[key])].join('\n').toLowerCase();
  return {
    hits: queryWords.filter(word => lower.includes(word)).length,
    bodyHits: queryWords.filter(word => body.includes(word)).length,
    exact: fields.includes('event_id') && record.meta.event_id === String(query).trim(),
    fields: fields.filter(key => queryWords.some(word => record.meta[key].toLowerCase().includes(word))),
  };
}

function recordSnippet(record, query, budget) {
  const match = queryMatch(record, query);
  if (match.bodyHits || !match.fields.length) return snippetFor(record.body, query, budget);
  const field = match.exact ? 'event_id' : match.fields[0];
  const max = Math.max(80, Math.floor(budget * 4));
  const excerpt = snippetFor(record.meta[field], query, Math.min(160, max / 2) / 4).slice(0, Math.floor(max / 2));
  const hint = `[metadata ${field}: ${JSON.stringify(excerpt)}]`;
  return record.body.slice(0, Math.max(0, max - hint.length - 1)) + '\n' + hint;
}

function localResults(query, projectId, options = {}) {
  const paths = options.paths || resolvePaths({ root: options.root });
  const limit = options.limit ?? DEFAULTS.limit;
  const budget = options.budget ?? DEFAULTS.budget;
  const queryWords = words(query);
  if (!String(query).trim()) return [];
  const registry = paths.registry || configFor(paths.system_root).registry || [];
  assertKnownProject({ ...paths, registry }, projectId);
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      // Junction/symlink внутри корня — не источник памяти: обход не должен
      // уводить чтение за настроенный корень (G05).
      if (entry.isSymbolicLink()) continue;
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
      // Проектный запрос видит только записи с подтверждённым scope 'user'
      // или своим project_id; неизвестный/отсутствующий scope не открывает
      // файл проекту (R3) — виден только на пользовательском уровне.
      if (projectId && meta.scope !== 'user' && meta.scope !== projectId) continue;
      const match = queryMatch(record, query);
      const hits = match.hits;
      if (!hits && !match.exact) continue;
      const source = relativeSource(paths.memory_root, file);
      results.push({
        snippet: recordSnippet(record, query, budget),
        source,
        scope: meta.scope || 'unknown',
        status_hint: meta.status || 'unknown',
        ...(meta.source ? { record_source: meta.source } : {}),
        ...(meta.date ? { date: meta.date } : {}),
        ...(JSON.stringify(meta).includes('\uFFFD') || record.body.includes('\uFFFD') ? { encoding_warning: 'U+FFFD' } : {}),
        relevance: match.exact ? 1 : Math.min(0.99, hits / queryWords.length),
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

// Атрибуция сниппета сервиса к локальной записи: запись должна содержать хотя
// бы одно слово запроса (подтверждение локальным содержимым), среди кандидатов
// выбирается та, где больше слов запроса и токенов сниппета в теле. Возвращает
// запись или null, если ни одна локальная запись не подтверждает сниппет
// (R2: scope и snippet берутся из локального файла, текст сервиса как источник
// доверия не используется).
function matchEntry(records, query, snippet) {
  const tokens = new Set(String(snippet || '').toLowerCase().match(/[\p{L}\p{N}_-]{2,}/gu) || []);
  let best = null;
  for (const record of records) {
    const match = queryMatch(record, query);
    const hits = match.hits;
    if (!hits && !match.exact) continue;
    const overlap = [...tokens].filter(token => record.body.toLowerCase().includes(token)).length;
    const score = hits * 1000 + overlap;
    if (!best || (match.exact && !best.exact) || (match.exact === best.exact && score > best.score)) {
      best = { record, score, exact: match.exact };
    }
  }
  return best ? best.record : null;
}

async function searchKhoj(query, projectId, options = {}) {
  const paths = options.paths || resolvePaths({ root: options.root });
  const config = options.config || configFor(paths.system_root);
  const khoj = config.integrations?.khoj || {};
  const baseUrl = options.baseUrl || khoj.base_url || 'http://127.0.0.1:42110';
  const timeout = options.timeout ?? config.search?.timeout_ms ?? DEFAULTS.timeout;
  const limit = options.limit ?? config.search?.result_limit ?? DEFAULTS.limit;
  const budget = options.budget ?? (config.search?.budget_tokens_per_item ?? DEFAULTS.budget);
  // До обращения к сервису: неизвестный проект — недопустимый запрос, а не
  // «повезло с конфигурацией» (G09).
  assertKnownProject(paths, projectId);
  if (khoj.enabled === false && !options.force) {
    return { ok: false, error: 'khoj-unavailable', message: 'Khoj integration is disabled', fallback: 'local', fallback_results: localResults(query, projectId, { paths, limit, budget }) };
  }
  try {
    await httpJson(new URL(khoj.health_path || '/api/health', baseUrl), {}, timeout);
    // Контракт Khoj 1.42.10: GET /api/search?q=&n= отвечает голым массивом
    // SearchResponse. Обёртка {results} — форма прежних релизов; здесь она
    // принимается, чтобы смена конверта не выдавалась за недоступность сервиса.
    const searchUrl = new URL(khoj.search_path || '/api/search', baseUrl);
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('n', String(limit));
    const payload = await httpJson(searchUrl, {}, timeout);
    const items = Array.isArray(payload) ? payload : payload?.results;
    if (!Array.isArray(items)) throw Object.assign(new Error('results must be an array'), { code: 'invalid-response' });
    const results = items.map(item => {
      // Путь к файлу 1.42.10 отдаёт в additional.file (абсолютный), текст записи — в entry.
      const additional = item.additional || {};
      const source = relativeSource(paths.memory_root, additional.file || item.source || item.file || item.path);
      if (!source) return null;
      // Без локального файла scope записи проверить нельзя — сниппет сервиса
      // не является подтверждением (R2). Файл должен лежать внутри настоящего
      // корня памяти: junction наружу даёт имя «внутри», но читает снаружи (G05).
      const localFile = readableSource(paths.memory_root, source);
      if (!localFile || !fs.existsSync(localFile)) return null;
      const candidates = entries(fs.readFileSync(localFile, 'utf8')).filter(record => {
        const scope = record.meta.scope || 'unknown';
        return !projectId || scope === 'user' || scope === projectId;
      });
      const record = matchEntry(candidates, query, item.entry || item.snippet || item.text);
      if (!record) return null;
      const scope = record.meta.scope || 'unknown';
      if (projectId && scope !== 'user' && scope !== projectId) return null;
      // snippet пересобирается из тела подтверждённой локальной записи;
      // чужому результату scope запрашивающего проекта не присваивается.
      return {
        snippet: recordSnippet(record, query, budget), source, scope,
        _exactMatch: queryMatch(record, query).exact,
        status_hint: record.meta.status || 'unknown',
        ...(record.meta.source ? { record_source: record.meta.source } : {}),
        ...(record.meta.date ? { date: record.meta.date } : {}),
        ...(JSON.stringify(record.meta).includes('\uFFFD') || record.body.includes('\uFFFD') ? { encoding_warning: 'U+FFFD' } : {}),
        relevance: Number(item.score ?? item['cross-score'] ?? item.relevance ?? 0),
      };
    }).filter(Boolean).sort((a, b) => Number(b._exactMatch) - Number(a._exactMatch))
      .slice(0, limit).map(({ _exactMatch, ...result }) => result);
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

module.exports = { searchKhoj, localResults, relativeSource, sourceFile, readableSource, assertKnownProject, snippetFor, frontmatter, entries, matchEntry };
