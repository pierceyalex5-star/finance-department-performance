from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Missing anchor: {label}")
    return text.replace(old, new, 1)


def replace_region(text, start, end, new, label):
    i = text.find(start)
    if i < 0:
        raise SystemExit(f"Missing start anchor: {label}")
    j = text.find(end, i + len(start))
    if j < 0:
        raise SystemExit(f"Missing end anchor: {label}")
    return text[:i] + new + text[j:]


p = Path("index.html")
s = p.read_text(encoding="utf-8")

# Deliverables controls + workflow/SOP columns.
s = replace_once(
    s,
    '<div class="controls"><select id="buSelect"><option>IRM</option><option>SWG</option><option selected>Ifast</option><option>Corp.</option><option>FP&A Corp.</option></select><button class="btn" id="addHODeliverableBtn">+ Add deliverable</button></div>',
    '<div class="controls"><select id="buSelect"><option>IRM</option><option>SWG</option><option selected>Ifast</option><option>Corp.</option><option>FP&A Corp.</option></select><select id="hoPersonFilter"></select><button class="btn" id="addHODeliverableBtn">+ Add deliverable</button></div>',
    "deliverables controls",
)
s = replace_once(
    s,
    '<div class="table-wrap"><table><thead><tr><th>Deliverable</th><th>Day</th><th>Time ET</th><th>Owner</th><th>Sign-off</th><th>Score</th><th>Interpretation</th><th></th></tr></thead><tbody id="hoBody"></tbody></table></div>',
    '<div class="table-wrap"><table><thead><tr><th>Deliverable</th><th>Day</th><th>Time ET</th><th>Function</th><th>Prepared by</th><th>Reviewed by</th><th>Workflow</th><th>SOP</th><th>Score</th><th>Interpretation</th><th></th></tr></thead><tbody id="hoBody"></tbody></table></div>',
    "deliverables table header",
)
s = replace_once(
    s,
    '<div class="table-wrap"><table><thead><tr><th>Task</th><th>Deadline</th><th>Workbook owner</th><th>Preparation</th><th>Approval</th><th>Entry</th><th>Review</th><th>Close critical</th><th></th></tr></thead><tbody id="teamBody"></tbody></table></div>',
    '<div class="table-wrap"><table><thead><tr><th>Task</th><th>Deadline</th><th>Workbook owner</th><th>Preparation</th><th>Approval</th><th>Entry</th><th>Review</th><th>SOP</th><th>Close critical</th><th></th></tr></thead><tbody id="teamBody"></tbody></table></div>',
    "team SOP table header",
)

# Settings: explicit Quebec calendar plus employer Easter choice; manual dates remain additive.
s = replace_once(
    s,
    '<div class="field full"><label>Holidays / non-working dates (YYYY-MM-DD, comma separated)</label><input id="holidayInput" placeholder="2026-09-07, 2026-10-12"></div>',
    '<div class="field"><label>Holiday calendar</label><select id="holidayRegion"><option value="QC">Québec, Canada</option><option value="manual">Manual dates only</option></select></div><div class="field"><label>Easter statutory holiday</label><select id="easterHoliday"><option value="good_friday">Good Friday</option><option value="easter_monday">Easter Monday</option></select></div><div class="field full"><label>Additional company holidays / non-working dates (YYYY-MM-DD, comma separated)</label><input id="holidayInput" placeholder="2026-12-24, 2026-12-31"></div><div class="field full"><div class="small">WD always excludes Saturday and Sunday. Québec mode also excludes CNESST statutory holidays; add plant/company shutdown dates above when needed.</div></div>',
    "holiday settings",
)

