(function(){
  function v6Pct(x){return Math.max(0,Math.min(100,Math.round((Number(x)||0)*10)/10))}
  function v6TaskProgress(t){if(typeof taskProgress==='function')return v6Pct(taskProgress(t));return v6Pct(t.progress||(['Approved','Closed'].includes(t.status)?100:0))}
  function v6MilestoneTasks(mid){return (data().tasks||[]).filter(t=>(t.milestoneId||'')===mid)}
  function v6OrderedMilestones(){return (data().milestones||[]).slice().sort((a,b)=>String(a.start||'').localeCompare(String(b.start||''))||String(a.id||'').localeCompare(String(b.id||'')))}
  function v6Path(t){const l1=t.l1||t.stream||'Program',l2=t.l2||'',l3=t.l3ProcessId?`${t.l3ProcessId} · ${t.l3ProcessName||''}`:(t.process&&t.process!=='All'?t.process:'');return [l1,l2,l3].filter(Boolean).join(' › ')}
  function v6Weights(mid){
    const tasks=v6MilestoneTasks(mid),explicit=tasks.some(t=>Number(t.milestoneContribution)>0),weights={};
    if(!tasks.length)return {tasks,weights,mode:'none',coverage:0,earned:0,progress:0};
    if(!explicit){const w=100/tasks.length;tasks.forEach(t=>weights[t.id]=w);return {tasks,weights,mode:'auto',coverage:100,earned:tasks.reduce((s,t)=>s+w*v6TaskProgress(t)/100,0),progress:v6Pct(tasks.reduce((s,t)=>s+w*v6TaskProgress(t)/100,0))}}
    let coverage=0,earned=0;tasks.forEach(t=>{const w=Math.max(0,Number(t.milestoneContribution)||0);weights[t.id]=w;coverage+=w;earned+=w*v6TaskProgress(t)/100});return {tasks,weights,mode:'explicit',coverage:Math.round(coverage*10)/10,earned:Math.round(earned*10)/10,progress:v6Pct(earned)}
  }
  function v6DerivedStatus(m){
    const r=v6Weights(m.id),tol=.2;if(!r.tasks.length)return 'Not decomposed';
    if(r.mode==='explicit'&&r.coverage<100-tol)return 'Under-defined';
    if(r.mode==='explicit'&&r.coverage>100+tol)return 'Over-allocated';
    if(r.tasks.some(t=>t.status==='Blocked'))return 'Blocked';
    const past=m.end&&m.end<today();if(past&&r.progress<100)return 'At Risk';
    if(r.progress>=99.9){return r.tasks.every(t=>['Approved','Closed'].includes(t.status))?'Achieved':'Ready for approval'}
    if(r.tasks.some(t=>v6TaskProgress(t)>0))return 'In Progress';return 'Not Started';
  }
  function v6StatusBadge(s){const cls=s==='Achieved'?'green':(['At Risk','Blocked','Under-defined','Over-allocated'].includes(s)?'red':(s==='Ready for approval'?'blue':'yellow'));return `<span class="v6-status ${cls}">${esc(s)}</span>`}
  function v6CoverageLabel(r){return r.mode==='auto'?'100% · auto-equal':`${r.coverage}% · explicit`}
  function v6TaskWeight(mid,t){const r=v6Weights(mid);return r.weights[t.id]||0}

  function v6MilestonePanel(){
    const ms=v6OrderedMilestones();
    return `<div class="section-title v6-title"><div><h2>Milestone outcome roll-up</h2><span>Milestone = the weighted sum of the tasks required to achieve its exit criteria</span></div></div><div class="v6-principle"><b>Control rule</b><span>Task contributions should total 100%. Milestone progress is calculated from task progress × task contribution. A milestone cannot be closed until contribution coverage = 100%, task outcome = 100%, linked tasks are approved/closed and exit criteria are defined.</span></div><div class="v6-milestones">${ms.map((m,ix)=>{const r=v6Weights(m.id),status=v6DerivedStatus(m),missing=Math.max(0,100-r.coverage),over=Math.max(0,r.coverage-100);return `<details class="card v6-milestone" ${ix===0?'open':''}><summary><div class="v6-ms-main"><span>${esc(m.id)} · ${esc(m.start||'')} → ${esc(m.end||'')}</span><b>${esc(m.name)}</b><small>${r.tasks.length} linked task${r.tasks.length===1?'':'s'} · contribution coverage ${v6CoverageLabel(r)}</small></div><div class="v6-ms-score"><strong>${r.progress}%</strong>${v6StatusBadge(status)}</div></summary><div class="v6-ms-body"><div class="v6-ms-progress"><div><b>Outcome progress</b><span>${r.progress}% earned of 100%</span></div><div class="maturity-bar"><i style="width:${r.progress}%"></i></div></div>${r.mode==='explicit'&&Math.abs(r.coverage-100)>.2?`<div class="notice ${r.coverage<100?'warn':''}"><b>${r.coverage<100?'Milestone under-defined':'Contribution over-allocated'}:</b> ${r.coverage<100?`${missing}% of the milestone outcome is not yet represented by a task.`:`Task contributions exceed the milestone by ${over}%. Reduce weights so the total returns to 100%.`}</div>`:''}<div class="v6-criteria"><b>Purpose / outcome</b><span>${esc(m.description||'Not documented')}</span><b>Exit criteria / definition of done</b><span>${esc(m.exitCriteria||'Not yet defined — define before milestone closure.')}</span></div><div class="v6-ms-actions"><button class="btn primary" data-v6-add-milestone-task="${esc(m.id)}">+ Task for milestone</button><button class="btn" data-edit-milestone="${esc(m.id)}">Edit milestone / exit criteria</button></div><div class="table-wrap"><table class="data-table v6-task-rollup"><thead><tr><th>Task</th><th>L1 › L2 › L3</th><th>Owner</th><th>Contribution</th><th>Task progress</th><th>Earned outcome</th><th>Status</th></tr></thead><tbody>${r.tasks.map(t=>{const w=r.weights[t.id]||0,earned=Math.round(w*v6TaskProgress(t))/100;return `<tr data-edit-task="${esc(t.id)}"><td><b>${esc(t.title)}</b>${t.milestoneOutcome?`<small>Outcome: ${esc(t.milestoneOutcome)}</small>`:''}</td><td>${esc(v6Path(t)||'Program')}</td><td>${esc(t.owner||'Unassigned')}</td><td><b>${Math.round(w*10)/10}%</b>${r.mode==='auto'?'<small>auto-weighted</small>':''}</td><td>${v6TaskProgress(t)}%</td><td>${Math.round(earned*10)/10}%</td><td>${badge(t.status||'Not Started')}</td></tr>`}).join('')}</tbody></table>${r.tasks.length?'':'<div class="empty">No task is linked to this milestone. Decompose the milestone before execution begins.</div>'}</div></div></details>`}).join('')}</div>`;
  }

  const _v6EditTask=editTask;
  editTask=function(id,stream=selectedStream,ownerDefault='',defaults={}){
    _v6EditTask(id,stream,ownerDefault,defaults);
    const mm=[...document.querySelectorAll('.modal-backdrop')].at(-1);if(!mm)return;
    const task=(state.tasks?.tasks||[]).find(t=>t.id===id),form=mm.querySelector('.v5-task-form')||mm.querySelector('.form-grid');if(!form||form.querySelector('[name="milestoneContribution"]'))return;
    const contribution=task?.milestoneContribution??defaults?.milestoneContribution??'',outcome=task?.milestoneOutcome??defaults?.milestoneOutcome??'';
    const label=document.createElement('label');label.innerHTML=`Milestone contribution %<input type="number" min="0" max="100" step="0.1" name="milestoneContribution" value="${esc(contribution)}" placeholder="Blank = auto">`;
    const outcomeLabel=document.createElement('label');outcomeLabel.className='full';outcomeLabel.innerHTML=`Milestone outcome / exit criterion supported<input name="milestoneOutcome" value="${esc(outcome)}" placeholder="What part of the milestone does this task deliver?">`;
    const milestoneSelect=form.querySelector('[name="milestoneId"]');if(milestoneSelect){milestoneSelect.closest('label')?.after(label);form.appendChild(outcomeLabel);const helper=document.createElement('div');helper.className='notice full v6-allocation-helper';form.appendChild(helper);const refresh=()=>{const mid=milestoneSelect.value;if(!mid){helper.innerHTML='<b>Milestone linkage:</b> select a milestone to make this task contribute to an outcome.';return}const r=v6Weights(mid),thisExisting=task&&task.milestoneId===mid?(Number(task.milestoneContribution)||0):0,allocated=Math.max(0,r.coverage-thisExisting);helper.innerHTML=`<b>${esc(mid)} allocation:</b> ${r.mode==='auto'?'Current tasks are auto-weighted equally. Entering a contribution switches this milestone to explicit weighting.':`${Math.round(allocated*10)/10}% already allocated to other tasks; ${Math.max(0,Math.round((100-allocated)*10)/10)}% remains.`} Task contributions should total 100%.`};milestoneSelect.addEventListener('change',refresh);refresh()}
  };

  const _v6EditMilestone=editMilestone;
  editMilestone=function(id){
    _v6EditMilestone(id);const mm=[...document.querySelectorAll('.modal-backdrop')].at(-1);if(!mm)return;const m=(data().milestones||[]).find(x=>x.id===id),body=mm.querySelector('.modal-body');if(body&&!body.querySelector('.v6-gate-note')){const n=document.createElement('div');n.className='notice v6-gate-note';const r=m?v6Weights(m.id):null;n.innerHTML=`<b>Outcome-driven milestone:</b> progress is derived from linked tasks, not entered manually. ${r?`Current outcome progress ${r.progress}% · contribution coverage ${v6CoverageLabel(r)}.`:''} The Status field is the governance/gate disposition.`;body.prepend(n)}const save=mm.querySelector('.modal-save'),orig=save?.onclick;if(save&&orig){save.onclick=(e)=>{const status=mm.querySelector('[name="status"]')?.value,criteria=mm.querySelector('[name="exitCriteria"]')?.value?.trim(),mid=mm.querySelector('[name="id"]')?.value||id,r=id?v6Weights(id):null;if(['Complete','Closed'].includes(status)&&r){const okCoverage=Math.abs(r.coverage-100)<=.2,okProgress=r.progress>=99.9,okApproval=r.tasks.length>0&&r.tasks.every(t=>['Approved','Closed'].includes(t.status));if(!criteria||!okCoverage||!okProgress||!okApproval){alert(`Milestone ${mid} cannot be ${status}. Required: exit criteria defined, task contribution coverage = 100%, outcome progress = 100%, and all linked tasks approved/closed.`);return}}orig.call(save,e)}}
  };

  const _v6RenderExecution=renderExecution;
  renderExecution=function(){const base=_v6RenderExecution();const marker='<div class="section-title"><h2>Execution list</h2>';return base.includes(marker)?base.replace(marker,`${v6MilestonePanel()}${marker}`):`${base}${v6MilestonePanel()}`};

  const _v6RenderRoadmap=renderRoadmap;
  renderRoadmap=function(){const base=_v6RenderRoadmap();const marker='<div class="section-title"><h2>Integrated program Gantt</h2>';return base.includes(marker)?base.replace(marker,`${v6MilestonePanel()}${marker}`):`${v6MilestonePanel()}${base}`};

  function v6DecorateExecutionRows(){
    $$('.v5-execution-table tr[data-edit-task]').forEach(row=>{const t=(data().tasks||[]).find(x=>x.id===row.dataset.editTask);if(!t||row.querySelector('.v6-task-ms'))return;const cells=row.querySelectorAll('td'),target=cells[3]||cells[2];if(!target)return;const s=document.createElement('small');s.className='v6-task-ms';if(t.milestoneId){const w=v6TaskWeight(t.milestoneId,t);s.textContent=`Milestone ${t.milestoneId} · ${Math.round(w*10)/10}% contribution${t.milestoneOutcome?` · ${t.milestoneOutcome}`:''}`}else s.textContent='No milestone linked';target.appendChild(s)})
  }
  function v6DecorateLegacyMilestones(){
    const ms=v6OrderedMilestones();$$('.milestone-detail').forEach((d,i)=>{const m=ms[i];if(!m)return;const r=v6Weights(m.id),strong=d.querySelector('.milestone-summary-progress strong'),bar=d.querySelector('.milestone-summary-progress .maturity-bar i');if(strong)strong.textContent=`${r.progress}%`;if(bar)bar.style.width=`${r.progress}%`});
    $$('.gantt-row.milestone-row').forEach((row,i)=>{const m=ms[i];if(!m)return;const r=v6Weights(m.id),small=row.querySelector('.gantt-label small');if(small)small.textContent=small.textContent.replace(/\d+(?:\.\d+)?% complete/,`${r.progress}% outcome complete`)});
    $$('tr[data-edit-milestone]').forEach(row=>{const m=(data().milestones||[]).find(x=>x.id===row.dataset.editMilestone);if(!m)return;const r=v6Weights(m.id),cells=row.querySelectorAll('td');if(cells[6])cells[6].innerHTML=`<b>${r.progress}%</b><small>${v6CoverageLabel(r)} coverage</small>`;if(cells[7])cells[7].innerHTML=v6StatusBadge(v6DerivedStatus(m))})
  }

  const _v6Bind=bindPage;
  bindPage=function(){_v6Bind();v6DecorateExecutionRows();v6DecorateLegacyMilestones();$$('[data-v6-add-milestone-task]').forEach(b=>b.onclick=(e)=>{e.stopPropagation();const mid=b.dataset.v6AddMilestoneTask,m=(data().milestones||[]).find(x=>x.id===mid);editTask(undefined,m?.stream&&m.stream!=='Program'?m.stream:'Program','',{milestoneId:mid,sourceType:'Milestone decomposition',sourceId:mid,sourceTitle:`Task created to achieve ${mid} · ${m?.name||'milestone'}`,milestoneOutcome:m?.exitCriteria||''})})
  };
})();
