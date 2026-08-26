from pathlib import Path
import re

INDEX=Path('index.html')
WORKER=Path('cloudflare-worker/src/index.js')
s=INDEX.read_text(encoding='utf-8')
w=WORKER.read_text(encoding='utf-8')

MARK='/* close-risk-opportunity-v1 */'
if MARK in s:
    print('Front-end patch already applied')
else:
    def rep(old,new,label):
        global s
        if old not in s:
            raise SystemExit(f'Missing index anchor: {label}')
        s=s.replace(old,new,1)

    # Responsive KPI layout + uploaded-file indicator styling.
    rep('.grid{display:grid;gap:13px}.kpis{grid-template-columns:repeat(5,minmax(150px,1fr));margin-bottom:14px}.two{grid-template-columns:1fr 1fr}.three{grid-template-columns:repeat(3,1fr)}',
        '.grid{display:grid;gap:13px}.kpis{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:14px}.two{grid-template-columns:1fr 1fr}.three{grid-template-columns:repeat(3,1fr)}',
        'kpi grid')
    rep('@media(max-width:1100px)',
        '''button.file-status-btn.file-present{background:rgba(69,207,154,.14);color:var(--green);border-color:rgba(69,207,154,.55)}\nbutton.file-status-btn.file-present:hover{background:rgba(69,207,154,.22)}\n.ro-type-risk{background:rgba(242,119,112,.12);color:var(--red)}.ro-type-opportunity{background:rgba(69,207,154,.12);color:var(--green)}\n.ro-priority-high{color:var(--red);font-weight:800}.ro-priority-medium{color:var(--amber);font-weight:800}\n'''+MARK+'\n@media(max-width:1100px)',
        'file status CSS')

    # Navigation: one combined Risks & Opportunities module.
    old_nav='''    <button data-page="quality">05 · Quality & Corrections</button>\n    <button data-page="automation">06 · Manual JEs & Automation</button>\n    <button data-page="improvement">07 · Improvements</button>\n    <button data-page="managerKpi">08 · Manager KPI</button>\n    <button data-page="settings">09 · Settings</button>'''
    new_nav='''    <button data-page="riskOpp">05 · Risks & Opportunities</button>\n    <button data-page="quality">06 · Quality & Corrections</button>\n    <button data-page="automation">07 · Manual JEs & Automation</button>\n    <button data-page="improvement">08 · Improvements</button>\n    <button data-page="managerKpi">09 · Manager KPI</button>\n    <button data-page="settings">10 · Settings</button>'''
    rep(old_nav,new_nav,'navigation')

    # Cockpit KPIs and current-close queue.
    old_ho='''      <div class="card"><div class="kpi-label">Deliverable Ifast score</div><div class="kpi-value" id="kpiHO">—</div><div class="kpi-meta">3 = on time/error-free</div></div>'''
    new_ho=old_ho+'''\n      <div class="card"><div class="kpi-label">SOP coverage</div><div class="kpi-value" id="kpiSOPCoverage">—</div><div class="kpi-meta" id="kpiSOPCoverageMeta">Controlled SOPs uploaded</div></div>\n      <div class="card"><div class="kpi-label">Open close actions</div><div class="kpi-value" id="kpiCloseActions">0</div><div class="kpi-meta">Risks & opportunities requiring action</div></div>'''
    rep(old_ho,new_ho,'cockpit SOP KPI')
    rep('''    <div class="section"><h2>Immediate close risks</h2></div>''',
        '''    <div class="section"><h2>Current-close risks & opportunities</h2><button type="button" class="btn ghost" onclick="navigateToPage('riskOpp')">Open register</button></div>\n    <div class="table-wrap"><table><thead><tr><th>Type</th><th>Action</th><th>Owner</th><th>Division / FS line</th><th>Due</th><th>Impact</th><th>Status</th><th></th></tr></thead><tbody id="cockpitCloseActionBody"></tbody></table></div>\n    <div class="section"><h2>Immediate recurring-task risks</h2></div>''',
        'cockpit close actions')

    # Workflow: expose current-close action items as transient close tasks.
    old_wf_cards='''    <div class="grid three">\n      <div class="card"><div class="kpi-label">Tasks fully reviewed</div><div class="kpi-value" id="wfDone">0</div><div class="kpi-meta">All four enabled stages completed</div></div>\n      <div class="card"><div class="kpi-label">Ready for action</div><div class="kpi-value" id="wfReady">0</div><div class="kpi-meta">Current unlocked stage</div></div>\n      <div class="card"><div class="kpi-label">Late / at risk</div><div class="kpi-value" id="wfBad">0</div><div class="kpi-meta">Needs intervention</div></div>\n    </div>'''
    new_wf_cards='''    <div class="grid kpis">\n      <div class="card"><div class="kpi-label">Tasks fully reviewed</div><div class="kpi-value" id="wfDone">0</div><div class="kpi-meta">All enabled stages completed</div></div>\n      <div class="card"><div class="kpi-label">Ready for action</div><div class="kpi-value" id="wfReady">0</div><div class="kpi-meta">Current unlocked stage</div></div>\n      <div class="card"><div class="kpi-label">Late / at risk</div><div class="kpi-value" id="wfBad">0</div><div class="kpi-meta">Recurring tasks needing intervention</div></div>\n      <div class="card"><div class="kpi-label">Open close actions</div><div class="kpi-value" id="wfCloseActions">0</div><div class="kpi-meta">Risk/opportunity action queue</div></div>\n    </div>\n    <div class="section"><h2>Current-close action queue</h2><button type="button" class="btn ghost" onclick="navigateToPage('riskOpp')">Manage risks & opportunities</button></div>\n    <div class="table-wrap"><table><thead><tr><th>Type</th><th>Action</th><th>Owner</th><th>Division / FS line</th><th>Due</th><th>Impact</th><th>Status</th><th></th></tr></thead><tbody id="workflowCloseActionBody"></tbody></table></div>'''
    rep(old_wf_cards,new_wf_cards,'workflow close action cards')

    # Risks & Opportunities page.
    risk_page='''  <section id="riskOpp" class="page">\n    <div class="grid kpis">\n      <div class="card"><div class="kpi-label">Open risks</div><div class="kpi-value" id="roOpenRisks">0</div><div class="kpi-meta">Current close</div></div>\n      <div class="card"><div class="kpi-label">Open opportunities</div><div class="kpi-value" id="roOpenOpps">0</div><div class="kpi-meta">Current close</div></div>\n      <div class="card"><div class="kpi-label">Material open items</div><div class="kpi-value" id="roMaterial">0</div><div class="kpi-meta">Based on current materiality</div></div>\n      <div class="card"><div class="kpi-label">Actions completed</div><div class="kpi-value" id="roCompleted">0</div><div class="kpi-meta">Current close</div></div>\n    </div>\n    <div class="section"><h2>Current-close risk & opportunity register</h2><button class="btn" id="addRiskOppBtn">+ Add item</button></div>\n    <div class="help">Use this register for issues, risks, opportunities, cleanups and one-time actions that must be addressed during the selected close. Open items automatically surface in the Finance Cockpit and Live Close Workflow until completed.</div>\n    <div class="table-wrap" style="margin-top:13px"><table><thead><tr><th>ID</th><th>Type</th><th>Item / required action</th><th>Division / FS line</th><th>Owner</th><th>Due</th><th>Impact</th><th>Priority</th><th>Status</th><th></th></tr></thead><tbody id="riskOppBody"></tbody></table></div>\n  </section>\n\n'''
    rep('  <section id="quality" class="page">',risk_page+'  <section id="quality" class="page">','risk page')

    # Manager KPI also shows SOP coverage.
    rep('''    <div class="grid three" style="margin-top:13px">\n      <div class="card"><div class="kpi-label">Team tasks done</div>''',
        '''    <div class="grid kpis" style="margin-top:13px">\n      <div class="card"><div class="kpi-label">Team tasks done</div>''',
        'manager kpi grid')
    old_mgr='''      <div class="card"><div class="kpi-label">Team average score</div><div class="kpi-value" id="managerTeamAvg">—</div><div class="kpi-meta">Weighted by completed task/deliverable observations</div></div>'''
    new_mgr=old_mgr+'''\n      <div class="card"><div class="kpi-label">SOP coverage</div><div class="kpi-value" id="managerSOPCoverage">—</div><div class="kpi-meta" id="managerSOPCoverageMeta">Controlled SOPs uploaded</div></div>'''
    rep(old_mgr,new_mgr,'manager SOP KPI')

    # Local state support for new close register.
    rep(''' if(a.type==="improvement_add")state.improvements.push(a.item); if(a.type==="improvement_delete")state.improvements=state.improvements.filter(x=>x.id!==a.id);''',
        ''' if(a.type==="improvement_add")state.improvements.push(a.item); if(a.type==="improvement_delete")state.improvements=state.improvements.filter(x=>x.id!==a.id);\n if(a.type==="riskop_add"){state.riskOpportunities??=[];state.riskOpportunities.push(a.item)}\n if(a.type==="riskop_update"){state.riskOpportunities??=[];const i=state.riskOpportunities.findIndex(x=>x.id===a.item.id);if(i>=0)state.riskOpportunities[i]={...state.riskOpportunities[i],...a.item}}\n if(a.type==="riskop_delete")state.riskOpportunities=(state.riskOpportunities||[]).filter(x=>x.id!==a.id);\n if(a.type==="riskop_complete"){const x=(state.riskOpportunities||[]).find(x=>x.id===a.id);if(x){x.status='Done';x.completedAt=a.at||new Date().toISOString();x.completedBy=a.doneBy||currentUser}}''',
        'local risk actions')
    rep('''for(const x of state.improvements||[])if(x.owner===oldName)x.owner=newName;state.settings??={};''',
        '''for(const x of state.improvements||[])if(x.owner===oldName)x.owner=newName;for(const x of state.riskOpportunities||[])if(x.owner===oldName)x.owner=newName;state.settings??={};''',
        'local rename risk owner')

    # File status cache, globally consistent buttons, and SOP KPI calculations.
    old_sop_btn="function sopButton(itemType,itemId,lastReviewed=''){const review=lastReviewed?`<div class=\"small\" style=\"margin-top:5px\">Reviewed ${esc(lastReviewed)}</div>`:'<div class=\"small\" style=\"margin-top:5px\">Not yet reviewed</div>';return `<button type=\"button\" class=\"btn ghost\" onclick=\"openSOP('${itemType}','${itemId}')\">SOP</button>${review}`}"
    if old_sop_btn not in s:
        raise SystemExit('Missing SOP button function anchor')
    new_sop_btn=r'''let fileStatusMap=new Map(),fileStatusPeriod='',fileStatusAt=0,fileStatusPromise=null;
function fileStatusKey(period,itemType,itemId){return `${period}|${itemType}|${itemId}`}
function hasUploadedFile(scope,itemType,itemId){const p=scope==='sop'?'SOP':selectedPeriod;return (fileStatusMap.get(fileStatusKey(p,itemType,itemId))||0)>0}
function sopCoverage(period=selectedPeriod){const items=[...allTemplates(period).map(x=>({type:'task',id:x.id})),...activeDeliverables(period).map(x=>({type:'deliverable',id:x.id}))];const uploaded=items.filter(x=>hasUploadedFile('sop',x.type,x.id)).length;return {uploaded,total:items.length,pct:items.length?uploaded/items.length:0}}
function updateFileIndicators(){
 document.querySelectorAll('[data-file-scope]').forEach(b=>{const has=hasUploadedFile(b.dataset.fileScope,b.dataset.itemType,b.dataset.itemId);b.classList.toggle('file-present',has);const label=b.dataset.fileScope==='sop'?'SOP':'Backup';b.textContent=has?`${label} ✓`:label});
 const c=sopCoverage();for(const [valueId,metaId] of [['kpiSOPCoverage','kpiSOPCoverageMeta'],['managerSOPCoverage','managerSOPCoverageMeta']]){const v=$(valueId),m=$(metaId);if(v)v.textContent=fileStatusAt?Math.round(c.pct*100)+'%':'—';if(m)m.textContent=fileStatusAt?`${c.uploaded} of ${c.total} active items have an SOP`:'Loading controlled-document status…'}
}
async function refreshFileStatus(force=false){
 if(!serverMode)return;const now=Date.now();if(!force&&fileStatusPeriod===selectedPeriod&&now-fileStatusAt<15000){updateFileIndicators();return}if(fileStatusPromise)return fileStatusPromise;
 fileStatusPromise=(async()=>{try{const q=new URLSearchParams({period:selectedPeriod});const r=await fetch(apiUrl('/api/file-status?'+q.toString()),{cache:'no-store'});if(!r.ok)throw new Error('file status unavailable');const rows=await r.json(),m=new Map();for(const x of rows)m.set(fileStatusKey(x.period,x.item_type,x.item_id),Number(x.file_count||0));fileStatusMap=m;fileStatusPeriod=selectedPeriod;fileStatusAt=Date.now();updateFileIndicators()}catch(e){}finally{fileStatusPromise=null}})();return fileStatusPromise
}
function sopButton(itemType,itemId,lastReviewed=''){const review=lastReviewed?`<div class="small" style="margin-top:5px">Reviewed ${esc(lastReviewed)}</div>`:'<div class="small" style="margin-top:5px">Not yet reviewed</div>';return `<button type="button" class="btn ghost file-status-btn" data-sop-open="1" data-file-scope="sop" data-item-type="${esc(itemType)}" data-item-id="${esc(itemId)}">SOP</button>${review}`}
'''
    s=s.replace(old_sop_btn,new_sop_btn,1)

    old_backup="function backupButton(itemType,itemId){return serverMode?`<button class=\"btn ghost\" onclick=\"openBackup('${itemType}','${itemId}')\">Files</button>`:'<span class=\"small\">Server only</span>'}"
    if old_backup not in s:
        raise SystemExit('Missing backup button anchor')
    s=s.replace(old_backup,"function backupButton(itemType,itemId){return serverMode?`<button type=\"button\" class=\"btn ghost file-status-btn\" data-backup-open=\"1\" data-file-scope=\"backup\" data-item-type=\"${esc(itemType)}\" data-item-id=\"${esc(itemId)}\">Backup</button>`:'<span class=\"small\">Server only</span>'}",1)

    # Workflow inline buttons also use the same delegated handlers and status colors.
    s=s.replace("<button class=\"btn ghost\" style=\"padding:3px 6px\" onclick=\"openSOP('task','${x.t.id}')\">SOP</button>","<button type=\"button\" class=\"btn ghost file-status-btn\" style=\"padding:3px 6px\" data-sop-open=\"1\" data-file-scope=\"sop\" data-item-type=\"task\" data-item-id=\"${esc(x.t.id)}\">SOP</button>",1)
    s=s.replace("<button class=\"btn ghost\" style=\"padding:3px 6px\" onclick=\"openBackup('task','${x.t.id}')\">Backup</button>","<button type=\"button\" class=\"btn ghost file-status-btn\" style=\"padding:3px 6px\" data-backup-open=\"1\" data-file-scope=\"backup\" data-item-type=\"task\" data-item-id=\"${esc(x.t.id)}\">Backup</button>",1)

    # Refresh indicators after file mutations.
    rep("input.value='';toast('SOP uploaded');await refreshSOPList(itemType,itemId)}","input.value='';toast('SOP uploaded');await refreshSOPList(itemType,itemId);await refreshFileStatus(true)}",'SOP upload refresh')
    rep("toast('SOP deleted');await refreshSOPList(itemType,itemId)}","toast('SOP deleted');await refreshSOPList(itemType,itemId);await refreshFileStatus(true)}",'SOP delete refresh')
    rep("toast('Backup uploaded');await refreshBackupList(itemType,itemId)}","toast('Backup uploaded');await refreshBackupList(itemType,itemId);await refreshFileStatus(true)}",'backup upload refresh')
    rep("toast('Backup deleted');await refreshBackupList(itemType,itemId)}","toast('Backup deleted');await refreshBackupList(itemType,itemId);await refreshFileStatus(true)}",'backup delete refresh')

    # Risks/opportunities register and close-action queue.
    anchor='function renderQuality(){'
    if anchor not in s: raise SystemExit('Missing renderQuality anchor')
    risk_js=r'''function riskOppRows(period=selectedPeriod){const rows=(state.riskOpportunities||[]).filter(x=>x.period===period);return currentUser==='Manager View'?rows:rows.filter(x=>personMatches(x.owner,currentUser))}
function openRiskOppRows(period=selectedPeriod){return riskOppRows(period).filter(x=>x.status!=='Done')}
function riskOppDue(x){return finalDue(x,x.period||selectedPeriod)}
function riskOppStatus(x){if(x.status==='Done')return {label:'Done',cls:'good'};const d=riskOppDue(x);if(d){const mins=(d-new Date())/60000;if(mins<0)return {label:`Late ${Math.ceil(-mins)}m`,cls:'bad'};if(mins<=Number(state.settings.warnMinutes||60))return {label:`Due in ${Math.max(0,Math.floor(mins))}m`,cls:'warn'}}return {label:x.status||'Open',cls:x.status==='In progress'?'neutral':'neutral'}}
function nextRiskOppId(){const prefix=`RO-${selectedPeriod.replace('-','')}-`,nums=(state.riskOpportunities||[]).filter(x=>String(x.displayId||'').startsWith(prefix)).map(x=>Number(String(x.displayId).slice(prefix.length))||0);return prefix+String(Math.max(0,...nums)+1).padStart(3,'0')}
function riskOppTypePill(x){return `<span class="pill ${x.type==='Risk'?'ro-type-risk':'ro-type-opportunity'}">${esc(x.type)}</span>`}
function renderCloseActionRows(bodyId,limit=99){const body=$(bodyId);if(!body)return;const rows=openRiskOppRows().sort((a,b)=>{const da=riskOppDue(a)?.getTime()??Infinity,db=riskOppDue(b)?.getTime()??Infinity;return da-db}).slice(0,limit);body.innerHTML=rows.map(x=>{const st=riskOppStatus(x),due=riskOppDue(x);return `<tr><td>${riskOppTypePill(x)}</td><td><b>${esc(x.title)}</b><div class="small">${esc(x.actionText||'')}</div></td><td>${esc(x.owner||'Unassigned')}</td><td>${esc(x.division||'—')}<div class="small">${esc(x.financialStatementLine||'—')}</div></td><td>${due?fmtDate(due):esc(x.day||'—')}</td><td>${money(x.impactAmount||0)}</td><td><span class="pill ${st.cls}">${esc(st.label)}</span></td><td><button type="button" class="btn secondary" onclick="completeRiskOpp('${x.id}')">Done</button></td></tr>`}).join('')||`<tr><td colspan="8" class="empty">No open current-close actions.</td></tr>`}
function renderRiskOpportunities(){const rows=riskOppRows(),open=rows.filter(x=>x.status!=='Done'),done=rows.filter(x=>x.status==='Done');$('roOpenRisks').textContent=open.filter(x=>x.type==='Risk').length;$('roOpenOpps').textContent=open.filter(x=>x.type==='Opportunity').length;$('roMaterial').textContent=open.filter(x=>isMaterialAmount(x.impactAmount,`${x.title||''} ${x.actionText||''} ${x.financialStatementLine||''}`)).length;$('roCompleted').textContent=done.length;$('riskOppBody').innerHTML=rows.sort((a,b)=>(a.status==='Done')-(b.status==='Done')||((riskOppDue(a)?.getTime()??Infinity)-(riskOppDue(b)?.getTime()??Infinity))).map(x=>{const st=riskOppStatus(x),due=riskOppDue(x);return `<tr><td><b>${esc(x.displayId||x.id)}</b></td><td>${riskOppTypePill(x)}</td><td><b>${esc(x.title)}</b><div class="small">${esc(x.actionText||'')}</div></td><td>${esc(x.division||'—')}<div class="small">${esc(x.financialStatementLine||'—')}</div></td><td>${esc(x.owner||'Unassigned')}</td><td>${due?fmtDate(due):esc(x.day||'—')}</td><td>${money(x.impactAmount||0)}</td><td><span class="${x.priority==='High'?'ro-priority-high':x.priority==='Medium'?'ro-priority-medium':''}">${esc(x.priority||'Medium')}</span></td><td><span class="pill ${st.cls}">${esc(st.label)}</span>${x.completedAt?`<div class="small">${fmtDate(x.completedAt)} · ${esc(x.completedBy||'')}</div>`:''}</td><td>${x.status!=='Done'?`<button type="button" class="btn secondary" onclick="completeRiskOpp('${x.id}')">Done</button> `:''}<button type="button" class="btn ghost" onclick="editRiskOpp('${x.id}')">Edit</button> <button type="button" class="btn ghost" onclick="deleteRiskOpp('${x.id}')">Delete</button></td></tr>`}).join('')||`<tr><td colspan="10" class="empty">No risks or opportunities logged for this close.</td></tr>`}
function riskOppForm(x={}){const owner=x.owner||((state.users||[]).includes(currentUser)?currentUser:'Unassigned');return `<div class="form-grid"><div class="field"><label>ID</label><input readonly value="${esc(x.displayId||nextRiskOppId())}" name="displayId"></div><div class="field"><label>Type</label><select name="type"><option ${x.type==='Risk'||!x.type?'selected':''}>Risk</option><option ${x.type==='Opportunity'?'selected':''}>Opportunity</option></select></div><div class="field full"><label>Risk / opportunity</label><input name="title" required value="${esc(x.title||'')}"></div><div class="field full"><label>Action required during this close</label><textarea name="actionText" required>${esc(x.actionText||'')}</textarea></div><div class="field"><label>Owner</label><select name="owner"><option>Unassigned</option>${(state.users||[]).map(u=>`<option ${u===owner?'selected':''}>${esc(u)}</option>`).join('')}</select></div><div class="field"><label>Priority</label><select name="priority"><option ${x.priority==='High'?'selected':''}>High</option><option ${x.priority==='Medium'||!x.priority?'selected':''}>Medium</option><option ${x.priority==='Low'?'selected':''}>Low</option></select></div><div class="field"><label>Division</label><select name="division" required>${taskDivisionOptions(x.division||'')}</select></div><div class="field"><label>Financial statement line</label><input name="financialStatementLine" list="fsLineSuggestions" required value="${esc(x.financialStatementLine||'')}">${fsLineDatalist()}</div><div class="field"><label>Impact / exposure / benefit (CAD)</label><input name="impactAmount" type="number" step="0.01" value="${Number(x.impactAmount||0)}"></div><div class="field"><label>Status</label><select name="status"><option ${x.status==='Open'||!x.status?'selected':''}>Open</option><option ${x.status==='In progress'?'selected':''}>In progress</option><option ${x.status==='Done'?'selected':''}>Done</option></select></div><div class="field"><label>Due working day</label><input name="day" value="${esc(x.day||'WD2')}" placeholder="WD-1, WD1, WD2 — no WD0"></div><div class="field"><label>Due time ET</label><input name="time" type="time" value="${esc(x.time||'17:00')}"></div></div><div class="modal-actions"><button type="button" class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" type="submit">Save item</button></div>`}
function riskOppFromForm(fd,id,existing={}){const o=Object.fromEntries(fd.entries()),now=new Date().toISOString(),done=o.status==='Done';return {id,displayId:o.displayId||existing.displayId||nextRiskOppId(),period:existing.period||selectedPeriod,type:o.type,title:o.title.trim(),actionText:o.actionText.trim(),owner:o.owner,division:o.division,financialStatementLine:(o.financialStatementLine||'').trim(),impactAmount:Number(o.impactAmount||0),priority:o.priority,status:o.status,day:o.day.trim(),time:o.time||'17:00',createdAt:existing.createdAt||now,createdBy:existing.createdBy||currentUser,completedAt:done?(existing.completedAt||now):null,completedBy:done?(existing.completedBy||currentUser):''}}
function addRiskOpp(){openModal('Add current-close risk / opportunity',riskOppForm(),async fd=>{const item=riskOppFromForm(fd,uid('ro'));await action({type:'riskop_add',item});closeModal();toast('Close action added')})}
function editRiskOpp(id){const x=(state.riskOpportunities||[]).find(x=>x.id===id);if(!x)return;openModal('Edit current-close risk / opportunity',riskOppForm(x),async fd=>{await action({type:'riskop_update',item:riskOppFromForm(fd,id,x)});closeModal();toast('Close action updated')})}
async function completeRiskOpp(id){const x=(state.riskOpportunities||[]).find(x=>x.id===id);if(!x)return;if(currentUser==='Manager View'&&x.owner&&x.owner!=='Unassigned')return toast(`Select ${x.owner} in the top view to complete this action.`);if(x.owner&&x.owner!=='Unassigned'&&currentUser!==x.owner)return toast(`This action is assigned to ${x.owner}.`);await action({type:'riskop_complete',id,at:new Date().toISOString(),doneBy:currentUser});toast('Close action completed')}
function deleteRiskOpp(id){if(confirm('Delete this current-close risk/opportunity item?'))action({type:'riskop_delete',id})}

'''
    s=s.replace(anchor,risk_js+anchor,1)

    # Render queues and KPIs on cockpit/workflow.
    rep(''' const hm=hoMetrics(selectedPeriod,"Ifast");$("kpiHO").textContent=hm.avg===null?"—":hm.avg.toFixed(2);''',
        ''' const hm=hoMetrics(selectedPeriod,"Ifast");$("kpiHO").textContent=hm.avg===null?"—":hm.avg.toFixed(2);$("kpiCloseActions").textContent=openRiskOppRows().length;''',
        'cockpit close action KPI js')
    rep(''' const body=$("cockpitRiskBody");body.innerHTML=risks.slice(0,12).map(x=>riskRow(x)).join("")||`<tr><td colspan="7" class="empty">No tasks are currently late or inside the warning threshold.</td></tr>`;\n drawHOTrend''',
        ''' const body=$("cockpitRiskBody");body.innerHTML=risks.slice(0,12).map(x=>riskRow(x)).join("")||`<tr><td colspan="7" class="empty">No tasks are currently late or inside the warning threshold.</td></tr>`;renderCloseActionRows("cockpitCloseActionBody",10);\n drawHOTrend''',
        'cockpit queue render')
    rep(''' $("wfDone").textContent=rows.filter(x=>x.status.code==="done").length;$("wfReady").textContent=rows.filter(x=>x.status.code==="ready").length;$("wfBad").textContent=rows.filter(x=>["late","risk"].includes(x.status.code)).length;''',
        ''' $("wfDone").textContent=rows.filter(x=>x.status.code==="done").length;$("wfReady").textContent=rows.filter(x=>x.status.code==="ready").length;$("wfBad").textContent=rows.filter(x=>["late","risk"].includes(x.status.code)).length;$("wfCloseActions").textContent=openRiskOppRows().length;renderCloseActionRows("workflowCloseActionBody");''',
        'workflow queue render')

    # One render map entry + file-status refresh on every rendered page.
    rep('''const map={cockpit:renderCockpit,workflow:renderWorkflow,headOffice:renderHeadOffice,team:renderTeam,quality:renderQuality,automation:renderAutomation,improvement:renderImprovements,managerKpi:()=>{renderManagerKPI();renderManagementAnalytics()},settings:()=>{renderSettings();renderTeamManagement()}};''',
        '''const map={cockpit:renderCockpit,workflow:renderWorkflow,headOffice:renderHeadOffice,team:renderTeam,riskOpp:renderRiskOpportunities,quality:renderQuality,automation:renderAutomation,improvement:renderImprovements,managerKpi:()=>{renderManagerKPI();renderManagementAnalytics()},settings:()=>{renderSettings();renderTeamManagement()}};''',
        'render page map')
    rep(''' const fn=map[page];if(fn)fn()\n}''',''' const fn=map[page];if(fn)fn();updateFileIndicators();void refreshFileStatus(false)\n}''','render file status')

    # Alert banner includes current-close action items so they visibly follow the close.
    start=s.find('function updateAlertBanner(){')
    end=s.find('function notify(){ return; }',start)
    if start<0 or end<0: raise SystemExit('Missing alert banner block')
    s=s[:start]+r'''function updateAlertBanner(){
 const taskRisks=getRiskTasks(currentPeriod()).filter(x=>personMatches(stageOwner(x.t,x.st),currentUser));
 const closeItems=(state.riskOpportunities||[]).filter(x=>x.period===currentPeriod()&&x.status!=='Done'&&(currentUser==='Manager View'||personMatches(x.owner,currentUser)));
 const box=$("alertBox"),n=taskRisks.length+closeItems.length;if(n){const details=[...closeItems.slice(0,2).map(x=>`${esc(x.type)}: ${esc(x.title)}`),...taskRisks.slice(0,2).map(x=>`${esc(x.t.name)} (${esc(x.st)} — ${esc(x.status.label)})`)].slice(0,3);box.classList.add("show");box.innerHTML=`<b>${n} close action${n===1?'':'s'} need attention.</b> ${details.join(' · ')}` }else{box.classList.remove("show");box.innerHTML=""}
}
''' + s[end:]

    # Delegated file button clicks guarantee identical behavior on Team Tasks, Workflow and Deliverables.
    nav_anchor='document.querySelectorAll(".nav button").forEach(b=>b.onclick=()=>navigateToPage(b.dataset.page));'
    delegate=r'''document.addEventListener('click',e=>{const sop=e.target.closest('[data-sop-open]');if(sop){e.preventDefault();e.stopPropagation();void openSOP(sop.dataset.itemType,sop.dataset.itemId);return}const backup=e.target.closest('[data-backup-open]');if(backup){e.preventDefault();e.stopPropagation();void openBackup(backup.dataset.itemType,backup.dataset.itemId)}});
'''
    rep(nav_anchor,delegate+nav_anchor,'delegated file clicks')

    # Add register button handler and refresh file status when period changes / app starts.
    rep('''$("periodSelect").onchange=e=>{selectedPeriod=e.target.value;renderSharedChrome();renderPage(activePageId())};''',
        '''$("periodSelect").onchange=e=>{selectedPeriod=e.target.value;fileStatusPeriod='';fileStatusAt=0;renderSharedChrome();renderPage(activePageId());void refreshFileStatus(true)};''',
        'period file refresh')
    rep('''$("addHODeliverableBtn").onclick=addHODeliverable;''','''$("addHODeliverableBtn").onclick=addHODeliverable;$("addRiskOppBtn").onclick=addRiskOpp;''','risk add handler')
    rep('''renderAll();connectEvents();''','''renderAll();await refreshFileStatus(true);connectEvents();''','initial file status')

    # Legacy SOP override was the root cause of inconsistent buttons. Remove it completely.
    legacy_start=s.find("  if (typeof sopButton === 'function') {")
    if legacy_start>=0:
        legacy_end=s.find('  function addSopSettingsCard()',legacy_start)
        if legacy_end<0: raise SystemExit('Could not bound legacy SOP override')
        s=s[:legacy_start]+s[legacy_end:]
    s=s.replace('Create the controlled Word SOP in the approved repository, then paste its SharePoint/OneDrive link into the task or deliverable SOP field.','Download the Word template from the SOP window, complete the controlled SOP, then upload the approved/current document back to the same SOP window.')

    INDEX.write_text(s,encoding='utf-8')
    print('Front-end risk/SOP patch applied')

