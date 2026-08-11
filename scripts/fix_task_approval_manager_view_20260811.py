from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')


def repl(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'Missing patch anchor: {label}')
    s = s.replace(old, new, 1)

# 1) Make the current lens visible in the top bar.
repl(
'''    <div><h1 id="pageTitle">Finance Cockpit</h1><div class="small">Dynamic month-end management and performance history</div></div>''',
'''    <div><h1 id="pageTitle">Finance Cockpit</h1><div class="small">Dynamic month-end management and performance history · <span id="viewContext"><b>Manager View</b> · full team</span></div></div>''',
'view context'
)

# 2) Make Team Tasks explicitly show the operational four-stage workflow.
repl(
'''    <div class="help">Alex P. and Akram L. are intentionally left open: add, remove or change their tasks here. Edits become the recurring template used for future monthly periods.</div>
    <div class="section"><h2 id="teamTitle">Tasks</h2></div>
    <div class="table-wrap"><table><thead><tr><th>Task</th><th>Deadline</th><th>Workbook owner</th><th>Preparation</th><th>Approval</th><th>Entry</th><th>Review</th><th>SOP</th><th>Backup</th><th>Close critical</th><th></th></tr></thead><tbody id="teamBody"></tbody></table></div>''',
'''    <div class="help"><b>Task approval workflow:</b> Prepared → Approved → Entered → Reviewed. Completing a stage unlocks the next stage. When the next owner has a Teams email / UPN configured, the handoff is pushed to that person automatically.</div>
    <div class="section"><h2 id="teamTitle">Tasks</h2></div>
    <div class="table-wrap"><table><thead><tr><th>Task</th><th>Deadline</th><th>Workbook owner</th><th>Prepared</th><th>Approved</th><th>Entered</th><th>Reviewed</th><th>SOP</th><th>Backup</th><th>Close critical</th><th></th></tr></thead><tbody id="teamBody"></tbody></table></div>''',
'team workflow header'
)

# 3) Supporting workflow cell styling.
repl(
'''.help{padding:11px 13px;background:#0c1a2c;border:1px dashed #345277;border-radius:10px;color:var(--muted);font-size:12px}''',
'''.help{padding:11px 13px;background:#0c1a2c;border:1px dashed #345277;border-radius:10px;color:var(--muted);font-size:12px}
.stage-cell{min-width:145px}.stage-cell .stage-owner{font-weight:800}.stage-cell .stage-state{font-size:10px;color:var(--muted);margin-top:3px}.stage-cell.current{background:rgba(104,168,255,.055)}.stage-cell.done-cell{background:rgba(69,207,154,.035)}.stage-cell.unassigned{background:rgba(244,199,92,.04)}.stage-cell .btn{margin-top:6px;padding:5px 7px;font-size:10px}.view-context-manager{color:var(--blue)}.view-context-person{color:var(--green)}''',
'stage cell css'
)

# 4) The top view selector must materially change the operating lens.
repl(
'''function allTemplates(){return state.taskTemplates.filter(t=>t.active!==false)}
function periodTasks(){return allTemplates()}''',
'''function allTemplates(){return state.taskTemplates.filter(t=>t.active!==false)}
function periodTasks(){
 if(currentUser==="Manager View")return allTemplates();
 return allTemplates().filter(t=>t.person===currentUser||enabledStages(t).some(st=>personMatches(stageOwner(t,st),currentUser)))
}''',
'period task lens'
)

