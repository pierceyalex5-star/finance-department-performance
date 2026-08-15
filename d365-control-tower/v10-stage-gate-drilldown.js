(function(){
  'use strict';

  function isFr(){return document.documentElement.lang==='fr'}
  function tr(en,fr){return isFr()?fr:en}
  function d(){return typeof data==='function'?data():{}}
  function pct(v){return Math.max(0,Math.min(100,Math.round((Number(v)||0)*10)/10))}
  function taskProgressV10(t){return typeof taskProgress==='function'?taskProgress(t):(Number(t.progress)||(['Approved','Closed'].includes(t.status)?100:0))}
  function closed(t){return ['Approved','Closed'].includes(t.status)}
  function esc10(v){return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function streams(){return typeof allStreams==='function'?allStreams():[...(state.framework?.valueStreams||[]),...(state.framework?.crossFunctional||[])]}
  function processes(stream){return state.processes?.subprocesses?.[stream]||[]}
  function currentMilestone(){
    const ms=(d().milestones||[]).slice().sort((a,b)=>String(a.start||'').localeCompare(String(b.start||'')));
    const now=typeof today==='function'?today():new Date().toISOString().slice(0,10);
    return ms.find(m=>m.start<=now&&m.end>=now)||ms.find(m=>m.end>=now)||ms.at(-1)||null;
  }
  function milestoneTasks(m){return (d().tasks||[]).filter(t=>t.milestoneId===m?.id)}
  function rollup(m){
    const tasks=milestoneTasks(m),explicit=tasks.some(t=>Number(t.milestoneContribution)>0),weights={};
    if(!tasks.length)return {tasks,weights,coverage:0,progress:0,mode:'none'};
    if(!explicit){const w=100/tasks.length;tasks.forEach(t=>weights[t.id]=w);return {tasks,weights,coverage:100,progress:pct(tasks.reduce((s,t)=>s+w*taskProgressV10(t)/100,0)),mode:'auto'}}
    let coverage=0,earned=0;tasks.forEach(t=>{const w=Math.max(0,Number(t.milestoneContribution)||0);weights[t.id]=w;coverage+=w;earned+=w*taskProgressV10(t)/100});
    return {tasks,weights,coverage:Math.round(coverage*10)/10,progress:pct(earned),mode:'explicit'};
  }
  function rawRegister(name){return state.registers?.[name]||[]}
  function findings(){return [...(d().painPoints||[]).map(x=>({...x,_kind:'Pain point'})),...(d().opportunities||[]).map(x=>({...x,_kind:'Opportunity'}))]}
  function procScore(p){try{return typeof processGateScore==='function'?pct(processGateScore(p)):(['Approved','Validated','Closed'].includes(p.status)?100:0)}catch{return 0}}
  function streamName(id){const s=streams().find(x=>x.id===id);return s?`${s.id} · ${s.name}`:(id||'Program')}
  function l3Label(t){if(t.l3ProcessId){const p=processes(t.stream||t.l1).find(x=>String(x.id)===String(t.l3ProcessId));return p?`${p.id} · ${p.name}`:String(t.l3ProcessId)}return t.l3ProcessName||''}
  function statusClass(s){if(['Blocked','Critical','At Risk','Failed','Open'].includes(s))return 'bad';if(['Approved','Closed','Passed','Ready','Complete','Validated','Achieved'].includes(s))return 'good';if(['In Progress','Developing','Waiting','Ready for Review','BPO Review','High'].includes(s))return 'warn';return ''}
  function pill(s){return `<span class="v10-pill ${statusClass(s)}">${esc10(s||'—')}</span>`}
  function bar(v){return `<div class="v10-bar"><i style="width:${pct(v)}%"></i></div>`}
  function openView(name){
    try{view=name;document.querySelectorAll('#mainNav [data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));render()}catch(e){console.warn('[V10] navigation',e)}
  }

  function processEvidence(){
    const rows=[];streams().forEach(s=>processes(s.id).forEach(p=>{const score=procScore(p),ts=(d().tasks||[]).filter(t=>(t.stream||t.l1)===s.id&&String(t.l3ProcessId||'')===String(p.id)),fs=findings().filter(x=>(x.stream===s.id||x.stream==='ALL')&&String(x.subprocess||'').includes(String(p.id)));rows.push({type:'process',stream:s.id,id:p.id,title:p.name,status:score>=99.9?'Validated':score>0?'In Progress':'Not Started',score,owner:s.bpo||'',detail:`${ts.length} ${tr('tasks','tâches')} · ${fs.length} ${tr('findings','constats')}`})}));return rows
  }
  function ownershipEvidence(){return streams().map(s=>({type:'stream',stream:s.id,id:s.id,title:s.name,status:s.bpo&&!String(s.bpo).toUpperCase().includes('TBD')?'Confirmed':'Missing',score:s.bpo&&!String(s.bpo).toUpperCase().includes('TBD')?100:0,owner:s.bpo||'',detail:tr('BPO / accountable process owner','BPO / responsable de processus')}))}
  function findingsEvidence(){return findings().map(x=>({type:'finding',stream:x.stream,id:x.id,title:x.title,status:x.status||'Open',score:!['Open','To assess',''].includes(x.status||'Open')?100:0,owner:x.owner||'',detail:`${x._kind} · ${x.subprocess||''}`}))}
  function requirementEvidence(fitGapOnly=false){return (d().requirements||[]).map(x=>{const complete=fitGapOnly?!!(x.fitGap&&x.fitGap!=='TBD'&&(x.toBeDesign||x.toBeProcess)):['Approved','Ready for Design','Closed'].includes(x.status);return {type:'requirement',stream:x.stream,id:x.id,title:x.title||x.requirement||x.description,status:fitGapOnly?(complete?'Complete':'Incomplete'):(x.status||'Open'),score:complete?100:0,owner:x.owner||'',detail:fitGapOnly?`${tr('Fit/Gap','Fit/Gap')}: ${x.fitGap||'TBD'}`:(x.priority||'')}})}
  function taskEvidence(m,approvalOnly=false){const r=rollup(m);return r.tasks.map(t=>({type:'task',stream:t.stream||t.l1,id:t.id,title:t.title,status:t.status||'Not Started',score:approvalOnly?(closed(t)?100:0):taskProgressV10(t),owner:t.owner||'',detail:`${r.weights[t.id]?.toFixed?.(1)||r.weights[t.id]||0}% ${tr('contribution','contribution')} · ${l3Label(t)||t.l2||tr('stream level','niveau chaîne')}`}))}
  function dataEvidence(){return (d().dataObjects||[]).map(x=>{const ok=['Validated','Complete'].includes(x.mappingStatus)&&['Validated','Complete'].includes(x.cleansingStatus);return {type:'architecture',stream:x.stream,id:x.id,title:x.name||x.object||x.title,status:ok?'Ready':(x.mappingStatus||x.status||'Not Started'),score:ok?100:0,owner:x.owner||'',detail:`${tr('Mapping','Mappage')}: ${x.mappingStatus||'—'} · ${tr('Cleansing','Nettoyage')}: ${x.cleansingStatus||'—'}`}})}
  function integrationEvidence(){return (d().integrations||[]).map(x=>{const st=x.buildStatus||x.status||'Not Started',ok=['Complete','Ready','Closed'].includes(st);return {type:'architecture',stream:x.stream,id:x.id,title:x.name||x.integration||x.title,status:st,score:ok?100:0,owner:x.owner||'',detail:x.direction||x.system||''}})}
  function entityEvidence(){return rawRegister('entityDesign').map(x=>{const ok=['Approved','Closed'].includes(x.status)||(['Common','Controlled variant','Entity-specific'].includes(x.disposition)&&!['TBD','Open','Decision Required'].includes(x.status));return {type:'governance',stream:x.stream,id:x.id,title:x.title||x.capability||x.process||x.l2||x.l3ProcessId||tr('Entity design item','Élément de conception entité'),status:x.status||x.disposition||'TBD',score:ok?100:0,owner:x.owner||'',detail:`${x.entityScope||'All entities'} · ${x.disposition||'TBD'}`}})}
  function testEvidence(testType){return rawRegister('testScenarios').filter(x=>x.testType===testType).map(x=>({type:'architecture',stream:x.stream,id:x.id,title:x.scenario||x.title,status:x.status||'Not Started',score:x.status==='Passed'?100:0,owner:x.owner||'',detail:`${x.entityScope||'All entities'} · ${x.criticality||''}`}))}
  function readinessEvidence(category){return rawRegister('cutoverItems').filter(x=>!category||x.category===category).map(x=>{const ok=['Ready','Complete','Closed'].includes(x.status);return {type:'architecture',stream:x.stream,id:x.id,title:x.title,status:x.status||'Not Started',score:ok?100:0,owner:x.owner||'',detail:`${x.category||''} · ${x.entityScope||'All entities'}`}})}
  function evidenceFor(rule,m){
    if(rule==='processValidation')return processEvidence();
    if(rule==='ownership')return ownershipEvidence();
    if(rule==='findingsReviewed')return findingsEvidence();
    if(rule==='requirementsApproved')return requirementEvidence(false);
    if(rule==='fitGapComplete')return requirementEvidence(true);
    if(rule==='taskCoverage')return taskEvidence(m,false);
    if(rule==='tasksApproved')return taskEvidence(m,true);
    if(rule==='dataReady')return dataEvidence();
    if(rule==='integrationsReady')return integrationEvidence();
    if(rule==='entityDesignResolved')return entityEvidence();
    if(rule==='sitPassed')return testEvidence('SIT');
    if(rule==='uatPassed')return testEvidence('UAT');
    if(rule==='trainingReady')return readinessEvidence('People / Training');
    if(rule==='cutoverReady')return readinessEvidence('Cutover');
    if(rule==='hypercareReady')return readinessEvidence('Hypercare');
    return [];
  }
  function criterionScore(rule,m){const rows=evidenceFor(rule,m);if(rule==='taskCoverage'){const r=rollup(m);return r.tasks.length?Math.min(100,r.coverage):0}if(!rows.length)return 0;return pct(rows.reduce((s,x)=>s+x.score,0)/rows.length)}

  function streamRollups(m){
    return streams().map(s=>{const ts=milestoneTasks(m).filter(t=>(t.stream||t.l1)===s.id),progress=ts.length?pct(ts.reduce((a,t)=>a+taskProgressV10(t),0)/ts.length):0,blocked=ts.filter(t=>t.status==='Blocked').length,approved=ts.filter(closed).length;return {stream:s.id,name:s.name,bpo:s.bpo||'',tasks:ts.length,progress,blocked,approved}}).filter(x=>x.tasks||processes(x.stream).length);
  }

  function rowHtml(x){return `<tr class="v10-evidence-row" data-v10-type="${esc10(x.type)}" data-v10-id="${esc10(x.id)}" data-v10-stream="${esc10(x.stream||'')}"><td><b>${esc10(x.id||'')}</b><small>${esc10(x.detail||'')}</small></td><td><b>${esc10(x.title||'')}</b></td><td>${esc10(x.owner||'—')}</td><td>${pill(x.status)}${bar(x.score)}</td></tr>`}
  function evidenceTable(rows){if(!rows.length)return `<div class="v10-empty">${tr('No evidence records exist for this criterion yet.','Aucune preuve n’existe encore pour ce critère.')}</div>`;return `<div class="v10-table-wrap"><table class="v10-table"><thead><tr><th>${tr('ID / context','ID / contexte')}</th><th>${tr('Evidence item','Élément de preuve')}</th><th>${tr('Owner','Responsable')}</th><th>${tr('Status / readiness','Statut / préparation')}</th></tr></thead><tbody>${rows.map(rowHtml).join('')}</tbody></table></div>`}

  function createModal(m){
    document.querySelector('.v10-gate-backdrop')?.remove();
    const r=rollup(m),criteria=m.gateCriteria||[],scores=criteria.map(c=>criterionScore(c.rule,m)),gateScore=scores.length?pct(scores.reduce((a,b)=>a+b,0)/scores.length):r.progress,streamRows=streamRollups(m),exit=isFr()?(m.exitCriteriaFr||m.exitCriteria):(m.exitCriteria||m.exitCriteriaFr);
    const wrap=document.createElement('div');wrap.className='v10-gate-backdrop';
    wrap.innerHTML=`<section class="v10-gate-modal" role="dialog" aria-modal="true" aria-labelledby="v10GateTitle"><header><div><span class="v10-eyebrow">${tr('STAGE-GATE DRILLDOWN','FORAGE DU JALON')}</span><h2 id="v10GateTitle">${esc10(m.id)} · ${esc10(m.name)}</h2><small>${esc10(m.start||'')} → ${esc10(m.end||'')}</small></div><div class="v10-head-score"><b>${Math.round(gateScore)}%</b><span>${tr('gate readiness','préparation du jalon')}</span></div><button type="button" class="v10-close" aria-label="${tr('Close','Fermer')}">×</button></header>
      <div class="v10-modal-body">
        <div class="v10-exit"><b>${tr('Definition of done / exit criteria','Définition de terminé / critères de sortie')}</b><p>${esc10(exit||tr('No exit criteria documented.','Aucun critère de sortie documenté.'))}</p></div>
        <div class="v10-summary-grid"><div><span>${tr('Linked tasks','Tâches liées')}</span><b>${r.tasks.length}</b></div><div><span>${tr('Task contribution coverage','Couverture contribution')}</span><b>${r.coverage}%</b></div><div><span>${tr('Task outcome progress','Avancement des tâches')}</span><b>${Math.round(r.progress)}%</b></div><div><span>${tr('Allocation mode','Mode d’allocation')}</span><b>${r.mode==='auto'?tr('Auto','Auto'):r.mode==='explicit'?tr('Explicit','Explicite'):tr('None','Aucun')}</b></div></div>
        <div class="v10-layout"><aside><h3>${tr('Gate criteria','Critères du jalon')}</h3><p>${tr('Select a criterion to see the evidence underneath it.','Sélectionnez un critère pour voir les preuves sous-jacentes.')}</p><div class="v10-criteria-list">${criteria.map((c,i)=>`<button type="button" class="v10-criterion-btn ${i===0?'active':''}" data-v10-rule="${esc10(c.rule)}"><span>${scores[i]>=99.9?'✓':scores[i]>0?'◐':'○'}</span><b>${esc10(isFr()&&c.fr?c.fr:c.text)}</b><em>${Math.round(scores[i])}%</em></button>`).join('')||`<div class="v10-empty">${tr('No formal criteria.','Aucun critère formel.')}</div>`}</div></aside>
          <main class="v10-detail"><div id="v10CriterionDetail"></div></main></div>
        <section class="v10-section"><div class="v10-section-head"><div><h3>${tr('Workstream contribution to this gate','Contribution des chaînes à ce jalon')}</h3><p>${tr('Click a workstream to open its BPO workspace.','Cliquez une chaîne pour ouvrir son espace BPO.')}</p></div></div><div class="v10-stream-grid">${streamRows.map(x=>`<button type="button" class="v10-stream-card" data-v10-open-stream="${esc10(x.stream)}"><span>${esc10(x.stream)}</span><b>${esc10(x.name)}</b><small>${esc10(x.bpo||'TBD')}</small>${bar(x.progress)}<em>${Math.round(x.progress)}% · ${x.approved}/${x.tasks} ${tr('approved','approuvées')}${x.blocked?` · ${x.blocked} ${tr('blocked','bloquées')}`:''}</em></button>`).join('')}</div></section>
        <section class="v10-section"><div class="v10-section-head"><div><h3>${tr('All linked execution work','Tout le travail d’exécution lié')}</h3><p>${tr('Tasks are the delivery evidence beneath the stage gate. Click a task to edit it.','Les tâches sont la preuve de livraison sous le jalon. Cliquez une tâche pour la modifier.')}</p></div><button type="button" class="btn" data-v10-view="execution">${tr('Open Execution','Ouvrir Exécution')}</button></div>${evidenceTable(taskEvidence(m,false))}</section>
      </div></section>`;
    document.body.appendChild(wrap);

    function showCriterion(rule){
      const c=criteria.find(x=>x.rule===rule),rows=evidenceFor(rule,m),score=criterionScore(rule,m),el=wrap.querySelector('#v10CriterionDetail');if(!c||!el)return;
      const incomplete=rows.filter(x=>x.score<99.9).length;
      el.innerHTML=`<div class="v10-detail-head"><div><span>${tr('SELECTED CRITERION','CRITÈRE SÉLECTIONNÉ')}</span><h3>${esc10(isFr()&&c.fr?c.fr:c.text)}</h3></div><div><b>${Math.round(score)}%</b><small>${incomplete} ${tr('items incomplete','éléments incomplets')}</small></div></div>${bar(score)}<div class="v10-detail-actions"><span>${rows.length} ${tr('evidence records','preuves')}</span>${['dataReady','integrationsReady','sitPassed','uatPassed','trainingReady','cutoverReady','hypercareReady'].includes(rule)?`<button type="button" class="btn small" data-v10-view="architecture">${tr('Open Data & Solution','Ouvrir Données & Solution')}</button>`:''}${['findingsReviewed','requirementsApproved','fitGapComplete','entityDesignResolved'].includes(rule)?`<button type="button" class="btn small" data-v10-view="governance">${tr('Open Governance','Ouvrir Gouvernance')}</button>`:''}</div>${evidenceTable(rows)}`;
      wrap.querySelectorAll('.v10-criterion-btn').forEach(b=>b.classList.toggle('active',b.dataset.v10Rule===rule));bindInner();
    }
    function bindInner(){
      wrap.querySelectorAll('[data-v10-view]').forEach(b=>b.onclick=e=>{e.stopPropagation();wrap.remove();openView(b.dataset.v10View)});
      wrap.querySelectorAll('.v10-evidence-row').forEach(row=>row.onclick=e=>{e.stopPropagation();const type=row.dataset.v10Type,id=row.dataset.v10Id,stream=row.dataset.v10Stream;wrap.remove();if(type==='task'&&typeof editTask==='function')editTask(id);else if(type==='requirement'&&typeof editRequirement==='function')editRequirement(id);else if(type==='process'||type==='stream'){if(typeof openStream==='function')openStream(stream)}else if(type==='finding'){openView('governance')}else if(type==='governance'){openView('governance')}else openView('architecture')});
    }
    wrap.querySelector('.v10-close').onclick=()=>wrap.remove();wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};
    wrap.addEventListener('keydown',e=>{if(e.key==='Escape')wrap.remove()});
    wrap.querySelectorAll('.v10-criterion-btn').forEach(b=>b.onclick=()=>showCriterion(b.dataset.v10Rule));
    wrap.querySelectorAll('[data-v10-open-stream]').forEach(b=>b.onclick=()=>{const s=b.dataset.v10OpenStream;wrap.remove();if(typeof openStream==='function')openStream(s)});
    bindInner();if(criteria[0])showCriterion(criteria[0].rule);wrap.querySelector('.v10-close').focus();
  }

  function decorateGate(){
    const card=document.querySelector('.v9-gate-card');if(!card||card.dataset.v10Gate==='1')return;card.dataset.v10Gate='1';card.classList.add('v10-clickable-gate');card.setAttribute('role','button');card.setAttribute('tabindex','0');card.setAttribute('aria-label',tr('Open current stage-gate drilldown','Ouvrir le détail du jalon actuel'));
    const hint=document.createElement('div');hint.className='v10-gate-hint';hint.innerHTML=`<span>↳</span> ${tr('Click to drill down into criteria, workstreams and tasks','Cliquer pour descendre dans les critères, chaînes et tâches')}`;card.appendChild(hint);
    const open=()=>{const m=currentMilestone();if(m)createModal(m)};card.addEventListener('click',open);card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
  }

  const priorBind=typeof bindPage==='function'?bindPage:null;
  if(priorBind){bindPage=function(){priorBind();decorateGate()}}
  const obs=new MutationObserver(()=>decorateGate());obs.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  setTimeout(decorateGate,100);
  window.D365_STAGE_GATE_DRILLDOWN={open:()=>{const m=currentMilestone();if(m)createModal(m)}};
})();
