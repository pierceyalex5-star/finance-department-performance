const CFG={
  framework:'data/framework.json',processes:'data/processes.json',registers:'data/registers.json',tasks:'data/tasks.json',milestones:'data/milestones.json',flowManifest:'data/flows/manifest.json'
};
const LS='ifast-d365-control-tower-v3',GHLS='ifast-d365-github-v3';
let state={framework:{},processes:{subprocesses:{}},registers:{painPoints:[],opportunities:[],requirements:[],decisions:[],fitGap:[]},tasks:{tasks:[]},milestones:{milestones:[]}},flowManifest={},flowChunks={},flows=[];
let view='cockpit',selectedStream='O2C',streamTab='overview',selectedFlowId=null,selectedNodeId=null,asIsMode='text',dirtyFiles=new Set(),syncTimer=null,pullTimer=null;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const uid=p=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
const today=()=>new Date().toISOString().slice(0,10);
const filePath=k=>`d365-control-tower/${CFG[k]}`;
function mergeState(){return {...state.framework,...state.processes,...state.registers,...state.tasks,...state.milestones}}
function data(){return mergeState()}
function allStreams(){const d=data();return [...(d.valueStreams||[]),...(d.crossFunctional||[])]}
function flowFor(id){return flows.find(f=>f.id===id)}
function streamFlows(s){return flows.filter(f=>f.stream===s)}
function flowFile(f){return f?._file||''}
function setSync(t){const e=$('#dataMode');if(e)e.textContent=`GitHub-synced · ${t}`}
function kpi(label,value,sub=''){return `<div class="card kpi-card"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div><div class="sub">${esc(sub)}</div></div>`}
function badge(s){const x=String(s||'').toLowerCase(),c=x.includes('high')||x.includes('overdue')?'red':x.includes('progress')||x.includes('review')?'yellow':x.includes('approved')||x.includes('closed')||x.includes('imported')||x.includes('validated')?'green':'gray';return `<span class="badge ${c}">${esc(s||'—')}</span>`}
function saveLocal(){const serialChunks={};for(const [p,fs] of Object.entries(flowChunks))serialChunks[p]=fs.map(({_file,...f})=>f);localStorage.setItem(LS,JSON.stringify({state,flowChunks:serialChunks}))}
function mark(key){dirtyFiles.add(key);saveLocal();setSync(`${dirtyFiles.size} change set${dirtyFiles.size===1?'':'s'} pending`);schedulePush()}
function markFlow(f){if(f?._file){dirtyFiles.add(f._file);saveLocal();setSync(`${dirtyFiles.size} change set${dirtyFiles.size===1?'':'s'} pending`);schedulePush()}}
function rebuildFlows(){flows=[];for(const [p,fs] of Object.entries(flowChunks)){for(const f of fs){f._file=p;flows.push(f)}}if(!selectedFlowId||!flowFor(selectedFlowId))selectedFlowId=streamFlows(selectedStream)[0]?.id||flows[0]?.id||null}
async function jfetch(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error(`Load failed: ${path}`);return r.json()}
async function loadBaseline(){
  const [framework,processes,registers,tasks,milestones,manifest]=await Promise.all([jfetch(CFG.framework),jfetch(CFG.processes),jfetch(CFG.registers),jfetch(CFG.tasks),jfetch(CFG.milestones),jfetch(CFG.flowManifest)]);
  const chunks={};const paths=[...new Set(Object.values(manifest).flat())];await Promise.all(paths.map(async p=>{chunks[p]=await jfetch(p)}));
  return {state:{framework,processes,registers,tasks,milestones},flowManifest:manifest,flowChunks:chunks};
}
async function init(){
  const b=await loadBaseline();state=b.state;flowManifest=b.flowManifest;flowChunks=b.flowChunks;
  try{const l=JSON.parse(localStorage.getItem(LS)||'null');if(l?.state&&l?.flowChunks){state=l.state;flowChunks=l.flowChunks}}catch{}
  rebuildFlows();bindShell();render();setupPolling();setSync('ready · no backend');
}
function bindShell(){
  $('#mainNav').onclick=e=>{const b=e.target.closest('[data-view]');if(!b)return;view=b.dataset.view;$$('#mainNav button').forEach(x=>x.classList.toggle('active',x===b));render()};
  $('#exportBtn').onclick=exportAll;$('#importFile').onchange=importAll;
  $('#refreshBtn').onclick=async()=>{if(!confirm('Replace local edits with the latest deployed baseline?'))return;const b=await loadBaseline();state=b.state;flowManifest=b.flowManifest;flowChunks=b.flowChunks;dirtyFiles.clear();rebuildFlows();saveLocal();render();setSync('baseline refreshed')};
  $('#snapshotBtn').onclick=()=>{view='sync';$$('#mainNav button').forEach(x=>x.classList.remove('active'));render()};
}
function exportAll(){const out={state,flowManifest,flowChunks:Object.fromEntries(Object.entries(flowChunks).map(([p,fs])=>[p,fs.map(({_file,...f})=>f)]))};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'}));a.download='IFAST-D365-Control-Tower.json';a.click();URL.revokeObjectURL(a.href)}
function importAll(e){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.state||!x.flowChunks)throw Error('Unsupported D365 package');state=x.state;flowChunks=x.flowChunks;flowManifest=x.flowManifest||flowManifest;rebuildFlows();for(const k of ['framework','processes','registers','tasks','milestones'])dirtyFiles.add(k);for(const p of Object.keys(flowChunks))dirtyFiles.add(p);saveLocal();render();setSync('imported · pending sync')}catch(err){alert(err.message)}};r.readAsText(f)}
function openStream(id){selectedStream=id;view='streams';streamTab='overview';selectedFlowId=streamFlows(id)[0]?.id||null;selectedNodeId=null;$$('#mainNav button').forEach(b=>b.classList.toggle('active',b.dataset.view==='streams'));render()}
function render(){const app=$('#app');const fn={cockpit:renderCockpit,streams:renderStreams,people:renderPeople,execution:renderExecution,governance:renderGovernance,roadmap:renderRoadmap,sync:renderSync}[view]||renderCockpit;app.innerHTML=fn();bindPage()}
