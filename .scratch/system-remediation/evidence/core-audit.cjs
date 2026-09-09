const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '../../..');
const mod = name => require(path.join(repo, 'scripts/memory', name));
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'system2-audit-'));
const results = [];
function fixture(name) {
  const root = path.join(base, name);
  fs.mkdirSync(path.join(root, 'config'), {recursive:true});
  fs.mkdirSync(path.join(root, '.git'));
  fs.mkdirSync(path.join(root, '.claude/memory'), {recursive:true});
  fs.writeFileSync(path.join(root, 'config/system.example.json'), JSON.stringify({registry:[{project_id:'A'},{project_id:'B'}]}));
  process.env.SYSTEM2_ROOT = root;
  return root;
}
const p = (statement, scope='user', category='facts') => ({category,status:'observation',scope,statement,evidence:'synthetic audit fixture',source:'audit'});
async function test(name, fn) {
  fixture(name);
  try { results.push({name, reproduced:true, evidence:await fn()}); }
  catch(e) {results.push({name,reproduced:false,error:e.stack});}
}
async function main() {
  const writer = mod('writer');
  const wl = mod('writer-log');
  const idx = mod('indexer');
  const il = mod('indexer-log');
  const {DurableQueue} = mod('queue');
  const memoryFile = () => path.join(process.env.SYSTEM2_ROOT,'.claude/memory/facts/writer-entries.md');
  await test('F01-batch-loss', () => {
    const result = writer.writeProposal('evt_batch',[p('FIRST_MARKER'),p('SECOND_MARKER')]);
    const text = fs.readFileSync(memoryFile(),'utf8');
    assert(text.includes('FIRST_MARKER')); assert(!text.includes('SECOND_MARKER'));
    return {result,secondProposalMissing:true};
  });
  await test('F02-intent-false-success', () => {
    const proposals=[p('NEVER_WRITTEN')];
    const hash=require('node:crypto').createHash('sha256').update(JSON.stringify({eventId:'evt_crash',proposals})).digest('hex');
    wl.append({event_id:'evt_crash',hash,status:'intent'});
    const result=writer.writeProposal('evt_crash',proposals);
    assert.equal(result.status,'persisted'); assert(!fs.existsSync(memoryFile()));
    return {result,memoryFileExists:false};
  });
  await test('F03-stale-lock', () => {
    const lock=path.join(process.env.SYSTEM2_ROOT,'.local/writer/memory.lock');
    fs.mkdirSync(path.dirname(lock),{recursive:true}); fs.writeFileSync(lock,'');
    assert.throws(()=>writer.writeProposal('evt_lock',p('BLOCKED')),/writer lock timeout/);
    return {error:'writer lock timeout',orphanLockStillExists:fs.existsSync(lock)};
  });
  await test('F04-project-leak', () => {
    writer.writeProposal('evt_public',p('PUBLIC_MARKER'));
    writer.writeProposal('evt_private',p('PRIVATE_B_MARKER','B'));
    const results=mod('search').localResults('PRIVATE_B_MARKER','A');
    assert(results.some(x=>x.snippet.includes('PRIVATE_B_MARKER')));
    return {queryProject:'A',results};
  });
  await test('F05-index-queue-loss', () => {
    const dir=path.join(process.env.SYSTEM2_ROOT,'.local/indexer');
    fs.mkdirSync(path.dirname(dir),{recursive:true}); fs.writeFileSync(dir,'simulate unavailable index log directory');
    const first=writer.writeProposal('evt_indexloss',p('SAVED_WITHOUT_INDEX_JOB'));
    fs.unlinkSync(dir);
    const retry=writer.writeProposal('evt_indexloss',p('SAVED_WITHOUT_INDEX_JOB'));
    assert.equal(first.status,'persisted'); assert.equal(idx.status().length,0);
    return {first,retry,indexTasks:idx.status()};
  });
  await test('F06-index-inflight-stuck', async () => {
    const [task]=idx.queueIndex('evt_stuck',[memoryFile()]);
    il.append({...task,status:'in-flight',attempts:1});
    const run=await idx.run(); const requeued=idx.requeueFailed();
    assert.equal(run.length,0); assert.equal(requeued,0); assert.equal(idx.status()[0].status,'in-flight');
    return {run,requeued,tasks:idx.status()};
  });
  await test('F07-partial-index-success', async () => {
    writer.writeProposal('evt_partial',[p('FACT'),p('DECISION','user','decisions')]);
    const original=global.fetch; let calls=0;
    global.fetch=async()=>({ok:++calls===1,status:503});
    let run; try {run=await idx.run({reindexUrl:'http://synthetic.invalid'});} finally {global.fetch=original;}
    assert.equal(wl.get('evt_partial').indexed,true); assert(run.some(x=>x.status==='failed'));
    return {run,eventIndexed:wl.get('evt_partial').indexed};
  });
  await test('F08-duplicate-concurrent-delivery', async () => {
    const q1=new DurableQueue(); q1.enqueue({event_id:'evt_queue'});
    let release; const pending=new Promise(r=>release=r); let deliveries=0;
    const first=q1.process(async()=>{deliveries++; await pending; return {ok:false,retryable:false,error:'first consumer fails after second consumer succeeded'};});
    const q2=new DurableQueue();
    await q2.process(async()=>{deliveries++;return {ok:true};});
    release(); await first; assert.equal(deliveries,2); assert.equal(q1.list()[0].status,'failed');
    return {deliveries,finalStatus:q1.list()[0].status};
  });
  await test('F09-recapture-conflict', () => {
    const {createEvent}=mod('events'); const queue=new DurableQueue();
    const input={kind:'commit',project_id:'A',sha:'abcdef1234567',summary:'same commit'};
    const a=createEvent({...input,timestamp:'2026-09-09T10:00:00.000Z'});
    const b=createEvent({...input,timestamp:'2026-09-09T10:00:01.000Z'});
    queue.enqueue(a); assert.equal(a.event_id,b.event_id);
    assert.throws(()=>queue.enqueue(b),/different content/);
    return {sameEventId:true,error:'event_id already exists with different content'};
  });
  await test('F10-truncated-queue-log', () => {
    const queue=new DurableQueue(); queue.enqueue({event_id:'evt_good'});
    fs.appendFileSync(queue.file,'{"event":');
    assert.throws(()=>new DurableQueue(),SyntaxError);
    return {previousValidEventInaccessible:true,error:'SyntaxError on partial last JSONL line'};
  });
  await test('controls-writer-and-http-auth', async () => {
    const first=writer.writeProposal('evt_ok',p('ONE'));
    const repeat=writer.writeProposal('evt_ok',p('ONE'));
    assert.equal(first.revision,repeat.revision); assert.equal(repeat.idempotent,true);
    assert.throws(()=>writer.writeProposal('evt_ok',p('TWO')),e=>e.code==='CONFLICT');
    assert.throws(()=>writer.writeProposal('evt_bad',p('INVALID','missing')),/invalid scope/);
    assert.throws(()=>writer.writeProposal('evt_path',p('INVALID','user','../outside')),/invalid category/);
    const server=mod('bridge-server').server({token:'synthetic-audit-token'});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    try {
      const url=`http://127.0.0.1:${server.address().port}/write`;
      const noAuth=await fetch(url,{method:'POST',body:'{}'}); assert.equal(noAuth.status,401);
      const auth=await fetch(url,{method:'POST',headers:{authorization:'Bearer synthetic-audit-token','content-type':'application/json'},body:JSON.stringify({event_id:'evt_http',proposals:[p('HTTP_OK')]})});
      assert.equal(auth.status,200);
      return {repeat:true,conflictRejected:true,invalidScopeRejected:true,pathCategoryRejected:true,noAuthStatus:noAuth.status,authorizedStatus:auth.status};
    } finally {await new Promise(resolve=>server.close(resolve));}
  });
  const output={repo,revision:'69a257c',node:process.version,fixtureRoot:base,results};
  fs.writeFileSync(path.join(__dirname,'core-audit-results.json'),JSON.stringify(output,null,2));
  console.log(JSON.stringify(output,null,2));
  if(results.some(x=>!x.reproduced)) process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
