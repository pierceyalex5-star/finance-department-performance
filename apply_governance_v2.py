from pathlib import Path
import json,re

# ---------- state migration ----------
p=Path('state.json')
state=json.loads(p.read_text(encoding='utf-8'))
state.setdefault('settings',{})['materialityAmount']=10000
state['settings']['intercompanyAlwaysMaterial']=True

def assign_ids(items,prefix,label_field):
    used={str(x.get('displayId','')).upper() for x in items if x.get('displayId')}
    n=1
    for x in items:
        if not x.get('displayId'):
            while f'{prefix}-{n:04d}' in used:n+=1
            x['displayId']=f'{prefix}-{n:04d}';used.add(x['displayId']);n+=1
        x.setdefault('effectiveStartPeriod','2026-01')
        x.setdefault('dependencyId','')
        x.setdefault('sopLastReviewed','')

assign_ids(state.get('taskTemplates',[]),'TASK','name')
assign_ids(state.get('headOfficeTemplate',[]),'DEL','activity')
state['version']=int(state.get('version',0))+1
p.write_text(json.dumps(state,ensure_ascii=False,indent=2),encoding='utf-8')

# ---------- front-end patch ----------
p=Path('index.html');s=p.read_text(encoding='utf-8')

# Settings materiality fields
old='<div class="field"><label>Close target time ET</label><input id="targetTime" type="time"></div>'
new=old+'<div class="field"><label>Materiality threshold ($)</label><input id="materialityAmount" type="number" min="0" step="1000"></div><div class="field"><label>Intercompany exception</label><select id="intercompanyAlwaysMaterial"><option value="true">Always material</option><option value="false">Use threshold</option></select></div>'
s=s.replace(old,new,1)

# Cockpit materiality card below hero
needle='    <div class="grid kpis">'
insert='''    <div class="card" style="margin-bottom:14px"><div class="section" style="margin-top:0"><h2>Materiality</h2></div><div class="form-grid"><div class="field"><label>General materiality ($)</label><input id="cockpitMateriality" type="number" min="0" step="1000"></div><div class="field"><label>Intercompany</label><select id="cockpitIntercompany"><option value="true">Always material</option><option value="false">Use general threshold</option></select></div><div class="field full"><button class="btn" type="button" id="saveMaterialityBtn">Save materiality</button><div class="small" style="margin-top:6px">Used as the default management threshold. Intercompany items can be treated as material regardless of amount.</div></div></div></div>\n'''+needle
s=s.replace(needle,insert,1)

# Table guidance and task rendering
s=s.replace('<div class="help"><b>Task approval workflow:</b> Prepared → Approved → Entered → Reviewed. Completing a stage unlocks the next stage. When the next owner has a Teams email / UPN configured, the handoff is pushed to that person automatically.</div>',
'''<div class="help"><b>Task workflow:</b> Prepared → Approved → Entered → Reviewed. Internal stages unlock sequentially. An optional external dependency can also be assigned by ID; the first stage remains blocked until that prerequisite is fully complete for the same month.</div>''')

