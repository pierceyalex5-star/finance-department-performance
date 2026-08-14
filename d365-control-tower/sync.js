const GH_REPO='pierceyalex5-star/finance-department-performance';
const GH_BRANCH='main';
const GH_PREFIX='d365-control-tower/';
const TOKEN_KEY='d365_gh_token';
const PULL_MS=10000;
const DEBOUNCE_MS=1500;
let syncBase={},lastDeployedStamp='',lastPushedStamp='',pollHandle=null;

function syncKeyPath(k){
  if(['framework','processes','registers','tasks','milestones'].includes(k))return GH_PREFIX+CFG[k];
  if(flowChunks[k])return GH_PREFIX+k;
  return null;
}
function payloadFor(k){
  if(['framework','processes','registers','tasks','milestones'].includes(k))return state[k];
  if(flowChunks[k])return flowChunks[k].map(({_file,...f})=>f);
  return null;
}
function stable(v){return JSON.stringify(v)}
function captureSyncBase(){
  syncBase={};
  for(const k of ['framework','processes','registers','tasks','milestones'])syncBase[k]=clone(state[k]);
  for(const [p,fs] of Object.entries(flowChunks))syncBase[p]=fs.map(({_file,...f})=>clone(f));
}
function getToken(promptIfMissing=false){
  let t=localStorage.getItem(TOKEN_KEY)||'';
  if(!t&&promptIfMissing){
    t=(prompt('Shared editing uses the same GitHub model as the Finance Control Tower.\n\nPaste your fine-grained GitHub token for this repository (Contents: Read and write):')||'').trim();
    if(t)localStorage.setItem(TOKEN_KEY,t);
  }
  return t;
}
function clearToken(){localStorage.removeItem(TOKEN_KEY);setSync('editor token cleared');render()}
function ghHeaders(token){const h={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};if(token)h.Authorization=`Bearer ${token}`;return h}
function b64d(s){const bin=atob(String(s||'').replace(/\n/g,'')),u=Uint8Array.from(bin,c=>c.charCodeAt(0));return new TextDecoder().decode(u)}
function b64e(s){const u=new TextEncoder().encode(s);let b='';for(const x of u)b+=String.fromCharCode(x);return btoa(b)}
async function ghRead(path,token=''){
  const api=`https://api.github.com/repos/${GH_REPO}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(GH_BRANCH)}&_=${Date.now()}`;
  const r=await fetch(api,{headers:ghHeaders(token),cache:'no-store'});
  if(!r.ok)throw Error(`GitHub read failed (${r.status}) for ${path}`);
  const j=await r.json();return {sha:j.sha,value:JSON.parse(b64d(j.content))};
}
async function ghPut(path,value,sha,token,message){
  const api=`https://api.github.com/repos/${GH_REPO}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
  const body={message,content:b64e(JSON.stringify(value,null,2)),branch:GH_BRANCH};if(sha)body.sha=sha;
  const r=await fetch(api,{method:'PUT',headers:{...ghHeaders(token),'Content-Type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok){const e=Error(j.message||`GitHub write failed (${r.status})`);e.status=r.status;throw e}
  return j;
}
async function writeSyncStamp(token,changedFiles){
  const path=GH_PREFIX+'data/sync.json';let sha='';
  try{sha=(await ghRead(path,token)).sha}catch(e){if(!String(e.message).includes('(404)'))throw e}
  const stamp={updatedAt:new Date().toISOString(),changedFiles,lastEditor:'Browser editor'};
  await ghPut(path,stamp,sha,token,`D365 shared sync · ${stamp.updatedAt}`);lastPushedStamp=stamp.updatedAt;lastDeployedStamp=stamp.updatedAt;
}
async function pushGithub(silent=false){
  if(!dirtyFiles.size)return;
  const token=getToken(!silent);if(!token){setSync('local changes · editor token required');return}
  const keys=[...dirtyFiles].filter(k=>syncKeyPath(k));if(!keys.length)return;
  setSync('saving to GitHub…');
  try{
    for(const k of keys){
      const path=syncKeyPath(k),localValue=payloadFor(k),remote=await ghRead(path,token),base=syncBase[k];
      if(base!==undefined&&stable(remote.value)!==stable(base)){
        const e=Error(`Conflict on ${k}. Another editor changed this area after your page was loaded.`);e.status=409;throw e;
      }
      await ghPut(path,localValue,remote.sha,token,`D365 Control Tower · ${k} · ${new Date().toISOString()}`);
      syncBase[k]=clone(localValue);dirtyFiles.delete(k);
    }
    await writeSyncStamp(token,keys);saveLocal();setSync('saved for the team ✓');
  }catch(e){
    if(e.status===409){setSync('conflict · refresh required');if(!silent)alert(`${e.message}\n\nUse Refresh deployed to load the latest version, then re-apply your change.`)}
    else{setSync('GitHub save error');if(!silent)alert(e.message)}
  }
}
function schedulePush(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>pushGithub(false),DEBOUNCE_MS)}
async function loadDeployedStamp(){
  try{const r=await fetch(`data/sync.json?_=${Date.now()}`,{cache:'no-store'});if(!r.ok)return null;return r.json()}catch{return null}
}
async function pullGithub(force=false){
  if(dirtyFiles.size&&!force&&!confirm('Local edits are pending. Replace them with the latest deployed version?'))return;
  setSync('refreshing deployed data…');
  try{
    const b=await loadStaticBaseline();state=b.state;flowManifest=b.flowManifest;flowChunks=b.flowChunks;dirtyFiles.clear();rebuildFlows();captureSyncBase();saveLocal();render();const s=await loadDeployedStamp();if(s?.updatedAt)lastDeployedStamp=s.updatedAt;setSync('synced');
  }catch(e){setSync('refresh error');if(!force)alert(e.message)}
}
async function pollDeployed(){
  if(dirtyFiles.size)return;
  const s=await loadDeployedStamp();if(!s?.updatedAt)return;
  if(!lastDeployedStamp){lastDeployedStamp=s.updatedAt;return}
  if(s.updatedAt>lastDeployedStamp&&s.updatedAt!==lastPushedStamp){lastDeployedStamp=s.updatedAt;await pullGithub(true)}
  else if(s.updatedAt>lastDeployedStamp)lastDeployedStamp=s.updatedAt;
}
function setupPolling(){
  clearInterval(pollHandle);captureSyncBase();setTimeout(pollDeployed,2500);pollHandle=setInterval(pollDeployed,PULL_MS)
}
function renderSync(){const hasToken=!!getToken(false);return `<div class="page-head"><div><h1>GitHub Shared Sync</h1><p>Same deployment model as the Finance Control Tower: GitHub Pages hosts the dashboard and GitHub JSON files are the shared source of truth. There is no Vercel, Neon, Teams integration, notification service or application backend.</p></div>${badge(dirtyFiles.size?`${dirtyFiles.size} pending`:'Synced')}</div><div class="grid two-col"><div class="card pad"><h3>Team sync</h3><div class="mini-grid"><div><span>Editor access</span><strong>${hasToken?'Enabled':'Viewer'}</strong></div><div><span>Auto-refresh</span><strong>${PULL_MS/1000}s</strong></div></div><p class="muted">Everyone can view the public project data. Editing uses a fine-grained GitHub token stored only in that editor's browser, exactly like the Finance Control Tower.</p><div class="modal-actions"><button class="btn" id="pullGh">Refresh deployed</button><button class="btn primary" id="pushGh">Save now</button>${hasToken?'<button class="btn" onclick="clearToken()">Clear editor token</button>':''}</div></div><div class="card pad"><h3>How updates flow</h3><ol class="activity-list"><li>An editor changes a process, task, person, requirement or flowchart.</li><li>The affected JSON file is committed automatically to GitHub after a short debounce.</li><li>A lightweight sync timestamp triggers the existing GitHub Pages deployment.</li><li>Other browsers poll the deployed timestamp and reload the updated project automatically.</li><li>Git history provides the version trail; stale same-area edits are blocked instead of silently overwriting another editor.</li></ol><div class="notice"><b>Editing rule:</b> different areas can be edited in parallel. For the same detailed flowchart, use one designated editor during a workshop to minimize conflicts.</div></div></div>`}
