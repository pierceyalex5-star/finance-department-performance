from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# ---------- Task mapping helpers ----------
needle="function deliverablePersonOptions(value){"
helpers=r'''const TASK_DIVISIONS=[
  '11 - INFASCO',
  '23 - INFASCO NUT',
  '31 - IFASTGROUPE DISTRIBUTION CAN',
  '41 - IFASTGROUPE DISTRIBUTION USA',
  'Consolidated / Corporate',
  'Multiple divisions'
];
const FS_LINE_SUGGESTIONS=[
  'Cash & cash equivalents','Accounts receivable','Inventory','Prepaid expenses & deposits','Fixed assets / PP&E','Other assets',
  'Accounts payable','Accrued liabilities','Payroll & benefits','Income taxes payable','Debt / leases','Other liabilities','Equity',
  'Sales / Revenue','Cost of goods sold','Gross margin','Selling expenses','General & administrative expenses','Depreciation & amortization',
  'Other income / expense','EBIT','Interest expense / income','Income tax expense','Net income','Intercompany','Cash flow / working capital','Other'
];
function taskDivisionOptions(value=''){const list=['',...TASK_DIVISIONS];if(value&&!list.includes(value))list.push(value);return list.map(v=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(v||'Select division')}</option>`).join('')}
function fsLineDatalist(){return `<datalist id="fsLineSuggestions">${FS_LINE_SUGGESTIONS.map(v=>`<option value="${esc(v)}"></option>`).join('')}</datalist>`}
function taskMappingMeta(t){return `<span>${esc(t.division||'Division not mapped')}</span> · <span>${esc(t.financialStatementLine||'FS line not mapped')}</span>`}
'''+needle
if needle not in s: raise SystemExit('deliverablePersonOptions anchor not found')
s=s.replace(needle,helpers,1)

