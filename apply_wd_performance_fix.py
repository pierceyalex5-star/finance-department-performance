from pathlib import Path
import json,re

# ---------- shared state: WD0 is invalid ----------
p=Path('state.json')
state=json.loads(p.read_text(encoding='utf-8'))
state.setdefault('settings',{})['closeTargetWD']=max(1,int(state['settings'].get('closeTargetWD',2) or 2))
state['version']=int(state.get('version',0))+1
p.write_text(json.dumps(state,ensure_ascii=False,indent=2),encoding='utf-8')

# ---------- front end ----------
p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Remove the very large stale embedded state. Live state is loaded from the shared API;
# localStorage remains the offline fallback.
pat=r'const INITIAL_STATE = .*?;\nconst STAGES='
replacement='''const INITIAL_STATE = {version:0,updatedAt:null,settings:{warnMinutes:60,repeatMinutes:60,holidays:[],closeTargetWD:2,closeTargetTime:"18:00",holidayRegion:"QC",easterHoliday:"good_friday",materialityAmount:10000,intercompanyAlwaysMaterial:true},users:[],taskTemplates:[],periodStates:{},closeActual:{},headOfficeTemplate:[],headOfficeHistory:{},deliverableStates:{},corrections:[],manualJEs:[],improvements:[]};\nconst STAGES='''
s,n=re.subn(pat,replacement,s,count=1,flags=re.S)
if n!=1: raise SystemExit(f'INITIAL_STATE replacement count={n}')

# WD0 does not exist. WD-1 is the last business day on/before calendar month-end;
# WD1 is the first business day after month-end.
old='''function businessDay(period,n){
  const [y,m]=period.split("-").map(Number); let d=new Date(y,m,0,12,0,0);
  if(n===0){while(!isBusinessDay(d))d.setDate(d.getDate()-1);return d}
  let count=0,dir=n>0?1:-1;
  while(count<Math.abs(n)){d.setDate(d.getDate()+dir);if(isBusinessDay(d))count++}
  return d
}
function parseWD(raw){
  if(!raw||String(raw).toUpperCase().includes("TBD"))return null;
  const s=String(raw).toUpperCase().replace(/\\s+/g,"");
  const range=s.match(/WD(-?\\d+)-(-?\\d+)/); if(range)return Number(range[2]);
  const m=s.match(/WD(-?\\d+)/); return m?Number(m[1]):null;
}'''
new='''function businessDay(period,n){
  n=Number(n);
  if(!Number.isFinite(n)||n===0)return null;
  const [y,m]=period.split("-").map(Number);
  // Positive WD sequence starts after month-end: WD1, WD2, ...
  if(n>0){
    let d=new Date(y,m,0,12,0,0),count=0;
    while(count<n){d.setDate(d.getDate()+1);if(isBusinessDay(d))count++}
    return d
  }
  // There is no WD0. WD-1 is the final business day of the closing month.
  let d=new Date(y,m,1,12,0,0),count=0;
  while(count<Math.abs(n)){d.setDate(d.getDate()-1);if(isBusinessDay(d))count++}
  return d
}
function parseWD(raw){
  if(!raw||String(raw).toUpperCase().includes("TBD"))return null;
  const s=String(raw).toUpperCase().replace(/\\s+/g,"");
  const range=s.match(/WD(-?\\d+)-(-?\\d+)/);
  if(range){const v=Number(range[2]);return v===0?null:v}
  const m=s.match(/WD(-?\\d+)/);if(!m)return null;const v=Number(m[1]);return v===0?null:v;
}'''
if old not in s: raise SystemExit('businessDay/parseWD block not found')
s=s.replace(old,new,1)

# finalDue and targetClose must tolerate invalid WD0 safely.
s=s.replace('''  const wd=parseWD(t.day);if(wd===null)return null;let d=businessDay(period,wd);
  const tm=''', '''  const wd=parseWD(t.day);if(wd===null)return null;let d=businessDay(period,wd);if(!d)return null;
  const tm=''',1)
