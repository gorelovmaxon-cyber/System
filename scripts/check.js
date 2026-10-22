'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const EXCLUDED = new Set(['.git', '.local', 'node_modules', '__pycache__', 'data']);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => {
    if (EXCLUDED.has(item.name)) return [];
    const file = path.join(dir, item.name);
    return item.isDirectory() ? walk(file) : item.isFile() ? [file] : [];
  });
}

function visibleMarkdown(text) {
  // Ignore fenced and inline examples: their relative paths belong to the sample project.
  let fence = null;
  return text.split(/\r?\n/).map(line => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) { fence = fence ? (marker[1][0] === fence ? null : fence) : marker[1][0]; return ''; }
    return fence ? '' : line.replace(/(`+)([\s\S]*?)\1/g, '');
  }).join('\n');
}

function slug(text) {
  return text.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, '').replace(/\s/g, '-');
}

function linkErrors(file, text) {
  const errors = [];
  for (const match of visibleMarkdown(text).matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    const target = match[1];
    if (/^(?:[a-z]+:|\/)|[<>]|\s["']/i.test(target)) continue;
    const [relative, fragment] = target.split('#');
    const destination = relative ? path.resolve(path.dirname(file), relative) : file;
    if (!fs.existsSync(destination)) { errors.push(`missing target ${target}`); continue; }
    if (fragment && fs.statSync(destination).isFile()) {
      let decoded;
      try { decoded = decodeURIComponent(fragment); }
      catch { errors.push(`invalid fragment encoding ${target}`); continue; }
      const content = fs.readFileSync(destination, 'utf8');
      const headings = content.split(/\r?\n/).filter(line => /^#{1,6} /.test(line)).map(line => slug(line.replace(/^#{1,6} /, '')));
      const ids = [...content.matchAll(/\bid\s*=\s*(["'])(.*?)\1/g)].map(match => match[2]);
      if (!ids.includes(decoded) && !headings.includes(decoded)) errors.push(`missing anchor ${target}`);
    }
  }
  return errors;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', windowsHide: true, timeout: 60000, ...options });
  if (result.status !== 0) throw new Error(`${command} failed (${result.status}): ${result.error?.message || result.stderr || result.stdout}`);
  return result.stdout;
}

function python() {
  const local = path.join(ROOT, '.local', 'check-venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  return process.env.SYSTEM2_CHECK_PYTHON || (fs.existsSync(local) ? local : 'python');
}

function main() {
  const started = Date.now();
  const code = [...walk(path.join(ROOT, 'scripts')), ...walk(path.join(ROOT, '.claude/mcp-servers/figma'))].filter(f => /\.(?:c?js|mjs)$/.test(f));
  for (const file of code) run(process.execPath, ['--check', file]);
  console.log(`JS syntax: ${code.length} passed`);
  process.stdout.write(run(python(), ['-B', 'scripts/check-skills.py'], { env: { ...process.env, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1' } }));
  const docs = [...walk(path.join(ROOT, '.claude/skills')), ...walk(path.join(ROOT, 'docs')), ...walk(path.join(ROOT, 'templates')),
    ...['CLAUDE.md', 'README.md', 'QUICKSTART.md', 'OPUS.md', 'QWEN.md', 'TICKET_TEMPLATE.md',
      '.claude/memory/MEMORY.md', '.claude/memory/README.md'].map(f => path.join(ROOT, f)).filter(f => fs.existsSync(f))].filter(f => f.endsWith('.md'));
  const errors = docs.flatMap(file => linkErrors(file, fs.readFileSync(file, 'utf8')).map(error => `${path.relative(ROOT, file)}: ${error}`));
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Markdown links: ${docs.length} documents passed`);
  run('git', ['diff', '--check']);
  run('git', ['diff', '--cached', '--check']);
  process.stdout.write(run(process.execPath, ['--test', 'scripts/checks.test.js']));
  console.log(`Fast check passed in ${((Date.now() - started) / 1000).toFixed(2)}s (no services or model calls)`);
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { walk, visibleMarkdown, linkErrors, run, python };