# Utility functions inserted before allTemplates
old='function allTemplates(){return state.taskTemplates.filter(t=>t.active!==false)}'
new='''function itemActiveForPeriod(x,period=selectedPeriod){return x.active!==false&&(!x.effectiveStartPeriod||x.effectiveStartPeriod<=period)}
function allTemplates(period=selectedPeriod){return state.taskTemplates.filter(t=>itemActiveForPeriod(t,period))}
function activeDeliverables(period=selectedPeriod){return (state.headOfficeTemplate||[]).filter(h=>itemActiveForPeriod(h,period))}
function nextDisplayId(prefix){const items=prefix==='TASK'?(state.taskTemplates||[]): (state.headOfficeTemplate||[]);let max=0;for(const x of items){const m=String(x.displayId||'').match(/-(\\d+)$/);if(m)max=Math.max(max,Number(m[1]))}return `${prefix}-${String(max+1).padStart(4,'0')}`}
function dependencyOptions(currentId,value){const items=[...(state.taskTemplates||[]).filter(x=>x.active!==false).map(x=>({id:x.id,label:`${x.displayId||x.id} · ${x.name}`})),...(state.headOfficeTemplate||[]).filter(x=>x.active!==false).map(x=>({id:x.id,label:`${x.displayId||x.id} · ${x.activity}`}))].filter(x=>x.id!==currentId);return `<option value="">No dependency</option>`+items.map(x=>`<option value="${esc(x.id)}" ${x.id===value?'selected':''}>${esc(x.label)}</option>`).join('')}
function dependencyItem(id){return (state.taskTemplates||[]).find(x=>x.id===id)||(state.headOfficeTemplate||[]).find(x=>x.id===id)||null}
function dependencyLabel(x){if(!x?.dependencyId)return '';const d=dependencyItem(x.dependencyId);return d?`${d.displayId||d.id} · ${d.name||d.activity}`:x.dependencyId}
function dependencyComplete(x,period=selectedPeriod){if(!x?.dependencyId)return true;const d=dependencyItem(x.dependencyId);if(!d||!itemActiveForPeriod(d,period))return false;if((state.taskTemplates||[]).some(t=>t.id===d.id))return !currentStage(d,period);const ds=hoPState(period,d.id);return !!ds.reviewedAt}
function isMaterialAmount(amount,text=''){if(state.settings?.intercompanyAlwaysMaterial&&/inter\\s*company|interco/i.test(String(text||'')))return true;return Math.abs(Number(amount||0))>=Number(state.settings?.materialityAmount||10000)}'''
s=s.replace(old,new,1)
s=s.replace('function periodTasks(){\n if(currentUser==="Manager View")return allTemplates();\n return allTemplates().filter', 'function periodTasks(period=selectedPeriod){\n if(currentUser==="Manager View")return allTemplates(period);\n return allTemplates(period).filter',1)
s=s.replace('return periodTasks().map(t=>', 'return periodTasks(period).map(t=>',1)
s=s.replace(' const ts=periodTasks(), totalStages=', ' const ts=periodTasks(period), totalStages=',1)

# Historical task metrics respect effective period
for a,b in [
('const tasks=allTemplates().filter(t=>t.person===person);','const tasks=allTemplates(period).filter(t=>t.person===person);'),
('return allTemplates().filter(t=>t.person===person).map','return allTemplates(period).filter(t=>t.person===person).map'),
('for(const t of allTemplates().filter(t=>parseWD(t.day)===wd))','for(const t of allTemplates(period).filter(t=>parseWD(t.day)===wd))'),
('for(const t of allTemplates().filter(t=>enabledStages(t).includes(stage)))','for(const t of allTemplates(period).filter(t=>enabledStages(t).includes(stage)))')]:s=s.replace(a,b)

# Deliverable historical filters
s=s.replace('for(const h of (state.headOfficeTemplate||[]).filter(x=>x.active!==false&&hoPrepOwner(x)===person))','for(const h of activeDeliverables(period).filter(x=>hoPrepOwner(x)===person))')
s=s.replace('for(const h of (state.headOfficeTemplate||[]).filter(x=>x.active!==false&&hoPrepOwner(x)===person)){','for(const h of activeDeliverables(period).filter(x=>hoPrepOwner(x)===person)){')
s=s.replace('(state.headOfficeTemplate||[]).filter(h=>h.active!==false&&hoPrepOwner(h)===person)', 'activeDeliverables(period).filter(h=>hoPrepOwner(h)===person)')

# Head office current-period rows
s=s.replace('const scores=hoScores(selectedPeriod,bu), rows=state.headOfficeTemplate.filter(h=>h.active!==false).filter(', 'const scores=hoScores(selectedPeriod,bu), rows=activeDeliverables(selectedPeriod).filter(',1)
s=s.replace('<tr><td><b>${esc(h.activity)}</b></td><td>${esc(h.day||"—")}</td>', '<tr><td><b>${esc(h.activity)}</b><div class="small">${esc(h.displayId||h.id)}${h.dependencyId?` · Depends on ${esc(dependencyLabel(h))}`:""}</div></td><td>${esc(h.day||"—")}</td>',1)

# Task row shows stable ID/dependency/review date
s=s.replace('<tr><td><b>${esc(t.name)}</b><div class="small">${esc(t.source||"Internal Close")}</div></td>', '<tr><td><b>${esc(t.name)}</b><div class="small">${esc(t.displayId||t.id)} · ${esc(t.source||"Internal Close")}${t.dependencyId?` · Depends on ${esc(dependencyLabel(t))}`:""}</div></td>',1)
s=s.replace('<td>${sopButton(t.sopUrl,\'task\',t.id)}</td>', '<td>${sopButton(t.sopUrl,t.sopLastReviewed)}</td>',1)
s=s.replace('<td>${sopButton(h.sopUrl,\'deliverable\',h.id)}</td>', '<td>${sopButton(h.sopUrl,h.sopLastReviewed)}</td>',1)

