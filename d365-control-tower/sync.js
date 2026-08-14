let sharedVersion=0,sharedFileVersions={},eventStream=null,pullInterval=null;
function ghCfg(){return {autoSyncSeconds:45,autoSync:true}}
function saveGhCfg(){setupPolling()}
function payloadFor(k){if(['framework','processes','registers','tasks','milestones'].includes(k))return {key:k,value:state[k]};if(flowChunks[k])return {key:k,value:flowChunks[k].map(({_file,...f})=>f)};return null}
async function serverJson(path,opts){const r=await fetch(path,{cache:'no-store',...(opts||{})});const j=await r.json().catch(()=>({}));if(!r.ok){const e=Error(j.error||`Shared server request failed (${r.status})`);e.status=r.status;e.payload=j;throw e}return j}
async function pullGithub(force=false){
  if(dirtyFiles.size&&!force&&!confirm('Local edits are pending. Replace them with the latest shared state?'))return;
  setSync('pulling shared state…');
  try{
    const x=await serverJson('/api/state');state=x.state;flowManifest=x.flowManifest;flowChunks=x.flowChunks||{};sharedVersion=Number(x.version||0);sharedFileVersions=x.fileVersions||{};dirtyFiles.clear();rebuildFlows();saveLocal();render();setSync('synced');
  }catch(e){setSync('shared server unavailable');if(!force)alert(e.message);throw e}
}
async function pushGithub(silent=false){
  if(!dirtyFiles.size)return;
  const updates=[];
  for(const k of [...dirtyFiles]){const p=payloadFor(k);if(!p)continue;updates.push({...p,baseFileVersion:Number(sharedFileVersions[k]||0)})}
  if(!updates.length)return;
  setSync('saving shared changes…');
  try{
    const x=await serverJson('/api/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({updates,user:'Dashboard editor',summary:`D365 Control Tower update: ${updates.map(u=>u.key).join(', ')}`})});
    sharedVersion=Number(x.version||sharedVersion);sharedFileVersions=x.fileVersions||sharedFileVersions;for(const u of updates)dirtyFiles.delete(u.key);saveLocal();
    await pullGithub(true);
  }catch(e){
    if(e.status===409){setSync('edit conflict · pull required');if(!silent)alert(`${e.message}\n\nAnother editor changed the same shared file. Pull the latest shared state, then re-apply your change.`)}else{setSync('save error');if(!silent)alert(e.message)}
  }
}
function schedulePush(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>pushGithub(true),1200)}
function setupPolling(){
  if(eventStream){try{eventStream.close()}catch{}eventStream=null}clearInterval(pullInterval);
  try{
    eventStream=new EventSource('/api/events');
    eventStream.onopen=()=>setSync(dirtyFiles.size?`${dirtyFiles.size} local change set${dirtyFiles.size===1?'':'s'} pending`:'connected');
    eventStream.onmessage=e=>{try{const m=JSON.parse(e.data);if(Number(m.version||0)<=sharedVersion)return;if(dirtyFiles.size){setSync('shared update waiting · local edits pending');return}pullGithub(true).catch(()=>{})}catch{}};
    eventStream.onerror=()=>setSync('reconnecting…');
  }catch{}
  pullInterval=setInterval(()=>{if(!dirtyFiles.size)pullGithub(true).catch(()=>{})},60000);
}
function renderSync(){return `<div class="page-head"><div><h1>Shared Internal Sync</h1><p>Same deployment pattern as the Finance Control Tower: one internal Node.js host, shared JSON state and live browser refresh. No Vercel, Neon, Teams integration or notifications.</p></div>${badge(dirtyFiles.size?`${dirtyFiles.size} pending`:'Connected')}</div><div class="grid two-col"><div class="card pad"><h3>Shared server</h3><p class="muted">All team members opening the same internal server address work from the same live project state. Changes are saved to the host and broadcast to connected browsers.</p><div class="mini-grid"><div><span>Shared version</span><strong>${sharedVersion||'—'}</strong></div><div><span>Pending local sets</span><strong>${dirtyFiles.size}</strong></div></div><div class="modal-actions"><button class="btn" id="pullGh">Pull latest</button><button class="btn primary" id="pushGh">Save now</button></div></div><div class="card pad"><h3>Operating model</h3><ol class="activity-list"><li>GitHub versions the application code and baseline process data.</li><li>The internal Node.js host stores the live runtime state in <code>data/runtime-state.json</code>.</li><li>Connected browsers receive changes automatically through Server-Sent Events.</li><li>Edits are conflict-checked by shared data file / process-flow chunk.</li><li>One local backup is written per day on the host; JSON export remains available from the dashboard.</li></ol><div class="notice"><b>Deployment:</b> run <code>start-d365.cmd</code> on the approved internal host. The launcher pulls the latest GitHub code before starting the shared server.</div></div></div>`}