# Replace business-day calculation with Quebec statutory calendar support.
new_business = r'''function localISO(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function easterSunday(year){
 const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
 return new Date(year,month-1,day,12,0,0)
}
function mondayBeforeMay25(year){let d=new Date(year,4,24,12,0,0);while(d.getDay()!==1)d.setDate(d.getDate()-1);return d}
function nthWeekday(year,month,weekday,n){let d=new Date(year,month,1,12,0,0),count=0;while(true){if(d.getDay()===weekday&&++count===n)return d;d.setDate(d.getDate()+1)}}
function quebecHolidayDates(year){
 if((state.settings.holidayRegion||"QC")!=="QC")return [];
 const dates=[new Date(year,0,1,12),mondayBeforeMay25(year),new Date(year,5,24,12),new Date(year,6,1,12),nthWeekday(year,8,1,1),nthWeekday(year,9,1,2),new Date(year,11,25,12)];
 const easter=easterSunday(year),easterChoice=state.settings.easterHoliday||"good_friday";dates.push(addDays(easter,easterChoice==="easter_monday"?1:-2));
 const june24=dates[2];if(june24.getDay()===0)dates.push(new Date(year,5,25,12));
 const july1=dates[3];if(july1.getDay()===0)dates.push(new Date(year,6,2,12));
 return dates.map(localISO)
}
function isBusinessDay(d){const day=d.getDay(),iso=localISO(d),manual=state.settings.holidays||[],qc=quebecHolidayDates(d.getFullYear());return day!==0&&day!==6&&!manual.includes(iso)&&!qc.includes(iso)}
'''
s = replace_region(s, "function isBusinessDay", "function businessDay", new_business, "business-day functions")

# Add deliverable workflow mutations to local/offline mode.
s = replace_once(
    s,
    ' if(a.type==="ho_template_delete"){const h=state.headOfficeTemplate.find(x=>x.id===a.id);if(h)h.active=false}\n',
    ' if(a.type==="ho_template_delete"){const h=state.headOfficeTemplate.find(x=>x.id===a.id);if(h)h.active=false}\n if(a.type==="ho_stage_complete"){state.deliverableStates??={};state.deliverableStates[a.period]??={};state.deliverableStates[a.period][a.id]??={};const ds=state.deliverableStates[a.period][a.id];if(a.stage==="Preparation"){ds.preparedAt=a.at||new Date().toISOString();ds.preparedDoneBy=a.doneBy||currentUser;delete ds.reviewedAt;delete ds.reviewedDoneBy}else if(a.stage==="Review"&&ds.preparedAt){ds.reviewedAt=a.at||new Date().toISOString();ds.reviewedDoneBy=a.doneBy||currentUser}}\n if(a.type==="ho_stage_undo"){const ds=state.deliverableStates?.[a.period]?.[a.id];if(ds){if(a.stage==="Preparation"){delete ds.preparedAt;delete ds.preparedDoneBy;delete ds.reviewedAt;delete ds.reviewedDoneBy}else{delete ds.reviewedAt;delete ds.reviewedDoneBy}}}\n',
    "local deliverable workflow actions",
)

# Include Deliverables person filter among team-member selectors.
new_init_users = r'''function initUsers(){
 const opts=["Manager View",...state.users];
 for(const id of ["currentUser","workflowPersonFilter","hoPersonFilter"]){
   const el=$(id);if(!el)continue;const previous=el.value || (id==="currentUser"?currentUser:"Manager View");
   el.innerHTML="";
   opts.forEach(u=>{const o=document.createElement("option");o.value=u;o.textContent=(id==="hoPersonFilter"&&u==="Manager View")?"All people":u;if(previous===u)o.selected=true;el.appendChild(o)})
 }
}
'''
s = replace_region(s, "function initUsers", "function renderCockpit", new_init_users, "initUsers")