# 5) Add human workflow labels and active task-stage cells.
repl(
'''function stageOwner(t,s){return t.stageOwners?.[s]||"Unassigned"}
function taskStatus(t,period,now=new Date()){''',
'''function stageOwner(t,s){return t.stageOwners?.[s]||"Unassigned"}
const STAGE_DONE_LABEL={Preparation:"Prepared",Approval:"Approved",Entry:"Entered",Review:"Reviewed"};
const STAGE_ACTION_LABEL={Preparation:"Mark prepared",Approval:"Approve",Entry:"Mark entered",Review:"Mark reviewed"};
function taskStageCell(t,s){
 if(t.stageEnabled?.[s]===false)return '<td class="stage-cell"><span class="small">Skipped</span></td>';
 const ps=pstate(selectedPeriod,t.id),x=ps.stages?.[s],cur=currentStage(t,selectedPeriod),owner=stageOwner(t,s),hasTeams=!!String(state.settings?.teamsEmails?.[owner]||'').trim();
 if(x?.doneAt){const done=enabledStages(t).filter(st=>ps.stages?.[st]?.doneAt),last=done[done.length-1]===s;return `<td class="stage-cell done-cell"><div class="stage-owner">${esc(owner)}</div><div class="stage-state">✓ ${STAGE_DONE_LABEL[s]} · ${fmtDate(x.doneAt)}<br>${esc(x.doneBy||'')}</div>${last?`<button class="btn ghost" onclick="undoTaskStage('${t.id}','${s}')">Undo</button>`:''}</td>`}
 if(s===cur){if(owner==='Unassigned')return `<td class="stage-cell current unassigned"><div class="stage-owner">Unassigned</div><div class="stage-state">Current stage · assign an owner to enable Teams handoff.</div><button class="btn ghost" onclick="editTask('${t.id}')">Assign owner</button></td>`;if(currentUser==='Manager View')return `<td class="stage-cell current"><div class="stage-owner">${esc(owner)}</div><div class="stage-state">Current stage${hasTeams?' · Teams ready':''}<br>Select ${esc(owner)} in the top view to sign.</div></td>`;if(currentUser!==owner)return `<td class="stage-cell current"><div class="stage-owner">${esc(owner)}</div><div class="stage-state">Current stage${hasTeams?' · Teams ready':''}<br>Assigned to ${esc(owner)}.</div></td>`;return `<td class="stage-cell current"><div class="stage-owner">${esc(owner)}</div><div class="stage-state">Current stage${hasTeams?' · Teams handoff enabled':''}</div><button class="btn secondary" onclick="completeStage('${t.id}')">${STAGE_ACTION_LABEL[s]}</button></td>`}
 return `<td class="stage-cell"><div class="stage-owner">${esc(owner)}</div><div class="stage-state">Waiting for previous stage${hasTeams?' · Teams configured':''}</div></td>`
}
function taskStatus(t,period,now=new Date()){''',
'stage cell helpers'
)

# 6) Use user-facing stage labels in Live Close Workflow.
repl(
'''function workflowMarkup(t){
 const ps=pstate(selectedPeriod,t.id),cur=currentStage(t,selectedPeriod);
 return `<div class="workflow">${enabledStages(t).map((s,i)=>{const x=ps.stages?.[s];const stamp=x?.doneAt?`<span class="step-stamp">${fmtDate(x.doneAt)}<br>${esc(x.doneBy||"")}</span>`:"";return `${i?'<span class="arrow">→</span>':''}<span class="step ${x?.doneAt?'done':s===cur?'ready':'locked'}">${esc(s)}${x?.doneAt?' ✓':''}${stamp}</span>`}).join("")}</div>`
}''',
'''function workflowMarkup(t){
 const ps=pstate(selectedPeriod,t.id),cur=currentStage(t,selectedPeriod);
 return `<div class="workflow">${enabledStages(t).map((s,i)=>{const x=ps.stages?.[s];const stamp=x?.doneAt?`<span class="step-stamp">${fmtDate(x.doneAt)}<br>${esc(x.doneBy||"")}</span>`:"";return `${i?'<span class="arrow">→</span>':''}<span class="step ${x?.doneAt?'done':s===cur?'ready':'locked'}">${esc(STAGE_DONE_LABEL[s])}${x?.doneAt?' ✓':''}${stamp}</span>`}).join("")}</div>`
}''',
'workflow labels'
)

# 7) Audit-safe signoff and explicit undo for task stages.
repl(
'''async function completeStage(id){
 const t=state.taskTemplates.find(x=>x.id===id),st=currentStage(t,selectedPeriod);if(!st)return;await action({type:"stage_complete",period:selectedPeriod,taskId:id,stage:st,doneBy:currentUser,at:new Date().toISOString()});toast(`${t.name}: ${st} completed`)
}
async function undoLast(id){''',
'''async function completeStage(id){
 const t=state.taskTemplates.find(x=>x.id===id),st=currentStage(t,selectedPeriod);if(!st)return;const owner=stageOwner(t,st);
 if(owner==='Unassigned'){toast(`Assign an owner to ${st} before sign-off.`);return editTask(id)}
 if(currentUser==='Manager View'){toast(`Select ${owner} in the top view before signing ${STAGE_DONE_LABEL[st].toLowerCase()}.`);return}
 if(currentUser!==owner){toast(`${STAGE_DONE_LABEL[st]} is assigned to ${owner}. Select that person in the top view to sign.`);return}
 await action({type:"stage_complete",period:selectedPeriod,taskId:id,stage:st,doneBy:currentUser,at:new Date().toISOString()});toast(`${t.name}: ${STAGE_DONE_LABEL[st].toLowerCase()}`)
}
async function undoTaskStage(id,stage){const t=state.taskTemplates.find(x=>x.id===id);if(!t)return;if(!confirm(`Undo ${STAGE_DONE_LABEL[stage]} for ${t.name}? Later stages will also be reopened.`))return;await action({type:"stage_undo",period:selectedPeriod,taskId:id,stage});toast(`${t.name}: ${STAGE_DONE_LABEL[stage]} reopened`)}
async function undoLast(id){''',
'audit safe task signoff'
)