# SOP button uses actual downloadable Word template
s=s.replace('function sopButton(u){const href=safeSOPUrl(u);return href?`<a class="btn ghost" href="${esc(href)}" target="_blank" rel="noopener">Open SOP</a>`:\'<span class="small">—</span>\'}',
'''function sopButton(u,lastReviewed=''){const href=safeSOPUrl(u);const open=href?`<a class="btn ghost" href="${esc(href)}" target="_blank" rel="noopener">Open SOP</a>`:'';const review=lastReviewed?`<div class="small" style="margin-top:5px">Last reviewed: ${esc(lastReviewed)}</div>`:'<div class="small" style="margin-top:5px">Not yet reviewed</div>';return `<div style="display:flex;gap:5px;flex-wrap:wrap">${open}<a class="btn ghost" href="./templates/Finance_SOP_Template.docx" download>Download template</a></div>${review}`}''')

# Task form fields
s=s.replace('<div class="field full"><label>Task / activity</label><input name="name" required value="${esc(t.name||"")}"></div>',
'''<div class="field"><label>Task ID</label><input name="displayId" readonly value="${esc(t.displayId||nextDisplayId('TASK'))}"></div><div class="field"><label>Effective start period</label><input name="effectiveStartPeriod" type="month" value="${esc(t.effectiveStartPeriod||selectedPeriod)}"></div><div class="field full"><label>Task / activity</label><input name="name" required value="${esc(t.name||"")}"></div>''',1)
s=s.replace('<div class="field full"><label>SOP link</label><input name="sopUrl" type="url" value="${esc(t.sopUrl||"")}" placeholder="https://... (SharePoint, OneDrive, Google Drive, PDF, etc.)"></div>',
'''<div class="field full"><label>Dependency</label><select name="dependencyId">${dependencyOptions(t.id,t.dependencyId||'')}</select><div class="small">The prerequisite must be fully complete before this item can start.</div></div><div class="field"><label>SOP last reviewed</label><input name="sopLastReviewed" type="date" value="${esc(t.sopLastReviewed||"")}"></div><div class="field"><label>SOP template</label><a class="btn ghost" href="./templates/Finance_SOP_Template.docx" download>Download Word template</a></div><div class="field full"><label>Completed SOP link</label><input name="sopUrl" type="url" value="${esc(t.sopUrl||"")}" placeholder="https://... SharePoint / OneDrive / controlled document link"></div>''',1)
s=s.replace('return {id,name:o.name,person:o.person,workbookOwner:o.workbookOwner,day:o.day,time:o.time,closeCritical:o.closeCritical==="true",source:o.source||"Internal Close",sopUrl:(o.sopUrl||"").trim(),active:true,stageOwners,stageOffsets,stageEnabled}',
'''return {id,displayId:o.displayId||nextDisplayId('TASK'),effectiveStartPeriod:o.effectiveStartPeriod||selectedPeriod,dependencyId:o.dependencyId||'',name:o.name,person:o.person,workbookOwner:o.workbookOwner,day:o.day,time:o.time,closeCritical:o.closeCritical==="true",source:o.source||"Internal Close",sopUrl:(o.sopUrl||"").trim(),sopLastReviewed:o.sopLastReviewed||'',active:true,stageOwners,stageOffsets,stageEnabled}''',1)