# Deliverables rendering, filtering, workflow and SOP presentation.
new_render_ho = r'''function renderHeadOffice(){
 const bu=$("buSelect").value||"Ifast",person=$("hoPersonFilter")?.value||"Manager View",m=hoMetrics(selectedPeriod,bu);$("hoAvg").textContent=m.avg===null?"—":m.avg.toFixed(2);$("hoGreen").textContent=m.green===null?"—":Math.round(m.green*100)+"%";$("hoRed").textContent=m.n?m.red:"—";
 const scores=hoScores(selectedPeriod,bu), rows=state.headOfficeTemplate.filter(h=>h.active!==false).filter(h=>person==="Manager View"||personMatches(hoPrepOwner(h),person)||personMatches(hoReviewOwner(h),person));
 $("hoBody").innerHTML=rows.map(h=>{const v=scores[h.activity]??"",[lab,cls]=scoreLabel(v),ds=hoPState(selectedPeriod,h.id);return `<tr><td><b>${esc(h.activity)}</b></td><td>${esc(h.day||"—")}</td><td>${esc(h.time||"—")}</td><td>${esc(h.owner||"—")}</td><td>${ownerProgress(hoPrepOwner(h),ds.preparedAt,ds.preparedDoneBy)}</td><td>${ownerProgress(hoReviewOwner(h),ds.reviewedAt,ds.reviewedDoneBy)}</td><td>${hoWorkflowMarkup(h)}</td><td>${sopButton(h.sopUrl)}</td><td><select class="score-select ${cls}" onchange="setHOScore('${escAttr(h.activity)}',this.value)"><option value="" ${v===""?"selected":""}>Not scored</option><option value="3" ${Number(v)===3?"selected":""}>3</option><option value="2" ${Number(v)===2?"selected":""}>2</option><option value="1" ${Number(v)===1?"selected":""}>1</option><option value="0" ${Number(v)===0||String(v).toLowerCase().includes("not sent")?"selected":""}>0 / Not sent</option></select></td><td><span class="pill ${cls}">${lab}</span></td><td><button class="btn secondary" onclick="editHODeliverable('${h.id}')">Edit</button> <button class="btn ghost" onclick="deleteHODeliverable('${h.id}')">Delete</button></td></tr>`}).join("")||`<tr><td colspan="11" class="empty">No active deliverables match this filter.</td></tr>`;drawHOTrend("hoBUCanvas",bu)
}
'''
s = replace_region(s, "function renderHeadOffice", "function hoDeliverableForm", new_render_ho, "renderHeadOffice")

new_ho_form = r'''function deliverablePersonOptions(value){const list=["Unassigned",...(state.users||[])];if(value&&!list.includes(value))list.push(value);return list.map(u=>`<option value="${esc(u)}" ${u===value?"selected":""}>${esc(u)}</option>`).join("")}
function hoDeliverableForm(h={}){
 const prep=h.preparedBy||((state.users||[]).includes(h.owner)?h.owner:"Unassigned"),review=h.reviewedBy||h.signoffOwner||"Unassigned";
 return `<div class="form-grid"><div class="field full"><label>Deliverable</label><input name="activity" required value="${esc(h.activity||"")}"></div><div class="field"><label>Working day / due day</label><input name="day" value="${esc(h.day||"")}" placeholder="WD1, WD2, etc."></div><div class="field"><label>Time ET</label><input name="time" type="time" value="${esc(h.time||"12:00")}"></div><div class="field"><label>Owner / function</label><input name="owner" value="${esc(h.owner||"")}" placeholder="FP&A Corp., Ifast, etc."></div><div class="field"><label>Prepared by</label><select name="preparedBy">${deliverablePersonOptions(prep)}</select></div><div class="field"><label>Reviewed by</label><select name="reviewedBy">${deliverablePersonOptions(review)}</select></div><div class="field full"><label>SOP link</label><input name="sopUrl" type="url" value="${esc(h.sopUrl||"")}" placeholder="https://... (SharePoint, OneDrive, Google Drive, PDF, etc.)"></div></div><div class="modal-actions"><button type="button" class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" type="submit">Save deliverable</button></div>`
}
'''
s = replace_region(s, "function hoDeliverableForm", "function addHODeliverable", new_ho_form, "hoDeliverableForm")

