'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const repo=process.cwd();
const {fixture}=require(path.join(repo,'scripts/memory/tests/helpers'));
const {DurableQueue}=require(path.join(repo,'scripts/memory/queue'));
const results=[];
function git(root,args){const r=cp.spawnSync('git',['-C',root,...args],{encoding:'utf8',windowsHide:true});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();}
function init(root){git(root,['init','-q']);git(root,['config','user.email','synthetic@example.invalid']);git(root,['config','user.name','Synthetic']);const empty=path.join(root,'empty-hooks');fs.mkdirSync(empty);git(root,['config','core.hooksPath',empty]);}
function test(id,fn){const root=fixture('broad-'+id);try{results.push({id,root,...fn(root)});}catch(e){results.push({id,root,harness_error:e.stack});}console.log(JSON.stringify(results.at(-1)));}
test('G17',root=>{
 init(root);fs.writeFileSync(path.join(root,'file.txt'),'base');git(root,['add','file.txt']);git(root,['commit','-qm','base']);git(root,['branch','-M','main']);
 const bare=fs.mkdtempSync(path.join(os.tmpdir(),'broad-bare-'));git(bare,['init','--bare','-q']);git(root,['remote','add','origin',bare]);git(root,['push','-qu','origin','main']);
 const before=git(bare,['rev-parse','refs/heads/main']);git(root,['checkout','-qb','local-work']);git(root,['branch','--set-upstream-to','origin/main']);
 fs.appendFileSync(path.join(root,'file.txt'),'new');git(root,['add','file.txt']);git(root,['commit','-qm','new']);
 const pushed=cp.spawnSync(process.execPath,[path.join(repo,'scripts/memory/sync.js'),'--push'],{cwd:root,env:{...process.env,SYSTEM2_ROOT:root},encoding:'utf8',windowsHide:true});
 const after=git(bare,['rev-parse','refs/heads/main']);
 const other=cp.spawnSync('git',['-C',bare,'rev-parse','refs/heads/local-work'],{encoding:'utf8'});
 return{bare,before,after,exit:pushed.status,stdout:pushed.stdout,stderr:pushed.stderr,createdOtherBranch:other.status===0,reproduced:pushed.status===0&&before===after&&other.status===0};
});
test('G18',root=>{
 const result=cp.spawnSync(process.execPath,[path.join(repo,'scripts/memory/indexer.js'),'--reconcile'],{env:{...process.env,SYSTEM2_ROOT:root},encoding:'utf8',windowsHide:true});
 return{exit:result.status,stderr:result.stderr,reproduced:result.status===1&&result.stderr.includes('use --file')};
});
test('G19',root=>{
 const scriptDir=path.join(root,'scripts/memory');fs.mkdirSync(scriptDir,{recursive:true});
 for(const entry of fs.readdirSync(path.join(repo,'scripts/memory'),{withFileTypes:true})){
  if(entry.isFile()&&/\.(js|cjs)$/.test(entry.name))fs.copyFileSync(path.join(repo,'scripts/memory',entry.name),path.join(scriptDir,entry.name));
 }
 const project=fs.mkdtempSync(path.join(os.tmpdir(),'broad-initial-commit-'));init(project);
 const hooks=path.join(project,'test-hooks');fs.mkdirSync(hooks);
 fs.writeFileSync(path.join(hooks,'post-commit'),fs.readFileSync(path.join(repo,'.git-hooks-templates/post-commit'),'utf8').replace(/\r\n/g,'\n'));
 git(project,['config','core.hooksPath',hooks]);
 fs.writeFileSync(path.join(project,'initial.txt'),'INITIAL_DIFF_MARKER');git(project,['add','initial.txt']);
 const result=cp.spawnSync('git',['-C',project,'commit','-qm','initial commit'],{env:{...process.env,SYSTEM2_ROOT:root,SYSTEM2_PROJECT_ID:'A'},encoding:'utf8',windowsHide:true,timeout:15000});
 // Hook enqueue is synchronous; background worker only uses an unconfigured endpoint.
 const records=new DurableQueue().list();
 return{project,exit:result.status,events:records.length,diff:records[0]?.event.diff,reproduced:result.status===0&&records.length===1&&records[0].event.diff===''};
});
fs.writeFileSync(path.join(__dirname,'comprehensive-transfer-2026-09-12-results.json'),JSON.stringify({date:'2026-09-12',results},null,2)+'\n');
process.exitCode=results.some(x=>x.harness_error)?2:results.every(x=>x.reproduced)?0:1;
