'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const { fixture, proposal, memoryFile, mod } = require('./helpers');

const writer = mod('writer');
const writerLog = mod('writer-log');
const indexerLog = mod('indexer-log');

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