new_ho_edit = r'''function addHODeliverable(){openModal("Add deliverable",hoDeliverableForm(),async fd=>{const o=Object.fromEntries(fd.entries());await action({type:"ho_template_add",item:{id:uid("ho"),activity:o.activity.trim(),day:o.day.trim(),time:o.time,owner:o.owner.trim(),preparedBy:o.preparedBy,reviewedBy:o.reviewedBy,signoffOwner:o.reviewedBy,sopUrl:o.sopUrl.trim(),active:true}});closeModal();toast("Deliverable added")})}
function editHODeliverable(id){const h=state.headOfficeTemplate.find(x=>x.id===id);if(!h)return;openModal("Edit deliverable",hoDeliverableForm(h),async fd=>{const o=Object.fromEntries(fd.entries()),oldActivity=h.activity,newActivity=o.activity.trim();await action({type:"ho_template_update",item:{id,activity:newActivity,day:o.day.trim(),time:o.time,owner:o.owner.trim(),preparedBy:o.preparedBy,reviewedBy:o.reviewedBy,signoffOwner:o.reviewedBy,sopUrl:o.sopUrl.trim(),active:true},oldActivity});closeModal();toast("Deliverable updated")})}
'''
s = replace_region(s, "function addHODeliverable", "function updateHOSignoff", new_ho_edit, "deliverable add/edit")
s = replace_region(s, "function updateHOSignoff", "function deleteHODeliverable", "", "remove inline signoff editor")

new_ho_helpers = r'''function setHOScore(activity,value){action({type:"ho_score",period:selectedPeriod,bu:$("buSelect").value,activity,value:value===""?"":Number(value)})}
function hoPState(period,id){return state.deliverableStates?.[period]?.[id]||{}}
function hoPrepOwner(h){return h.preparedBy||((state.users||[]).includes(h.owner)?h.owner:"Unassigned")}
function hoReviewOwner(h){return h.reviewedBy||h.signoffOwner||"Unassigned"}
function hoCurrentStage(h,period){const ds=hoPState(period,h.id);if(!ds.preparedAt)return "Preparation";if(!ds.reviewedAt)return "Review";return null}
function ownerProgress(owner,at,doneBy){return `<b>${esc(owner||"Unassigned")}</b>${at?`<div class="small">✓ ${esc(doneBy||"")} · ${fmtDate(at)}</div>`:'<div class="small">Pending</div>'}`}
function hoWorkflowMarkup(h){const ds=hoPState(selectedPeriod,h.id),st=hoCurrentStage(h,selectedPeriod);return `<div class="workflow"><span class="step ${ds.preparedAt?'done':st==='Preparation'?'ready':'locked'}">Prepared${ds.preparedAt?' ✓':''}</span><span class="arrow">→</span><span class="step ${ds.reviewedAt?'done':st==='Review'?'ready':'locked'}">Reviewed${ds.reviewedAt?' ✓':''}</span></div><div style="margin-top:6px">${st?`<button class="btn secondary" onclick="completeHOStage('${h.id}')">Mark ${st==='Preparation'?'prepared':'reviewed'}</button>`:`<button class="btn ghost" onclick="undoHOLast('${h.id}')">Undo review</button>`}${ds.preparedAt&&!ds.reviewedAt?` <button class="btn ghost" onclick="undoHOLast('${h.id}')">Undo prepared</button>`:''}</div>`}
async function completeHOStage(id){const h=state.headOfficeTemplate.find(x=>x.id===id);if(!h)return;const st=hoCurrentStage(h,selectedPeriod);if(!st)return;await action({type:"ho_stage_complete",period:selectedPeriod,id,stage:st,doneBy:currentUser,at:new Date().toISOString()});toast(`${h.activity}: ${st==='Preparation'?'prepared':'reviewed'}`)}
async function undoHOLast(id){const h=state.headOfficeTemplate.find(x=>x.id===id);if(!h)return;const ds=hoPState(selectedPeriod,id),stage=ds.reviewedAt?"Review":"Preparation";await action({type:"ho_stage_undo",period:selectedPeriod,id,stage})}
function safeSOPUrl(u){try{const x=new URL(String(u||""),location.href);return (x.protocol==="https:"||x.protocol==="http:")?x.href:""}catch(e){return ""}}
function sopButton(u){const href=safeSOPUrl(u);return href?`<a class="btn ghost" href="${esc(href)}" target="_blank" rel="noopener">Open SOP</a>`:'<span class="small">—</span>'}
'''
s = replace_region(s, "function setHOScore", "function renderTeam", new_ho_helpers, "deliverable workflow helpers")