# Deliverable form / create / edit
old="return `<div class=\"form-grid\"><div class=\"field full\"><label>Deliverable</label><input name=\"activity\" required value=\"${esc(h.activity||\"\")}\"></div>"
new="return `<div class=\"form-grid\"><div class=\"field\"><label>Deliverable ID</label><input name=\"displayId\" readonly value=\"${esc(h.displayId||nextDisplayId('DEL'))}\"></div><div class=\"field\"><label>Effective start period</label><input name=\"effectiveStartPeriod\" type=\"month\" value=\"${esc(h.effectiveStartPeriod||selectedPeriod)}\"></div><div class=\"field full\"><label>Deliverable</label><input name=\"activity\" required value=\"${esc(h.activity||\"\")}\"></div>"
s=s.replace(old,new,1)
s=s.replace('<div class="field full"><label>SOP link</label><input name="sopUrl" type="url" value="${esc(h.sopUrl||"")}" placeholder="https://... (SharePoint, OneDrive, Google Drive, PDF, etc.)"></div></div>',
'''<div class="field full"><label>Dependency</label><select name="dependencyId">${dependencyOptions(h.id,h.dependencyId||'')}</select></div><div class="field"><label>SOP last reviewed</label><input name="sopLastReviewed" type="date" value="${esc(h.sopLastReviewed||"")}"></div><div class="field"><label>SOP template</label><a class="btn ghost" href="./templates/Finance_SOP_Template.docx" download>Download Word template</a></div><div class="field full"><label>Completed SOP link</label><input name="sopUrl" type="url" value="${esc(h.sopUrl||"")}" placeholder="https://... SharePoint / OneDrive / controlled document link"></div></div>''',1)
s=s.replace("item:{id:uid(\"ho\"),activity:o.activity.trim(),day:o.day.trim(),time:o.time,owner:o.owner.trim(),preparedBy:o.preparedBy,reviewedBy:o.reviewedBy,signoffOwner:o.reviewedBy,sopUrl:o.sopUrl.trim(),active:true}",
"item:{id:uid(\"ho\"),displayId:o.displayId||nextDisplayId('DEL'),effectiveStartPeriod:o.effectiveStartPeriod||selectedPeriod,dependencyId:o.dependencyId||'',activity:o.activity.trim(),day:o.day.trim(),time:o.time,owner:o.owner.trim(),preparedBy:o.preparedBy,reviewedBy:o.reviewedBy,signoffOwner:o.reviewedBy,sopUrl:o.sopUrl.trim(),sopLastReviewed:o.sopLastReviewed||'',active:true}",1)
s=s.replace("item:{id,activity:newActivity,day:o.day.trim(),time:o.time,owner:o.owner.trim(),preparedBy:o.preparedBy,reviewedBy:o.reviewedBy,signoffOwner:o.reviewedBy,sopUrl:o.sopUrl.trim(),active:true}",
"item:{id,displayId:o.displayId||h.displayId,effectiveStartPeriod:o.effectiveStartPeriod||h.effectiveStartPeriod||selectedPeriod,dependencyId:o.dependencyId||'',activity:newActivity,day:o.day.trim(),time:o.time,owner:o.owner.trim(),preparedBy:o.preparedBy,reviewedBy:o.reviewedBy,signoffOwner:o.reviewedBy,sopUrl:o.sopUrl.trim(),sopLastReviewed:o.sopLastReviewed||'',active:true}",1)

# Front-end dependency pre-checks for better UX
s=s.replace('async function completeHOStage(id){const h=state.headOfficeTemplate.find(x=>x.id===id);if(!h)return;const st=hoCurrentStage(h,selectedPeriod);',
'async function completeHOStage(id){const h=state.headOfficeTemplate.find(x=>x.id===id);if(!h)return;if(!dependencyComplete(h,selectedPeriod))return toast(`Blocked by ${dependencyLabel(h)}.`);const st=hoCurrentStage(h,selectedPeriod);',1)
# locate task completion function pattern
s=s.replace('async function completeStage(id){const t=state.taskTemplates.find(x=>x.id===id);if(!t)return;const st=currentStage(t,selectedPeriod);',
'async function completeStage(id){const t=state.taskTemplates.find(x=>x.id===id);if(!t)return;if(!dependencyComplete(t,selectedPeriod))return toast(`Blocked by ${dependencyLabel(t)}.`);const st=currentStage(t,selectedPeriod);',1)

# Render settings/cockpit materiality
s=s.replace('$("holidayInput").value=(state.settings.holidays||[]).join(", ");', '$("holidayInput").value=(state.settings.holidays||[]).join(", ");$("materialityAmount").value=Number(state.settings.materialityAmount||10000);$("intercompanyAlwaysMaterial").value=String(state.settings.intercompanyAlwaysMaterial!==false);')
# add materiality controls to renderCockpit end through safe insert after close target text assignment if found
anchor='function renderCockpit(){'
idx=s.find(anchor)
if idx>=0:
    end=s.find('\n}',idx)
    # insert before first function close is unsafe; use a lightweight renderAll post-render hook instead below.

