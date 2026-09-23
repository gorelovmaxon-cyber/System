'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fixture, mod } = require('./helpers');

const { localResults, searchKhoj } = mod('search');

test('SW-03: shared lesson is attributed, project secret stays isolated, and missing date stays missing', async () => {
  const root = fixture('sw-03-site', { registry: [{ project_id: 'new-site' }, { project_id: 'old-site' }] });
  const file = path.join(root, '.claude', 'memory', 'facts', 'site-lessons.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, [
    '---', 'status: confirmed', 'scope: user', 'source: docs/site-check.md', 'date: 2026-09-23', '---', '',
    'Check asset paths before launch SHARED_SITE_LESSON.',
    '---', 'status: confirmed', 'scope: old-site', 'source: private project', '---', '',
    'PRIVATE_CLIENT_SECRET_MARKER SHARED_SITE_LESSON.',
    '---', 'status: observation', 'scope: user', 'source: draft', '---', '',
    'UNVERIFIED_SITE_IDEA.',
    '---', 'status: confirmed', 'scope: user', 'source: old import', '---', '',
    'DAMAGED_SITE_FACT with replacement � character.',
  ].join('\n'));
  const shared = localResults('SHARED_SITE_LESSON', 'new-site');
  assert.equal(shared.length, 1);
  assert.equal(shared[0].scope, 'user');
  assert.equal(shared[0].status_hint, 'confirmed');
  assert.equal(shared[0].record_source, 'docs/site-check.md');
  assert.equal(shared[0].date, '2026-09-23');
  assert.equal(shared[0].snippet.includes('PRIVATE_CLIENT_SECRET_MARKER'), false);
  assert.equal(localResults('PRIVATE_CLIENT_SECRET_MARKER', 'new-site').length, 0);
  const draft = localResults('UNVERIFIED_SITE_IDEA', 'new-site');
  assert.equal(draft[0].status_hint, 'observation');
  assert.equal('date' in draft[0], false);
  const damaged = localResults('DAMAGED_SITE_FACT', 'new-site');
  assert.equal(damaged[0].encoding_warning, 'U+FFFD');
  const fallback = await searchKhoj('SHARED_SITE_LESSON', 'new-site');
  assert.equal(fallback.ok, false);
  assert.equal(fallback.fallback, 'local');
  assert.equal(fallback.fallback_results.length, 1);
});