# Tasks: show/open SOP and edit SOP URL.
new_render_team = r'''function renderTeam(){
 const tabs=$("personTabs");tabs.innerHTML=state.users.map(p=>`<button class="${p===teamPerson?'active':''}" onclick="setTeamPerson('${escAttr(p)}')">${esc(p)}</button>`).join("");$("teamTitle").textContent=`${teamPerson} · recurring task template`;
 const rows=allTemplates().filter(t=>t.person===teamPerson);$("teamBody").innerHTML=rows.map(t=>`<tr><td><b>${esc(t.name)}</b><div class="small">${esc(t.source||"Internal Close")}</div></td><td>${esc(t.day||"—")} ${esc(t.time||"")}</td><td>${esc(t.workbookOwner||"—")}</td>${STAGES.map(s=>`<td>${t.stageEnabled?.[s]===false?'<span class="small">Skipped</span>':esc(stageOwner(t,s))}</td>`).join("")}<td>${sopButton(t.sopUrl)}</td><td>${t.closeCritical?'<span class="pill warn">Yes</span>':'No'}</td><td><button class="btn secondary" onclick="editTask('${t.id}')">Edit</button> <button class="btn ghost" onclick="deleteTask('${t.id}')">Remove</button></td></tr>`).join("")||`<tr><td colspan="10"><div class="empty"><b>No fixed tasks yet.</b><br>Add tasks for ${esc(teamPerson)} directly in the dashboard.</div></td></tr>`
}
'''
s = replace_region(s, "function renderTeam", "function setTeamPerson", new_render_team, "renderTeam")

s = replace_once(
    s,
    ' <div class="field"><label>Source</label><input name="source" value="${esc(t.source||"Internal Close")}"></div>\n <div class="field full"><label>Workflow ownership and deadline offsets</label>',
    ' <div class="field"><label>Source</label><input name="source" value="${esc(t.source||"Internal Close")}"></div>\n <div class="field full"><label>SOP link</label><input name="sopUrl" type="url" value="${esc(t.sopUrl||"")}" placeholder="https://... (SharePoint, OneDrive, Google Drive, PDF, etc.)"></div>\n <div class="field full"><label>Workflow ownership and deadline offsets</label>',
    "task SOP form field",
)
s = replace_once(
    s,
    'return {id,name:o.name,person:o.person,workbookOwner:o.workbookOwner,day:o.day,time:o.time,closeCritical:o.closeCritical==="true",source:o.source||"Internal Close",active:true,stageOwners,stageOffsets,stageEnabled}',
    'return {id,name:o.name,person:o.person,workbookOwner:o.workbookOwner,day:o.day,time:o.time,closeCritical:o.closeCritical==="true",source:o.source||"Internal Close",sopUrl:(o.sopUrl||"").trim(),active:true,stageOwners,stageOffsets,stageEnabled}',
    "task SOP persistence",
)
# Put SOP access directly in Live Close Workflow too.
s = replace_once(
    s,
    '<tr><td><b>${esc(x.t.name)}</b><div class="small">${esc(x.t.source||"")}</div></td><td>${esc(x.t.person)}</td>',
    '<tr><td><b>${esc(x.t.name)}</b><div class="small">${esc(x.t.source||"")}${safeSOPUrl(x.t.sopUrl)?` · <a href="${esc(safeSOPUrl(x.t.sopUrl))}" target="_blank" rel="noopener">SOP</a>`:""}</div></td><td>${esc(x.t.person)}</td>',
    "workflow SOP link",
)

