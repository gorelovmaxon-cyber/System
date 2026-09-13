'use strict';
// Manual phase-3 probe. Starts no services; requires the loopback bridge.
// Replays only a known persisted event after checking its existing content hash.
// Evidence is never overwritten: --output is mandatory and the target must not exist.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
process.chdir(root);
const { resolvePaths } = require(path.join(root, 'scripts/memory/resolve-paths'));
const { validateProposal } = require(path.join(root, 'scripts/memory/writer'));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

const COMMAND_TIMEOUT_MS = 15000;
const HTTP_TIMEOUT_MS = 15000;

function outputPath(argv) {
  const index = argv.indexOf('--output');
  if (index === -1 || !argv[index + 1]) {
    process.stderr.write('usage: node activepieces-phase3-preflight.cjs --output <new-file.json>\n');
    process.exit(2);
  }
  const target = path.resolve(argv[index + 1]);
  if (fs.existsSync(target)) {
    process.stderr.write('refusing to overwrite existing evidence: ' + target + '\n');
    process.exit(2);
  }
  return target;
}

const target = outputPath(process.argv.slice(2));
const results = {
  checked_at: new Date().toISOString(),
  base_sha: cp.execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', timeout: COMMAND_TIMEOUT_MS }).trim(),
  checks: {},
  environment: {},
};

const snapshot = () => Object.fromEntries([
  'config/system.local.json', 'services/activepieces/.env',
  '.claude/memory/facts/writer-entries.md', '.local/writer/processed.jsonl', '.local/indexer/tasks.jsonl',
].map(file => [file, digest(fs.readFileSync(file))]));

async function run() {
  const before = snapshot();
  const paths = resolvePaths();
  const url = 'http://127.0.0.1:' + paths.config.bridge.port;
  const event_id = 'evt_system2_acceptance_w1_20260912';
  const proposal = validateProposal({category:'facts', status:'observation', scope:'systemqwen',
    source:'independent acceptance',
    evidence:'.scratch/system-remediation/W1-REVIVE-AWAIT-REPORT-2026-09-12.md; independent W1/G12 tests 5/5; fix commit 30321e4',
    statement:'2026-09-12: W1 independently accepted; local core approved for staged service setup. Live Activepieces and Khoj validation remains pending.'});
  const previous = fs.readFileSync('.local/writer/processed.jsonl','utf8').trim().split('\n').map(JSON.parse).filter(x=>x.event_id===event_id).at(-1);
  assert.ok(previous, 'no journal record for ' + event_id);
  // Same formula as writer.proposalHash: it hashes the canonical proposals under the
  // camelCase key `eventId`, while the HTTP request field stays `event_id`. Fail before
  // POST if this replay would not reproduce the journal hash, so a replay can only ever
  // be idempotent.
  assert.equal(previous.status,'persisted');
  assert.equal(digest(JSON.stringify({eventId:event_id, proposals:[proposal]})), previous.hash);
  const health = await fetch(url+'/health', {signal:AbortSignal.timeout(HTTP_TIMEOUT_MS)});
  assert.equal(health.status,200);
  results.checks.bridge_health = await health.json();
  const request = async token => {
    const response = await fetch(url+'/write',{method:'POST', signal:AbortSignal.timeout(HTTP_TIMEOUT_MS),
      headers:{'Content-Type':'application/json', ...(token ? {Authorization:'Bearer '+token} : {})},
      body:JSON.stringify({event_id, proposals:[proposal]})});
    return {status:response.status, body:await response.json()};
  };
  results.checks.unauthorized = await request();
  assert.equal(results.checks.unauthorized.status,401);
  results.checks.replay = await request(paths.config.bridge.token);
  assert.equal(results.checks.replay.status,200);
  assert.equal(results.checks.replay.body.status,'persisted');
  assert.equal(results.checks.replay.body.idempotent,true);
  assert.equal(results.checks.replay.body.revision,previous.revision);
  assert.deepEqual(snapshot(),before);
  results.checks.config_memory_journals_unchanged = true;
  results.phase_status = 'blocked';
  results.limit = 'Host bridge only; Docker/WSL unavailable. No live AP flow, container connectivity, owner, AI call, export, or AP restart verified.';
}

// Environment facts are context for the report, not part of the bridge smoke: they are
// recorded rather than asserted, so a registry or WSL hiccup cannot mask a passing smoke.
function recordEnvironment() {
  for (const [name, command, args] of [['wsl', 'wsl.exe', ['--status']], ['docker', 'docker', ['--version']]]) {
    const result = cp.spawnSync(command, args, { timeout: COMMAND_TIMEOUT_MS });
    results.environment[name] = {
      exit_code: result.status,
      error: result.error ? String(result.error.code || result.error.message) : null,
      stdout: result.stdout ? result.stdout.toString('utf16le') : '',
      stderr: result.stderr ? result.stderr.toString('utf16le') : '',
    };
  }
}

async function recordImage() {
  const reference = 'ghcr.io/activepieces/activepieces:0.86.3';
  try {
    const tokenResponse = await fetch('https://ghcr.io/token?scope=repository:activepieces/activepieces:pull', {signal:AbortSignal.timeout(HTTP_TIMEOUT_MS)});
    const token = (await tokenResponse.json()).token;
    const manifest = await fetch('https://ghcr.io/v2/activepieces/activepieces/manifests/0.86.3',{signal:AbortSignal.timeout(HTTP_TIMEOUT_MS),headers:{Authorization:'Bearer '+token,Accept:'application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json'}});
    results.environment.image = {reference, token_status:tokenResponse.status, status:manifest.status, digest:manifest.headers.get('docker-content-digest'), platforms:(await manifest.json()).manifests.map(x=>x.platform)};
  } catch (error) {
    results.environment.image = {reference, error:String(error.message || error)};
  }
}

run()
  .then(recordImage, error => { throw error; })
  .catch(error=>{results.error=String(error.message || error);process.exitCode=1;})
  .finally(()=>{
    recordEnvironment();
    fs.writeFileSync(target,JSON.stringify(results,null,2)+'\n');
    console.log(JSON.stringify(results,null,2));
  });
