from pathlib import Path
import re

idx = Path('index.html')
worker = Path('cloudflare-worker/src/index.js')
html = idx.read_text()
js = worker.read_text()

def replace1(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing expected snippet: {label}')
    return text.replace(old, new, 1)

# ---------- Dashboard UI ----------
html = replace1(html,
'.workflow{display:flex;align-items:center;gap:5px;white-space:nowrap}.step{font-size:10px;padding:4px 6px;border-radius:7px;border:1px solid var(--line);color:var(--muted)}',
'.workflow{display:flex;align-items:center;gap:5px;white-space:nowrap}.step{font-size:10px;padding:4px 6px;border-radius:7px;border:1px solid var(--line);color:var(--muted);display:inline-flex;flex-direction:column;gap:2px;min-width:78px}.step-stamp{font-size:9px;line-height:1.25;color:var(--muted);font-weight:500;white-space:normal}',
'workflow CSS')

html = replace1(html,
'<div class="help">Imported from <b>Infasco_Month-End_Dashboard.xlsx</b>. Historical values are retained. You can update the selected month directly: 3 = on time/error-free, 2 = &lt;1h late/minor error, 1 = &gt;1h late/correction required, 0 = not sent.</div>',
'<div class="help">Imported from <b>Infasco_Month-End_Dashboard.xlsx</b>. Historical values are retained. New workflow scores calculate automatically from the final <b>Reviewed</b> timestamp: 3 = on time, 2 = up to 1h late, 1 = more than 1h late. Manual score override remains available for error/correction exceptions; 0 = not sent.</div>',
'deliverable help')

html = replace1(html,
'<div class="table-wrap"><table><thead><tr><th>Deliverable</th><th>Day</th><th>Time ET</th><th>Function</th><th>Prepared by</th><th>Reviewed by</th><th>Workflow</th><th>SOP</th><th>Score</th><th>Interpretation</th><th></th></tr></thead><tbody id="hoBody"></tbody></table></div>',
'<div class="table-wrap"><table><thead><tr><th>Deliverable</th><th>Day</th><th>Time ET</th><th>Function</th><th>Prepared by</th><th>Reviewed by</th><th>Workflow</th><th>SOP</th><th>Backup</th><th>Score</th><th>Interpretation</th><th></th></tr></thead><tbody id="hoBody"></tbody></table></div>',
'deliverable header')

html = replace1(html,
'<div class="table-wrap"><table><thead><tr><th>Task</th><th>Deadline</th><th>Workbook owner</th><th>Preparation</th><th>Approval</th><th>Entry</th><th>Review</th><th>SOP</th><th>Close critical</th><th></th></tr></thead><tbody id="teamBody"></tbody></table></div>',
'<div class="table-wrap"><table><thead><tr><th>Task</th><th>Deadline</th><th>Workbook owner</th><th>Preparation</th><th>Approval</th><th>Entry</th><th>Review</th><th>SOP</th><th>Backup</th><th>Close critical</th><th></th></tr></thead><tbody id="teamBody"></tbody></table></div>',
'team header')

old_wf = '''function workflowMarkup(t){
 const ps=pstate(selectedPeriod,t.id),cur=currentStage(t,selectedPeriod);
 return `<div class="workflow">${enabledStages(t).map((s,i)=>`${i?'<span class="arrow">→</span>':''}<span class="step ${ps.stages?.[s]?.doneAt?'done':s===cur?'ready':'locked'}">${esc(s)}${ps.stages?.[s]?.doneAt?' ✓':''}</span>`).join("")}</div>`
}'''
new_wf = '''function workflowMarkup(t){
 const ps=pstate(selectedPeriod,t.id),cur=currentStage(t,selectedPeriod);
 return `<div class="workflow">${enabledStages(t).map((s,i)=>{const x=ps.stages?.[s];const stamp=x?.doneAt?`<span class="step-stamp">${fmtDate(x.doneAt)}<br>${esc(x.doneBy||"")}</span>`:"";return `${i?'<span class="arrow">→</span>':''}<span class="step ${x?.doneAt?'done':s===cur?'ready':'locked'}">${esc(s)}${x?.doneAt?' ✓':''}${stamp}</span>`}).join("")}</div>`
}'''
html = replace1(html, old_wf, new_wf, 'workflow markup')

html = replace1(html,
'${safeSOPUrl(x.t.sopUrl)?` · <a href="${esc(safeSOPUrl(x.t.sopUrl))}" target="_blank" rel="noopener">SOP</a>`:""}</div></td>',
'${safeSOPUrl(x.t.sopUrl)?` · <a href="${esc(safeSOPUrl(x.t.sopUrl))}" target="_blank" rel="noopener">SOP</a>`:""} · <button class="btn ghost" style="padding:3px 6px" onclick="openBackup(\'task\',\'${x.t.id}\')">Backup</button></div></td>',
'workflow backup button')

# Deliverable table renderer.
pat = re.compile(r'function renderHeadOffice\(\)\{.*?\n\}\nfunction deliverablePersonOptions', re.S)
m = pat.search(html)
if not m:
    raise SystemExit('Missing renderHeadOffice')
new_block = r'''function renderHeadOffice(){
 const bu=$("buSelect").value||"Ifast",person=$("hoPersonFilter")?.value||"Manager View",m=hoMetrics(selectedPeriod,bu);$("hoAvg").textContent=m.avg===null?"—":m.avg.toFixed(2);$("hoGreen").textContent=m.green===null?"—":Math.round(m.green*100)+"%";$("hoRed").textContent=m.n?m.red:"—";
 const scores=hoScores(selectedPeriod,bu), rows=state.headOfficeTemplate.filter(h=>h.active!==false).filter(h=>person==="Manager View"||personMatches(hoPrepOwner(h),person)||personMatches(hoReviewOwner(h),person));
 $("hoBody").innerHTML=rows.map(h=>{const v=scores[h.activity]??"",[lab,cls]=scoreLabel(v),ds=hoPState(selectedPeriod,h.id),auto=autoScoreMeta(ds,bu,h.activity);return `<tr><td><b>${esc(h.activity)}</b></td><td>${esc(h.day||"—")}</td><td>${esc(h.time||"—")}</td><td>${esc(h.owner||"—")}</td><td>${ownerProgress(hoPrepOwner(h),ds.preparedAt,ds.preparedDoneBy)}</td><td>${ownerProgress(hoReviewOwner(h),ds.reviewedAt,ds.reviewedDoneBy)}</td><td>${hoWorkflowMarkup(h)}</td><td>${sopButton(h.sopUrl)}</td><td>${backupButton('deliverable',h.id)}</td><td><select class="score-select ${cls}" onchange="setHOScore('${escAttr(h.activity)}',this.value)"><option value="" ${v===""?"selected":""}>Not scored</option><option value="3" ${Number(v)===3?"selected":""}>3</option><option value="2" ${Number(v)===2?"selected":""}>2</option><option value="1" ${Number(v)===1?"selected":""}>1</option><option value="0" ${Number(v)===0||String(v).toLowerCase().includes("not sent")?"selected":""}>0 / Not sent</option></select>${auto}</td><td><span class="pill ${cls}">${lab}</span></td><td><button class="btn secondary" onclick="editHODeliverable('${h.id}')">Edit</button> <button class="btn ghost" onclick="deleteHODeliverable('${h.id}')">Delete</button></td></tr>`}).join("")||`<tr><td colspan="12" class="empty">No active deliverables match this filter.</td></tr>`;drawHOTrend("hoBUCanvas",bu)
}
function deliverablePersonOptions'''
html = html[:m.start()] + new_block + html[m.end():]

old_ho = '''function hoWorkflowMarkup(h){
 const ds=hoPState(selectedPeriod,h.id),st=hoCurrentStage(h,selectedPeriod);let controls='';
 if(st==='Preparation') controls=`<button class="btn secondary" onclick="completeHOStage('${h.id}')">Mark prepared</button>`;
 else if(st==='Review') controls=`<button class="btn secondary" onclick="completeHOStage('${h.id}')">Mark reviewed</button> <button class="btn ghost" onclick="undoHOStage('${h.id}','Preparation')">Undo Prepared</button>`;
 else controls=`<button class="btn ghost" onclick="undoHOStage('${h.id}','Review')">Undo Reviewed</button> <button class="btn ghost" onclick="undoHOStage('${h.id}','Preparation')">Undo Prepared</button>`;
 return `<div class="workflow"><span class="step ${ds.preparedAt?'done':st==='Preparation'?'ready':'locked'}">Prepared${ds.preparedAt?' ✓':''}</span><span class="arrow">→</span><span class="step ${ds.reviewedAt?'done':st==='Review'?'ready':'locked'}">Reviewed${ds.reviewedAt?' ✓':''}</span></div><div style="margin-top:6px">${controls}</div>`
}
async function completeHOStage(id){const h=state.headOfficeTemplate.find(x=>x.id===id);if(!h)return;const st=hoCurrentStage(h,selectedPeriod);if(!st)return;await action({type:"ho_stage_complete",period:selectedPeriod,id,stage:st,doneBy:currentUser,at:new Date().toISOString()});toast(`${h.activity}: ${st==='Preparation'?'prepared':'reviewed'}`)}
async function undoHOStage(id,stage){const h=state.headOfficeTemplate.find(x=>x.id===id);if(!h)return;await action({type:"ho_stage_undo",period:selectedPeriod,id,stage});toast(`${h.activity}: ${stage==='Preparation'?'prepared status removed':'reviewed status removed'}`)}'''
new_ho = '''function autoDeliverableScore(h,period,at){const due=finalDue(h,period);if(!due)return null;const mins=(new Date(at)-due)/60000;return {score:mins<=0?3:mins<=60?2:1,minutesLate:Math.max(0,Math.round(mins)),dueAt:due.toISOString()}}
function autoScoreMeta(ds,bu,activity){if(ds.autoScore==null||ds.autoScoreBu!==bu||ds.autoScoreActivity!==activity)return "";const timing=Number(ds.autoMinutesLate||0)<=0?"on time":`${Number(ds.autoMinutesLate)} min late`;return `<div class="small">Auto from review · ${timing}${ds.manualScoreOverride?' · manual override':''}</div>`}
function hoWorkflowMarkup(h){
 const ds=hoPState(selectedPeriod,h.id),st=hoCurrentStage(h,selectedPeriod);let controls='';
 if(st==='Preparation') controls=`<button class="btn secondary" onclick="completeHOStage('${h.id}')">Mark prepared</button>`;
 else if(st==='Review') controls=`<button class="btn secondary" onclick="completeHOStage('${h.id}')">Mark reviewed</button> <button class="btn ghost" onclick="undoHOStage('${h.id}','Preparation')">Undo Prepared</button>`;
 else controls=`<button class="btn ghost" onclick="undoHOStage('${h.id}','Review')">Undo Reviewed</button> <button class="btn ghost" onclick="undoHOStage('${h.id}','Preparation')">Undo Prepared</button>`;
 const prepStamp=ds.preparedAt?`<span class="step-stamp">${fmtDate(ds.preparedAt)}<br>${esc(ds.preparedDoneBy||"")}</span>`:"",reviewStamp=ds.reviewedAt?`<span class="step-stamp">${fmtDate(ds.reviewedAt)}<br>${esc(ds.reviewedDoneBy||"")}</span>`:"";
 return `<div class="workflow"><span class="step ${ds.preparedAt?'done':st==='Preparation'?'ready':'locked'}">Prepared${ds.preparedAt?' ✓':''}${prepStamp}</span><span class="arrow">→</span><span class="step ${ds.reviewedAt?'done':st==='Review'?'ready':'locked'}">Reviewed${ds.reviewedAt?' ✓':''}${reviewStamp}</span></div><div style="margin-top:6px">${controls}</div>`
}
async function completeHOStage(id){const h=state.headOfficeTemplate.find(x=>x.id===id);if(!h)return;const st=hoCurrentStage(h,selectedPeriod);if(!st)return;const at=new Date().toISOString(),auto=st==='Review'?autoDeliverableScore(h,selectedPeriod,at):null;await action({type:"ho_stage_complete",period:selectedPeriod,id,stage:st,doneBy:currentUser,at,bu:$("buSelect").value,autoScore:auto?.score??null,autoMinutesLate:auto?.minutesLate??null,dueAt:auto?.dueAt??null});toast(`${h.activity}: ${st==='Preparation'?'prepared':'reviewed'}`)}
async function undoHOStage(id,stage){const h=state.headOfficeTemplate.find(x=>x.id===id);if(!h)return;await action({type:"ho_stage_undo",period:selectedPeriod,id,stage});toast(`${h.activity}: ${stage==='Preparation'?'prepared status removed':'reviewed status removed'}`)}'''
html = replace1(html, old_ho, new_ho, 'deliverable workflow')

# Restore helper functions that were lost in the prior generated revision, and add file backup management.
helper_anchor = 'function setTeamPerson(p){teamPerson=p;renderTeam()}'
if helper_anchor not in html:
    raise SystemExit('Missing setTeamPerson anchor')
helpers = r'''function safeSOPUrl(u){try{const x=new URL(String(u||""),location.href);return (x.protocol==="https:"||x.protocol==="http:")?x.href:""}catch(e){return ""}}
function sopButton(u){const href=safeSOPUrl(u);return href?`<a class="btn ghost" href="${esc(href)}" target="_blank" rel="noopener">Open SOP</a>`:'<span class="small">—</span>'}
function backupButton(itemType,itemId){return serverMode?`<button class="btn ghost" onclick="openBackup('${itemType}','${itemId}')">Files</button>`:'<span class="small">Server only</span>'}
function backupItemName(itemType,itemId){if(itemType==='task')return state.taskTemplates.find(x=>x.id===itemId)?.name||'Task';return state.headOfficeTemplate.find(x=>x.id===itemId)?.activity||'Deliverable'}
async function openBackup(itemType,itemId){if(!serverMode)return toast('Backup files require shared live mode.');openModal(`Backup files · ${backupItemName(itemType,itemId)}`,`<div class="help">Backup/supporting documents for <b>${esc(monthName(selectedPeriod))}</b>. Upload the files the next workflow owner should verify. Maximum 10 MB per file.</div><div id="backupList" style="margin-top:12px">Loading…</div><div class="section"><h2>Upload backup</h2></div><div class="field"><input id="backupFileInput" type="file" multiple></div><div class="modal-actions"><button type="button" class="btn ghost" onclick="closeModal()">Close</button><button type="button" class="btn" onclick="uploadBackupFiles('${itemType}','${itemId}')">Upload file(s)</button></div>`,async()=>{});await refreshBackupList(itemType,itemId)}
async function refreshBackupList(itemType,itemId){const box=$("backupList");if(!box)return;try{const q=new URLSearchParams({period:selectedPeriod,itemType,itemId});const r=await fetch(apiUrl('/api/files?'+q.toString()),{cache:'no-store'});if(!r.ok)throw new Error('Unable to load files');const files=await r.json();box.innerHTML=files.length?`<div class="table-wrap"><table style="min-width:620px"><thead><tr><th>File</th><th>Uploaded</th><th>By</th><th>Size</th><th></th></tr></thead><tbody>${files.map(f=>`<tr><td><b>${esc(f.file_name)}</b><div class="small">${esc(f.content_type||'file')}</div></td><td>${fmtDate(f.uploaded_at)}</td><td>${esc(f.uploaded_by||'')}</td><td>${(Number(f.size_bytes||0)/1024).toFixed(0)} KB</td><td><a class="btn ghost" href="${apiUrl('/api/files/'+encodeURIComponent(f.id))}" target="_blank" rel="noopener">Download</a> <button type="button" class="btn ghost" onclick="deleteBackupFile('${f.id}','${itemType}','${itemId}')">Delete</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No backup files uploaded for this period yet.</div>'}catch(e){box.innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
async function uploadBackupFiles(itemType,itemId){const input=$("backupFileInput"),files=[...(input?.files||[])];if(!files.length)return toast('Choose at least one file.');for(const file of files){if(file.size>10*1024*1024){toast(`${file.name} exceeds 10 MB`);continue}const q=new URLSearchParams({period:selectedPeriod,itemType,itemId});const r=await fetch(apiUrl('/api/files?'+q.toString()),{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','X-File-Name':encodeURIComponent(file.name),'X-Uploaded-By':encodeURIComponent(currentUser)},body:file});if(!r.ok){const j=await r.json().catch(()=>({}));toast(`Upload failed: ${j.error||file.name}`);return}}input.value='';toast('Backup uploaded');await refreshBackupList(itemType,itemId)}
async function deleteBackupFile(fileId,itemType,itemId){if(!confirm('Delete this backup file?'))return;const r=await fetch(apiUrl('/api/files/'+encodeURIComponent(fileId)),{method:'DELETE'});if(!r.ok)return toast('Delete failed');toast('Backup deleted');await refreshBackupList(itemType,itemId)}
function renderTeam(){
 const tabs=$("personTabs");tabs.innerHTML=(state.users||[]).map(p=>`<button class="${p===teamPerson?'active':''}" onclick="setTeamPerson('${escAttr(p)}')">${esc(p)}</button>`).join("");$("teamTitle").textContent=`${teamPerson} · recurring task template`;
 const rows=allTemplates().filter(t=>t.person===teamPerson);$("teamBody").innerHTML=rows.map(t=>`<tr><td><b>${esc(t.name)}</b><div class="small">${esc(t.source||"Internal Close")}</div></td><td>${esc(t.day||"—")} ${esc(t.time||"")}</td><td>${esc(t.workbookOwner||"—")}</td>${STAGES.map(s=>`<td>${t.stageEnabled?.[s]===false?'<span class="small">Skipped</span>':esc(stageOwner(t,s))}</td>`).join("")}<td>${sopButton(t.sopUrl)}</td><td>${backupButton('task',t.id)}</td><td>${t.closeCritical?'<span class="pill warn">Yes</span>':'No'}</td><td><button class="btn secondary" onclick="editTask('${t.id}')">Edit</button> <button class="btn ghost" onclick="deleteTask('${t.id}')">Remove</button></td></tr>`).join("")||`<tr><td colspan="11"><div class="empty"><b>No fixed tasks yet.</b><br>Add tasks for ${esc(teamPerson)} directly in the dashboard.</div></td></tr>`
}
'''
html = html.replace(helper_anchor, helpers + helper_anchor, 1)

# Local-mode score behavior.
html = replace1(html,
'if(a.type==="ho_score"){state.headOfficeHistory[a.period]??={};state.headOfficeHistory[a.period][a.bu]??={}; if(a.value===""||a.value===null)delete state.headOfficeHistory[a.period][a.bu][a.activity]; else state.headOfficeHistory[a.period][a.bu][a.activity]=a.value}',
'if(a.type==="ho_score"){state.headOfficeHistory[a.period]??={};state.headOfficeHistory[a.period][a.bu]??={}; if(a.value===""||a.value===null)delete state.headOfficeHistory[a.period][a.bu][a.activity]; else state.headOfficeHistory[a.period][a.bu][a.activity]=a.value;const h=(state.headOfficeTemplate||[]).find(x=>x.activity===a.activity),ds=h?state.deliverableStates?.[a.period]?.[h.id]:null;if(ds&&ds.autoScoreBu===a.bu&&ds.autoScoreActivity===a.activity)ds.manualScoreOverride=true}',
'local score override')
html = replace1(html,
'if(a.type==="ho_stage_complete"){state.deliverableStates??={};state.deliverableStates[a.period]??={};state.deliverableStates[a.period][a.id]??={};const ds=state.deliverableStates[a.period][a.id];if(a.stage==="Preparation"){ds.preparedAt=a.at||new Date().toISOString();ds.preparedDoneBy=a.doneBy||currentUser;delete ds.reviewedAt;delete ds.reviewedDoneBy}else if(a.stage==="Review"&&ds.preparedAt){ds.reviewedAt=a.at||new Date().toISOString();ds.reviewedDoneBy=a.doneBy||currentUser}}',
'if(a.type==="ho_stage_complete"){state.deliverableStates??={};state.deliverableStates[a.period]??={};state.deliverableStates[a.period][a.id]??={};const ds=state.deliverableStates[a.period][a.id],h=(state.headOfficeTemplate||[]).find(x=>x.id===a.id);if(a.stage==="Preparation"){ds.preparedAt=a.at||new Date().toISOString();ds.preparedDoneBy=a.doneBy||currentUser;delete ds.reviewedAt;delete ds.reviewedDoneBy}else if(a.stage==="Review"&&ds.preparedAt){ds.reviewedAt=a.at||new Date().toISOString();ds.reviewedDoneBy=a.doneBy||currentUser;if(a.autoScore!=null&&a.bu&&h){state.headOfficeHistory??={};state.headOfficeHistory[a.period]??={};state.headOfficeHistory[a.period][a.bu]??={};state.headOfficeHistory[a.period][a.bu][h.activity]=Number(a.autoScore);ds.autoScore=Number(a.autoScore);ds.autoScoreBu=a.bu;ds.autoScoreActivity=h.activity;ds.autoMinutesLate=Number(a.autoMinutesLate||0);ds.autoDueAt=a.dueAt||null;ds.manualScoreOverride=false}}}',
'local auto score')
html = replace1(html,
'if(a.type==="ho_stage_undo"){const ds=state.deliverableStates?.[a.period]?.[a.id];if(ds){if(a.stage==="Preparation"){delete ds.preparedAt;delete ds.preparedDoneBy;delete ds.reviewedAt;delete ds.reviewedDoneBy}else{delete ds.reviewedAt;delete ds.reviewedDoneBy}}}',
'if(a.type==="ho_stage_undo"){const ds=state.deliverableStates?.[a.period]?.[a.id];if(ds){if(ds.autoScore!=null&&!ds.manualScoreOverride){const scores=state.headOfficeHistory?.[a.period]?.[ds.autoScoreBu];if(scores&&Number(scores[ds.autoScoreActivity])===Number(ds.autoScore))delete scores[ds.autoScoreActivity]}delete ds.autoScore;delete ds.autoScoreBu;delete ds.autoScoreActivity;delete ds.autoMinutesLate;delete ds.autoDueAt;delete ds.manualScoreOverride;if(a.stage==="Preparation"){delete ds.preparedAt;delete ds.preparedDoneBy;delete ds.reviewedAt;delete ds.reviewedDoneBy}else{delete ds.reviewedAt;delete ds.reviewedDoneBy}}}',
'local score undo')

# ---------- Cloudflare Worker / Neon binary file storage ----------
js = replace1(js,
"'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',\n  'Access-Control-Allow-Headers': 'Content-Type',",
"'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',\n  'Access-Control-Allow-Headers': 'Content-Type,X-File-Name,X-Uploaded-By',",
'CORS')

anchor = '''async function getState(env) {
  const sql = sqlFor(env);
  const rows = await sql`SELECT state FROM dashboard_state WHERE id = 1`;
  if (!rows.length) throw new Error('Dashboard state has not been initialized');
  return rows[0].state;
}
'''
extra = anchor + r'''
const MAX_FILE_BYTES = 10 * 1024 * 1024;
async function ensureFilesTable(env) {
  const sql = sqlFor(env);
  await sql`CREATE TABLE IF NOT EXISTS dashboard_files (id text PRIMARY KEY, period text NOT NULL, item_type text NOT NULL, item_id text NOT NULL, file_name text NOT NULL, content_type text NOT NULL, size_bytes integer NOT NULL, uploaded_at timestamptz NOT NULL DEFAULT now(), uploaded_by text, data bytea NOT NULL)`;
  await sql`CREATE INDEX IF NOT EXISTS dashboard_files_lookup_idx ON dashboard_files (period, item_type, item_id, uploaded_at DESC)`;
}
function arrayBufferToBase64(buffer){const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+0x8000,bytes.length)));return btoa(binary)}
function base64ToBytes(value){const binary=atob(String(value||'')),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes}
function decodeHeader(value,fallback=''){try{return decodeURIComponent(String(value||''))||fallback}catch{return String(value||'')||fallback}}
async function listFiles(env,period,itemType,itemId){await ensureFilesTable(env);const sql=sqlFor(env);return await sql`SELECT id,file_name,content_type,size_bytes,uploaded_at,uploaded_by FROM dashboard_files WHERE period=${period} AND item_type=${itemType} AND item_id=${itemId} ORDER BY uploaded_at DESC`}
async function uploadFile(env,request,url){const period=url.searchParams.get('period')||'',itemType=url.searchParams.get('itemType')||'',itemId=url.searchParams.get('itemId')||'';if(!period||!['task','deliverable'].includes(itemType)||!itemId)return json({error:'Missing or invalid file target'},400);const state=await getState(env),exists=itemType==='task'?(state.taskTemplates||[]).some(x=>x.id===itemId):(state.headOfficeTemplate||[]).some(x=>x.id===itemId);if(!exists)return json({error:'Task or deliverable not found'},404);const buffer=await request.arrayBuffer();if(!buffer.byteLength)return json({error:'Empty file'},400);if(buffer.byteLength>MAX_FILE_BYTES)return json({error:'File exceeds 10 MB limit'},413);const id=crypto.randomUUID(),fileName=decodeHeader(request.headers.get('X-File-Name'),'backup-file'),uploadedBy=decodeHeader(request.headers.get('X-Uploaded-By'),''),contentType=request.headers.get('Content-Type')||'application/octet-stream',base64=arrayBufferToBase64(buffer);await ensureFilesTable(env);const sql=sqlFor(env);const rows=await sql`INSERT INTO dashboard_files (id,period,item_type,item_id,file_name,content_type,size_bytes,uploaded_by,data) VALUES (${id},${period},${itemType},${itemId},${fileName},${contentType},${buffer.byteLength},${uploadedBy},decode(${base64},'base64')) RETURNING id,file_name,content_type,size_bytes,uploaded_at,uploaded_by`;return json(rows[0],201)}
async function downloadFile(env,id){await ensureFilesTable(env);const sql=sqlFor(env);const rows=await sql`SELECT file_name,content_type,encode(data,'base64') AS data_base64 FROM dashboard_files WHERE id=${id}`;if(!rows.length)return json({error:'File not found'},404);const row=rows[0],bytes=base64ToBytes(row.data_base64);return new Response(bytes,{status:200,headers:{...CORS,'Content-Type':row.content_type||'application/octet-stream','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(row.file_name||'backup-file')}`}})}
async function deleteFile(env,id){await ensureFilesTable(env);const sql=sqlFor(env);const rows=await sql`DELETE FROM dashboard_files WHERE id=${id} RETURNING id`;return rows.length?json({ok:true}):json({error:'File not found'},404)}
'''
js = replace1(js, anchor, extra, 'file helper anchor')

old_score = """  } else if (a.type === 'ho_score') {
    state.headOfficeHistory ??= {};
    state.headOfficeHistory[a.period] ??= {};
    state.headOfficeHistory[a.period][a.bu] ??= {};
    if (a.value === '' || a.value === null) delete state.headOfficeHistory[a.period][a.bu][a.activity];
    else state.headOfficeHistory[a.period][a.bu][a.activity] = a.value;"""
new_score = old_score + """
    const scoreItem = (state.headOfficeTemplate || []).find(x => x.activity === a.activity);
    const scoreState = scoreItem ? state.deliverableStates?.[a.period]?.[scoreItem.id] : null;
    if (scoreState && scoreState.autoScoreBu === a.bu && scoreState.autoScoreActivity === a.activity) scoreState.manualScoreOverride = true;"""
js = replace1(js, old_score, new_score, 'worker score override')

old_review = """    } else if (a.stage === 'Review' && ds.preparedAt) {
      ds.reviewedAt = a.at || new Date().toISOString();
      ds.reviewedDoneBy = a.doneBy || '';
    }
  } else if (a.type === 'ho_stage_undo') {
    const ds = state.deliverableStates?.[a.period]?.[a.id];
    if (ds) {
      if (a.stage === 'Preparation') {
        delete ds.preparedAt; delete ds.preparedDoneBy; delete ds.reviewedAt; delete ds.reviewedDoneBy;
      } else {
        delete ds.reviewedAt; delete ds.reviewedDoneBy;
      }
    }"""
new_review = """    } else if (a.stage === 'Review' && ds.preparedAt) {
      ds.reviewedAt = a.at || new Date().toISOString();
      ds.reviewedDoneBy = a.doneBy || '';
      const h = (state.headOfficeTemplate || []).find(x => x.id === a.id);
      if (a.autoScore !== null && a.autoScore !== undefined && a.bu && h) {
        state.headOfficeHistory ??= {};
        state.headOfficeHistory[a.period] ??= {};
        state.headOfficeHistory[a.period][a.bu] ??= {};
        state.headOfficeHistory[a.period][a.bu][h.activity] = Number(a.autoScore);
        ds.autoScore = Number(a.autoScore); ds.autoScoreBu = a.bu; ds.autoScoreActivity = h.activity; ds.autoMinutesLate = Number(a.autoMinutesLate || 0); ds.autoDueAt = a.dueAt || null; ds.manualScoreOverride = false;
      }
    }
  } else if (a.type === 'ho_stage_undo') {
    const ds = state.deliverableStates?.[a.period]?.[a.id];
    if (ds) {
      if (ds.autoScore !== null && ds.autoScore !== undefined && !ds.manualScoreOverride) {
        const scores = state.headOfficeHistory?.[a.period]?.[ds.autoScoreBu];
        if (scores && Number(scores[ds.autoScoreActivity]) === Number(ds.autoScore)) delete scores[ds.autoScoreActivity];
      }
      delete ds.autoScore; delete ds.autoScoreBu; delete ds.autoScoreActivity; delete ds.autoMinutesLate; delete ds.autoDueAt; delete ds.manualScoreOverride;
      if (a.stage === 'Preparation') {
        delete ds.preparedAt; delete ds.preparedDoneBy; delete ds.reviewedAt; delete ds.reviewedDoneBy;
      } else {
        delete ds.reviewedAt; delete ds.reviewedDoneBy;
      }
    }"""
js = replace1(js, old_review, new_review, 'worker review score')

route = """      if (url.pathname === '/api/state' && request.method === 'GET') {
        return json(await getState(env));
      }"""
file_routes = """      if (url.pathname === '/api/files' && request.method === 'GET') {
        return json(await listFiles(env, url.searchParams.get('period') || '', url.searchParams.get('itemType') || '', url.searchParams.get('itemId') || ''));
      }
      if (url.pathname === '/api/files' && request.method === 'POST') return await uploadFile(env, request, url);
      if (url.pathname.startsWith('/api/files/') && request.method === 'GET') return await downloadFile(env, decodeURIComponent(url.pathname.slice('/api/files/'.length)));
      if (url.pathname.startsWith('/api/files/') && request.method === 'DELETE') return await deleteFile(env, decodeURIComponent(url.pathname.slice('/api/files/'.length)));
""" + route
js = replace1(js, route, file_routes, 'file routes')

idx.write_text(html)
worker.write_text(js)
print('Patched dashboard successfully.')