# Settings values and current holiday policy.
new_render_settings = r'''function renderSettings(){
 $("warnMinutes").value=state.settings.warnMinutes||60;$("repeatMinutes").value=state.settings.repeatMinutes||60;$("targetWD").value=state.settings.closeTargetWD??2;$("targetTime").value=state.settings.closeTargetTime||"18:00";$("holidayRegion").value=state.settings.holidayRegion||"QC";$("easterHoliday").value=state.settings.easterHoliday||"good_friday";$("holidayInput").value=(state.settings.holidays||[]).join(", ");
 $("liveModeText").innerHTML=serverMode?'<span class="pill good">Shared live mode active</span> Changes are synchronized to every connected browser.':'<span class="pill warn">Standalone browser mode</span> Changes are stored only on this device.'
}
'''
s = replace_region(s, "function renderSettings", "function renderTeamManagement", new_render_settings, "renderSettings")

# Extend browser notification handoff logic to deliverables.
new_alerts = r'''function checkAlerts(fromLive=false){
 if(!("Notification" in window)||Notification.permission!=="granted")return;const p=currentPeriod(),now=new Date();
 for(const t of allTemplates()){const st=currentStage(t,p);if(!st)continue;const owner=stageOwner(t,st);if(!personMatches(owner,currentUser))continue;const due=stageDue(t,st,p);if(!due)continue;const mins=(due-now)/60000;if(mins<=Number(state.settings.warnMinutes||60)){notify(mins<0?"Finance task overdue":"Finance task due soon",`${t.name} · ${st} · ${owner} · ${mins<0?Math.ceil(-mins)+" min late":Math.floor(mins)+" min remaining"}`,`${p}-${t.id}-${st}-${mins<0?"late":"soon"}`)}}
 if(fromLive){
  for(const t of allTemplates()){const st=currentStage(t,p),k=t.id,owner=st?stageOwner(t,st):"";if(readySnapshot[k]&&readySnapshot[k]!==st&&st&&personMatches(owner,currentUser))notify("Task ready for you",`${t.name} moved to ${st}.`,`${p}-${t.id}-${st}-ready`);readySnapshot[k]=st}
  for(const h of (state.headOfficeTemplate||[]).filter(x=>x.active!==false)){const st=hoCurrentStage(h,p),key=`ho-stage-${p}-${h.id}`,prev=localStorage.getItem(key)||"",owner=st==="Preparation"?hoPrepOwner(h):st==="Review"?hoReviewOwner(h):"";if(prev&&prev!==String(st||"done")&&st&&personMatches(owner,currentUser))notify("Deliverable ready for you",`${h.activity} is ready for ${st==='Preparation'?'preparation':'review'}.`,`${p}-${h.id}-${st}-ready`);localStorage.setItem(key,String(st||"done"))}
 }
}
'''
s = replace_region(s, "function checkAlerts", "function downloadState", new_alerts, "checkAlerts")

