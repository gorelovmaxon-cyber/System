const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const repo=path.resolve(__dirname,'../../..');
const {fixture,proposal:p,memoryFile,mod}=require(path.join(repo,'scripts/memory/tests/helpers'));
const writer=mod('writer'),search=mod('search'),indexer=mod('indexer'),indexLog=mod('indexer-log'),writerLog=mod('writer-log');
const {resolvePaths}=mod('resolve-paths');const results=[];
const json=(file,obj)=>fs.writeFileSync(file,JSON.stringify(obj));
function local(root,obj){json(path.join(root,'config/system.local.json'),obj);}
function git(root,args){const r=spawnSync('git',['-C',root,...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();}
async function probe(id,fn){const root=fixture('extended-'+id);try{results.push({id,reproduced:true,root,evidence:await fn(root)});}catch(e){results.push({id,reproduced:false,error:e.stack});}}
async function fakeFetch(fn,body){const original=global.fetch;global.fetch=fn;try{return await body();}finally{global.fetch=original;}}
async function main(){
 await probe('B01-missing-evidence-accepted',root=>{
  const proposal=p('NO_EVIDENCE');delete proposal.evidence;
  const result=writer.writeProposal('evt_evidence',proposal);const text=fs.readFileSync(memoryFile(root),'utf8');
  assert(text.includes('evidence: undefined'));return {result,undefinedEvidenceWritten:true};
 });
 await probe('B02-junction-write-escape',root=>{
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'s2-external-target-'));
  fs.symlinkSync(outside,path.join(root,'.claude/memory/facts'),'junction');
  const result=writer.writeProposal('evt_junction',p('OUTSIDE_MEMORY'));
  const target=path.join(outside,'writer-entries.md');assert(fs.existsSync(target));return {result,outsideWrite:target};
 });
 await probe('B03-explicit-root-overridden',root=>{
  const other=fixture('alternate-root');process.env.SYSTEM2_ROOT=root;local(root,{system_root:other});
  const resolved=resolvePaths({root});assert.equal(resolved.system_root,other);assert.equal(resolved.localConfig,path.join(root,'config/system.local.json'));
  return {explicitRoot:root,resolved};
 });
 await probe('B04-local-config-drops-search-defaults',async root=>{
  local(root,{local_paths:{}});let calls=0;
  const result=await fakeFetch(async()=>{calls++;throw Error('synthetic unavailable');},()=>search.searchKhoj('query','A'));
  assert(calls>0);return {exampleKhojEnabled:false,localConfig:{local_paths:{}},unexpectedNetworkCalls:calls,result};
 });
 await probe('B05-custom-memory-khoj-misses',async root=>{
  local(root,{memory_root:'custom-memory'});writer.writeProposal('evt_custom',p('CUSTOM_MARKER','A'));
  let n=0;const target=path.join(root,'custom-memory/facts/writer-entries.md');
  const result=await fakeFetch(async()=>({ok:true,text:async()=>JSON.stringify(++n===1?{}:{results:[{source:target,snippet:'CUSTOM_MARKER'}]})}),()=>search.searchKhoj('CUSTOM_MARKER','A',{force:true}));
  assert(fs.existsSync(target));assert.equal(result.ok,true);assert.equal(result.results.length,0);return {memoryFile:target,result};
 });
 await probe('B06-reinit-erases-handoff',root=>{
  const init=mod('init-project');const project=path.join(root,'project');fs.mkdirSync(project);
  local(root,{registry:[{project_id:'proj-a'}]});const args={root:project,systemRoot:root,projectId:'proj-a'};
  init.initProject(args);const handoff=path.join(project,'HANDOFF.md');
  fs.writeFileSync(handoff,`MANUAL_OUTSIDE\n${init.START}\nNEXT_ACTION_SAVED\n${init.END}\n`);
  init.initProject(args);const text=fs.readFileSync(handoff,'utf8');assert(!text.includes('NEXT_ACTION_SAVED'));assert(text.includes('MANUAL_OUTSIDE'));
  return {savedStateLost:true,manualOutsidePreserved:true};
 });
 await probe('B07-reindex-same-file-not-rescheduled',async root=>{
  const file=memoryFile(root);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'version 1');
  indexer.queueIndex('manual',[file]);await fakeFetch(async()=>({ok:true}),()=>indexer.run({reindexUrl:'http://synthetic.invalid'}));
  fs.writeFileSync(file,'version 2');const queued=indexer.queueIndex('manual',[file]);const run=await indexer.run();
  assert.equal(queued[0].status,'indexed');assert.equal(run.length,0);return {queued,secondRun:run,changedFileNotReindexed:true};
 });
 await probe('B08-index-retries-without-backoff',async root=>{
  indexer.queueIndex('evt_backoff',[memoryFile(root)]);let calls=0;
  const start=Date.now();await fakeFetch(async()=>{calls++;return {ok:false,status:503};},async()=>{
   const opts={reindexUrl:'http://synthetic.invalid',config:{indexer:{retries_max:5,backoff_ms:60000}}};await indexer.run(opts);await indexer.run(opts);
  });
  assert.equal(calls,2);return {calls,requestedBackoffMs:60000,elapsedMs:Date.now()-start,status:indexer.status()};
 });
 await probe('B09-truncated-writer-and-index-logs',root=>{
  writer.writeProposal('evt_valid',p('VALID'));fs.appendFileSync(writerLog.logPath(),'{"event_id":');
  assert.throws(()=>writer.writeProposal('evt_new',p('NEW')),SyntaxError);
  fs.appendFileSync(indexLog.logPath(),'{"task_id":');assert.throws(()=>indexer.status(),SyntaxError);
  return {writerBlocked:true,indexStatusBlocked:true};
 });
 await probe('B10-truncate-corrupts-utf8',root=>{
  const output=mod('events').truncateUtf8('яяяя',6);assert(output.includes('\uFFFD'));assert(Buffer.byteLength(output)>6);return {output,limit:6,bytes:Buffer.byteLength(output)};
 });
 await probe('B11-event-validator-missing-id-and-wrong-arrays',root=>{
  const ev=mod('events').createEvent({kind:'commit',project_id:'A',sha:'abcdef0',summary:'valid'});delete ev.event_id;ev.decisions={not:'array'};
  mod('events').validateEvent(ev);const queue=new (mod('queue').DurableQueue)();queue.enqueue(ev);return {acceptedMissingId:true,acceptedObjectDecisions:true,count:queue.list().length};
 });
 await probe('B12-hook-installer-overrides-custom',root=>{
  git(root,['init']);const custom=path.join(root,'custom-hooks');fs.mkdirSync(custom);fs.writeFileSync(path.join(custom,'post-commit'),'#!/bin/sh\nexit 0\n');
  fs.cpSync(path.join(repo,'.git-hooks-templates'),path.join(root,'.git-hooks-templates'),{recursive:true});git(root,['config','core.hooksPath',custom]);
  const bash='C:\\Program Files\\Git\\usr\\bin\\bash.exe';assert(fs.existsSync(bash));
  const r=spawnSync(bash,[path.join(root,'.git-hooks-templates/install-hooks.sh')],{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  const actual=git(root,['config','--get','core.hooksPath']);assert.equal(actual,'.git-hooks-templates');return {previous:custom,actual,withoutForce:true};
 });
 await probe('B13-project-id-ignores-local-registry',root=>{
  git(root,['init']);git(root,['remote','add','origin','https://example.invalid/project-a.git']);
  local(root,{registry:[{project_id:'proj-a',remote:'https://example.invalid/project-a.git'}]});
  const result=mod('project-id').projectId(root);assert.equal(result,'systemqwen');return {expected:'proj-a',actual:result};
 });
 await probe('B14-forbidden-best-hit-hides-allowed',async root=>{
  writer.writeProposal('evt_B',p('SHARED_QUERY private details','B'));writer.writeProposal('evt_A',p('SHARED_QUERY allowed details','A'));
  let n=0;const result=await fakeFetch(async()=>({ok:true,text:async()=>JSON.stringify(++n===1?{}:{results:[{source:'facts/writer-entries.md',snippet:'SHARED_QUERY'}]})}),()=>search.searchKhoj('SHARED_QUERY','A',{force:true}));
  assert.equal(result.results.length,0);const fallback=search.localResults('SHARED_QUERY','A');assert.equal(fallback.length,1);return {result,allowedFallback:fallback};
 });
 await probe('B15-legacy-normalization-conflicts',root=>{
  const cp=require('node:crypto');const proposal=p('LEGACY_SOURCE','user','facts',{source:'  evidence-source  '});
  const hash=cp.createHash('sha256').update(JSON.stringify({eventId:'evt_legacy',proposals:[proposal]})).digest('hex');
  writerLog.append({event_id:'evt_legacy',hash,status:'intent'});
  assert.throws(()=>writer.writeProposal('evt_legacy',proposal),e=>e.code==='CONFLICT');return {oldValidIntentSameInputRejected:true};
 });
 await probe('B16-index-duplicate-records-per-batch',root=>{
  writer.writeProposal('evt_batch',[p('FIRST'),p('SECOND')]);const lines=fs.readFileSync(indexLog.logPath(),'utf8').trim().split('\n');assert.equal(lines.length,2);
  return {rawPendingRecords:lines.length,uniqueTaskIds:new Set(lines.map(x=>JSON.parse(x).task_id)).size};
 });
 await probe('B17-empty-batch-locks-event-id',root=>{
  const first=writer.writeProposal('evt_empty',[]);assert.equal(first.status,'persisted');assert.equal(first.written_files.length,0);
  assert.throws(()=>writer.writeProposal('evt_empty',p('REAL_DATA')),e=>e.code==='CONFLICT');return {first,laterDataRejected:true};
 });
 await probe('B18-figma-extractor-ignores-nodeId',root=>{
  const extract=require(path.join(repo,'.claude/mcp-servers/figma/lib/extract')).extractDesignTokens;
  const doc={document:{id:'0',children:[{id:'1',name:'wanted',cornerRadius:1},{id:'2',name:'unwanted',cornerRadius:2}]}};
  const r=extract(doc,{nodeId:'1'});assert(r.radii.some(x=>x.node_id==='2'));return {requestedNode:'1',returnedNodes:r.radii.map(x=>x.node_id)};
 });
 await probe('B19-index-invalid-absolute-dotdot-accepted',root=>{
  const input=path.join(root,'.claude/memory')+path.sep+'..'+path.sep+'..'+path.sep+'outside.md';
  const normalized=indexer.normalizeFile(input,resolvePaths());assert(!path.resolve(normalized).startsWith(path.resolve(root,'.claude/memory')+path.sep));return {input,accepted:normalized,resolved:path.resolve(normalized)};
 });
 await probe('F05-index-job-lost-on-write',root=>{
  const dir=path.join(root,'.local/indexer');fs.mkdirSync(path.dirname(dir),{recursive:true});fs.writeFileSync(dir,'blocked');writer.writeProposal('evt_f05',p('SAVED'));
  fs.unlinkSync(dir);writer.writeProposal('evt_f05',p('SAVED'));assert.equal(indexer.status().length,0);return {afterRetryTasks:0};
 });
 await probe('F06-inflight-index-stuck',async root=>{
  const [task]=indexer.queueIndex('evt_f06',[memoryFile(root)]);indexLog.append({...task,status:'in-flight',attempts:1});
  const run=await indexer.run();const requeued=indexer.requeueFailed();assert.equal(run.length,0);assert.equal(requeued,0);return {run,requeued,status:indexer.status()[0].status};
 });
 await probe('F07-partial-index-false-success',async root=>{
  writer.writeProposal('evt_f07',[p('FACT'),p('DECISION','user','decisions')]);let n=0;
  const run=await fakeFetch(async()=>({ok:++n===1,status:503}),()=>indexer.run({reindexUrl:'http://synthetic.invalid'}));
  assert(run.some(x=>x.status==='failed'));assert.equal(writerLog.get('evt_f07').indexed,true);return {run,eventIndexed:true};
 });
 await probe('F08-queue-concurrent-status-loss',async root=>{
  const {DurableQueue}=mod('queue');const q=new DurableQueue();q.enqueue({event_id:'evt_f08'});let release;const pending=new Promise(r=>release=r);
  let count=0;const first=q.process(async()=>{count++;await pending;return {ok:false,retryable:false,error:'late failure'};});
  const second=new DurableQueue();await second.process(async()=>{count++;return {ok:true};});release();await first;
  assert.equal(count,2);assert.equal(q.list()[0].status,'failed');return {deliveries:count,finalStatus:'failed'};
 });
 await probe('F09-recapture-timestamp-conflict',root=>{
  const create=mod('events').createEvent;const q=new (mod('queue').DurableQueue)();const args={kind:'commit',project_id:'A',sha:'abcdef0',summary:'same'};
  const a=create({...args,timestamp:'2026-09-09T00:00:00Z'}),b=create({...args,timestamp:'2026-09-09T00:00:01Z'});q.enqueue(a);assert.throws(()=>q.enqueue(b),/different content/);return {sameId:a.event_id===b.event_id,rejected:true};
 });
 await probe('F10-queue-corrupt-tail-blocks',root=>{
  const {DurableQueue}=mod('queue');const q=new DurableQueue();q.enqueue({event_id:'evt_good'});fs.appendFileSync(q.file,'{"event":');assert.throws(()=>new DurableQueue(),SyntaxError);return {previousValidEventUnavailable:true};
 });
 const output={revision:'ffe215a',node:process.version,results};fs.writeFileSync(path.join(__dirname,'extended-audit-results.json'),JSON.stringify(output,null,2));
 console.log(JSON.stringify(output,null,2));if(results.some(x=>!x.reproduced))process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
