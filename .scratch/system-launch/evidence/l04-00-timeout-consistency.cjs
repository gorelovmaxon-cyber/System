#!/usr/bin/env node
'use strict';

// L04-00: фактическое поведение очереди при таймауте синхронного webhook.
// Поднимает настоящий bridge+writer на fixture-памяти, ставит перед ним стенд,
// имитирующий flow-run Activepieces, и прогоняет реальные DurableQueue +
// deliverEvent. Секретов не содержит; токен bridge выдуман для fixture.

const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..', '..', '..');
const LABEL = process.env.L04_LABEL || 'after-fix';
const OUT = path.join(__dirname, `l04-00-timeout-consistency-${LABEL}-2026-09-13.json`);
const BRIDGE_TOKEN = 'fixture-token-not-a-secret';

const { createEvent } = require(path.join(REPO, 'scripts/memory/events'));
const { DurableQueue } = require(path.join(REPO, 'scripts/memory/queue'));
const { deliverEvent } = require(path.join(REPO, 'scripts/memory/deliver'));
const { server: bridgeServer } = require(path.join(REPO, 'scripts/memory/bridge-server'));

function makeRoot(name) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `s2-l04-${name}-`));
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.mkdirSync(path.join(root, '.git'), { recursive: true });
  fs.mkdirSync(path.join(root, '.claude/memory'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config', 'system.example.json'), JSON.stringify({
    registry: [{ project_id: 'fixture' }],
    memory_root: '.claude/memory',
    data_dir: '.local',
    integrations: { khoj: { enabled: false } },
    queue: { retries_max: 3, backoff_ms: 100 },
    bridge: { port: 0, token: BRIDGE_TOKEN },
    writer: { categories: ['facts'] },
  }));
  fs.writeFileSync(path.join(root, '.gitignore'), '.local/\n');
  process.env.SYSTEM2_ROOT = root;
  process.env.SYSTEM2_LOCK_DIR = path.join(root, '.locks');
  return root;
}

const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = server => new Promise(resolve => server.close(() => resolve()));

