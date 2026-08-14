const http=require('http');
const fs=require('fs');
const path=require('path');
const url=require('url');

const ROOT=__dirname;
const DATA_DIR=path.join(ROOT,'data');
const RUNTIME=path.join(DATA_DIR,'runtime-state.json');
const BACKUP_DIR=path.join(DATA_DIR,'backups');
const PORT=Number(process.env.PORT||8090);
const CFG={framework:'data/framework.json',processes:'data/processes.json',registers:'data/registers.json',tasks:'data/tasks.json',milestones:'data/milestones.json',flowManifest:'data/flows/manifest.json'};
let clients=new Set();

function readJson(rel){return JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'))}
function buildBaseline(){
  const state={};
  for(const k of ['framework','processes','registers','tasks','milestones'])state[k]=readJson(CFG[k]);
  const flowManifest=readJson(CFG.flowManifest);
  const paths=[...new Set(Object.values(flowManifest).flat())];
  const flowChunks={};
  for(const p of paths)flowChunks[p]=readJson(p);
  const fileVersions={framework:1,processes:1,registers:1,tasks:1,milestones:1};
  for(const p of paths)fileVersions[p]=1;
  return {version:1,updatedAt:new Date().toISOString(),fileVersions,state,flowManifest,flowChunks,audit:[]};
}
function loadRuntime(){
  if(!fs.existsSync(BACKUP_DIR))fs.mkdirSync(BACKUP_DIR,{recursive:true});
  if(!fs.existsSync(RUNTIME)){const b=buildBaseline();fs.writeFileSync(RUNTIME,JSON.stringify(b,null,2));return b}
  try{return JSON.parse(fs.readFileSync(RUNTIME,'utf8'))}catch(e){const b=buildBaseline();fs.writeFileSync(RUNTIME,JSON.stringify(b,null,2));return b}
}
let runtime=loadRuntime();
function persist(){
  runtime.version=Number(runtime.version||0)+1;
  runtime.updatedAt=new Date().toISOString();
  const tmp=RUNTIME+'.tmp';fs.writeFileSync(tmp,JSON.stringify(runtime,null,2));fs.renameSync(tmp,RUNTIME);
  const day=runtime.updatedAt.slice(0,10),backup=path.join(BACKUP_DIR,`state-${day}.json`);if(!fs.existsSync(backup))fs.writeFileSync(backup,JSON.stringify(runtime,null,2));
}
function broadcast(){const msg=`data: ${JSON.stringify({version:runtime.version,updatedAt:runtime.updatedAt})}\n\n`;for(const r of clients){try{r.write(msg)}catch(e){clients.delete(r)}}}
function body(req,limit=8e6){return new Promise((resolve,reject)=>{let b='';req.on('data',c=>{b+=c;if(b.length>limit){reject(Error('Body too large'));req.destroy()}});req.on('end',()=>resolve(b));req.on('error',reject)})}
function publicState(){return {version:runtime.version,updatedAt:runtime.updatedAt,fileVersions:runtime.fileVersions||{},state:runtime.state,flowManifest:runtime.flowManifest,flowChunks:runtime.flowChunks,audit:(runtime.audit||[]).slice(0,100)}}
function applyUpdate(u){
  const key=u.key;if(!key)throw Error('Missing update key');
  runtime.fileVersions=runtime.fileVersions||{};
  const current=Number(runtime.fileVersions[key]||0),base=Number(u.baseFileVersion||0);
  if(!u.force&&base!==current){const e=Error(`Conflict on ${key}: server version ${current}, editor version ${base}`);e.code='CONFLICT';throw e}
  if(['framework','processes','registers','tasks','milestones'].includes(key))runtime.state[key]=u.value;
  else if(runtime.flowChunks&&Object.prototype.hasOwnProperty.call(runtime.flowChunks,key))runtime.flowChunks[key]=u.value;
  else if(String(key).startsWith('data/flows/'))runtime.flowChunks[key]=u.value;
  else throw Error(`Unknown shared file: ${key}`);
  runtime.fileVersions[key]=current+1;
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webmanifest':'application/manifest+json'};

const server=http.createServer(async(req,res)=>{
  const p=url.parse(req.url).pathname;
  if(p==='/api/state'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify(publicState()))}
  if(p==='/api/update'&&req.method==='POST'){
    try{
      const x=JSON.parse(await body(req));const updates=x.updates||[];if(!updates.length)throw Error('No updates');
      const before=JSON.parse(JSON.stringify(runtime));
      try{for(const u of updates)applyUpdate(u)}catch(e){runtime=before;throw e}
      runtime.audit=runtime.audit||[];runtime.audit.unshift({at:new Date().toISOString(),user:x.user||'Browser editor',files:updates.map(u=>u.key),summary:x.summary||'Shared dashboard update'});if(runtime.audit.length>500)runtime.audit.length=500;
      persist();broadcast();res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({ok:true,version:runtime.version,updatedAt:runtime.updatedAt,fileVersions:runtime.fileVersions}))
    }catch(e){res.writeHead(e.code==='CONFLICT'?409:400,{'Content-Type':'application/json'});return res.end(JSON.stringify({ok:false,error:e.message,fileVersions:runtime.fileVersions,version:runtime.version}))}
  }
  if(p==='/api/events'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write(`data: ${JSON.stringify({version:runtime.version,updatedAt:runtime.updatedAt})}\n\n`);clients.add(res);req.on('close',()=>clients.delete(res));return}
  if(p==='/api/reset-baseline'&&req.method==='POST'){
    try{runtime=buildBaseline();runtime.audit.unshift({at:new Date().toISOString(),user:'System',files:['all'],summary:'Reset runtime to GitHub baseline'});persist();broadcast();res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({ok:true,version:runtime.version}))}catch(e){res.writeHead(500,{'Content-Type':'application/json'});return res.end(JSON.stringify({ok:false,error:e.message}))}
  }
  let rel=p==='/'?'index.html':decodeURIComponent(p).replace(/^\/+/,''),file=path.normalize(path.join(ROOT,rel));if(!file.startsWith(ROOT)){res.writeHead(403);return res.end('Forbidden')}
  fs.stat(file,(err,st)=>{if(err||!st.isFile()){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res)})
});
server.listen(PORT,'0.0.0.0',()=>console.log(`IFAST D365 Control Tower running at http://localhost:${PORT}`));