s=s.replace('$("saveSettingsBtn").onclick=()=>action({type:"settings_update",settings:{warnMinutes:Number($("warnMinutes").value||60),repeatMinutes:Number($("repeatMinutes").value||60),closeTargetWD:Number($("targetWD").value||2),closeTargetTime:$("targetTime").value||"18:00",holidayRegion:$("holidayRegion").value||"QC",easterHoliday:$("easterHoliday").value||"good_friday",holidays:$("holidayInput").value.split(",").map(x=>x.trim()).filter(Boolean)}});',
'''$("saveSettingsBtn").onclick=()=>action({type:"settings_update",settings:{warnMinutes:Number($("warnMinutes").value||60),repeatMinutes:Number($("repeatMinutes").value||60),closeTargetWD:Number($("targetWD").value||2),closeTargetTime:$("targetTime").value||"18:00",holidayRegion:$("holidayRegion").value||"QC",easterHoliday:$("easterHoliday").value||"good_friday",holidays:$("holidayInput").value.split(",").map(x=>x.trim()).filter(Boolean),materialityAmount:Number($("materialityAmount").value||10000),intercompanyAlwaysMaterial:$("intercompanyAlwaysMaterial").value==="true"}});
$("saveMaterialityBtn").onclick=()=>action({type:"settings_update",settings:{materialityAmount:Number($("cockpitMateriality").value||10000),intercompanyAlwaysMaterial:$("cockpitIntercompany").value==="true"}});''',1)

# Patch renderAll so cockpit fields always refresh
s=s.replace('function renderAll(){', 'function renderAll(){if($("cockpitMateriality"))$("cockpitMateriality").value=Number(state.settings?.materialityAmount||10000);if($("cockpitIntercompany"))$("cockpitIntercompany").value=String(state.settings?.intercompanyAlwaysMaterial!==false);',1)

# Quality materiality uses policy instead of only manual flag
s=s.replace('$("qMaterial").textContent=rows.filter(x=>x.material).length;', '$("qMaterial").textContent=rows.filter(x=>isMaterialAmount(x.amount,`${x.process||\'\'} ${x.rootCause||\'\'}`)).length;',1)

p.write_text(s,encoding='utf-8')

# ---------- Worker dependency enforcement ----------
p=Path('cloudflare-worker/src/index.js');w=p.read_text(encoding='utf-8')
helper='''\nfunction itemActiveForPeriod(x,period){return x && x.active!==false && (!x.effectiveStartPeriod || x.effectiveStartPeriod<=period)}\nfunction dependencyItem(state,id){return (state.taskTemplates||[]).find(x=>x.id===id)||(state.headOfficeTemplate||[]).find(x=>x.id===id)||null}\nfunction dependencyComplete(state,item,period){if(!item?.dependencyId)return true;const d=dependencyItem(state,item.dependencyId);if(!itemActiveForPeriod(d,period))return false;if((state.taskTemplates||[]).some(x=>x.id===d.id)){const stages=enabledStages(d),ps=state.periodStates?.[period]?.[d.id]?.stages||{};return stages.every(st=>!!ps[st]?.doneAt)}const ds=state.deliverableStates?.[period]?.[d.id]||{};return !!ds.reviewedAt}\nfunction assertDependency(state,action){let item=null;if(action.type==='stage_complete')item=(state.taskTemplates||[]).find(x=>x.id===action.taskId);else if(action.type==='ho_stage_complete')item=(state.headOfficeTemplate||[]).find(x=>x.id===action.id);if(item&&!dependencyComplete(state,item,action.period)){const d=dependencyItem(state,item.dependencyId);throw new Error(`Blocked by dependency ${d?.displayId||item.dependencyId}`)}}\n'''
if 'function assertDependency' not in w:w=w.replace('function enabledStages(t) {',helper+'\nfunction enabledStages(t) {',1)
w=w.replace('    const current = rows[0].state;\n    const currentVersion', '    const current = rows[0].state;\n    assertDependency(current, action);\n    const currentVersion',1)
p.write_text(w,encoding='utf-8')

# ---------- Pages: include templates folder ----------
p=Path('.github/workflows/pages.yml');y=p.read_text(encoding='utf-8')
if "      - 'templates/**'" not in y:y=y.replace("      - 'sops/**'", "      - 'sops/**'\n      - 'templates/**'")
if 'if [ -d templates ]' not in y:y=y.replace('          if [ -d sops ]; then cp -R sops _site/; fi', '          if [ -d sops ]; then cp -R sops _site/; fi\n          if [ -d templates ]; then cp -R templates _site/; fi')
p.write_text(y,encoding='utf-8')

print('Governance v2 patch applied')
