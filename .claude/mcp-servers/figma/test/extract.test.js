'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { extractDesignTokens } = require('../lib/extract');

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/tokens.json'), 'utf8'));

test('extracts supported tokens with provenance and duplicates', () => {
  const tokens = extractDesignTokens(fixture);
  assert.equal(tokens.colors.some(item => item.value === '#FF0000' && item.node_id === 'style-red'), true);
  assert.equal(tokens.colors.some(item => item.name === 'Button' && item.opacity === 0.5 && item.node_id === '2:1'), true);
  assert.equal(tokens.spacing[0].padding.top, 24);
  assert.equal(tokens.spacing[0].padding.right, 16);
  assert.deepEqual(tokens.radii.find(item => item.node_id === '2:2').radius, { tl: 1, tr: 2, br: 3, bl: 4 });
  assert.equal(tokens.radii.filter(item => item.name === 'Button').length, 2);
  assert.equal(tokens.typography.find(item => item.name === 'Heading/H1').fontSize, 32);
});

