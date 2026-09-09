const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const repo = path.resolve(__dirname,'../../..');
const {fixture,proposal:p,memoryFile,mod} = require(path.join(repo,'scripts/memory/tests/helpers'));
const writer = mod('writer');
const search = mod('search');
const results=[];
async function probe(name,fn){fixture('review-'+name);try{results.push({name,reproduced:true,evidence:await fn()});}catch(e){results.push({name,reproduced:false,error:e.stack});}}
const wait = ms => new Promise(r=>setTimeout(r,ms));
async function until(fn){const end=Date.now()+7000;while(!fn()){if(Date.now()>end)throw Error('probe timeout');await wait(10);}}
async function spawnPaused(mode){
 const root=process.env.SYSTEM2_ROOT;
 const child=spawn(process.execPath,[__filename,mode],{env:process.env,stdio:['ignore','pipe','pipe']});
 let out='',err='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);
 const done=new Promise(resolve=>child.on('exit',code=>resolve({code,out,err})));
 await until(()=>fs.existsSync(path.join(root,'ready')));
 return {root,child,done,resume:()=>fs.writeFileSync(path.join(root,'resume'),'1')};
}
function childMode(mode){
 const root=process.env.SYSTEM2_ROOT;const original=fs.openSync;let intercepted=false;
 fs.openSync=function(file,flags,...args){
  if(!intercepted && flags==='wx' && String(file).endsWith('memory.lock')){
   intercepted=true;const fd=mode==='pause-after-open'?original(file,flags,...args):undefined;
   fs.writeFileSync(path.join(root,'ready'),'1');
   const end=Date.now()+7000;
   while(!fs.existsSync(path.join(root,'resume'))){if(Date.now()>end)throw Error('child timeout');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10);}
   return fd===undefined?original(file,flags,...args):fd;
  }return original(file,flags,...args);
 };
 if(mode==='pause-after-open'){
  const release=writer.acquireLock();
  fs.writeFileSync(path.join(root,'child-acquired'),'1');
  release();console.log('child acquired and released');
 }else console.log(JSON.stringify(writer.writeProposal('evt_race',p('CHILD_CONTENT'))));
}
async function main(){
 await probe('R1-same-text-different-scope',()=>{
  const r=writer.writeProposal('evt_same',[p('SAME_TEXT','A'),p('SAME_TEXT','B')]);
  const text=fs.readFileSync(memoryFile(process.env.SYSTEM2_ROOT),'utf8');
  assert(!text.includes('scope: B'));assert.equal(r.status,'persisted');
  return {status:r.status,scopeBMissing:true};
 });
 await probe('R2-khoj-success-leaks',async()=>{
  writer.writeProposal('evt_public',p('PUBLIC','user'));writer.writeProposal('evt_B',p('PRIVATE_B','B'));
  const original=global.fetch;let count=0;
  global.fetch=async()=>({ok:true,text:async()=>JSON.stringify(++count===1?{ok:true}:{results:[{source:'facts/writer-entries.md',snippet:'PRIVATE_B',score:1}]})});
  try{const r=await search.searchKhoj('PRIVATE_B','A',{force:true});assert.equal(r.ok,true);assert(r.results.some(x=>x.snippet.includes('PRIVATE_B')));return r;}finally{global.fetch=original;}
 });
 await probe('R3-crlf-fallback-leaks',()=>{
  writer.writeProposal('evt_A',p('PUBLIC','user'));writer.writeProposal('evt_B',p('PRIVATE_B','B'));
  const file=memoryFile(process.env.SYSTEM2_ROOT);fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(/\n/g,'\r\n'));
  const r=search.localResults('PRIVATE_B','A');assert(r.some(x=>x.snippet.includes('PRIVATE_B')));return r;
 });
 await probe('R4-crlf-repeat-duplicates',()=>{
  writer.writeProposal('evt_A',p('CRLF_MARKER'));
  const file=memoryFile(process.env.SYSTEM2_ROOT);fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(/\n/g,'\r\n'));
  const result=writer.writeProposal('evt_A',p('CRLF_MARKER'));
  const copies=(fs.readFileSync(file,'utf8').match(/## CRLF_MARKER/g)||[]).length;assert.equal(copies,2);return {result,copies};
 });
 await probe('R5-live-empty-lock-stolen',async()=>{
  const holder=await spawnPaused('pause-after-open');let release;
  try{
   release=writer.acquireLock();const file=path.join(holder.root,'.local/writer/memory.lock');
   assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).pid,process.pid);
   holder.resume();const done=await holder.done;
   assert.equal(done.code,0,done.err);assert(fs.existsSync(path.join(holder.root,'child-acquired')));
   assert(!fs.existsSync(file));return {twoLiveHolders:true,firstReleaseRemovedSecondLock:true,child:done};
  }finally{holder.resume();if(release)release();holder.child.kill();}
 });
 await probe('R6-conflict-check-before-lock',async()=>{
  const holder=await spawnPaused('pause-before-open');
  try{
   const parent=writer.writeProposal('evt_race',p('PARENT_CONTENT'));holder.resume();const child=await holder.done;
   assert.equal(child.code,0,child.err);const text=fs.readFileSync(memoryFile(holder.root),'utf8');
   assert(text.includes('PARENT_CONTENT')&&text.includes('CHILD_CONTENT'));
   return {parent,child,sameEventDifferentContentBothPersisted:true};
  }finally{holder.resume();holder.child.kill();}
 });
 const output={revision:'a8574f6',node:process.version,results};
 fs.writeFileSync(path.join(__dirname,'writer-review-probes-results.json'),JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
 if(results.some(x=>!x.reproduced))process.exitCode=1;
}
if(process.argv[2])childMode(process.argv[2]);else main().catch(e=>{console.error(e);process.exitCode=1;});