# Worker: one aggregated file-status query + persistent risk/opportunity actions. No operational state seeding.
WMARK='// close-risk-opportunity-v1'
if WMARK in w:
    print('Worker patch already applied')
else:
    def wrep(old,new,label):
        global w
        if old not in w: raise SystemExit(f'Missing worker anchor: {label}')
        w=w.replace(old,new,1)

    wrep("async function listFiles(env,period,itemType,itemId){await ensureFilesTable(env);const sql=sqlFor(env);return await sql`SELECT id,file_name,content_type,size_bytes,uploaded_at,uploaded_by FROM dashboard_files WHERE period=${period} AND item_type=${itemType} AND item_id=${itemId} ORDER BY uploaded_at DESC`}",
         "async function listFiles(env,period,itemType,itemId){await ensureFilesTable(env);const sql=sqlFor(env);return await sql`SELECT id,file_name,content_type,size_bytes,uploaded_at,uploaded_by FROM dashboard_files WHERE period=${period} AND item_type=${itemType} AND item_id=${itemId} ORDER BY uploaded_at DESC`}\nasync function listFileStatus(env,period){await ensureFilesTable(env);const sql=sqlFor(env);return await sql`SELECT period,item_type,item_id,COUNT(*)::int AS file_count,MAX(uploaded_at) AS last_uploaded FROM dashboard_files WHERE period='SOP' OR period=${period} GROUP BY period,item_type,item_id`}\n"+WMARK,
         'worker file status function')
    wrep("  } else if (a.type === 'settings_update') {",
         "  } else if (a.type === 'riskop_add') {\n    state.riskOpportunities ??= []; state.riskOpportunities.push(a.item);\n  } else if (a.type === 'riskop_update') {\n    state.riskOpportunities ??= []; const i = state.riskOpportunities.findIndex(x => x.id === a.item.id); if (i >= 0) state.riskOpportunities[i] = { ...state.riskOpportunities[i], ...a.item };\n  } else if (a.type === 'riskop_delete') {\n    state.riskOpportunities = (state.riskOpportunities || []).filter(x => x.id !== a.id);\n  } else if (a.type === 'riskop_complete') {\n    const x = (state.riskOpportunities || []).find(x => x.id === a.id); if (x) { x.status = 'Done'; x.completedAt = a.at || new Date().toISOString(); x.completedBy = a.doneBy || ''; }\n  } else if (a.type === 'settings_update') {",
         'worker risk actions')
    wrep("      for (const x of state.improvements || []) if (x.owner === oldName) x.owner = newName;",
         "      for (const x of state.improvements || []) if (x.owner === oldName) x.owner = newName;\n      for (const x of state.riskOpportunities || []) if (x.owner === oldName) x.owner = newName;",
         'worker rename risk owner')
    wrep("      if (url.pathname === '/api/files' && request.method === 'GET') {\n        return json(await listFiles(env, url.searchParams.get('period') || '', url.searchParams.get('itemType') || '', url.searchParams.get('itemId') || ''));\n      }",
         "      if (url.pathname === '/api/file-status' && request.method === 'GET') return json(await listFileStatus(env, url.searchParams.get('period') || ''));\n      if (url.pathname === '/api/files' && request.method === 'GET') {\n        return json(await listFiles(env, url.searchParams.get('period') || '', url.searchParams.get('itemType') || '', url.searchParams.get('itemId') || ''));\n      }",
         'worker file status route')
    WORKER.write_text(w,encoding='utf-8')
    print('Worker risk/SOP patch applied')