s=s.replace('function targetClose(period){let d=businessDay(period,Number(state.settings.closeTargetWD||2));let [h,m]=', 'function targetClose(period){let wd=Number(state.settings.closeTargetWD||2);if(!Number.isFinite(wd)||wd===0)wd=2;let d=businessDay(period,wd);let [h,m]=',1)

# UI no longer permits zero as a close target.
s=s.replace('id="targetWD" type="number" min="0" max="10"','id="targetWD" type="number" min="1" max="10"',1)
s=s.replace('closeTargetWD:Number($("targetWD").value||2)', 'closeTargetWD:Math.max(1,Number($("targetWD").value||2))',1)

# Visible-page rendering. This eliminates rebuilding all hidden analytics/tables after every update.
old='''function renderManagementAnalytics(){renderScoreDecomposition();renderWorkloadHeatmap();renderBottlenecks();renderPostMortem()}
function renderAll(){if($("cockpitMateriality"))$("cockpitMateriality").value=Number(state.settings?.materialityAmount||10000);if($("cockpitIntercompany"))$("cockpitIntercompany").value=String(state.settings?.intercompanyAlwaysMaterial!==false);initUsers();updateViewContext();renderCockpit();renderWorkflow();renderHeadOffice();renderTeam();renderQuality();renderAutomation();renderImprovements();renderManagerKPI();renderManagementAnalytics();renderSettings();renderTeamManagement();updateAlertBanner()}
function navigateToPage(page){document.querySelectorAll(".nav button").forEach(x=>x.classList.toggle("active",x.dataset.page===page));document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id===page));const b=document.querySelector(`.nav button[data-page="${page}"]`);if(b)$("pageTitle").textContent=b.textContent.replace(/^\\d+\\s*·\\s*/,"")}'''
new='''function renderManagementAnalytics(){renderScoreDecomposition();renderWorkloadHeatmap();renderBottlenecks();renderPostMortem()}
function activePageId(){return document.querySelector('.page.active')?.id||'cockpit'}
function renderSharedChrome(){
 if($("cockpitMateriality"))$("cockpitMateriality").value=Number(state.settings?.materialityAmount||10000);
 if($("cockpitIntercompany"))$("cockpitIntercompany").value=String(state.settings?.intercompanyAlwaysMaterial!==false);
 initUsers();updateViewContext();updateAlertBanner()
}
function renderPage(page=activePageId()){
 const map={cockpit:renderCockpit,workflow:renderWorkflow,headOffice:renderHeadOffice,team:renderTeam,quality:renderQuality,automation:renderAutomation,improvement:renderImprovements,managerKpi:()=>{renderManagerKPI();renderManagementAnalytics()},settings:()=>{renderSettings();renderTeamManagement()}};
 const fn=map[page];if(fn)fn()
}
function renderAll(){renderSharedChrome();renderPage(activePageId())}
function navigateToPage(page){document.querySelectorAll(".nav button").forEach(x=>x.classList.toggle("active",x.dataset.page===page));document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id===page));const b=document.querySelector(`.nav button[data-page="${page}"]`);if(b)$("pageTitle").textContent=b.textContent.replace(/^\\d+\\s*·\\s*/,"");renderPage(page)}'''
if old not in s: raise SystemExit('renderAll/navigation block not found')
s=s.replace(old,new,1)

# Avoid duplicate SSE render after the POST response already returned the same state version.
old='''function connectEvents(){
 if(!serverMode)return; eventSource=new EventSource(apiUrl("/api/events"));
 eventSource.onmessage=async()=>{try{const r=await fetch(apiUrl("/api/state"),{cache:"no-store"});state=await r.json();renderAll();checkAlerts(true)}catch(e){}}
}'''
new='''function connectEvents(){
 if(!serverMode)return;if(eventSource)try{eventSource.close()}catch(e){};eventSource=new EventSource(apiUrl("/api/events"));
 eventSource.onmessage=async()=>{try{const r=await fetch(apiUrl("/api/state"),{cache:"no-store"});const next=await r.json();if(Number(next.version||0)<=Number(state.version||0))return;state=next;renderSharedChrome();renderPage(activePageId());checkAlerts(true)}catch(e){}}
}'''
if old not in s: raise SystemExit('connectEvents block not found')
s=s.replace(old,new,1)

