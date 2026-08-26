from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# 1) Make dashboard actions optimistic: update the visible UI immediately, then reconcile with Neon.
pat=r'''async function action\(a\)\{.*?\n\}\nfunction connectEvents\(\)\{.*?\n\}\nfunction initPeriods\(\)\{'''
m=re.search(pat,s,re.S)
if not m:
    raise SystemExit('Could not locate action/connectEvents block')
replacement=r'''async function action(a){
 if(serverMode){
  const before=structuredClone(state);
  // Optimistic local mutation: make the dashboard react immediately.
  applyLocal(a);renderSharedChrome();renderPage(activePageId());checkAlerts(true);
  try{
   const r=await fetch(apiUrl("/api/action"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)});
   if(!r.ok){const j=await r.json().catch(()=>({}));state=before;renderSharedChrome();renderPage(activePageId());checkAlerts(true);toast("Update failed"+(j.error?": "+j.error:""));return false}
   // Server remains authoritative; replacing state is cheap and normally needs no second full render.
   state=await r.json();renderSharedChrome();checkAlerts(true);return true
  }catch(e){state=before;renderSharedChrome();renderPage(activePageId());checkAlerts(true);toast("Update failed — connection unavailable");return false}
 }else{applyLocal(a);renderSharedChrome();renderPage(activePageId());checkAlerts(true);return true}
}
function connectEvents(){
 if(!serverMode)return;if(eventSource)try{eventSource.close()}catch(e){};eventSource=new EventSource(apiUrl("/api/events"));
 eventSource.onmessage=async e=>{try{
  // The event already contains the shared-state version. Do not download state unless it changed.
  const meta=JSON.parse(e.data||"{}");if(Number(meta.version||0)<=Number(state.version||0))return;
  const r=await fetch(apiUrl("/api/state"),{cache:"no-store"});if(!r.ok)return;const next=await r.json();if(Number(next.version||0)<=Number(state.version||0))return;state=next;renderSharedChrome();renderPage(activePageId());checkAlerts(true)
 }catch(e){}}
}
function initPeriods(){'''
s=s[:m.start()]+replacement+s[m.end():]

# 2) File status is relevant only on pages that actually show SOP/Backup indicators or the SOP KPI.
old=''' const fn=map[page];if(fn)fn();updateFileIndicators();void refreshFileStatus(false)'''
new=''' const fn=map[page];if(fn)fn();updateFileIndicators();if(['cockpit','workflow','headOffice','team','managerKpi'].includes(page))void refreshFileStatus(false)'''
if old not in s:
    raise SystemExit('Could not locate renderPage file-status hook')
s=s.replace(old,new,1)

# 3) Journal analytics should not rebuild BOTH analytics pages on every resize.
old='''window.addEventListener("resize",()=>{try{renderQuality2();renderAutomation2()}catch(e){}})'''
new='''let journalResizeRAF=0;window.addEventListener("resize",()=>{const p=typeof activePageId==='function'?activePageId():'';if(p!=='quality'&&p!=='automation'||journalResizeRAF)return;journalResizeRAF=requestAnimationFrame(()=>{journalResizeRAF=0;try{p==='quality'?renderQuality2():renderAutomation2()}catch(e){}})})'''
if old in s:
    s=s.replace(old,new,1)

p.write_text(s,encoding='utf-8')

# 4) Worker event endpoint should read only version metadata, not deserialize the whole state on every SSE reconnect.
w=Path('cloudflare-worker/src/index.js')
ws=w.read_text(encoding='utf-8')
anchor='''async function getState(env) {
  const sql = sqlFor(env);
  const rows = await sql`SELECT state FROM dashboard_state WHERE id = 1`;
  if (!rows.length) throw new Error('Dashboard state has not been initialized');
  return rows[0].state;
}
'''
if anchor not in ws:
    raise SystemExit('Could not locate worker getState')
meta=anchor+'''\nasync function getStateMeta(env) {\n  const sql = sqlFor(env);\n  const rows = await sql`SELECT COALESCE((state->>'version')::bigint,0) AS version, updated_at FROM dashboard_state WHERE id = 1`;\n  if (!rows.length) throw new Error('Dashboard state has not been initialized');\n  return { version: Number(rows[0].version || 0), updatedAt: rows[0].updated_at || null };\n}\n'''
ws=ws.replace(anchor,meta,1)
old_event='''      if (url.pathname === '/api/events' && request.method === 'GET') {
        const state = await getState(env);
        const body = `retry: 5000\\ndata: ${JSON.stringify({ version: state.version || 0, updatedAt: state.updatedAt || null })}\\n\\n`;
        return new Response(body, {
'''
new_event='''      if (url.pathname === '/api/events' && request.method === 'GET') {
        const meta = await getStateMeta(env);
        const body = `retry: 5000\\ndata: ${JSON.stringify(meta)}\\n\\n`;
        return new Response(body, {
'''
if old_event not in ws:
    raise SystemExit('Could not locate worker events endpoint')
ws=ws.replace(old_event,new_event,1)
w.write_text(ws,encoding='utf-8')

print('Performance v3 patch applied')
# trigger-active-workflow: 2026-08-26
# trigger-pages-workflow: 2026-08-26T11:16ET
