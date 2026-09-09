const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawn,spawnSync}=require('node:child_process');
const repo=path.resolve(__dirname,'../../..');
const {fixture,mod}=require(path.join(repo,'scripts/memory/tests/helpers'));
const writer=mod('writer');
function syncWait(file){const end=Date.now()+10000;while(!fs.existsSync(file)){if(Date.now()>end)throw Error('timeout '+file);Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10);}}
async function wait(file){const end=Date.now()+10000;while(!fs.existsSync(file)){if(Date.now()>end)throw Error('timeout '+file);await new Promise(r=>setTimeout(r,10));}}
const root=process.env.SYSTEM2_ROOT;
if(process.argv[2]==='reclaimer'){
 const orig=fs.renameSync;let once=false;
 fs.renameSync=function(a,b){
  if(!once&&String(a).endsWith('memory.lock')){
   once=true;fs.writeFileSync(path.join(root,'before-move'),'1');syncWait(path.join(root,'move-now'));
   const result=orig(a,b);fs.writeFileSync(path.join(root,'after-move'),'1');syncWait(path.join(root,'continue-reclaim'));return result;
  }return orig(a,b);
 };
 try{const release=writer.acquireLock();release();}catch(e){console.log(e.message);}
}else if(process.argv[2]==='third'){
 const release=writer.acquireLock();fs.writeFileSync(path.join(root,'third-acquired'),'1');syncWait(path.join(root,'release-third'));release();
}else main().catch(e=>{console.error(e);process.exitCode=1;});
async function main(){
 const root=fixture('round3-quarantine');const lock=path.join(root,'.local/writer/memory.lock');
 const gone=spawnSync(process.execPath,['-e','']);fs.mkdirSync(path.dirname(lock),{recursive:true});fs.writeFileSync(lock,JSON.stringify({pid:gone.pid,nonce:'dead'}));
 const children=[];
 function child(mode){const c=spawn(process.execPath,[__filename,mode],{env:process.env,stdio:'ignore'});children.push(c);return c;}
 let release;
 try{
  const c=child('reclaimer');await wait(path.join(root,'before-move'));
  release=writer.acquireLock();assert.equal(JSON.parse(fs.readFileSync(lock,'utf8')).pid,process.pid);
  fs.writeFileSync(path.join(root,'move-now'),'1');await wait(path.join(root,'after-move'));assert(!fs.existsSync(lock));
  const third=child('third');await wait(path.join(root,'third-acquired'));
  assert.equal(JSON.parse(fs.readFileSync(lock,'utf8')).pid,third.pid);process.kill(third.pid,0);
  const result={revision:'ffe215a',root,reproduced:true,parentHasNotReleased:true,thirdSuccessfullyAcquired:true,reclaimerPid:c.pid,thirdPid:third.pid};
  fs.writeFileSync(path.join(__dirname,'writer-review-round3-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 }finally{
  for(const f of ['move-now','continue-reclaim','release-third'])fs.writeFileSync(path.join(root,f),'1');
  for(const c of children)c.kill();if(release)release();
 }
}
