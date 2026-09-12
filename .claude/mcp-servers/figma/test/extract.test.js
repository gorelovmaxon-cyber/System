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

test('fills with alpha and radii stay visible, non-solid fills are reported', () => {
  const tokens = extractDesignTokens(fixture);
  const button = tokens.colors.find(item => item.node_id === '2:1');
  assert.equal(button.alpha, true);
  assert.equal(button.opacity, 0.5);
  assert.deepEqual(tokens.radii.find(item => item.node_id === '2:1').radius, { tl: 8, tr: 8, br: 8, bl: 8 });
  assert.equal(
    tokens.ignored.some(item => item.kind === 'fill' && item.type === 'GRADIENT_LINEAR' && item.node_id === '2:4'),
    true,
  );
});

test('gap without padding is reported as a spacing token', () => {
  // RED on original: узел с одним itemSpacing не попадал в spacing вовсе.
  const tokens = extractDesignTokens(fixture, { nodeId: '2:4' });
  assert.equal(tokens.spacing.length, 1);
  assert.deepEqual(tokens.spacing[0].padding, {});
  assert.equal(tokens.spacing[0].gap, 8);
  assert.equal(tokens.spacing[0].node_id, '2:4');
});

test('nodeId limits the answer to the subtree, including file-wide styles', () => {
  // RED on original: file-wide styles выдавались за токены выбранного узла.
  const scoped = extractDesignTokens(fixture, { nodeId: '2:1' });
  assert.equal(scoped.colors.some(item => item.node_id === 'style-red'), true);
  assert.equal(scoped.typography.some(item => item.name === 'Heading/H1'), false);
  assert.equal(scoped.colors.some(item => item.name === 'Deprecated/Green'), false);
  assert.deepEqual(
    scoped.ignored.filter(item => item.kind === 'style').map(item => [item.name, item.reason, item.node_id]),
    [['Heading/H1', 'not-used-in-scope', 'style-heading'], ['Deprecated/Green', 'not-used-in-scope', 'style-unused']],
  );

  const subtree = extractDesignTokens(fixture, { nodeId: '2:3' });
  assert.equal(subtree.typography.some(item => item.node_id === 'style-heading'), true);

  const whole = extractDesignTokens(fixture);
  assert.equal(whole.typography.some(item => item.name === 'Heading/H1'), true);
  assert.equal(whole.colors.some(item => item.name === 'Deprecated/Green'), true);
  assert.equal(whole.ignored.some(item => item.kind === 'style'), false);
});

test('an unknown nodeId fails instead of silently returning the whole file', () => {
  assert.throws(() => extractDesignTokens(fixture, { nodeId: 'missing:node' }), /nodeId not found/);
});