# Event bindings and Settings save.
s = replace_once(
    s,
    '$("workflowPersonFilter").onchange=renderWorkflow;$("workflowStatusFilter").onchange=renderWorkflow;$("buSelect").onchange=renderHeadOffice;',
    '$("workflowPersonFilter").onchange=renderWorkflow;$("workflowStatusFilter").onchange=renderWorkflow;$("buSelect").onchange=renderHeadOffice;$("hoPersonFilter").onchange=renderHeadOffice;',
    "deliverable filter binding",
)
s = replace_once(
    s,
    '$("saveSettingsBtn").onclick=()=>action({type:"settings_update",settings:{warnMinutes:Number($("warnMinutes").value||60),repeatMinutes:Number($("repeatMinutes").value||60),closeTargetWD:Number($("targetWD").value||2),closeTargetTime:$("targetTime").value||"18:00",holidays:$("holidayInput").value.split(",").map(x=>x.trim()).filter(Boolean)}});',
    '$("saveSettingsBtn").onclick=()=>action({type:"settings_update",settings:{warnMinutes:Number($("warnMinutes").value||60),repeatMinutes:Number($("repeatMinutes").value||60),closeTargetWD:Number($("targetWD").value||2),closeTargetTime:$("targetTime").value||"18:00",holidayRegion:$("holidayRegion").value||"QC",easterHoliday:$("easterHoliday").value||"good_friday",holidays:$("holidayInput").value.split(",").map(x=>x.trim()).filter(Boolean)}});',
    "save holiday settings",
)
s = replace_once(
    s,
    'connectEvents();renderAll();allTemplates().forEach(t=>readySnapshot[t.id]=currentStage(t,currentPeriod()));setInterval(()=>{renderCockpit();renderWorkflow();updateAlertBanner();checkAlerts(false)},60000);',
    'connectEvents();renderAll();allTemplates().forEach(t=>readySnapshot[t.id]=currentStage(t,currentPeriod()));(state.headOfficeTemplate||[]).filter(h=>h.active!==false).forEach(h=>localStorage.setItem(`ho-stage-${currentPeriod()}-${h.id}`,String(hoCurrentStage(h,currentPeriod())||"done")));setInterval(()=>{renderCockpit();renderWorkflow();renderHeadOffice();updateAlertBanner();checkAlerts(false)},60000);',
    "initialize deliverable notification snapshot",
)

p.write_text(s, encoding="utf-8")

# Cloudflare Worker: persist deliverable two-step workflow.
w = Path("cloudflare-worker/src/index.js")
t = w.read_text(encoding="utf-8")
t = replace_once(
    t,
    "  } else if (a.type === 'ho_template_delete') {\n    const h = (state.headOfficeTemplate || []).find(x => x.id === a.id);\n    if (h) h.active = false;\n  } else if (a.type === 'close_set') {",
    "  } else if (a.type === 'ho_template_delete') {\n    const h = (state.headOfficeTemplate || []).find(x => x.id === a.id);\n    if (h) h.active = false;\n  } else if (a.type === 'ho_stage_complete') {\n    state.deliverableStates ??= {};\n    state.deliverableStates[a.period] ??= {};\n    state.deliverableStates[a.period][a.id] ??= {};\n    const ds = state.deliverableStates[a.period][a.id];\n    if (a.stage === 'Preparation') {\n      ds.preparedAt = a.at || new Date().toISOString();\n      ds.preparedDoneBy = a.doneBy || '';\n      delete ds.reviewedAt;\n      delete ds.reviewedDoneBy;\n    } else if (a.stage === 'Review' && ds.preparedAt) {\n      ds.reviewedAt = a.at || new Date().toISOString();\n      ds.reviewedDoneBy = a.doneBy || '';\n    }\n  } else if (a.type === 'ho_stage_undo') {\n    const ds = state.deliverableStates?.[a.period]?.[a.id];\n    if (ds) {\n      if (a.stage === 'Preparation') {\n        delete ds.preparedAt; delete ds.preparedDoneBy; delete ds.reviewedAt; delete ds.reviewedDoneBy;\n      } else {\n        delete ds.reviewedAt; delete ds.reviewedDoneBy;\n      }\n    }\n  } else if (a.type === 'close_set') {",
    "worker deliverable workflow actions",
)
w.write_text(t, encoding="utf-8")

print("Dashboard adjustments applied successfully.")