# 8) Deliverable signoff should also respect the selected operating identity.
repl(
'''async function completeHOStage(id){const h=state.headOfficeTemplate.find(x=>x.id===id);if(!h)return;const st=hoCurrentStage(h,selectedPeriod);if(!st)return;const at=new Date().toISOString(),auto=st==='Review'?autoDeliverableScore(h,selectedPeriod,at):null;await action({type:"ho_stage_complete",period:selectedPeriod,id,stage:st,doneBy:currentUser,at,bu:$("buSelect").value,autoScore:auto?.score??null,autoMinutesLate:auto?.minutesLate??null,dueAt:auto?.dueAt??null});toast(`${h.activity}: ${st==='Preparation'?'prepared':'reviewed'}`)}''',
'''async function completeHOStage(id){const h=state.headOfficeTemplate.find(x=>x.id===id);if(!h)return;const st=hoCurrentStage(h,selectedPeriod);if(!st)return;const owner=st==='Preparation'?hoPrepOwner(h):hoReviewOwner(h);if(owner==='Unassigned')return toast(`Assign an owner before ${st.toLowerCase()}.`);if(currentUser==='Manager View')return toast(`Select ${owner} in the top view before signing.`);if(currentUser!==owner)return toast(`${st==='Preparation'?'Preparation':'Review'} is assigned to ${owner}. Select that person in the top view to sign.`);const at=new Date().toISOString(),auto=st==='Review'?autoDeliverableScore(h,selectedPeriod,at):null;await action({type:"ho_stage_complete",period:selectedPeriod,id,stage:st,doneBy:currentUser,at,bu:$("buSelect").value,autoScore:auto?.score??null,autoMinutesLate:auto?.minutesLate??null,dueAt:auto?.dueAt??null});toast(`${h.activity}: ${st==='Preparation'?'prepared':'reviewed'}`)}''',
'audit safe deliverable signoff'
)

# 9) Team Tasks now shows real status/actions rather than only ownership names.
old_render_team = '''function renderTeam(){
 const tabs=$("personTabs");tabs.innerHTML=(state.users||[]).map(p=>`<button class="${p===teamPerson?'active':''}" onclick="setTeamPerson('${escAttr(p)}')">${esc(p)}</button>`).join("");$("teamTitle").textContent=`${teamPerson} · recurring task template`;
 const rows=allTemplates().filter(t=>t.person===teamPerson);$("teamBody").innerHTML=rows.map(t=>`<tr><td><b>${esc(t.name)}</b><div class="small">${esc(t.source||"Internal Close")}</div></td><td>${esc(t.day||"—")} ${esc(t.time||"")}</td><td>${esc(t.workbookOwner||"—")}</td>${STAGES.map(s=>`<td>${t.stageEnabled?.[s]===false?'<span class="small">Skipped</span>':esc(stageOwner(t,s))}</td>`).join("")}<td>${sopButton(t.sopUrl)}</td><td>${backupButton('task',t.id)}</td><td>${t.closeCritical?'<span class="pill warn">Yes</span>':'No'}</td><td><button class="btn secondary" onclick="editTask('${t.id}')">Edit</button> <button class="btn ghost" onclick="deleteTask('${t.id}')">Remove</button></td></tr>`).join("")||`<tr><td colspan="11"><div class="empty"><b>No fixed tasks yet.</b><br>Add tasks for ${esc(teamPerson)} directly in the dashboard.</div></td></tr>`
}'''
new_render_team = '''function renderTeam(){
 const tabs=$("personTabs");tabs.innerHTML=(state.users||[]).map(p=>`<button class="${p===teamPerson?'active':''}" onclick="setTeamPerson('${escAttr(p)}')">${esc(p)}</button>`).join("");$("teamTitle").textContent=`${teamPerson} · ${monthName(selectedPeriod)} task workflow`;
 const rows=allTemplates().filter(t=>t.person===teamPerson);$("teamBody").innerHTML=rows.map(t=>`<tr><td><b>${esc(t.name)}</b><div class="small">${esc(t.source||"Internal Close")}</div></td><td>${esc(t.day||"—")} ${esc(t.time||"")}</td><td>${esc(t.workbookOwner||"—")}</td>${STAGES.map(s=>taskStageCell(t,s)).join("")}<td>${sopButton(t.sopUrl)}</td><td>${backupButton('task',t.id)}</td><td>${t.closeCritical?'<span class="pill warn">Yes</span>':'No'}</td><td><button class="btn secondary" onclick="editTask('${t.id}')">Edit workflow</button> <button class="btn ghost" onclick="deleteTask('${t.id}')">Remove</button></td></tr>`).join("")||`<tr><td colspan="11"><div class="empty"><b>No fixed tasks yet.</b><br>Add tasks for ${esc(teamPerson)} directly in the dashboard.</div></td></tr>`
}'''
repl(old_render_team, new_render_team, 'render team workflow')

