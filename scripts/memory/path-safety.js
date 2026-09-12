#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function inside(root, candidate) {
  const base = path.resolve(root);
  const target = path.resolve(candidate);
  const fold = value => process.platform === 'win32' ? value.toLowerCase() : value;
  return fold(target) === fold(base) || fold(target).startsWith(fold(base + path.sep));
}

// Reject links/reparse points in every existing path component. This protects
// the configured memory boundary from accidental or pre-existing redirects.
// It intentionally does not claim protection against an external process that
// can replace directories concurrently; such an attacker requires OS ACLs.
function assertSafePath(root, candidate, label = 'path') {
  const base = path.resolve(root);
  const target = path.resolve(candidate);
  if (!inside(base, target)) throw new Error(`${label} escapes allowed root`);
  const relative = path.relative(base, target);
  let current = base;
  const parts = relative ? relative.split(path.sep) : [];
  for (const part of ['', ...parts]) {
    if (part) current = path.join(current, part);
    if (!fs.existsSync(current)) continue;
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error(`${label} crosses a symbolic link or junction`);
    const actual = fs.realpathSync.native(current);
    if (!inside(fs.realpathSync.native(base), actual)) throw new Error(`${label} resolves outside allowed root`);
  }
  return target;
}

module.exports = { inside, assertSafePath };

