'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const repo=process.cwd();
const {fixture,proposal}=require(path.join(repo,'scripts/memory/tests/helpers'));
const {resolvePaths}=require(path.join(repo,'scripts/memory/resolve-paths'));
const indexer=require(path.join(repo,'scripts/memory/indexer'));
const writer=require(path.join(repo,'scripts/memory/writer'));
const {initProject}=require(path.join(repo,'scripts/memory/init-project'));
const {projectId}=require(path.join(repo,'scripts/memory/project-id'));
const results=[];
const originalFetch=global.fetch;
const pause=()=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10);
function wait(fn){const deadline=Date.now()+15000;while(!fn()){if(Date.now()>deadline)throw new Error('timeout');pause();}}
function write(root,rel,text){const file=path.join(root,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);return file;}
async function test(id,fn){const root=fixture('broad-'+id);try{results.push({id,root,...await fn(root)});}catch(e){results.push({id,root,harness_error:e.stack});}finally{global.fetch=originalFetch;}console.log(JSON.stringify(results.at(-1)));}
(async()=>{
 await test('G13',async root=>{
  const memory=resolvePaths().memory_root;
  const file=write(memory,'facts/current.md','safe');indexer.queueIndex('redirect',[file]);
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'broad-index-outside-'));
  write(outside,'current.md','OUTSIDE_DATA');
  fs.renameSync(path.join(memory,'facts'),path.join(memory,'facts-original'));
  fs.symlinkSync(outside,path.join(memory,'facts'),'junction');
  let calls=0;global.fetch=async()=>{calls++;return{ok:true};};
  const result=await indexer.run({config:{indexer:{reindex_url:'http://synthetic.invalid',timeout_ms:1000}}});
  return{outside,calls,result,reproduced:calls===1&&result[0].status==='indexed'};
 });
 await test('G14',async root=>{
  const project=fs.mkdtempSync(path.join(os.tmpdir(),'broad-new-project-'));
  const registered=initProject({root:project,systemRoot:root,projectId:'new-project',register:true,title:'Synthetic',kind:'dev'});
  let error;try{projectId(project);}catch(e){error=e.message;}
  return{registered,error,reproduced:registered.registry==='registered-in-local-config'&&Boolean(error)};
 });
 await test('G15',async root=>{
  const other=fixture('broad-G15-other');
  const memory=fs.mkdtempSync(path.join(os.tmpdir(),'broad-shared-memory-'));
  for(const r of [root,other]){const cfg=path.join(r,'config/system.example.json');const data=JSON.parse(fs.readFileSync(cfg));data.memory_root=memory;fs.writeFileSync(cfg,JSON.stringify(data));}
  const ready=path.join(root,'ready'),resume=path.join(root,'resume'),done=path.join(root,'done');
  const target=path.join(memory,'facts/writer-entries.md');
  const code=`const fs=require('node:fs');const rename=fs.renameSync;fs.renameSync=function(a,b){if(String(b)===${JSON.stringify(target)}){fs.writeFileSync(${JSON.stringify(ready)},'1');const end=Date.now()+15000;while(!fs.existsSync(${JSON.stringify(resume)})){if(Date.now()>end)throw Error('timeout');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10);}}return rename.call(fs,a,b);};const w=require(${JSON.stringify(path.join(repo,'scripts/memory/writer.js'))});const result=w.writeProposal('shared-A',${JSON.stringify(proposal('RECORD_A'))});fs.writeFileSync(${JSON.stringify(done)},JSON.stringify(result));`;
  const child=cp.spawn(process.execPath,['-e',code],{env:{...process.env,SYSTEM2_ROOT:root},stdio:'ignore',windowsHide:true});
  try{
   wait(()=>fs.existsSync(ready));process.env.SYSTEM2_ROOT=other;
   const b=writer.writeProposal('shared-B',proposal('RECORD_B'));
   fs.writeFileSync(resume,'1');wait(()=>fs.existsSync(done));
   const a=JSON.parse(fs.readFileSync(done));const content=fs.readFileSync(target,'utf8');
   return{other,memory,a:a.status,b:b.status,containsA:content.includes('RECORD_A'),containsB:content.includes('RECORD_B'),reproduced:a.status==='persisted'&&b.status==='persisted'&&!content.includes('RECORD_B')};
  }finally{fs.writeFileSync(resume,'1');child.kill();}
 });
 await test('G16',async root=>{
  const {extractDesignTokens}=require(path.join(repo,'.claude/mcp-servers/figma/lib/extract'));
  const output=extractDesignTokens({styles:{outside:{styleType:'TEXT',name:'OUTSIDE_STYLE',fontFamily:'OutsideFont'}},document:{id:'0',children:[{id:'selected',name:'selected'}]}},{nodeId:'selected'});
  return{output,reproduced:output.typography.some(x=>x.name==='OUTSIDE_STYLE'),classification:'nodeId does not limit file-wide styles; contract decision needed'};
 });
 fs.writeFileSync(path.join(__dirname,'comprehensive-extra-2026-09-12-results.json'),JSON.stringify({date:'2026-09-12',results},null,2)+'\n');
 process.exitCode=results.some(x=>x.harness_error)?2:results.every(x=>x.reproduced)?0:1;
})().catch(e=>{console.error(e);process.exitCode=2;});
