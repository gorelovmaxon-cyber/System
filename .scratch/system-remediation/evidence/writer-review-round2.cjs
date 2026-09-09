const fs = require('node:fs');
const path = require('node:path');
const {spawn,spawnSync} = require('node:child_process');
const assert = require('node:assert/strict');
const repo=path.resolve(__dirname,'../../..');
const {fixture,proposal:p,memoryFile,mod}=require(path.join(repo,'scripts/memory/tests/helpers'));
const writer=mod('writer');
const search=mod('search');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
if(process.argv[2]==='reclaimer'){
 const root=process.env.SYSTEM2_ROOT;const orig=fs.unlinkSync;let paused=false;
 fs.unlinkSync=function(file){
  if(!paused && String(file).endsWith('memory.lock')){
   paused=true;fs.writeFileSync(path.join(root,'ready'),'1');
   const end=Date.now()+7000;
   while(!fs.existsSync(path.join(root,'resume'))){if(Date.now()>end)throw Error('resume timeout');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10);}
  }return orig(file);
 };
 const release=writer.acquireLock();
 fs.writeFileSync(path.join(root,'child-acquired'),'1');release();
 console.log('acquired and released');
}else main().catch(e=>{console.error(e);process.exitCode=1;});
async function main(){
 const results=[];
 async function probe(name,fn){const root=fixture('round2-'+name);try{results.push({name,reproduced:true,root,evidence:await fn(root)});}catch(e){results.push({name,reproduced:false,error:e.stack});}}
 await probe('S1-reclaim-check-unlink-race',async root=>{
  const dead=spawnSync(process.execPath,['-e','']);
  const lock=path.join(root,'.local/writer/memory.lock');fs.mkdirSync(path.dirname(lock),{recursive:true});
  fs.writeFileSync(lock,JSON.stringify({pid:dead.pid,nonce:'dead'}));
  const child=spawn(process.execPath,[__filename,'reclaimer'],{env:process.env,stdio:['ignore','pipe','pipe']});
  let err='';child.stderr.on('data',x=>err+=x);const done=new Promise(r=>child.on('close',code=>r({code,err})));
  let release;
  try{
   const end=Date.now()+7000;while(!fs.existsSync(path.join(root,'ready'))){if(Date.now()>end)throw Error('ready timeout');await sleep(10);}
   release=writer.acquireLock();assert.equal(JSON.parse(fs.readFileSync(lock,'utf8')).pid,process.pid);
   fs.writeFileSync(path.join(root,'resume'),'1');const result=await done;
   assert.equal(result.code,0,result.err);assert(fs.existsSync(path.join(root,'child-acquired')));assert(!fs.existsSync(lock));
   return {twoAcquiredWhileParentNotReleased:true,parentLiveLockDeleted:true};
  }finally{fs.writeFileSync(path.join(root,'resume'),'1');if(release)release();child.kill();}
 });
 await probe('S2-source-newline-overrides-scope',root=>{
  const result=writer.writeProposal('evt_injected',p('PRIVATE_B_VALUE','B','facts',{source:'source text\nscope: user'}));
  const hits=search.localResults('PRIVATE_B_VALUE','A');assert.equal(result.status,'persisted');assert(hits.some(x=>x.snippet.includes('PRIVATE_B_VALUE')));
  return {result,hits};
 });
 await probe('S3-crlf-input-retry-duplicates',root=>{
  const proposal=p('FIRST_LINE\r\nSECOND_LINE');
  writer.writeProposal('evt_multiline',proposal);const result=writer.writeProposal('evt_multiline',proposal);
  const copies=(fs.readFileSync(memoryFile(root),'utf8').match(/## FIRST_LINE/g)||[]).length;assert.equal(copies,2);
  return {copies,result};
 });
 const output={revision:'980d331',node:process.version,results};
 fs.writeFileSync(path.join(__dirname,'writer-review-round2-results.json'),JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
 if(results.some(x=>!x.reproduced))process.exitCode=1;
}