# ---------- SOP modal: controlled uploaded file, not navigation ----------
old=re.search(r"function safeSOPUrl\(u\)\{.*?async function deleteBackupFile\(fileId,itemType,itemId\)\{.*?\}\n",s,re.S)
if not old: raise SystemExit('SOP/backup function block not found')
block=old.group(0)
# Preserve backup functions from current block beginning at backupButton.
backup_start=block.index('function backupButton')
backup_part=block[backup_start:]
new=r'''function safeSOPUrl(u){try{const x=new URL(String(u||""),location.href);return (x.protocol==="https:"||x.protocol==="http:")?x.href:""}catch(e){return ""}}
function sopItem(itemType,itemId){return itemType==='task'?(state.taskTemplates||[]).find(x=>x.id===itemId):(state.headOfficeTemplate||[]).find(x=>x.id===itemId)}
function sopItemName(itemType,itemId){const x=sopItem(itemType,itemId);return x?(x.name||x.activity||'SOP'):'SOP'}
function sopButton(itemType,itemId,lastReviewed=''){const review=lastReviewed?`<div class="small" style="margin-top:5px">Reviewed ${esc(lastReviewed)}</div>`:'<div class="small" style="margin-top:5px">Not yet reviewed</div>';return `<button type="button" class="btn ghost" onclick="openSOP('${itemType}','${itemId}')">SOP</button>${review}`}
async function openSOP(itemType,itemId){
 if(!serverMode)return toast('SOP files require shared live mode.');
 const item=sopItem(itemType,itemId);if(!item)return toast('Item not found.');
 const legacy=safeSOPUrl(item.sopUrl);
 openModal(`SOP · ${sopItemName(itemType,itemId)}`,`<div class="help"><b>Controlled SOP.</b> This document belongs to the recurring ${itemType} and is not month-specific. Upload the approved/current SOP here so every team member opens the same file.</div><div class="form-grid" style="margin-top:12px"><div class="field"><label>Last reviewed date</label><input id="sopReviewDate" type="date" value="${esc(item.sopLastReviewed||'')}"></div><div class="field"><label>Blank SOP template</label><a class="btn ghost" href="./templates/Finance_SOP_Template.docx" download>Download Word template</a></div></div>${legacy?`<div class="help" style="margin-top:10px">Legacy external SOP link: <a href="${esc(legacy)}" target="_blank" rel="noopener">Open legacy document</a></div>`:''}<div id="sopList" style="margin-top:12px">Loading…</div><div class="section"><h2>Upload / replace SOP</h2></div><div class="field"><input id="sopFileInput" type="file" accept=".doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx"></div><div class="small" style="margin-top:5px">Maximum 10 MB. Uploading a new SOP replaces the current uploaded SOP for this item.</div><div class="modal-actions"><button type="button" class="btn ghost" onclick="closeModal()">Close</button><button type="button" class="btn secondary" onclick="saveSOPReviewDate('${itemType}','${itemId}')">Save review date</button><button type="button" class="btn" onclick="uploadSOPFile('${itemType}','${itemId}')">Upload / replace SOP</button></div>`,async()=>{});
 await refreshSOPList(itemType,itemId)
}
async function listSOPFiles(itemType,itemId){const q=new URLSearchParams({period:'SOP',itemType,itemId});const r=await fetch(apiUrl('/api/files?'+q.toString()),{cache:'no-store'});if(!r.ok)throw new Error('Unable to load SOP');return await r.json()}
async function refreshSOPList(itemType,itemId){const box=$("sopList");if(!box)return;try{const files=await listSOPFiles(itemType,itemId);box.innerHTML=files.length?`<div class="table-wrap"><table style="min-width:620px"><thead><tr><th>Current SOP</th><th>Uploaded</th><th>By</th><th>Size</th><th></th></tr></thead><tbody>${files.map((f,i)=>`<tr><td><b>${esc(f.file_name)}</b>${i===0?'<div class="small">Current uploaded version</div>':''}</td><td>${fmtDate(f.uploaded_at)}</td><td>${esc(f.uploaded_by||'')}</td><td>${(Number(f.size_bytes||0)/1024).toFixed(0)} KB</td><td><a class="btn ghost" href="${apiUrl('/api/files/'+encodeURIComponent(f.id))}" target="_blank" rel="noopener">Download</a> <button type="button" class="btn ghost" onclick="deleteSOPFile('${f.id}','${itemType}','${itemId}')">Delete</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><b>No SOP uploaded.</b><br>Download the template, complete it, then upload the controlled version here.</div>'}catch(e){box.innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
async function saveSOPReviewDate(itemType,itemId){const date=$("sopReviewDate")?.value||'';if(itemType==='task')await action({type:'template_update',task:{id:itemId,sopLastReviewed:date}});else await action({type:'ho_template_update',item:{id:itemId,sopLastReviewed:date}});toast('SOP review date saved');await refreshSOPList(itemType,itemId)}
async function uploadSOPFile(itemType,itemId){const input=$("sopFileInput"),file=input?.files?.[0];if(!file)return toast('Choose an SOP file.');if(file.size>10*1024*1024)return toast(`${file.name} exceeds 10 MB`);let existing=[];try{existing=await listSOPFiles(itemType,itemId)}catch(e){}if(existing.length&&!confirm('Replace the current uploaded SOP?'))return;for(const f of existing){const dr=await fetch(apiUrl('/api/files/'+encodeURIComponent(f.id)),{method:'DELETE'});if(!dr.ok)return toast('Unable to replace existing SOP.')}const q=new URLSearchParams({period:'SOP',itemType,itemId});const r=await fetch(apiUrl('/api/files?'+q.toString()),{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','X-File-Name':encodeURIComponent(file.name),'X-Uploaded-By':encodeURIComponent(currentUser)},body:file});if(!r.ok){const j=await r.json().catch(()=>({}));return toast(`SOP upload failed: ${j.error||file.name}`)}input.value='';toast('SOP uploaded');await refreshSOPList(itemType,itemId)}
async function deleteSOPFile(fileId,itemType,itemId){if(!confirm('Delete this uploaded SOP?'))return;const r=await fetch(apiUrl('/api/files/'+encodeURIComponent(fileId)),{method:'DELETE'});if(!r.ok)return toast('Delete failed');toast('SOP deleted');await refreshSOPList(itemType,itemId)}
'''+backup_part
s=s[:old.start()]+new+s[old.end():]

