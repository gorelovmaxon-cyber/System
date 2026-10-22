'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { linkErrors, run, python } = require('./check');

test('link checker rejects a missing target/anchor but ignores example code', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's2-check-links-'));
  const file = path.join(dir, 'source.md');
  fs.writeFileSync(path.join(dir, 'target.md'), '# Existing heading\n');
  assert.deepEqual(linkErrors(file, '[ok](target.md#existing-heading)'), []);
  assert.equal(linkErrors(file, '[bad](absent.md)').length, 1);
  assert.equal(linkErrors(file, '[bad](target.md#missing)').length, 1);
  assert.deepEqual(linkErrors(file, '`[example](absent.md)`\n```md\n[example](absent.md)\n```'), []);
});

test('check execution fails on syntax errors and nonzero child exit', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's2-check-syntax-'));
  const file = path.join(dir, 'bad.js');
  fs.writeFileSync(file, 'const = ;');
  assert.throws(() => run(process.execPath, ['--check', file]));
  assert.throws(() => run(process.execPath, ['-e', 'process.exit(7)']));
});

test('YAML validation accepts invocation policy and rejects malformed/duplicate metadata', () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 's2-check-yaml-')), 'valid-skill');
  fs.mkdirSync(dir);
  const name = path.basename(dir);
  const file = path.join(dir, 'SKILL.md');
  const validate = () => spawnSync(python(), ['-B', path.join(__dirname, 'check-skills.py'), file], { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
  fs.writeFileSync(file, `---\nname: ${name}\ndescription: 'role: planning'\ndisable-model-invocation: true\n---\n`);
  assert.equal(validate().status, 0);
  fs.writeFileSync(file, `---\nname: ${name}\ndescription: role: planning\n---\n`);
  assert.equal(validate().status, 1);
  fs.writeFileSync(file, `---\nname: ${name}\ndescription: first\ndescription: second\n---\n`);
  assert.equal(validate().status, 1);
});

test('C02: URL-encoded HTML ids and invalid escapes have consistent diagnostics', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's2-check-fragments-'));
  const file = path.join(dir, 'source.md');
  fs.writeFileSync(path.join(dir, 'target.md'), '<a id="проверка"></a>\n# Заголовок\n');
  assert.deepEqual(linkErrors(file, '[ok](target.md#%D0%BF%D1%80%D0%BE%D0%B2%D0%B5%D1%80%D0%BA%D0%B0)'), []);
  assert.deepEqual(linkErrors(file, '[ok](target.md#%D0%B7%D0%B0%D0%B3%D0%BE%D0%BB%D0%BE%D0%B2%D0%BE%D0%BA)'), []);
  assert.match(linkErrors(file, '[bad](target.md#absent)')[0], /missing anchor/);
  assert.doesNotThrow(() => linkErrors(file, '[bad](target.md#%GG)'));
  assert.match(linkErrors(file, '[bad](target.md#%GG)')[0], /invalid fragment encoding/);
});

test('C02: main checks the explicit canonical entry points without walking historical memory', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 's2-check-entrypoints-'));
  const files = ['OPUS.md', 'QWEN.md', 'TICKET_TEMPLATE.md', '.claude/memory/MEMORY.md', '.claude/memory/README.md'];
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.copyFileSync(path.join(__dirname, 'check.js'), path.join(root, 'scripts/check.js'));
  fs.writeFileSync(path.join(root, 'scripts/check-skills.py'), 'print("fixture YAML check")\n');
  fs.writeFileSync(path.join(root, 'scripts/checks.test.js'), '');
  for (const f of ['CLAUDE.md', 'README.md', 'QUICKSTART.md', ...files]) {
    fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
    fs.writeFileSync(path.join(root, f), '# Valid\n');
  }
  fs.mkdirSync(path.join(root, '.claude/memory/history'));
  fs.writeFileSync(path.join(root, '.claude/memory/history/old.md'), '[old](absent.md)');
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: root }).status, 0);
  const check = () => spawnSync(process.execPath, ['scripts/check.js'], { cwd: root, encoding: 'utf8', env: { ...process.env, SYSTEM2_CHECK_PYTHON: python() } });
  assert.equal(check().status, 0);
  for (const f of files) {
    fs.writeFileSync(path.join(root, f), '[broken](absent.md)');
    const result = check();
    assert.equal(result.status, 1, `must check ${f}`);
    assert.match(result.stderr, /missing target/);
    fs.writeFileSync(path.join(root, f), '# Valid\n');
  }
});
