(function(){
  'use strict';

  const VERSION='2026-08-18-program-admin-v2';
  const POOLED='Steering Committee (pooled)';
  const WORKWEEK_DEFAULT=40;

  const PHASES=[
    {m:'M-01',hours:{support:33,oneonone:28,steering:12,tracking:44,workshops:55},meetingHours:6},
    {m:'M-02',hours:{support:39,oneonone:33,steering:15,tracking:52,workshops:78},meetingHours:6},
    {m:'M-03',hours:{support:45,oneonone:38,steering:18,tracking:60,workshops:105},meetingHours:8},
    {m:'M-04',hours:{support:38,oneonone:38,steering:18,tracking:60,workshops:60},meetingHours:8},
    {m:'M-05',hours:{support:27,oneonone:23,steering:16,tracking:45,workshops:27},meetingHours:8},
    {m:'M-06',hours:{support:21,oneonone:15,steering:12,tracking:30,workshops:18},meetingHours:6},
    {m:'M-07',hours:{support:8,oneonone:4,steering:6,tracking:12,workshops:4},meetingHours:3},
    {m:'M-08',hours:{support:17,oneonone:11,steering:10,tracking:26,workshops:4},meetingHours:4}
  ];

  const CATEGORIES=[
    {key:'support',code:'SUPPORT',label:'Team support',outcome:'BPOs and SMEs receive timely coaching, unblockers, cross-stream alignment and issue escalation; material ownership or capacity issues do not age without action.',basis:'Continuous leader availability; approximately 2.5–4 hours per week depending on project intensity.'},
    {key:'oneonone',code:'1ON1',label:'1 on 1',outcome:'Regular 1 on 1s with BPO and cross-functional leads surface capacity, decisions, risks and support needs before they become milestone blockers.',basis:'Biweekly 30–45 minute 1 on 1 cadence with value-stream and cross-functional leads, including action follow-up.'},
    {key:'steering',code:'STEER',label:'Steering committee meetings',outcome:'Decision-ready Steering Committee meetings occur with clear asks, current program facts, documented decisions and accountable follow-up.',basis:'Monthly governance cadence with increased frequency around testing, readiness and go-live; includes Business Owner preparation and follow-up.'},
    {key:'tracking',code:'TRACK',label:'Project tracking',outcome:'Integrated schedule, RAID, decisions, capacity, effort, budget and project outlook remain current enough to manage the program by exception.',basis:'Weekly management-system refresh; approximately 4 hours per week, rising during testing and cutover.'},
    {key:'workshops',code:'WORKSHOP',label:'Workshop management',outcome:'Workshops have clear objectives, pre-work and attendees; decisions, actions and outputs are captured and linked back to processes, requirements and design.',basis:'Front-loaded during current-state, requirements and To-Be design; tapers after design as testing becomes the dominant activity.'}
  ];

  const e=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>Number(v)||0;
  const fmt=n=>`${Math.round(num(n)*10)/10}h`;
  const taskList=()=>state.tasks?.tasks||(state.tasks={tasks:[]}).tasks;
  const entryList=()=>state.planning?.timeEntries||(state.planning={timeEntries:[]}).timeEntries;
  const milestoneList=()=>state.milestones?.milestones||[];
  const boName=()=>state.framework?.businessOwner?.name||'Alex';
  const adminTaskId=code=>`T-PA-${code}`;
  const pooledTaskId=()=>`T-SC-ATTENDANCE`;
  const categoryTotal=key=>PHASES.reduce((s,p)=>s+num(p.hours[key]),0);
  const meetingBudget=()=>PHASES.reduce((s,p)=>s+num(p.meetingHours),0);

  function projectBounds(){
    const ms=milestoneList().filter(x=>x.start&&x.end).slice().sort((a,b)=>String(a.start).localeCompare(String(b.start)));
    return {start:ms[0]?.start||'',end:ms.at(-1)?.end||''};
  }

  function cfg(){
    state.planning=state.planning||{};
    const x=state.planning.programAdministration||(state.planning.programAdministration={});
    x.version=VERSION;
    if(x.standardWorkweekHours==null)x.standardWorkweekHours=WORKWEEK_DEFAULT;
    if(x.steeringParticipantCountExcludingBusinessOwner==null)x.steeringParticipantCountExcludingBusinessOwner=0;
    x.steeringPooledResourceName=POOLED;
    x.planningBasis=x.planningBasis||'Business Owner program-administration capacity baseline. Administration is a standing program responsibility and is intentionally not linked to a program milestone. Phase allocations are capacity-planning references only.';
    return x;
  }

  function baseTask(id,title,owner,role){
    const b=projectBounds();
    return {id,title,stream:'Program',l1:'Program',l2:'Program administration',process:'Program administration',owner,ownerRole:role,status:'Not Started',priority:'High',progress:0,start:b.start,due:b.end,baselineDue:b.end,forecastDue:b.end,phase:'Program Administration',dependency:'',milestoneId:'',ganttOrder:8800,type:'Recurring administration',entityScope:'All entities',estimatedHours:0,sourceType:'Program administration plan',sourceId:VERSION,sourceTitle:'Business Owner program administration capacity plan',sourceLevel:'Program',blocker:'',milestoneOutcome:'',expectedOutcome:'',programAdmin:true,programAdminStandalone:true,excludeFromMilestone:true,excludeFromRoadmap:true,programAdminPlanVersion:VERSION};
  }

  function legacyCategory(id=''){
    if(!/^T-PA-M\d{2}-/.test(id))return '';
    if(id.endsWith('-SUPPORT'))return 'SUPPORT';
    if(id.endsWith('-1ON1'))return '1ON1';
    if(id.endsWith('-STEER'))return 'STEER';
    if(id.endsWith('-TRACK'))return 'TRACK';
    if(id.endsWith('-WORKSHOP'))return 'WORKSHOP';
    return '';
  }

  function migrateLegacy(){
    let changed=false;
    entryList().forEach(x=>{
      const code=legacyCategory(x.taskId);
      if(code){x.taskId=adminTaskId(code);changed=true}
      if(/^T-SC-M\d{2}$/.test(x.taskId||'')){x.taskId=pooledTaskId();changed=true}
    });
    const before=taskList().length;
    state.tasks.tasks=taskList().filter(t=>!/^T-PA-M\d{2}-/.test(t.id||'')&&!/^T-SC-M\d{2}$/.test(t.id||''));
    if(state.tasks.tasks.length!==before)changed=true;
    return changed;
  }

  function ensureAdminTasks(){
    if(!state.tasks?.tasks)return false;
    let changed=migrateLegacy();
    const arr=taskList(),owner=boName(),b=projectBounds();
    CATEGORIES.forEach((cat,i)=>{
      const id=adminTaskId(cat.code);let t=arr.find(x=>x.id===id);
      if(!t){t=baseTask(id,`Program administration · ${cat.label}`,owner,'Business Owner');arr.push(t);changed=true}
      const desired={title:`Program administration · ${cat.label}`,owner,ownerRole:'Business Owner',stream:'Program',l1:'Program',l2:'Program administration',process:'Program administration',start:b.start,due:b.end,baselineDue:b.end,forecastDue:b.end,milestoneId:'',estimatedHours:categoryTotal(cat.key),expectedOutcome:cat.outcome,planningBasis:cat.basis,programAdminCategory:cat.label,programAdminKey:cat.key,programAdmin:true,programAdminStandalone:true,excludeFromMilestone:true,excludeFromRoadmap:true,programAdminPlanVersion:VERSION,ganttOrder:8800+i*10};
      if(cat.key==='steering')desired.committeeMeetingHoursBudget=meetingBudget();
      Object.entries(desired).forEach(([k,v])=>{if(JSON.stringify(t[k])!==JSON.stringify(v)){t[k]=v;changed=true}});
    });
    const count=Math.max(0,Math.round(num(cfg().steeringParticipantCountExcludingBusinessOwner))),pid=pooledTaskId();let pt=arr.find(x=>x.id===pid);
    if(!pt){pt=baseTask(pid,'Steering Committee attendance',POOLED,'Steering Committee');arr.push(pt);changed=true}
    const pooledHours=meetingBudget()*count;
    const pooledDesired={title:'Steering Committee attendance',owner:POOLED,ownerRole:'Steering Committee',stream:'Program',l1:'Program',l2:'Program administration',process:'Program governance',start:b.start,due:b.end,baselineDue:b.end,forecastDue:b.end,milestoneId:'',estimatedHours:pooledHours,priority:'Medium',expectedOutcome:'Aggregate Steering Committee participant time is planned and valued separately from the Business Owner meeting/preparation task.',planningBasis:`${meetingBudget()} planned meeting hour(s) × ${count} configured participant(s), excluding the Business Owner.`,programAdmin:true,programAdminDerived:true,programAdminStandalone:true,excludeFromMilestone:true,excludeFromRoadmap:true,programAdminCategory:'Steering Committee attendance',committeeMeetingHoursBudget:meetingBudget(),programAdminPlanVersion:VERSION,ganttOrder:8890};
    Object.entries(pooledDesired).forEach(([k,v])=>{if(JSON.stringify(pt[k])!==JSON.stringify(v)){pt[k]=v;changed=true}});
    return changed;
  }

  function adminTasks(){ensureAdminTasks();return taskList().filter(t=>t.programAdminStandalone&&!t.programAdminDerived&&t.owner===boName())}
  function pooledTasks(){ensureAdminTasks();return taskList().filter(t=>t.programAdminDerived&&t.owner===POOLED)}
  function adminTotal(){return adminTasks().reduce((s,t)=>s+num(t.estimatedHours),0)}
  function projectWeeks(){const b=projectBounds();if(!b.start||!b.end)return 0;return Math.max(1,(new Date(`${b.end}T12:00:00`)-new Date(`${b.start}T12:00:00`))/604800000)}
  function phaseRows(){return PHASES.map(ph=>{const h=Object.values(ph.hours).reduce((s,x)=>s+num(x),0),m=milestoneList().find(x=>x.id===ph.m),weeks=m?.start&&m?.end?Math.max(1,(new Date(`${m.end}T12:00:00`)-new Date(`${m.start}T12:00:00`))/604800000):0;return {m:ph.m,h,weeks,avg:weeks?h/weeks:0}})}

  function adminSummary(compact=false){
    ensureAdminTasks();const total=adminTotal(),weeks=projectWeeks(),avg=weeks?total/weeks:0,workweek=num(cfg().standardWorkweekHours)||40,fte=100*avg/workweek,count=num(cfg().steeringParticipantCountExcludingBusinessOwner),pooled=pooledTasks().reduce((s,t)=>s+num(t.estimatedHours),0);
    if(compact)return `<section class="v29-compact card"><div><span>Business Owner program administration</span><b>${fmt(total)} budgeted</b><small>${fmt(avg)}/week avg · ${Math.round(fte)}% of a ${workweek}h week</small></div><div><span>Steering participant capacity</span><b>${count?fmt(pooled):'Configure headcount'}</b><small>${meetingBudget()} meeting hours × ${count||'—'} participant(s), excluding Business Owner</small></div><button class="btn" type="button" data-v29-admin-settings>Admin assumptions</button></section>`;
    return `<section class="v29-admin"><div class="section-title"><div><h2>Program Administration Capacity</h2><span>Standing Business Owner responsibilities — deliberately outside the milestone structure</span></div><button class="btn" type="button" data-v29-admin-settings>Edit assumptions</button></div><div class="notice"><b>Structure:</b> these are recurring program-management responsibilities, not milestone deliverables. They do not contribute to milestone completion, stage-gate readiness or milestone task counts. The phase profile below is only a capacity-planning reference.</div><div class="notice"><b>Capacity baseline:</b> ${fmt(total)} across the program, approximately ${fmt(avg)}/week or ${Math.round(fte)}% of a ${workweek}-hour workweek on average.</div><div class="v29-cat-grid">${CATEGORIES.map(c=>`<div class="card"><span>${e(c.label)}</span><b>${fmt(categoryTotal(c.key))}</b><small>${e(c.basis)}</small></div>`).join('')}</div><div class="section-title"><div><h3>Capacity phasing</h3><span>reference only — not task-to-milestone linkage</span></div></div><div class="v29-table-wrap"><table class="v29-table"><thead><tr><th>Project period</th><th>Admin hours planned</th><th>Avg. hours / week</th><th>Approx. BO capacity</th></tr></thead><tbody>${phaseRows().map(r=>`<tr><td><b>${e(r.m)}</b></td><td>${fmt(r.h)}</td><td>${fmt(r.avg)}</td><td>${Math.round(100*r.avg/workweek)}%</td></tr>`).join('')}</tbody></table></div><div class="v29-steering-note card"><div><span>Steering Committee attendance model</span><b>${meetingBudget()}h meeting-time budget</b><small>Business Owner preparation/follow-up is included in the ${categoryTotal('steering')}h Steering administration allowance. Committee participant time is added separately only for meeting duration.</small></div><div><span>Configured participants excluding Business Owner</span><b>${count||'Not set'}</b><small>${count?`${fmt(pooled)} planned aggregate Steering Committee attendance`:'Set this once; the dashboard will budget aggregate committee attendance automatically.'}</small></div><div><span>Cost treatment</span><b>Encrypted Steering rate</b><small>Use the loaded rate for “${e(POOLED)}” in Steering financial settings.</small></div></div></section>`;
  }

  function editAdminSettings(){
    const x=cfg();const m=modal('Program administration assumptions',`<div class="form-grid"><label>Standard Business Owner workweek<input type="number" min="20" max="60" step="1" name="standardWorkweekHours" value="${e(x.standardWorkweekHours||40)}"></label><label>Steering participants excluding Business Owner<input type="number" min="0" max="50" step="1" name="steeringParticipantCountExcludingBusinessOwner" value="${e(x.steeringParticipantCountExcludingBusinessOwner||0)}"></label><label class="full">Planning basis<textarea rows="4" name="planningBasis">${e(x.planningBasis||'')}</textarea></label></div><div class="notice"><b>Administration rule:</b> these five recurring tasks remain outside all milestones. The phase allocation is used only to estimate capacity over time.</div><div class="notice"><b>Steering attendance rule:</b> do not include the Business Owner in the participant count. Your own time is already logged separately. When you log a Steering Committee meeting, the Control Tower creates aggregate committee person-hours automatically.</div><div class="notice"><b>Financial privacy:</b> the Steering Committee loaded rate remains in the encrypted Steering financial vault. Configure the rate under Financial settings as “${e(POOLED)}”.</div>`);
    m.querySelector('.modal-save').onclick=()=>{const v=vals(m);x.standardWorkweekHours=Math.max(20,num(v.standardWorkweekHours)||40);x.steeringParticipantCountExcludingBusinessOwner=Math.max(0,Math.round(num(v.steeringParticipantCountExcludingBusinessOwner)));x.planningBasis=v.planningBasis||'';ensureAdminTasks();mark('planning');mark('tasks');m.remove();render()}
  }

  function isSteeringAdminTask(taskId){const t=taskList().find(x=>x.id===taskId);return !!(t&&t.programAdminStandalone&&!t.programAdminDerived&&t.programAdminCategory==='Steering committee meetings'&&t.owner===boName())}
  function derivedId(sourceId){return `AUTO-SC-${sourceId}`}
  function removeDerived(sourceId){const arr=entryList(),id=derivedId(sourceId),before=arr.length;state.planning.timeEntries=arr.filter(x=>x.id!==id);return before!==state.planning.timeEntries.length}
  function syncDerived(source){
    if(!source)return false;const arr=entryList();
    if(!isSteeringAdminTask(source.taskId)||source.person!==boName())return removeDerived(source.id);
    const meeting=Math.max(0,num(source.committeeMeetingHours)||num(source.hours)),count=Math.max(0,Math.round(num(source.committeeParticipantCount)||num(cfg().steeringParticipantCountExcludingBusinessOwner)));
    source.committeeMeetingHours=meeting;source.committeeParticipantCount=count;
    if(count>0&&num(cfg().steeringParticipantCountExcludingBusinessOwner)!==count){cfg().steeringParticipantCountExcludingBusinessOwner=count;ensureAdminTasks()}
    const total=meeting*count,id=derivedId(source.id),existing=arr.find(x=>x.id===id);
    if(!total)return removeDerived(source.id);
    const record=existing||{id};
    Object.assign(record,{weekStart:source.weekStart,person:POOLED,role:'Steering Committee',taskId:pooledTaskId(),stream:'Program',hours:total,output:'Steering Committee participation',notes:`Auto-generated committee attendance: ${meeting}h meeting × ${count} participant(s), excluding ${boName()}. Source: ${source.id}.`,autoGenerated:true,sourceTimeEntryId:source.id,committeeMeetingHours:meeting,committeeParticipantCount:count,updatedAt:new Date().toISOString(),createdAt:existing?.createdAt||new Date().toISOString()});
    if(!existing)arr.push(record);return true
  }

  function addSteeringFields(m,sourceId){
    if(!m||m.dataset.v29SteeringAugmented)return;m.dataset.v29SteeringAugmented='1';const form=m.querySelector('.form-grid'),taskSel=m.querySelector('[name="taskId"]'),person=m.querySelector('[name="person"]'),hours=m.querySelector('[name="hours"]');if(!form||!taskSel)return;
    const source=sourceId?entryList().find(x=>x.id===sourceId):null;
    const wrap=document.createElement('div');wrap.className='v29-steering-fields full';wrap.innerHTML=`<div class="notice"><b>Steering Committee attendance automation</b><span>Applies when the Business Owner logs the standing “Steering committee meetings” administration task.</span></div><div class="form-grid"><label>Actual committee meeting duration<input type="number" min="0" step="0.25" name="committeeMeetingHours" value="${e(source?.committeeMeetingHours||'')}"></label><label>Participants excluding Business Owner<input type="number" min="0" step="1" name="committeeParticipantCount" value="${e(source?.committeeParticipantCount??cfg().steeringParticipantCountExcludingBusinessOwner??0)}"></label></div><small>Aggregate committee time = meeting duration × participant count. Preparation/follow-up stays in the Business Owner's own hours and is not multiplied.</small>`;
    form.appendChild(wrap);
    function refresh(){const active=isSteeringAdminTask(taskSel.value)&&(person?.value||boName())===boName();wrap.style.display=active?'block':'none';if(active){const mh=wrap.querySelector('[name="committeeMeetingHours"]');if(mh&&!mh.value&&hours?.value)mh.value=hours.value}}
    taskSel.addEventListener('change',refresh);person?.addEventListener('change',refresh);hours?.addEventListener('change',()=>{if(wrap.style.display!=='none'){const mh=wrap.querySelector('[name="committeeMeetingHours"]');if(mh&&!mh.value)mh.value=hours.value}});refresh();
    const save=m.querySelector('.modal-save'),origSave=save?.onclick,beforeIds=new Set(entryList().map(x=>x.id));
    if(save&&origSave){save.onclick=function(ev){const taskId=taskSel.value,steering=isSteeringAdminTask(taskId)&&(person?.value||'')===boName();if(steering){const mh=num(m.querySelector('[name="committeeMeetingHours"]')?.value),cnt=Math.max(0,Math.round(num(m.querySelector('[name="committeeParticipantCount"]')?.value)));if(mh<=0){alert('Enter the actual Steering Committee meeting duration.');return}if(cnt<=0){alert('Enter the number of Steering Committee participants excluding the Business Owner.');return}}origSave.call(save,ev);if(document.body.contains(m))return;const src=sourceId?entryList().find(x=>x.id===sourceId):entryList().find(x=>!beforeIds.has(x.id)&&x.person===boName()&&x.taskId===taskId);if(src&&syncDerived(src)){mark('planning');mark('tasks');render()}}}
    if(sourceId){const del=[...m.querySelectorAll('.modal-actions button')].find(x=>/delete/i.test(x.textContent||'')),origDel=del?.onclick;if(del&&origDel){del.onclick=function(ev){origDel.call(del,ev);if(document.body.contains(m))return;if(removeDerived(sourceId)){mark('planning');render()}}}}
  }

  function latestModal(){return [...document.querySelectorAll('.modal-backdrop')].at(-1)}
  function scheduleAugment(sourceId){setTimeout(()=>addSteeringFields(latestModal(),sourceId),0)}
  function decorateBudget(){const root=document.querySelector('.v28-budget');if(!root||root.querySelector('.v29-compact'))return;const privacy=root.querySelector('.v28-privacy')||root.querySelector('.v28-kpis');if(privacy)privacy.insertAdjacentHTML('afterend',adminSummary(true))}
  function decoratePooledRole(){document.querySelectorAll('.v28-table tbody tr').forEach(tr=>{const name=tr.querySelector('td:first-child b')?.textContent?.trim();if(name!==POOLED)return;const cell=tr.querySelector('td:nth-child(2)');if(cell)cell.innerHTML='Steering Committee<small>Program governance</small>'});document.querySelectorAll('.v28-rate-editor label').forEach(l=>{if(l.querySelector('b')?.textContent?.trim()===POOLED){const s=l.querySelector('small');if(s)s.textContent='Steering Committee'}})}

  document.addEventListener('click',ev=>{
    const timeRow=ev.target.closest('[data-v27-time]');if(timeRow){scheduleAugment(timeRow.dataset.v27Time);return}
    if(ev.target.closest('#v27LogTime')||ev.target.closest('[data-v27-log-from-task]')){scheduleAugment(null);return}
    if(ev.target.closest('[data-v29-admin-settings]')){ev.preventDefault();editAdminSettings();return}
    if(ev.target.closest('#v28FinancialSettings'))setTimeout(decoratePooledRole,0);
  });

  if(typeof renderBusinessOwner==='function'){const prevBO=renderBusinessOwner;renderBusinessOwner=function(){ensureAdminTasks();return prevBO()+adminSummary(false)}}
  const prevBind=bindPage;bindPage=function(){prevBind();decorateBudget();decoratePooledRole()};
  const prevRender=render;render=function(){ensureAdminTasks();const out=prevRender.apply(this,arguments);decorateBudget();decoratePooledRole();return out};

  window.D365_PROGRAM_ADMIN={ensure:ensureAdminTasks,summary:adminSummary,pooledResource:POOLED,version:VERSION,adminTaskIds:CATEGORIES.map(c=>adminTaskId(c.code))};
})();
