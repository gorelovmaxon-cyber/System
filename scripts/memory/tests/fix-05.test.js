'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { fixture, mod } = require('./helpers');

const { DurableQueue } = mod('queue');
const { createEvent } = mod('events');

function event(n) {
  return createEvent({ kind: 'commit', project_id: 'A', sha: String(n).repeat(40), summary: 'synthetic', diff: '' });
}

function frozenClock() {
  const actual = Date.now;
  let now = actual();
  Date.now = () => now;
  return {
    get now() { return now; },
    advance(ms) { now += ms; },
    restore() { Date.now = actual; },
  };
}

// G03. Аренда считается в момент захвата, а не в начале прохода: иначе второе
// событие получает аренду, которая к моменту захвата уже истекла, и живая
// доставка выглядит осиротевшей для любого другого процесса.
test('G03: a lease is dated at claim time, so a long previous delivery cannot orphan the next one', async () => {
  fixture('fix05-claim-clock');
  const clock = frozenClock();
  try {
    const q = new DurableQueue({ leaseMs: 1000 });
    q.enqueue(event(1));
    q.enqueue(event(2));
    let calls = 0;
    let leaseExpiry = null;
    let reclaimable = null;
    await q.process(async e => {
      calls += 1;
      if (calls === 1) {
        // первая доставка «занимает» 5 с — вчетверо больше аренды
        clock.advance(5000);
      } else {
        leaseExpiry = q.records().get(e.event_id).lease_expires_at;
        const other = new DurableQueue({ leaseMs: 1000 });
        other.restoreInflight();
        // RED on original: аренда второго события была посчитана от начала
        // прохода и к этому моменту уже истекла — второй процесс забирал
        // доставку, которая всё ещё выполнялась
        reclaimable = other.claim(e.event_id, { now: Date.now() }) !== null;
      }
      return { ok: true };
    });
    assert.equal(calls, 2);
    assert.equal(reclaimable, false, 'a live delivery must not be reclaimable');
    assert.ok(Date.parse(leaseExpiry) > clock.now, 'the lease of a freshly claimed event must be in the future');
    assert.deepEqual(
      [...q.records().values()].map(record => record.status),
      ['delivered', 'delivered']
    );
  } finally {
    clock.restore();
  }
});

// G03 (вторая половина). Просроченная аренда обязана восстанавливаться: отказ
// не должен превращаться в вечное владение после смерти доставившего.
test('G03: an expired generation is still recoverable by a later process', async () => {
  fixture('fix05-expired-recover');
  const clock = frozenClock();
  try {
    const q = new DurableQueue({ leaseMs: 1000 });
    q.enqueue(event(3));
    const claimed = q.claim(event(3).event_id);
    assert.ok(claimed, 'the first generation must be claimable');
    clock.advance(60000);
    const other = new DurableQueue({ leaseMs: 1000 });
    other.restoreInflight();
    assert.ok(other.claim(event(3).event_id, { now: Date.now() }), 'an expired generation must be recoverable');
  } finally {
    clock.restore();
  }
});

// Отсчёт повтора идёт от времени результата: иначе событие после медленной
// неуспешной попытки становится пригодным к немедленному повтору.
test('G03: retry backoff is measured from the result, not from the start of the pass', async () => {
  fixture('fix05-retry-clock');
  const clock = frozenClock();
  try {
    const start = clock.now;
    const q = new DurableQueue({ leaseMs: 1000, backoffMs: 60000 });
    q.enqueue(event(4));
    await q.process(async () => {
      clock.advance(300000);
      return { ok: false, error: 'synthetic delivery failure' };
    });
    const record = q.records().get(event(4).event_id);
    assert.equal(record.status, 'pending');
    assert.equal(record.attempts, 1);
    assert.equal(Date.parse(record.next_attempt_at), clock.now + 60000, 'backoff must start at the result time');
    assert.ok(Date.parse(record.next_attempt_at) > start + 60000);
    // и повтор действительно не идёт раньше срока
    let calls = 0;
    await q.process(async () => { calls += 1; return { ok: true }; });
    assert.equal(calls, 0);
  } finally {
    clock.restore();
  }
});

// Bounded lease renewal: доставка, которая законно длится дольше аренды,
// удерживает своё поколение, и освобождение аренды не может быть перехвачено
// параллельным процессом.
test('FIX-05: a delivery longer than the lease keeps its generation', async () => {
  fixture('fix05-renewal');
  const q = new DurableQueue({ leaseMs: 400 });
  q.enqueue(event(5));
  let observed = null;
  await q.process(async () => {
    await new Promise(resolve => setTimeout(resolve, 700));
    const other = new DurableQueue({ leaseMs: 400 });
    other.restoreInflight();
    observed = {
      status: q.records().get(event(5).event_id).status,
      stolen: other.claim(event(5).event_id, { now: Date.now() }) !== null,
    };
    return { ok: true };
  });
  assert.equal(observed.status, 'in-flight', 'the lease must still be held after 700 ms with a 400 ms lease');
  assert.equal(observed.stolen, false, 'a parallel process must not take a renewed live lease');
  assert.equal(q.records().get(event(5).event_id).status, 'delivered');
  assert.equal(q.records().get(event(5).event_id).lease_id, null);
});

// Продление ограничено: оно прекращается вместе с доставкой и не возвращает
// аренду поколению, которое её уже потеряло.
test('FIX-05: renewal stops with the delivery and refuses a lost generation', async () => {
  fixture('fix05-renewal-bounds');
  const q = new DurableQueue({ leaseMs: 300 });
  q.enqueue(event(6));
  const claimed = q.claim(event(6).event_id);
  const renewal = q.startRenewal(claimed);
  try {
    await new Promise(resolve => setTimeout(resolve, 450));
    const renewed = Date.parse(q.records().get(event(6).event_id).lease_expires_at);
    assert.ok(renewed > Date.parse(claimed.lease_expires_at), 'a live holder must extend its own lease');
    // поколение теряет аренду: продление отказывает и не перезаписывает чужой результат
    q.finish(claimed, { status: 'pending' });
    const successor = q.claim(event(6).event_id);
    assert.ok(successor);
    assert.notEqual(successor.lease_id, claimed.lease_id);
    q.renew(claimed);
    assert.equal(q.records().get(event(6).event_id).lease_id, successor.lease_id, 'a lost generation cannot overwrite the successor');
    await new Promise(resolve => setTimeout(resolve, 450));
    const after = Date.parse(q.records().get(event(6).event_id).lease_expires_at);
    assert.equal(after, Date.parse(successor.lease_expires_at), 'the stopped renewal must not keep extending');
  } finally {
    renewal.stop();
  }
  // после stop() таймер не держит процесс и ничего не пишет
  const before = fs.statSync(q.file).size;
  await new Promise(resolve => setTimeout(resolve, 450));
  assert.equal(fs.statSync(q.file).size, before, 'a stopped renewal writes nothing');
});
