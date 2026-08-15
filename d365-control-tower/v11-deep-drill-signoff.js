(function(){
  'use strict';

  const L3_L2={
    M2O:{'1.1':'RFQ / quotation'},
    O2C:{'1.2':'Order confirmation','1.4':'Invoicing'},
    F2P:{'3.1':'Supply planning / MRP'},
    P2P:{'3.2':'BOM / formula & route','3.3':'Finite / capacity scheduling','3.4':'Material availability','3.5':'Production execution','3.6':'Production execution','3.7':'Production execution','3.8':'Production execution','3.9':'Production execution','3.10':'Production execution','3.11':'Production execution','3.12':'Production execution','3.13':'Material availability','3.14':'Production execution'},
    S2P:{'2.1':'Requisition','2.2':'Purchase order','2.3':'Purchase order','2.4':'Purchase order','2.5':'Purchase order','2.6':'Receipt acknowledgment','2.7':'Receipt acknowledgment','2.8':'Receipt acknowledgment','2.9':'Supplier invoice','2.10':'Supplier invoice'},
    W2D:{'1.3':'Shipment','02':'Shipment','03':'Shipment'},
    R2R:{'1.5':'Subledger accounting'}
  };

  function fr(){return document.documentElement.lang==='fr'}
  function tr(en,frText){return fr()?frText:en}
  function esc11(v){return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function project(){return typeof data==='function'?data():{}}
  function taskArray(){return state.tasks?.tasks||[]}
  function today11(){return typeof today==='function'?today():new Date().toISOString().slice(0,10)}
  function pct(v){return Math.max(0,Math.min(100,Math.round((Number(v)||0)*10)/10))}
  function taskProgress11(t){return typeof taskProgress==='function'?pct(taskProgress(t)):pct(t.progress||(['Approved','Closed'].includes(t.status)?100:0))}
  function streams(){return typeof allStreams==='function'?allStreams():[...(state.framework?.valueStreams||[]),...(state.framework?.crossFunctional||[])]}
  function processes(stream){return state.processes?.subprocesses?.[stream]||[]}
  function rawReg(k){return state.registers?.[k]||[]}
  function isTaskApproved(t){return ['Approved','Closed'].includes(t.status)}
  function hasCompletionStamp(t){return !!(t.completedBy&&t.completedAt)}
  function hasApprovalStamp(t){return !!(t.approvedBy&&t.approvedAt)}
  function fullySigned(t){return hasCompletionStamp(t)&&hasApprovalStamp(t)&&isTaskApproved(t)}
  function signerNames(){
    return [...new Set([
      ...(state.framework?.people||[]).map(p=>p.name),
      state.framework?.businessOwner?.name,
      ...taskArray().map(t=>t.owner),
      ...taskArray().map(t=>t.approver),
      ...taskArray().map(t=>t.completedBy),
      ...taskArray().map(t=>t.approvedBy)
    ].filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
  }
  function latestModal(){return [...document.querySelectorAll('.modal-backdrop')].at(-1)}
  function openView11(name){try{view=name;document.querySelectorAll('#mainNav [data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));render()}catch(e){console.warn('[V11] navigation',e)}}
  function streamDef(id){return streams().find(s=>s.id===id)}

  // ---------------------------------------------------------------------------
  // Task completion + approval stamps
  // ---------------------------------------------------------------------------
  function datalistHtml(){return `<datalist id="v11SignerNames">${signerNames().map(x=>`<option value="${esc11(x)}"></option>`).join('')}</datalist>`}
  function injectSignoffEditor(mm,record,defaults={}){
    const form=mm?.querySelector('.v5-task-form')||mm?.querySelector('.form-grid');
    if(!form||form.querySelector('.v11-signoff-block'))return;
    const t=record||defaults||{};
    const box=document.createElement('div');box.className='v11-signoff-block full';
    box.innerHTML=`<div class="v11-signoff-head"><div><b>${tr('Task sign-off','Approbation de la tâche')}</b><span>${tr('Completion and approval stamps become part of the shared task audit trail.','Les estampilles de réalisation et d’approbation font partie de la piste d’audit partagée de la tâche.')}</span></div><span class="v11-sign-rule">${tr('Approved / Closed requires both stamps','Approuvée / Fermée exige les deux estampilles')}</span></div>
      ${datalistHtml()}
      <div class="v11-sign-grid">
        <label>${tr('Completed by','Terminé par')}<input name="completedBy" list="v11SignerNames" value="${esc11(t.completedBy||'')}"></label>
        <label>${tr('Completion date','Date de réalisation')}<input type="date" name="completedAt" value="${esc11(t.completedAt||'')}"></label>
        <label>${tr('Approved by','Approuvé par')}<input name="approvedBy" list="v11SignerNames" value="${esc11(t.approvedBy||t.approver||'')}"></label>
        <label>${tr('Approval date','Date d’approbation')}<input type="date" name="approvedAt" value="${esc11(t.approvedAt||'')}"></label>
      </div>
      <div class="v11-sign-actions"><button type="button" class="btn small v11-stamp-finished">${tr('✓ Stamp finished','✓ Estampiller terminé')}</button><button type="button" class="btn small primary v11-stamp-approved">${tr('✓ Stamp approval','✓ Estampiller approuvé')}</button></div>`;
    form.appendChild(box);

    const owner=()=>mm.querySelector('[name="owner"]')?.value||t.owner||'';
    const completedBy=box.querySelector('[name="completedBy"]'),completedAt=box.querySelector('[name="completedAt"]'),approvedBy=box.querySelector('[name="approvedBy"]'),approvedAt=box.querySelector('[name="approvedAt"]');
    box.querySelector('.v11-stamp-finished').onclick=()=>{
      if(!completedBy.value.trim())completedBy.value=owner();
      if(!completedBy.value.trim()){alert(tr('Enter the name of the person completing the task.','Inscrivez le nom de la personne qui termine la tâche.'));completedBy.focus();return}
      completedAt.value=completedAt.value||today11();
      const prog=mm.querySelector('[name="progress"]');if(prog)prog.value=100;
      const status=mm.querySelector('[name="status"]');if(status&&!['Approved','Closed'].includes(status.value))status.value='Ready for Review';
    };
    box.querySelector('.v11-stamp-approved').onclick=()=>{
      if(!completedBy.value.trim()||!completedAt.value){alert(tr('Stamp the task as finished before approval.','Estampillez la tâche comme terminée avant l’approbation.'));return}
      if(!approvedBy.value.trim()){alert(tr('Enter the name of the person approving the task.','Inscrivez le nom de la personne qui approuve la tâche.'));approvedBy.focus();return}
      approvedAt.value=approvedAt.value||today11();
      const prog=mm.querySelector('[name="progress"]');if(prog)prog.value=100;
      const status=mm.querySelector('[name="status"]');if(status)status.value='Approved';
    };

    const save=mm.querySelector('.modal-save'),orig=save?.onclick;
    if(save&&orig){save.onclick=(e)=>{
      const status=mm.querySelector('[name="status"]')?.value||'',progress=Number(mm.querySelector('[name="progress"]')?.value||0),cb=completedBy.value.trim(),cd=completedAt.value,ab=approvedBy.value.trim(),ad=approvedAt.value;
      if(['Ready for Review','BPO Review','Approved','Closed'].includes(status)&&(!cb||!cd)){
        alert(tr('A finished task requires a completion stamp: completed by + completion date.','Une tâche terminée exige une estampille de réalisation : terminé par + date de réalisation.'));return;
      }
      if(['Approved','Closed'].includes(status)){
        if(progress<99.9){alert(tr('Approved / Closed tasks must be 100% complete.','Les tâches Approuvées / Fermées doivent être complétées à 100 %.'));return}
        if(!ab||!ad){alert(tr('Approved / Closed tasks require an approval stamp: approved by + approval date.','Les tâches Approuvées / Fermées exigent une estampille d’approbation : approuvé par + date d’approbation.'));return}
      }
      orig.call(save,e);
    }}
  }

  const _v11EditTask=editTask;
  editTask=function(id,stream=selectedStream,ownerDefault='',defaults={}){
    const existing=taskArray().find(t=>t.id===id);
    _v11EditTask(id,stream,ownerDefault,defaults);
    injectSignoffEditor(latestModal(),existing,defaults);
  };

  const _v11EditMilestone=editMilestone;
  editMilestone=function(id){
    _v11EditMilestone(id);const mm=latestModal(),save=mm?.querySelector('.modal-save'),orig=save?.onclick;if(!mm||!save||!orig)return;
    save.onclick=(e)=>{
      const status=mm.querySelector('[name="status"]')?.value||'';
      if(['Complete','Closed'].includes(status)){
        const unsigned=taskArray().filter(t=>t.milestoneId===id&&isTaskApproved(t)&&!fullySigned(t));
        if(unsigned.length){alert(`${tr('Milestone cannot close. Approved tasks are missing completion/approval stamps:','Le jalon ne peut pas être fermé. Des tâches approuvées n’ont pas leurs estampilles de réalisation/approbation :')} ${unsigned.map(t=>t.id).join(', ')}`);return}
      }
      orig.call(save,e);
    };
  };

  function stampHtml(t,compact=false){
    if(!t)return '';
    const complete=hasCompletionStamp(t),approve=hasApprovalStamp(t);
    if(!complete&&!approve&&!isTaskApproved(t))return '';
    const a=complete?`<span class="v11-stamp done"><i>✓</i><b>${tr('Finished','Terminé')}</b><em>${esc11(t.completedBy)} · ${esc11(t.completedAt)}</em></span>`:`<span class="v11-stamp pending"><i>!</i><b>${tr('Finish stamp missing','Estampille terminé manquante')}</b></span>`;
    const b=approve?`<span class="v11-stamp approved"><i>✓</i><b>${tr('Approved','Approuvé')}</b><em>${esc11(t.approvedBy)} · ${esc11(t.approvedAt)}</em></span>`:(isTaskApproved(t)?`<span class="v11-stamp pending"><i>!</i><b>${tr('Approval stamp missing','Estampille d’approbation manquante')}</b></span>`:'');
    return `<div class="v11-stamps ${compact?'compact':''}">${a}${b}</div>`;
  }
  function decorateTaskStamps(root=document){
    root.querySelectorAll('tr[data-edit-task]').forEach(row=>{
      if(row.querySelector('.v11-stamps'))return;const t=taskArray().find(x=>x.id===row.dataset.editTask);if(!t)return;const cells=row.querySelectorAll('td'),target=cells[0]||cells[1];if(target)target.insertAdjacentHTML('beforeend',stampHtml(t,true));
    });
    root.querySelectorAll('.v10-evidence-row[data-v10-type="task"]').forEach(row=>{
      if(row.querySelector('.v11-stamps'))return;const t=taskArray().find(x=>x.id===row.dataset.v10Id);if(!t)return;const cell=row.querySelector('td:nth-child(2)')||row.querySelector('td');if(cell)cell.insertAdjacentHTML('beforeend',stampHtml(t,true));
    });
    root.querySelectorAll('.v5-linked-task[data-edit-task],.task-card[data-edit-task]').forEach(card=>{
      if(card.querySelector('.v11-stamps'))return;const t=taskArray().find(x=>x.id===card.dataset.editTask);if(t)card.insertAdjacentHTML('beforeend',stampHtml(t,true));
    });
  }

  // ---------------------------------------------------------------------------
  // Stage gate: criterion -> L1 -> L2 -> L3 -> evidence / task
  // ---------------------------------------------------------------------------
  function processFor(stream,idOrText){
    const ps=processes(stream),s=String(idOrText||'').trim();if(!s)return null;
    let p=ps.find(x=>String(x.id)===s);if(p)return p;
    p=ps.find(x=>s.includes(String(x.id))||String(x.name||'').toLowerCase()===s.toLowerCase()||s.toLowerCase().includes(String(x.name||'').toLowerCase()));return p||null;
  }
  function hierarchyOf(record,streamOverride=''){
    const stream=streamOverride||record.stream||record.l1||'Program';
    let l3Id=record.l3ProcessId||'',l3Name=record.l3ProcessName||'';
    if(!l3Id){const p=processFor(stream,record.subprocess||record.process||'');if(p){l3Id=p.id;l3Name=p.name}}
    if(l3Id&&!l3Name){const p=processFor(stream,l3Id);if(p)l3Name=p.name}
    const taskMatch=taskArray().find(t=>(t.stream||t.l1)===stream&&l3Id&&String(t.l3ProcessId||'')===String(l3Id));
    const l2=record.l2||record.capability||taskMatch?.l2||L3_L2[stream]?.[String(l3Id)]||'';
    return {stream,l2:l2||tr('Stream-level / unassigned L2','Niveau chaîne / L2 non assigné'),l3Id,l3Name,l3:l3Id?`${l3Id} · ${l3Name||tr('Unnamed process','Processus sans nom')}`:tr('Stream-level / no L3','Niveau chaîne / aucun L3')};
  }
  function scoreProcess(p){try{return typeof processGateScore==='function'?pct(processGateScore(p)):(['Approved','Validated','Closed'].includes(p.status)?100:0)}catch{return 0}}
  function allFindings(){return [...(project().painPoints||[]).map(x=>({...x,_kind:'Pain point'})),...(project().opportunities||[]).map(x=>({...x,_kind:'Opportunity'}))]}
  function evidence(rule,m){
    if(rule==='processValidation')return streams().flatMap(s=>processes(s.id).map(p=>{const h=hierarchyOf({...p,l3ProcessId:p.id,l3ProcessName:p.name},s.id);return {kind:'process',id:p.id,title:p.name,owner:s.bpo||'',status:p.status||'Draft',score:scoreProcess(p),...h}}));
    if(rule==='ownership')return streams().map(s=>({kind:'stream',id:s.id,title:s.name,owner:s.bpo||'',status:s.bpo&&!String(s.bpo).toUpperCase().includes('TBD')?'Confirmed':'Missing',score:s.bpo&&!String(s.bpo).toUpperCase().includes('TBD')?100:0,stream:s.id,l2:tr('Stream ownership','Responsabilité de la chaîne'),l3:tr('BPO / accountable owner','BPO / responsable'),l3Id:''}));
    if(rule==='findingsReviewed')return allFindings().map(x=>{const h=hierarchyOf(x);return {kind:'finding',subkind:x._kind,id:x.id,title:x.title||x.description,owner:x.owner||'',status:x.status||'Open',score:!['Open','To assess',''].includes(x.status||'Open')?100:0,...h}});
    if(rule==='requirementsApproved'||rule==='fitGapComplete')return (project().requirements||[]).map(x=>{const fit=!!(x.fitGap&&x.fitGap!=='TBD'&&(x.toBeDesign||x.toBeProcess)),ok=rule==='fitGapComplete'?fit:['Approved','Ready for Design','Closed'].includes(x.status);return {kind:'requirement',id:x.id,title:x.title||x.requirement||x.description,owner:x.owner||'',status:rule==='fitGapComplete'?(fit?'Complete':'Incomplete'):(x.status||'Open'),score:ok?100:0,...hierarchyOf(x)}});
    if(rule==='taskCoverage'||rule==='tasksApproved')return taskArray().filter(t=>t.milestoneId===m?.id).map(t=>({kind:'task',id:t.id,title:t.title,owner:t.owner||'',status:t.status||'Not Started',score:rule==='tasksApproved'?(isTaskApproved(t)?100:0):taskProgress11(t),signed:fullySigned(t),...hierarchyOf(t)}));
    if(rule==='dataReady')return (project().dataObjects||[]).map(x=>{const ok=['Validated','Complete'].includes(x.mappingStatus)&&['Validated','Complete'].includes(x.cleansingStatus);return {kind:'architecture',id:x.id,title:x.name||x.object||x.title,owner:x.owner||'',status:ok?'Ready':(x.mappingStatus||x.status||'Not Started'),score:ok?100:0,...hierarchyOf(x)}});
    if(rule==='integrationsReady')return (project().integrations||[]).map(x=>{const st=x.buildStatus||x.status||'Not Started',ok=['Complete','Ready','Closed'].includes(st);return {kind:'architecture',id:x.id,title:x.name||x.integration||x.title,owner:x.owner||'',status:st,score:ok?100:0,...hierarchyOf(x)}});
    if(rule==='entityDesignResolved')return rawReg('entityDesign').map(x=>{const ok=['Approved','Closed'].includes(x.status)||(['Common','Controlled variant','Entity-specific'].includes(x.disposition)&&!['TBD','Open','Decision Required'].includes(x.status));return {kind:'governance',id:x.id,title:x.title||x.capability||x.process||x.l2||x.l3ProcessId||tr('Entity design item','Élément de conception entité'),owner:x.owner||'',status:x.status||x.disposition||'TBD',score:ok?100:0,...hierarchyOf(x)}});
    if(rule==='sitPassed'||rule==='uatPassed'){const typ=rule==='sitPassed'?'SIT':'UAT';return rawReg('testScenarios').filter(x=>x.testType===typ).map(x=>({kind:'architecture',id:x.id,title:x.scenario||x.title,owner:x.owner||'',status:x.status||'Not Started',score:x.status==='Passed'?100:0,...hierarchyOf(x)}))}
    if(['trainingReady','cutoverReady','hypercareReady'].includes(rule)){const cat=rule==='trainingReady'?'People / Training':rule==='hypercareReady'?'Hypercare':null;return rawReg('cutoverItems').filter(x=>!cat||x.category===cat).map(x=>({kind:'architecture',id:x.id,title:x.title,owner:x.owner||'',status:x.status||'Not Started',score:['Ready','Complete','Closed'].includes(x.status)?100:0,...hierarchyOf(x)}))}
    return [];
  }
  function avgRows(rows){return rows.length?pct(rows.reduce((s,x)=>s+Number(x.score||0),0)/rows.length):0}
  function groupBy(rows,key){const m=new Map();rows.forEach(x=>{const k=x[key]||tr('Unassigned','Non assigné');if(!m.has(k))m.set(k,[]);m.get(k).push(x)});return m}
  function statusDot(score){return score>=99.9?'✓':score>0?'◐':'○'}
  function leafHtml(x){
    const sign=x.kind==='task'?stampHtml(taskArray().find(t=>t.id===x.id),true):'';
    return `<button type="button" class="v11-leaf" data-v11-kind="${esc11(x.kind)}" data-v11-id="${esc11(x.id)}" data-v11-stream="${esc11(x.stream||'')}"><span class="v11-leaf-state ${x.score>=99.9?'done':x.score>0?'progress':''}">${statusDot(x.score)}</span><span><b>${esc11(x.id)} · ${esc11(x.title||'')}</b><small>${esc11(x.owner||tr('Unassigned','Non assigné'))} · ${esc11(x.status||'—')}</small>${sign}</span><em>${Math.round(x.score)}%</em></button>`;
  }
  function hierarchyHtml(rows){
    if(!rows.length)return `<div class="v11-empty">${tr('No evidence exists yet for this criterion.','Aucune preuve n’existe encore pour ce critère.')}</div>`;
    const byStream=groupBy(rows,'stream');let si=0;
    return `<div class="v11-hierarchy">${[...byStream.entries()].map(([stream,srows])=>{const ss=avgRows(srows),sdef=streamDef(stream),byL2=groupBy(srows,'l2'),open=si++===0||ss<99.9;return `<details class="v11-level v11-l1" ${open?'open':''}><summary><span>${statusDot(ss)}</span><div><b>${esc11(stream)} · ${esc11(sdef?.name||stream)}</b><small>${srows.length} ${tr('evidence items','éléments de preuve')} · ${esc11(sdef?.bpo||tr('No BPO','Aucun BPO'))}</small></div><em>${Math.round(ss)}%</em></summary><div class="v11-level-body">${[...byL2.entries()].map(([l2,l2rows])=>{const l2s=avgRows(l2rows),byL3=groupBy(l2rows,'l3');return `<details class="v11-level v11-l2" ${l2s<99.9?'open':''}><summary><span>${statusDot(l2s)}</span><div><b>L2 · ${esc11(l2)}</b><small>${l2rows.length} ${tr('items','éléments')}</small></div><em>${Math.round(l2s)}%</em></summary><div class="v11-level-body">${[...byL3.entries()].map(([l3,l3rows])=>{const l3s=avgRows(l3rows);return `<details class="v11-level v11-l3" ${l3s<99.9?'open':''}><summary><span>${statusDot(l3s)}</span><div><b>L3 · ${esc11(l3)}</b><small>${l3rows.length} ${tr('evidence items','éléments de preuve')}</small></div><em>${Math.round(l3s)}%</em></summary><div class="v11-leaves">${l3rows.map(leafHtml).join('')}</div></details>`}).join('')}</div></details>`}).join('')}</div></details>`}).join('')}</div>`;
  }
  function milestoneFromGate(modal){const id=modal.querySelector('#v10GateTitle')?.textContent?.split('·')[0]?.trim();return (project().milestones||[]).find(m=>m.id===id)||null}
  function closeGate(){document.querySelector('.v10-gate-backdrop')?.remove()}
  function leafAction(btn){
    const kind=btn.dataset.v11Kind,id=btn.dataset.v11Id,stream=btn.dataset.v11Stream;closeGate();
    if(kind==='task'&&typeof editTask==='function')return editTask(id);
    if(kind==='requirement'&&typeof editRequirement==='function')return editRequirement(id);
    if(kind==='finding'&&typeof editPain==='function'){const x=allFindings().find(z=>z.id===id);return editPain(id,x?._kind||'Pain point')}
    if((kind==='process'||kind==='stream')&&typeof openStream==='function')return openStream(stream);
    if(kind==='governance')return openView11('governance');
    return openView11('architecture');
  }
  function enhanceGateModal(){
    const modal=document.querySelector('.v10-gate-modal');if(!modal)return;
    const detail=modal.querySelector('#v10CriterionDetail');if(!detail)return;
    const active=modal.querySelector('.v10-criterion-btn.active'),rule=active?.dataset.v10Rule||'';if(!rule)return;
    if(detail.dataset.v11Rule===rule&&detail.querySelector('.v11-drill-controls')){decorateTaskStamps(detail);return}
    detail.dataset.v11Rule=rule;
    detail.querySelectorAll('.v11-drill-controls,.v11-hierarchy-wrap').forEach(x=>x.remove());
    const m=milestoneFromGate(modal),rows=evidence(rule,m),actions=detail.querySelector('.v10-detail-actions');
    const controls=document.createElement('div');controls.className='v11-drill-controls';controls.innerHTML=`<div><b>${tr('Drill-down view','Vue de forage')}</b><span>${tr('Criterion → Value Stream → L2 → L3 → evidence / task','Critère → Chaîne de valeur → L2 → L3 → preuve / tâche')}</span></div><div class="segmented"><button type="button" class="active" data-v11-mode="hierarchy">${tr('Hierarchy','Hiérarchie')}</button><button type="button" data-v11-mode="list">${tr('Evidence list','Liste des preuves')}</button></div>`;
    const wrap=document.createElement('div');wrap.className='v11-hierarchy-wrap';wrap.innerHTML=hierarchyHtml(rows);
    if(actions){actions.after(controls);controls.after(wrap)}else{detail.prepend(wrap);detail.prepend(controls)}
    detail.classList.add('v11-hierarchy-mode');detail.classList.remove('v11-list-mode');
    controls.querySelectorAll('[data-v11-mode]').forEach(b=>b.onclick=()=>{controls.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));detail.classList.toggle('v11-hierarchy-mode',b.dataset.v11Mode==='hierarchy');detail.classList.toggle('v11-list-mode',b.dataset.v11Mode==='list')});
    wrap.querySelectorAll('.v11-leaf').forEach(b=>b.onclick=e=>{e.stopPropagation();leafAction(b)});
    decorateTaskStamps(detail);
  }

  let gateTick=0;
  function scheduleEnhance(){cancelAnimationFrame(gateTick);gateTick=requestAnimationFrame(()=>{enhanceGateModal();decorateTaskStamps()})}
  const observer=new MutationObserver(scheduleEnhance);observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest('.v10-criterion-btn,.v10-clickable-gate'))setTimeout(scheduleEnhance,0)},true);

  const _v11Bind=bindPage;
  bindPage=function(){_v11Bind();decorateTaskStamps();scheduleEnhance()};

  setTimeout(()=>{decorateTaskStamps();scheduleEnhance()},120);
})();
