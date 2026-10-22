'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fixture } = require('./helpers');
const { localResults, searchKhoj } = require('../search');
function record(id, body, extra = '', scope = 'user') {
  return `---\nstatus: confirmed\ncategory: facts\nscope: ${scope}\nevent_id: ${id}\nsource: SOURCE_ONLY_UNIQUE\nevidence: EVIDENCE_ONLY_UNIQUE\nsupersedes: SUPERSEDED_ONLY_UNIQUE\n${extra}---\n\n## ${body}\n`;
}
function put(root, name, text) {
  const file = path.join(root, '.claude/memory/facts', name);
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); return file;
}
test('C04: metadata-only queries find local records and exact event id outranks body coincidences', () => {
  const root = fixture('core-search-meta');
  put(root, 'a.md', record('other', 'TARGET_EVENT UNIQUE body coincidence'));
  put(root, 'z.md', record('TARGET_EVENT', 'Local verified body', 'custom: DO_NOT_SEARCH_THIS\n'));
  const hits = localResults('TARGET_EVENT', 'A', { limit: 1 });
  assert.equal(hits.length, 1);
  assert.match(hits[0].source, /z.md$/);
  assert.match(hits[0].snippet, /Local verified body/);
  assert.match(hits[0].snippet, /event_id/);
  assert.ok(!hits[0].snippet.includes('DO_NOT_SEARCH_THIS'));
  for (const query of ['SOURCE_ONLY_UNIQUE', 'EVIDENCE_ONLY_UNIQUE', 'SUPERSEDED_ONLY_UNIQUE']) {
    assert.ok(localResults(query, 'A').length > 0, query);
  }
  assert.deepEqual(localResults('DO_NOT_SEARCH_THIS', 'A'), []);
  put(root, 'one.md', record('x', 'Short identifier'));
  assert.equal(localResults('x', 'A', { limit: 1 })[0].relevance, 1);
});
test('C04: metadata never bypasses scope, duplicate critical keys or unknown projects', async () => {
  const root = fixture('core-search-scope');
  put(root, 'foreign.md', record('PRIVATE_META', 'body', '', 'B'));
  put(root, 'duplicate.md', record('DUP_META', 'body', 'scope: A\n'));
  put(root, 'status.md', record('BAD_STATUS_META', 'safe body', 'status: observation\n'));
  assert.deepEqual(localResults('PRIVATE_META', 'A'), []);
  assert.deepEqual(localResults('DUP_META', 'A'), []);
  assert.deepEqual(localResults('BAD_STATUS_META', 'A'), []);
  assert.throws(() => localResults('PRIVATE_META', 'unknown'), /unknown project/);
  await assert.rejects(searchKhoj('PRIVATE_META', 'unknown'), /unknown project/);
});
test('C04: Khoj attribution uses local metadata and body, with exact-event priority', async () => {
  const root = fixture('core-search-khoj');
  const file = put(root, 'shared.md', record('other', 'TARGET_META body coincidence') + record('TARGET_META', 'LOCAL_TRUSTED_BODY'));
  const original = global.fetch;
  global.fetch = async url => ({ ok: true, text: async () => String(url).includes('/health') ? '{}' : JSON.stringify([
    { source: file, snippet: 'INJECTED_SERVICE_TEXT', score: 0.5, scope: 'B', evidence: 'FAKE_EVIDENCE' },
    { source: '../outside.md', snippet: 'TARGET_META', score: 999 },
  ]) });
  try {
    for (const query of ['TARGET_META', 'EVIDENCE_ONLY_UNIQUE']) {
      const result = await searchKhoj(query, 'A', { force: true });
      assert.equal(result.ok, true);
      assert.equal(result.results.length, 1);
      assert.ok(!result.results[0].snippet.includes('INJECTED_SERVICE_TEXT'));
      assert.ok(!result.results[0].snippet.includes('FAKE_EVIDENCE'));
      if (query === 'TARGET_META') assert.match(result.results[0].snippet, /LOCAL_TRUSTED_BODY/);
      assert.equal(result.results[0].scope, 'user');
    }
  } finally { global.fetch = original; }
});
