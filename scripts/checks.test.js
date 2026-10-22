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
