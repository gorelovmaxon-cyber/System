'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { fixture, proposal, memoryFile, mod } = require('./helpers');

const writer = mod('writer');
const writerLog = mod('writer-log');
const indexerLog = mod('indexer-log');
const search = mod('search');

function proposalHash(eventId, proposals) {
  return crypto.createHash('sha256').update(JSON.stringify({ eventId, proposals })).digest('hex');
}

test('F01: batch of two proposals in same category persists both; repeat is idempotent', () => {
  const root = fixture('fix01-batch');
  const proposals = [proposal('FIRST_MARKER'), proposal('SECOND_MARKER')];

  const result = writer.writeProposal('evt_batch', proposals);
  assert.equal(result.status, 'persisted');

  const text = fs.readFileSync(memoryFile(root), 'utf8');
  assert.match(text, /## FIRST_MARKER/);
  // RED on original: second proposal of same category was skipped
  assert.match(text, /## SECOND_MARKER/);

  const again = writer.writeProposal('evt_batch', proposals);
  assert.equal(again.idempotent, true);

  const text2 = fs.readFileSync(memoryFile(root), 'utf8');
  assert.equal((text2.match(/## FIRST_MARKER/g) || []).length, 1);
  assert.equal((text2.match(/## SECOND_MARKER/g) || []).length, 1);
});

test('F01: batch write queues one pending index task per written file; repeat does not duplicate', () => {
  const root = fixture('fix01-queue');
  const proposals = [proposal('Q_A'), proposal('Q_B', 'user', 'decisions')];
  writer.writeProposal('evt_q', proposals);
  writer.writeProposal('evt_q', proposals);

  const tasks = [...indexerLog.records().values()];
  assert.equal(tasks.length, 2);
  assert.ok(tasks.every(t => t.event_id === 'evt_q' && t.status === 'pending'));
});

test('F02: intent without memory file is recovered into a real persisted entry', () => {
  const root = fixture('fix02-intent');
  const proposals = [proposal('NEVER_WRITTEN')];
  const hash = proposalHash('evt_crash', proposals);
  writerLog.append({ event_id: 'evt_crash', hash, status: 'intent' });

  const result = writer.writeProposal('evt_crash', proposals);
  assert.equal(result.status, 'persisted');
  // RED on original: intent was reported as persisted while no file exists
  assert.ok(fs.existsSync(memoryFile(root)));
  const text = fs.readFileSync(memoryFile(root), 'utf8');
  assert.match(text, /## NEVER_WRITTEN/);

  const again = writer.writeProposal('evt_crash', proposals);
  assert.equal(again.idempotent, true);
  const text2 = fs.readFileSync(memoryFile(root), 'utf8');
  assert.equal((text2.match(/## NEVER_WRITTEN/g) || []).length, 1);
});

test('F02: partial write (one category already present) is completed without duplicates', () => {
  const root = fixture('fix02-partial');
  const proposals = [proposal('FACTS_ENTRY'), proposal('DECISIONS_ENTRY', 'user', 'decisions')];

  // simulate crash: first proposal persisted, then intent for the full set recorded
  writer.writeProposal('evt_crash', [proposals[0]]);
  const hash = proposalHash('evt_crash', proposals);
  writerLog.append({ event_id: 'evt_crash', hash, status: 'intent' });

  const result = writer.writeProposal('evt_crash', proposals);
  assert.equal(result.status, 'persisted');

  const factsText = fs.readFileSync(memoryFile(root), 'utf8');
  assert.match(factsText, /## FACTS_ENTRY/);
  assert.equal((factsText.match(/## FACTS_ENTRY/g) || []).length, 1);

  // RED on original: decisions file never created
  const decisionsText = fs.readFileSync(memoryFile(root, 'decisions'), 'utf8');
  assert.match(decisionsText, /## DECISIONS_ENTRY/);
  assert.equal((decisionsText.match(/## DECISIONS_ENTRY/g) || []).length, 1);

  const again = writer.writeProposal('evt_crash', proposals);
  assert.equal(again.idempotent, true);
});

test('R1: same statement with different scope persists both proposals of one event', () => {
  const root = fixture('fix01-same-scope');
  const proposals = [proposal('SAME_TEXT', 'A'), proposal('SAME_TEXT', 'B')];

  const result = writer.writeProposal('evt_same', proposals);
  assert.equal(result.status, 'persisted');

  const text = fs.readFileSync(memoryFile(root), 'utf8');
  // RED on original: entryPresent узнавал только event_id+statement и вторая запись терялась
  assert.equal((text.match(/## SAME_TEXT/g) || []).length, 2);
  assert.match(text, /scope: A/);
  assert.match(text, /scope: B/);

  const again = writer.writeProposal('evt_same', proposals);
  assert.equal(again.idempotent, true);
  const text2 = fs.readFileSync(memoryFile(root), 'utf8');
  assert.equal((text2.match(/## SAME_TEXT/g) || []).length, 2);
});

test('R1: same statement and scope but different evidence persists both', () => {
  const root = fixture('fix01-same-evidence');
  const proposals = [
    proposal('SAME_META', 'user', 'facts', { evidence: 'first source' }),
    proposal('SAME_META', 'user', 'facts', { evidence: 'second source' }),
  ];

  writer.writeProposal('evt_ev', proposals);
  const text = fs.readFileSync(memoryFile(root), 'utf8');
  assert.equal((text.match(/## SAME_META/g) || []).length, 2);
  assert.match(text, /evidence: first source/);
  assert.match(text, /evidence: second source/);
});

test('R1: fully identical proposals in one event are written once, repeat is idempotent', () => {
  const root = fixture('fix01-identical');
  const proposals = [proposal('IDENTICAL_TEXT', 'A'), proposal('IDENTICAL_TEXT', 'A')];

  writer.writeProposal('evt_id', proposals);
  const text = fs.readFileSync(memoryFile(root), 'utf8');
  assert.equal((text.match(/## IDENTICAL_TEXT/g) || []).length, 1);
  // written_files без дублей файла
  const again = writer.writeProposal('evt_id', proposals);
  assert.equal(again.idempotent, true);
  assert.equal(fs.readFileSync(memoryFile(root), 'utf8').match(/## IDENTICAL_TEXT/g).length, 1);
});

test('R4: repeat after LF->CRLF conversion is idempotent, no duplicate entries', () => {
  const root = fixture('fix01-crlf');
  const proposals = [proposal('CRLF_MARKER'), proposal('CRLF_OTHER', 'user', 'decisions')];

  writer.writeProposal('evt_crlf', proposals);
  const file = memoryFile(root);
  const crlf = fs.readFileSync(file, 'utf8').replace(/\n/g, '\r\n');
  fs.writeFileSync(file, crlf, 'utf8');

  // RED on original: entryStatement не находил '\n## ' в CRLF-файле и повтор добавлял копию
  const again = writer.writeProposal('evt_crlf', proposals);
  assert.equal(again.idempotent, true);

  const text = fs.readFileSync(file, 'utf8');
  assert.equal((text.match(/## CRLF_MARKER/g) || []).length, 1);
  const decisionsText = fs.readFileSync(memoryFile(root, 'decisions'), 'utf8');
  assert.equal((decisionsText.match(/## CRLF_OTHER/g) || []).length, 1);
});

test('R4: partial recovery works after LF->CRLF conversion (writer normalizes EOL)', () => {
  const root = fixture('fix01-crlf-partial');
  const proposals = [proposal('CRLF_PART_A'), proposal('CRLF_PART_B')];

  writer.writeProposal('evt_crlf_p', [proposals[0]]);
  const file = memoryFile(root);
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\n/g, '\r\n'), 'utf8');
  // intent на полный набор (модель прерванного события) поверх persisted-записи первой части
  writerLog.append({ event_id: 'evt_crlf_p', hash: proposalHash('evt_crlf_p', proposals), status: 'intent' });

  const result = writer.writeProposal('evt_crlf_p', proposals);
  assert.equal(result.status, 'persisted');
  const text = fs.readFileSync(file, 'utf8');
  assert.equal((text.match(/## CRLF_PART_A/g) || []).length, 1);
  assert.equal((text.match(/## CRLF_PART_B/g) || []).length, 1);
});

test('control: exact repeat keeps revision and does not add intent lines; different content conflicts', () => {
  const root = fixture('fix02-control');
  const proposals = [proposal('CONTROL_ENTRY')];

  const first = writer.writeProposal('evt_ctl', proposals);
  assert.equal(first.status, 'persisted');
  assert.equal(first.idempotent, undefined);

  const again = writer.writeProposal('evt_ctl', proposals);
  assert.equal(again.idempotent, true);
  assert.equal(again.revision, first.revision);

  assert.throws(
    () => writer.writeProposal('evt_ctl', [proposal('OTHER_CONTENT')]),
    (err) => err.code === 'CONFLICT'
  );

  const log = fs.readFileSync(writerLog.logPath(), 'utf8');
  const intents = log.split(/\r?\n/).filter(l => l.includes('"event_id":"evt_ctl"') && l.includes('"status":"intent"')).length;
  assert.equal(intents, 1);
});

// ---------- S2: однозначная сериализация полей frontmatter ----------

test('S2: CR/LF in source, evidence, supersedes and event_id is rejected', () => {
  const root = fixture('fix01-s2-newline');
  // репродукция ревьюера: source с переносом строки внедрял вторую строку scope
  assert.throws(
    () => writer.writeProposal('evt_ok', proposal('PRIVATE_B_VALUE', 'B', 'facts', { source: 'source text\nscope: user' })),
    /source/
  );
  for (const bad of ['a\nb', 'a\r\nb', 'a\rb']) {
    assert.throws(() => writer.writeProposal('evt_ok', proposal('S', 'user', 'facts', { source: bad })), /source/);
    assert.throws(() => writer.writeProposal('evt_ok', proposal('S', 'user', 'facts', { evidence: bad })), /evidence/);
    assert.throws(() => writer.writeProposal('evt_ok', proposal('S', 'user', 'facts', { supersedes: bad })), /supersedes/);
    assert.throws(() => writer.writeProposal('evt\nbad', proposal('S')), /event_id/);
    assert.throws(() => writer.writeProposal('evt\r\nbad', proposal('S')), /event_id/);
  }
});

test('S2: statement line starting with --- (record boundary) is rejected', () => {
  const root = fixture('fix01-s2-boundary');
  assert.throws(() => writer.writeProposal('evt_ok', proposal('---\nSNEAKY')), /statement/);
  assert.throws(() => writer.writeProposal('evt_ok', proposal('---')), /statement/);
});

test('S2: round-trip of all fields through write and re-parse is lossless; repeat idempotent', () => {
  const root = fixture('fix01-s2-roundtrip');
  const input = proposal('RT_STATEMENT\nsecond line', 'B', 'patterns', {
    status: 'confirmed', evidence: 'RT evidence', source: 'RT source', confidence: 0.7, supersedes: 'evt_old',
  });
  writer.writeProposal('evt_rt', input);
  const records = search.entries(fs.readFileSync(memoryFile(root, 'patterns'), 'utf8'));
  assert.equal(records.length, 1);
  const meta = records[0].meta;
  assert.equal(meta.status, 'confirmed');
  assert.equal(meta.category, 'patterns');
  assert.equal(meta.scope, 'B');
  assert.equal(meta.source, 'RT source');
  assert.equal(meta.evidence, 'RT evidence');
  assert.equal(meta.event_id, 'evt_rt');
  assert.equal(meta.supersedes, 'evt_old');
  assert.equal(Number(meta.confidence), 0.7);
  assert.equal(records[0].body, '## RT_STATEMENT\nsecond line');
  const again = writer.writeProposal('evt_rt', input);
  assert.equal(again.idempotent, true);
});

// ---------- S3: каноническая форма содержимого — LF ----------

test('S3: CRLF multiline statement is stored once in LF; repeat is idempotent', () => {
  const root = fixture('fix01-s3-crlf-input');
  const proposals = [proposal('FIRST_LINE\r\nSECOND_LINE')];
  writer.writeProposal('evt_s3_crlf', proposals);
  const text = fs.readFileSync(memoryFile(root), 'utf8');
  assert.equal((text.match(/## FIRST_LINE/g) || []).length, 1);
  assert.equal(text.includes('\r\n'), false, 'file must be stored in LF');
  const again = writer.writeProposal('evt_s3_crlf', proposals);
  assert.equal(again.idempotent, true);
  assert.equal((fs.readFileSync(memoryFile(root), 'utf8').match(/## FIRST_LINE/g) || []).length, 1);
});

test('S3: mixed EOL in multiline statement is normalized to LF; repeat idempotent', () => {
  const root = fixture('fix01-s3-mixed');
  const proposals = [proposal('MIXED_A\r\nMIXED_B\nMIXED_C')];
  writer.writeProposal('evt_s3_mixed', proposals);
  const text = fs.readFileSync(memoryFile(root), 'utf8');
  assert.equal((text.match(/## MIXED_A/g) || []).length, 1);
  assert.equal(text.includes('\r\n'), false);
  const again = writer.writeProposal('evt_s3_mixed', proposals);
  assert.equal(again.idempotent, true);
  assert.equal((fs.readFileSync(memoryFile(root), 'utf8').match(/## MIXED_A/g) || []).length, 1);
});

test('S3: LF and CRLF forms of the same content hash identically (idempotent, not CONFLICT)', () => {
  const root = fixture('fix01-s3-hash');
  writer.writeProposal('evt_s3_hash', [proposal('HASH_A\r\nHASH_B')]);
  const again = writer.writeProposal('evt_s3_hash', [proposal('HASH_A\nHASH_B')]);
  assert.equal(again.idempotent, true);
  assert.equal((fs.readFileSync(memoryFile(root), 'utf8').match(/## HASH_A/g) || []).length, 1);
});

test('S3: partial recovery after CRLF input completes without duplicates', () => {
  const root = fixture('fix01-s3-partial');
  const proposals = [proposal('CRLF_PART_A\r\nCRLF_PART_A2'), proposal('CRLF_PART_B\r\nCRLF_PART_B2')];
  writer.writeProposal('evt_s3_partial', [proposals[0]]);
  // hash считается по нормализованным предложениям (S3): intent, созданный
  // до падения, должен совпасть с hash повтора, иначе — ложный CONFLICT
  const hash = crypto.createHash('sha256').update(JSON.stringify({
    eventId: 'evt_s3_partial',
    proposals: proposals.map(writer.validateProposal),
  })).digest('hex');
  writerLog.append({ event_id: 'evt_s3_partial', hash, status: 'intent' });
  const result = writer.writeProposal('evt_s3_partial', proposals);
  assert.equal(result.status, 'persisted');
  const text = fs.readFileSync(memoryFile(root), 'utf8');
  assert.equal((text.match(/## CRLF_PART_A/g) || []).length, 1);
  assert.equal((text.match(/## CRLF_PART_B/g) || []).length, 1);
});

test('S3: normalization does not hide real content differences (CONFLICT preserved)', () => {
  const root = fixture('fix01-s3-conflict');
  writer.writeProposal('evt_s3_conflict', [proposal('CONTENT_A\nCONTENT_B')]);
  assert.throws(
    () => writer.writeProposal('evt_s3_conflict', [proposal('CONTENT_A\nCONTENT_C')]),
    (err) => err.code === 'CONFLICT'
  );
});

test('B01: required evidence rejects missing and non-string values', () => {
  const root = fixture('b01-evidence-types');
  for (const [index, evidence] of [undefined, null, {}, []].entries()) {
    assert.throws(
      () => writer.writeProposal(`evt_bad_evidence_${index}`, [{ ...proposal('BAD_EVIDENCE'), evidence }]),
      /evidence must be a non-empty string/
    );
  }
  assert.equal(fs.existsSync(memoryFile(root)), false);
});

test('B17: empty batch is rejected without reserving the event id', () => {
  fixture('b17-empty-batch');
  assert.throws(() => writer.writeProposal('evt_empty', []), /non-empty array/);
  const result = writer.writeProposal('evt_empty', proposal('REAL_AFTER_EMPTY'));
  assert.equal(result.status, 'persisted');
});

test('B15: exact legacy intent with edge whitespace recovers under canonical hash', () => {
  fixture('b15-legacy-intent');
  const crypto = require('node:crypto');
  const writerLog = mod('writer-log');
  const legacy = proposal('LEGACY_SOURCE', 'user', 'facts', { source: '  evidence-source  ' });
  const legacyHash = crypto.createHash('sha256')
    .update(JSON.stringify({ eventId: 'evt_legacy', proposals: [legacy] }))
    .digest('hex');
  writerLog.append({ event_id: 'evt_legacy', hash: legacyHash, status: 'intent' });
  const result = writer.writeProposal('evt_legacy', legacy);
  assert.equal(result.status, 'persisted');
  assert.match(fs.readFileSync(memoryFile(process.env.SYSTEM2_ROOT), 'utf8'), /source: evidence-source/);
  assert.equal(writer.writeProposal('evt_legacy', legacy).idempotent, true);
  assert.throws(
    () => writer.writeProposal('evt_legacy', { ...legacy, statement: 'DIFFERENT' }),
    error => error.code === 'CONFLICT'
  );
});

test('B02: writer rejects a junction that redirects a category outside memory root', () => {
  const root = fixture('b02-junction');
  const outside = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 's2-b02-outside-'));
  const category = path.join(root, '.claude', 'memory', 'facts');
  fs.symlinkSync(outside, category, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(
    () => writer.writeProposal('evt_b02', proposal('MUST_STAY_INSIDE')),
    /symbolic link|junction|outside/
  );
  assert.equal(fs.existsSync(path.join(outside, 'writer-entries.md')), false);
});

test('G07: the order of JSON keys does not change proposal identity', () => {
  const root = fixture('g07-key-order');
  const ordered = { category: 'facts', status: 'observation', scope: 'user', statement: 'ORDER_MARKER', evidence: 'synthetic fixture', source: 'test' };
  const reversed = { source: 'test', evidence: 'synthetic fixture', statement: 'ORDER_MARKER', scope: 'user', status: 'observation', category: 'facts' };
  assert.equal(writer.writeProposal('evt_g07_order', ordered).status, 'persisted');
  // RED on original: hash считался по порядку ключей входа -> CONFLICT на том же содержимом
  const again = writer.writeProposal('evt_g07_order', reversed);
  assert.equal(again.idempotent, true);
  const text = fs.readFileSync(memoryFile(root), 'utf8');
  assert.equal((text.match(/## ORDER_MARKER/g) || []).length, 1);
});

test('G07: an explicit optional default equals the omitted one', () => {
  const root = fixture('g07-defaults');
  const base = proposal('DEFAULT_MARKER');
  assert.equal(writer.writeProposal('evt_g07_defaults', base).status, 'persisted');
  const explicit = writer.writeProposal('evt_g07_defaults', { ...base, supersedes: undefined, confidence: undefined });
  assert.equal(explicit.idempotent, true);
  const text = fs.readFileSync(memoryFile(root), 'utf8');
  assert.equal(text.includes('supersedes:'), false);
  assert.equal(text.includes('confidence:'), false);
});

test('G07: an unknown proposal field is rejected instead of changing identity invisibly', () => {
  fixture('g07-unknown-field');
  // RED on original: поле не попадало в запись, но меняло hash и порождало CONFLICT
  assert.throws(
    () => writer.writeProposal('evt_g07_unknown', { ...proposal('UNKNOWN_FIELD_MARKER'), extra_note: 'ignored before' }),
    /unknown proposal field: extra_note/
  );
});

test('G07: a substantive difference still conflicts', () => {
  fixture('g07-conflict');
  writer.writeProposal('evt_g07_conflict', proposal('CONFLICT_ONE'));
  assert.throws(
    () => writer.writeProposal('evt_g07_conflict', proposal('CONFLICT_TWO')),
    error => error.code === 'CONFLICT'
  );
  assert.throws(
    () => writer.writeProposal('evt_g07_conflict', proposal('CONFLICT_ONE', 'B')),
    error => error.code === 'CONFLICT'
  );
});

test('G07: an interrupted legacy intent is recoverable and republished canonically', () => {
  fixture('g07-legacy-intent');
  const raw = { source: 'test', statement: 'LEGACY_MARKER', scope: 'user', status: 'observation', category: 'facts', evidence: 'synthetic fixture' };
  // Старая (до канонизации) идентичность: порядок ключей входа, нормализованные поля.
  const legacy = { ...raw, statement: 'LEGACY_MARKER', evidence: 'synthetic fixture', source: 'test', supersedes: undefined };
  const legacyHash = proposalHash('evt_g07_legacy', [legacy]);
  writerLog.append({ event_id: 'evt_g07_legacy', hash: legacyHash, status: 'intent', indexed: false });
  const result = writer.writeProposal('evt_g07_legacy', raw);
  assert.equal(result.status, 'persisted');
  assert.notEqual(writerLog.get('evt_g07_legacy').hash, legacyHash);
});