# ---------- Replace SOP button call sites ----------
s=s.replace("${sopButton(h.sopUrl,h.sopLastReviewed)}","${sopButton('deliverable',h.id,h.sopLastReviewed)}")
s=s.replace("${sopButton(t.sopUrl,t.sopLastReviewed)}","${sopButton('task',t.id,t.sopLastReviewed)}")
# Workflow compact SOP link becomes modal button and mapping metadata.
oldfrag='${esc(x.t.source||"")}${safeSOPUrl(x.t.sopUrl)?` · <a href="${esc(safeSOPUrl(x.t.sopUrl))}" target="_blank" rel="noopener">SOP</a>`:""} · <button class="btn ghost" style="padding:3px 6px" onclick="openBackup(\'task\',\'${x.t.id}\')">Backup</button>'
newfrag='${esc(x.t.source||"")} · ${taskMappingMeta(x.t)} · <button class="btn ghost" style="padding:3px 6px" onclick="openSOP(\'task\',\'${x.t.id}\')">SOP</button> · <button class="btn ghost" style="padding:3px 6px" onclick="openBackup(\'task\',\'${x.t.id}\')">Backup</button>'
if oldfrag in s:s=s.replace(oldfrag,newfrag,1)
else: print('warning: workflow compact SOP fragment not matched')

# Team task metadata gets division + FS line.
oldmeta='${esc(t.displayId||t.id)} · ${esc(t.source||"Internal Close")}${t.dependencyId?` · Depends on ${esc(dependencyLabel(t))}`:""}'
newmeta='${esc(t.displayId||t.id)} · ${esc(t.source||"Internal Close")} · ${taskMappingMeta(t)}${t.dependencyId?` · Depends on ${esc(dependencyLabel(t))}`:""}'
s=s.replace(oldmeta,newmeta,1)

# ---------- Task Add/Edit form ----------
# Remove accidental duplicated Task ID/effective period pair first.
dup='''<div class="field"><label>Task ID</label><input name="displayId" readonly value="${esc(t.displayId||nextDisplayId('TASK'))}"></div><div class="field"><label>Effective start period</label><input name="effectiveStartPeriod" type="month" value="${esc(t.effectiveStartPeriod||selectedPeriod)}"></div><div class="field"><label>Task ID</label><input name="displayId" readonly value="${esc(t.displayId||nextDisplayId('TASK'))}"></div><div class="field"><label>Effective start period</label><input name="effectiveStartPeriod" type="month" value="${esc(t.effectiveStartPeriod||selectedPeriod)}"></div>'''
one='''<div class="field"><label>Task ID</label><input name="displayId" readonly value="${esc(t.displayId||nextDisplayId('TASK'))}"></div><div class="field"><label>Effective start period</label><input name="effectiveStartPeriod" type="month" value="${esc(t.effectiveStartPeriod||selectedPeriod)}"></div>'''
s=s.replace(dup,one,1)

anchor=''' <div class="field"><label>Person / task list</label><select name="person">${state.users.map(u=>`<option ${u===(t.person||teamPerson)?"selected":""}>${esc(u)}</option>`).join("")}</select></div>
 <div class="field"><label>Workbook owner / code (optional)</label><input name="workbookOwner" value="${esc(t.workbookOwner||"")}"></div>'''