function body(req) {
  return new Promise(resolve => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

// Стенд «flow-run»: принимает SC-07 событие, через delayMs идёт на шаг write,
// затем отвечает контрактом Activepieces — correlated persisted или 408 без тела.
function flowStand(bridgePort, delayMs, stats) {
  return http.createServer(async (req, res) => {
    stats.requests += 1;
    const raw = await body(req);
    let event;
    try { event = JSON.parse(raw.toString('utf8')); } catch {
      res.writeHead(400, { 'content-type': 'application/json' });
      return res.end('{"error":"bad event"}');
    }
    const payload = JSON.stringify({
      event_id: event.event_id,
      proposals: [{ category: 'facts', status: 'observation', scope: 'fixture', statement: `L04-00 fixture record for ${event.event_id}`, evidence: 'l04-00 stand' }],
    });
    const write = () => {
      const forward = http.request({
        host: '127.0.0.1',
        port: bridgePort,
        method: 'POST',
        path: '/write',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${BRIDGE_TOKEN}`, 'content-length': Buffer.byteLength(payload) },
      }, upstream => {
        const out = [];
        upstream.on('data', chunk => out.push(chunk));
        upstream.on('end', () => {
          stats.completed += 1;
          if (upstream.statusCode !== 200) {
            stats.write_failures += 1;
            res.writeHead(408, { 'content-type': 'application/json' });
            return res.end('');
          }
          const parsed = JSON.parse(Buffer.concat(out).toString('utf8'));
          stats.writes += 1;
          if (parsed.idempotent === true) stats.idempotent_writes += 1;
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ event_id: event.event_id, status: 'persisted', idempotent: parsed.idempotent === true }) + '\n');
        });
      });
      forward.on('error', () => {
        stats.completed += 1;
        stats.write_failures += 1;
        res.writeHead(408, { 'content-type': 'application/json' });
        res.end('');
      });
      forward.end(payload);
    };
    setTimeout(write, delayMs);
  });
}

// Стенд «flow-run упал до writer»: Activepieces не порождает flow-response и отдаёт 408.
function failedRunStand(delayMs, stats) {
  return http.createServer(async (req, res) => {
    stats.requests += 1;
    await body(req);
    setTimeout(() => {
      stats.completed += 1;
      res.writeHead(408, { 'content-type': 'application/json' });
      res.end('');
    }, delayMs);
  });
}

function readMemory(root) {
  const file = path.join(root, '.claude/memory/facts/writer-entries.md');
  if (!fs.existsSync(file)) return { records: 0, bytes: 0 };
  const text = fs.readFileSync(file, 'utf8');
  return { records: (text.match(/^event_id: /gm) || []).length, bytes: Buffer.byteLength(text, 'utf8') };
}

function emptyStats() {
  return { requests: 0, completed: 0, writes: 0, idempotent_writes: 0, write_failures: 0 };
}

async function drainPasses(queue, eventId, maxPasses) {
  const passes = [];
  for (let index = 0; index < maxPasses; index += 1) {
    const started = Date.now();
    let deliverMs = null;
    const timedDeliver = async event => {
      const attemptedAt = Date.now();
      const result = await deliverEvent(event);
      deliverMs = Date.now() - attemptedAt;
      return result;
    };
    const records = await queue.process(timedDeliver);
    const record = records.find(item => item.event.event_id === eventId);
    passes.push({
      pass: index + 1,
      elapsed_ms: Date.now() - started,
      deliver_ms: deliverMs,
      status: record.status,
      attempts: record.attempts || 0,
      last_error: record.last_error || null,
    });
    if (record.status === 'delivered' || record.status === 'failed') break;
    if (record.next_attempt_at) {
      const wait = Date.parse(record.next_attempt_at) - Date.now();
      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
    }
  }
  return passes;
}

async function scenario(spec) {
  const root = makeRoot(spec.name);
  const stats = emptyStats();
  let bridge = null;
  let bridgePort = 0;
  if (spec.withBridge) {
    bridge = bridgeServer({ token: BRIDGE_TOKEN });
    bridgePort = await listen(bridge);
  }
  const stand = spec.stand(bridgePort, stats);
  const standPort = await listen(stand);
  process.env.MEMORY_DELIVERY_ENDPOINT = `http://127.0.0.1:${standPort}/api/v1/webhooks/fixture/sync`;

  const event = createEvent({ kind: 'commit', project_id: 'fixture', sha: spec.sha, summary: spec.summary });
  const queue = new DurableQueue({ dir: path.join(root, '.local/queue'), retriesMax: 3, backoffMs: 100, leaseMs: 60000 });
  queue.enqueue(event);
  const passes = await drainPasses(queue, event.event_id, spec.maxPasses ?? 4);

  const result = {
    what: spec.what,
    stand_delay_ms: spec.delayMs,
    platform_requests: stats.requests,
    platform_responses: stats.completed,
    writer_calls_ok: stats.writes,
    writer_idempotent_calls: stats.idempotent_writes,
    failed_runs: stats.write_failures,
    queue_passes: passes,
    final_status: passes[passes.length - 1].status,
    memory_after: readMemory(root),
  };

  await close(stand);
  if (bridge) await close(bridge);
  return result;
}

async function main() {
  const report = {
    measured_at: new Date().toISOString(),
    label: LABEL,
    head: execSync('git rev-parse HEAD', { cwd: REPO }).toString().trim(),
    worktree_dirty: execSync('git status --porcelain', { cwd: REPO }).toString().trim().split('\n').filter(Boolean).length > 0,
    subject: 'scripts/memory/deliver.js: таймаут отправителя против таймаута Activepieces',
    note: 'sender используется настоящий deliverEvent; стенд держит контракт 408 / correlated persisted',
    scenarios: {},
  };

  report.scenarios.run_failed_ap_returns_408 = await scenario({
    name: 'ap408',
    sha: 'aaaaaaa1',
    summary: 'l04 run failed',
    what: 'flow-run падает до writer: Activepieces отдаёт HTTP 408 с пустым телом; очередь обязана повторить',
    withBridge: false,
    delayMs: 60,
    stand: (port, stats) => failedRunStand(60, stats),
  });

  report.scenarios.slow_run_longer_than_sender_timeout = await scenario({
    name: 'slowrun',
    sha: 'bbbbbbb2',
    summary: 'l04 slow run',
    what: 'flow-run доходит до writer и отвечает correlated persisted, но позже таймаута отправителя',
    withBridge: true,
    delayMs: 6000,
    maxPasses: 4,
    stand: (port, stats) => flowStand(port, 6000, stats),
  });

  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
}

main().catch(error => {
  process.stderr.write(error.stack + '\n');
  process.exitCode = 1;
});