# 10) Task edit form uses the same user-facing labels.
repl(
''' ${STAGES.map(s=>`<div class="stage-grid full"><b>${s}</b><select name="owner_${s}">${opts(t.stageOwners?.[s]||((s==="Preparation")?(t.person||teamPerson):"Unassigned"))}</select><input type="number" min="0" name="offset_${s}" value="${Number(t.stageOffsets?.[s]??({Preparation:180,Approval:120,Entry:60,Review:0}[s]))}"><label><input type="checkbox" name="enabled_${s}" ${t.stageEnabled?.[s]===false?"":"checked"}> Enabled</label></div>`).join("")}''',
''' ${STAGES.map(s=>`<div class="stage-grid full"><b>${STAGE_DONE_LABEL[s]}</b><select name="owner_${s}">${opts(t.stageOwners?.[s]||((s==="Preparation")?(t.person||teamPerson):"Unassigned"))}</select><input type="number" min="0" name="offset_${s}" value="${Number(t.stageOffsets?.[s]??({Preparation:180,Approval:120,Entry:60,Review:0}[s]))}"><label><input type="checkbox" name="enabled_${s}" ${t.stageEnabled?.[s]===false?"":"checked"}> Enabled</label></div>`).join("")}''',
'task form labels'
)

# 11) A real Manager View / Personal View switch, with synchronized operational filters.
repl(
'''function renderAll(){initUsers();renderCockpit();renderWorkflow();renderHeadOffice();renderTeam();renderQuality();renderAutomation();renderImprovements();renderManagerKPI();renderManagementAnalytics();renderSettings();renderTeamManagement();refreshIntegrationStatus();updateAlertBanner()}''',
'''function renderAll(){initUsers();updateViewContext();renderCockpit();renderWorkflow();renderHeadOffice();renderTeam();renderQuality();renderAutomation();renderImprovements();renderManagerKPI();renderManagementAnalytics();renderSettings();renderTeamManagement();refreshIntegrationStatus();updateAlertBanner()}
function navigateToPage(page){document.querySelectorAll(".nav button").forEach(x=>x.classList.toggle("active",x.dataset.page===page));document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id===page));const b=document.querySelector(`.nav button[data-page="${page}"]`);if(b)$("pageTitle").textContent=b.textContent.replace(/^\\d+\\s*·\\s*/,"")}
function updateViewContext(){const manager=currentUser==='Manager View',el=$("viewContext");if(el){el.className=manager?'view-context-manager':'view-context-person';el.innerHTML=manager?'<b>Manager View</b> · full team':`<b>${esc(currentUser)}</b> · personal workflow`}}
function applyViewMode(navigate=true){const manager=currentUser==='Manager View';if($("workflowPersonFilter"))$("workflowPersonFilter").value=manager?'Manager View':currentUser;if($("hoPersonFilter"))$("hoPersonFilter").value=manager?'Manager View':currentUser;if(!manager&&(state.users||[]).includes(currentUser))teamPerson=currentUser;updateViewContext();if(navigate)navigateToPage(manager?'managerKpi':'workflow')}''',
'render all view behavior'
)

# 12) Replace navigation + current user handlers with the actual mode switch.
repl(
'''document.querySelectorAll(".nav button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav button").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(b.dataset.page).classList.add("active");$("pageTitle").textContent=b.textContent.replace(/^\\d+\\s*·\\s*/,"")});
$("periodSelect").onchange=e=>{selectedPeriod=e.target.value;renderAll()};$("currentUser").onchange=e=>{currentUser=e.target.value;localStorage.setItem("finance-current-user",currentUser);renderAll();checkAlerts(true)};''',
'''document.querySelectorAll(".nav button").forEach(b=>b.onclick=()=>navigateToPage(b.dataset.page));
$("periodSelect").onchange=e=>{selectedPeriod=e.target.value;renderAll()};$("currentUser").onchange=e=>{currentUser=e.target.value;localStorage.setItem("finance-current-user",currentUser);applyViewMode(true);renderAll();checkAlerts(true)};''',
'view selector handler'
)

# 13) On startup, synchronize filters/team without forcing a page jump.
repl(
''' initPeriods();serverMode=await detectServer();if(!serverMode)loadLocal();initUsers();$("connectionState").innerHTML=serverMode?'<span class="dot"></span>Shared live server':'Standalone browser mode';''',
''' initPeriods();serverMode=await detectServer();if(!serverMode)loadLocal();initUsers();applyViewMode(false);$("connectionState").innerHTML=serverMode?'<span class="dot"></span>Shared live server':'Standalone browser mode';''',
'initial view sync'
)

p.write_text(s, encoding='utf-8')
print('Task approval workflow and Manager View repaired.')