# Avoid full render on every action; only visible page needs repainting.
s=s.replace(''' }else applyLocal(a);
 renderAll(); checkAlerts(true)
}''',''' }else applyLocal(a);
 renderSharedChrome();renderPage(activePageId());checkAlerts(true)
}''',1)

# Page and selector changes should only render the destination/current page.
s=s.replace('$("periodSelect").onchange=e=>{selectedPeriod=e.target.value;renderAll()};$("currentUser").onchange=e=>{currentUser=e.target.value;localStorage.setItem("finance-current-user",currentUser);applyViewMode(true);renderAll();checkAlerts(true)};',
'''$("periodSelect").onchange=e=>{selectedPeriod=e.target.value;renderSharedChrome();renderPage(activePageId())};$("currentUser").onchange=e=>{currentUser=e.target.value;localStorage.setItem("finance-current-user",currentUser);applyViewMode(true);renderSharedChrome();renderPage(activePageId());checkAlerts(true)};''',1)

# Timer only refreshes time-sensitive visible pages. Resize is throttled and page-aware.
old=''' initPeriods();serverMode=await detectServer();if(!serverMode)loadLocal();initUsers();applyViewMode(false);$("connectionState").innerHTML='<span class="dot"></span>GitHub shared sync';$("liveModeText").innerHTML='<span class="pill good">GitHub shared-state mode</span>';renderAll();allTemplates().forEach(t=>readySnapshot[t.id]=currentStage(t,currentPeriod()));(state.headOfficeTemplate||[]).filter(h=>h.active!==false).forEach(h=>localStorage.setItem(`ho-stage-${currentPeriod()}-${h.id}`,String(hoCurrentStage(h,currentPeriod())||"done")));setInterval(()=>{renderCockpit();renderWorkflow();renderHeadOffice();updateAlertBanner();checkAlerts(false)},60000);
 if("serviceWorker" in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(()=>{});
 window.addEventListener("resize",()=>{drawHOTrend("hoTrendCanvas","Ifast");drawHOTrend("hoBUCanvas",$("buSelect").value);drawStageChart();renderManagerKPI()})'''
new=''' initPeriods();serverMode=await detectServer();if(!serverMode)loadLocal();initUsers();applyViewMode(false);$("connectionState").innerHTML='<span class="dot"></span>Live shared sync';$("liveModeText").innerHTML='<span class="pill good">Live shared-state mode</span>';renderAll();connectEvents();allTemplates().forEach(t=>readySnapshot[t.id]=currentStage(t,currentPeriod()));(state.headOfficeTemplate||[]).filter(h=>h.active!==false).forEach(h=>localStorage.setItem(`ho-stage-${currentPeriod()}-${h.id}`,String(hoCurrentStage(h,currentPeriod())||"done")));setInterval(()=>{const p=activePageId();if(p==='cockpit'||p==='workflow'||p==='headOffice')renderPage(p);updateAlertBanner();checkAlerts(false)},60000);
 if("serviceWorker" in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(()=>{});
 let resizeRAF=0;window.addEventListener("resize",()=>{if(resizeRAF)return;resizeRAF=requestAnimationFrame(()=>{resizeRAF=0;const p=activePageId();if(p==='cockpit'){drawHOTrend("hoTrendCanvas","Ifast");drawStageChart()}else if(p==='headOffice')drawHOTrend("hoBUCanvas",$("buSelect").value);else if(p==='managerKpi')renderManagerKPI()})})'''
if old not in s: raise SystemExit('init/timer/resize block not found')
s=s.replace(old,new,1)

# Settings copy accurately describes current shared architecture.
s=s.replace('No Neon database and no push notifications. Shared dashboard state is synchronized through <b>state.json</b> in GitHub. Viewers pull updates automatically; editors require repository write authorization in their browser.',
'Push notifications are disabled. Shared dashboard state is synchronized live through the Finance Control Tower API so all team members see sign-offs and workflow changes automatically.',1)

p.write_text(s,encoding='utf-8')
print('WD0 removal and performance patch applied')