replace=''' <div class="field"><label>Person / task list</label><select name="person">${state.users.map(u=>`<option ${u===(t.person||teamPerson)?"selected":""}>${esc(u)}</option>`).join("")}</select></div>
 <div class="field"><label>Division</label><select name="division" required>${taskDivisionOptions(t.division||'')}</select></div>
 <div class="field full"><label>Financial statement line</label><input name="financialStatementLine" list="fsLineSuggestions" required value="${esc(t.financialStatementLine||'')}" placeholder="Choose or type the exact reporting line">${fsLineDatalist()}<div class="small">Use the exact P&L / balance-sheet reporting line when possible.</div></div>
 <div class="field"><label>Workbook owner / code (optional)</label><input name="workbookOwner" value="${esc(t.workbookOwner||"")}"></div>'''
if anchor not in s: raise SystemExit('task form person anchor not found')
s=s.replace(anchor,replace,1)

# Remove old completed SOP link field from task edit; SOP is now managed in modal.
s=re.sub(r'<div class="field"><label>SOP last reviewed</label>.*?<div class="field full"><label>Completed SOP link</label><input name="sopUrl"[^>]*></div>',
'''<div class="field full"><label>SOP document</label><div class="help">Use the <b>SOP</b> button in the task table to upload/download the controlled SOP and record its last review date.</div></div>''',s,count=1,flags=re.S)

# formTask persists division and FS line, while preserving legacy SOP metadata on edit.
oldret="return {id,displayId:o.displayId||nextDisplayId('TASK'),effectiveStartPeriod:o.effectiveStartPeriod||selectedPeriod,dependencyId:o.dependencyId||'',name:o.name,person:o.person,workbookOwner:o.workbookOwner,day:o.day,time:o.time,closeCritical:o.closeCritical===\"true\",source:o.source||\"Internal Close\",sopUrl:(o.sopUrl||\"\").trim(),sopLastReviewed:o.sopLastReviewed||'',active:true,stageOwners,stageOffsets,stageEnabled}"
if oldret not in s:
    oldret="return {id,displayId:o.displayId||nextDisplayId('TASK'),effectiveStartPeriod:o.effectiveStartPeriod||selectedPeriod,dependencyId:o.dependencyId||'',name:o.name,person:o.person,workbookOwner:o.workbookOwner,day:o.day,time:o.time,closeCritical:o.closeCritical==\"true\",source:o.source||\"Internal Close\",sopUrl:(o.sopUrl||\"\").trim(),sopLastReviewed:o.sopLastReviewed||'',active:true,stageOwners,stageOffsets,stageEnabled}"
newret="return {id,displayId:o.displayId||nextDisplayId('TASK'),effectiveStartPeriod:o.effectiveStartPeriod||selectedPeriod,dependencyId:o.dependencyId||'',name:o.name,person:o.person,division:o.division||'',financialStatementLine:(o.financialStatementLine||'').trim(),workbookOwner:o.workbookOwner,day:o.day,time:o.time,closeCritical:o.closeCritical===\"true\"||o.closeCritical==\"true\",source:o.source||\"Internal Close\",active:true,stageOwners,stageOffsets,stageEnabled}"
if oldret not in s: raise SystemExit('formTask return not found')
s=s.replace(oldret,newret,1)

# Deliverable SOP edit guidance: keep last-review field but remove external-link-as-primary UX.
s=re.sub(r'<div class="field"><label>SOP last reviewed</label><input name="sopLastReviewed"[^>]*></div><div class="field"><label>SOP template</label>.*?<div class="field full"><label>Completed SOP link</label><input name="sopUrl"[^>]*></div>',
'''<div class="field full"><label>SOP document</label><div class="help">Use the <b>SOP</b> button in Deliverable Performance to upload/download the controlled SOP and record its last review date.</div></div>''',s,count=1,flags=re.S)

p.write_text(s,encoding='utf-8')
print('Task financial-statement mapping and SOP modal patch applied')
