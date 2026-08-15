(function(){
  'use strict';

  const P=(en,fr)=>[en,fr];
  const FR=()=>document.documentElement.lang==='fr';
  const T=x=>Array.isArray(x)?(FR()?x[1]:x[0]):x;
  const E=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const D=()=>typeof data==='function'?data():{};
  const TODAY=()=>typeof today==='function'?today():new Date().toISOString().slice(0,10);
  const streams=()=>typeof allStreams==='function'?allStreams():[...(state.framework?.valueStreams||[]),...(state.framework?.crossFunctional||[])];
  const streamDef=id=>streams().find(s=>s.id===id)||{id,name:id,l2:[],bpo:''};
  const currentEntity=()=>window.D365_ENTITY_MODEL?.getContext?.()||'All entities';
  const WORKSHOP_STATUSES=['Not discussed','Discussed','Decision required','Designed','Configured','Tested','Signed off'];
  const WORKSHOP_SCORE={'Not discussed':0,'Discussed':15,'Decision required':25,'Designed':50,'Configured':70,'Tested':85,'Signed off':100};
  const POLICY_DEFAULTS={currency:'CAD',financialImpactAmount:100000,scheduleImpactDays:10,impactedStreamCount:3,overdueDays:5,riskRating:'Critical',enterpriseImpact:true,majorDesignDeviation:true,goLiveCritical:true,regulatoryImpact:true};

  function ensureRegisters(){
    state.registers=state.registers||{};
    if(!Array.isArray(state.registers.workshopReadiness))state.registers.workshopReadiness=[];
    if(!state.registers.governanceEscalationPolicy||Array.isArray(state.registers.governanceEscalationPolicy))state.registers.governanceEscalationPolicy={};
  }
  function policy(){ensureRegisters();return {...POLICY_DEFAULTS,...state.registers.governanceEscalationPolicy}}
  function policySave(x){ensureRegisters();state.registers.governanceEscalationPolicy={...policy(),...x};mark('registers')}
  function scopeKey(){return currentEntity()||'All entities'}
  function wrec(stream,l2,create=false){
    ensureRegisters();const scope=scopeKey();let x=state.registers.workshopReadiness.find(r=>r.stream===stream&&r.l2===l2&&(r.entityScope||'All entities')===scope);
    if(!x&&create){x={id:typeof uid==='function'?uid('WKS'):('WKS-'+Date.now()),stream,l2,entityScope:scope,status:'Not discussed',owner:streamDef(stream).bpo||'',nextWorkshopDate:'',notes:'',decisionId:'',signoffBy:'',signoffDate:''};state.registers.workshopReadiness.push(x)}
    return x;
  }
  function wsStatus(stream,l2){return wrec(stream,l2,false)?.status||'Not discussed'}
  function optionRows(current){return WORKSHOP_STATUSES.map(s=>`<option value="${E(s)}" ${s===current?'selected':''}>${E(T({
    'Not discussed':P('Not discussed','Non discuté'),'Discussed':P('Discussed','Discuté'),'Decision required':P('Decision required','Décision requise'),'Designed':P('Designed','Conçu'),'Configured':P('Configured','Configuré'),'Tested':P('Tested','Testé'),'Signed off':P('Signed off','Approuvé')
  }[s]))}</option>`).join('')}
  function taskArr(){state.tasks=state.tasks||{};return state.tasks.tasks||(state.tasks.tasks=[])}
  function milestoneEnd(id){return (state.milestones?.milestones||[]).find(m=>m.id===id)?.end||''}
  function taskSource(stream,l2,type,scope=scopeKey()){return `D365GUIDE|${scope}|${stream}|${l2}|${type}`}
  function linkedWorkshopTasks(stream,l2){const scope=scopeKey();return taskArr().filter(t=>t.sourceType==='D365 Guide workshop'&&t.stream===stream&&t.l2===l2&&(t.entityScope||'All entities')===scope)}
  function openDecisions(stream,l2){return (D().decisions||[]).filter(d=>!['Decided','Closed'].includes(d.status)&&d.stream===stream&&(!d.l2||d.l2===l2))}
  function passedTests(stream,l2){const xs=state.registers?.testScenarios||[];const relevant=xs.filter(x=>x.stream===stream&&x.l2===l2);return {total:relevant.length,passed:relevant.filter(x=>x.status==='Passed').length}}
  function suggestedStatus(stream,l2){
    const cur=wsStatus(stream,l2),decs=openDecisions(stream,l2),tasks=linkedWorkshopTasks(stream,l2),tests=passedTests(stream,l2);
    if(cur==='Signed off')return 'Signed off';
    if(decs.length)return 'Decision required';
    if(tests.total&&tests.passed===tests.total)return 'Tested';
    if(tasks.length&&tasks.every(t=>['Approved','Closed'].includes(t.status)))return 'Configured';
    if(tasks.some(t=>['In Progress','Ready for Review','BPO Review','Approved','Closed'].includes(t.status)))return 'Designed';
    return cur;
  }
  function l2GuideCells(stream,l2){
    const btn=[...document.querySelectorAll('.v14-guide-detail [data-jump-l2]')].find(b=>b.dataset.jumpL2===`${stream}|${l2}`),row=btn?.closest('tr'),cells=row?[...row.querySelectorAll('td')]:[];
    return {area:cells[1]?.innerText.trim()||'',design:cells[2]?.innerText.trim()||'',data:cells[3]?.innerText.trim()||'',test:cells[4]?.innerText.trim()||''};
  }
  function createGuideActions(stream,l2){
    const s=streamDef(stream),cells=l2GuideCells(stream,l2),scope=scopeKey(),arr=taskArr();
    const specs=[
      {type:'design',title:T(P(`Workshop: ${l2} — resolve design decisions`,`Atelier : ${l2} — résoudre les décisions de conception`)),outcome:cells.design||T(P('Document future-state design decisions and unresolved questions.','Documenter les décisions cible et questions non résolues.')),mid:'M-02',priority:'High'},
      {type:'data',title:T(P(`Data readiness: ${l2} — validate and clean required data`,`Préparation données : ${l2} — valider et nettoyer les données requises`)),outcome:cells.data||T(P('Profile, map and remediate the data required for this capability.','Profiler, mapper et corriger les données requises pour cette capacité.')),mid:'M-04',priority:'High'},
      {type:'test',title:T(P(`Test design: ${l2} — build minimum end-to-end scenario`,`Conception test : ${l2} — bâtir le scénario bout en bout minimal`)),outcome:cells.test||T(P('Define the minimum SIT/UAT scenario and expected evidence.','Définir le scénario SIT/UAT minimal et la preuve attendue.')),mid:'M-05',priority:'Medium'}
    ];
    let added=0;
    specs.forEach(sp=>{
      const sid=taskSource(stream,l2,sp.type,scope);if(arr.some(t=>t.sourceId===sid))return;
      arr.push({id:typeof uid==='function'?uid('WKS-TASK'):('WKS-TASK-'+Date.now()+'-'+added),title:sp.title,stream,l1:stream,l2,l3ProcessId:'',l3ProcessName:'',sourceLevel:'L2',sourceType:'D365 Guide workshop',sourceId:sid,sourceTitle:l2,sourceContext:[cells.area,sp.outcome].filter(Boolean).join(' · '),milestoneId:sp.mid,type:'Workshop / Design',owner:s.bpo||'',priority:sp.priority,status:'Not Started',progress:0,start:TODAY(),due:milestoneEnd(sp.mid),forecastDue:milestoneEnd(sp.mid),expectedOutcome:sp.outcome,entityScope:scope,notes:T(P('Generated from the D365 Guide L2 workshop playbook.','Généré depuis le guide d’atelier L2 D365.'))});added++;
    });
    if(added)mark('tasks');
    const r=wrec(stream,l2,true);if(r.status==='Not discussed'){r.status='Discussed';r.lastWorkshopDate=TODAY();mark('registers')}
    return added;
  }
  function workshopSummary(stream){
    const l2=streamDef(stream).l2||[],rows=l2.map(x=>({l2:x,status:wsStatus(stream,x),suggested:suggestedStatus(stream,x),tasks:linkedWorkshopTasks(stream,x)}));
    const score=rows.length?Math.round(rows.reduce((s,r)=>s+(WORKSHOP_SCORE[r.status]||0),0)/rows.length):0;
    const signed=rows.filter(r=>r.status==='Signed off').length,tested=rows.filter(r=>['Tested','Signed off'].includes(r.status)).length,actions=rows.reduce((s,r)=>s+r.tasks.length,0);
    return {rows,score,signed,tested,actions,total:l2.length};
  }
  function workshopHtml(stream){
    const sum=workshopSummary(stream),s=streamDef(stream),scope=scopeKey();
    return `<section class="v15-workshop card"><div class="v15-ws-head"><div><span>${E(T(P('BPO WORKSHOP CONTROL','CONTRÔLE DES ATELIERS BPO')))}</span><h2>${E(T(P('L2 workshop & design readiness','Préparation ateliers et conception L2')))}</h2><p>${E(T(P('Use this as the BPO checklist from first discussion through formal sign-off. Starting an L2 workshop generates design, data and test actions in the central Execution plan.','Utilisez ceci comme checklist BPO de la première discussion jusqu’à l’approbation formelle. Démarrer un atelier L2 génère des actions de conception, données et tests dans le plan Exécution central.')))}</p></div><div class="v15-ws-score"><b>${sum.score}%</b><span>${E(T(P('workshop readiness','préparation ateliers')))}</span></div></div><div class="v15-ws-kpis"><div><b>${sum.signed}/${sum.total}</b><span>${E(T(P('signed off','approuvés')))}</span></div><div><b>${sum.tested}/${sum.total}</b><span>${E(T(P('tested or signed','testés ou approuvés')))}</span></div><div><b>${sum.actions}</b><span>${E(T(P('linked execution actions','actions Exécution liées')))}</span></div><div><b>${E(scope)}</b><span>${E(T(P('entity scope','portée entité')))}</span></div></div><div class="v15-ws-toolbar"><span><b>${E(s.id)} · ${E(s.name)}</b> · ${E(T(P('BPO','BPO')))}: ${E(s.bpo||'TBD')}</span><button type="button" class="btn" data-v15-generate-all="${E(stream)}">${E(T(P('Generate all L2 workshop actions','Générer toutes les actions ateliers L2')))}</button></div><div class="v15-ws-table-wrap"><table class="v15-ws-table"><thead><tr><th>L2</th><th>${E(T(P('Workshop status','Statut atelier')))}</th><th>${E(T(P('System suggestion','Suggestion système')))}</th><th>${E(T(P('Execution actions','Actions Exécution')))}</th><th>${E(T(P('Decision / test evidence','Décision / preuve test')))}</th><th>${E(T(P('Owner / sign-off','Responsable / approbation')))}</th><th></th></tr></thead><tbody>${sum.rows.map((r,i)=>{const rec=wrec(stream,r.l2,false),decs=openDecisions(stream,r.l2),tests=passedTests(stream,r.l2),suggest=r.suggested;return `<tr><td><button type="button" class="v15-ws-l2" data-jump-l2="${E(stream)}|${E(r.l2)}"><span>${E(stream)}.L2.${String(i+1).padStart(2,'0')}</span><b>${E(r.l2)}</b></button></td><td><select data-v15-ws-status="${E(stream)}|${E(r.l2)}">${optionRows(r.status)}</select></td><td><span class="v15-suggest ${suggest!==r.status?'attention':''}">${E(T({
      'Not discussed':P('Not discussed','Non discuté'),'Discussed':P('Discussed','Discuté'),'Decision required':P('Decision required','Décision requise'),'Designed':P('Designed','Conçu'),'Configured':P('Configured','Configuré'),'Tested':P('Tested','Testé'),'Signed off':P('Signed off','Approuvé')
    }[suggest]))}</span></td><td><b>${r.tasks.length}</b><small>${r.tasks.filter(t=>['Approved','Closed'].includes(t.status)).length} ${E(T(P('approved','approuvées')))}</small></td><td><b>${decs.length} ${E(T(P('open decisions','décisions ouvertes')))}</b><small>${tests.passed}/${tests.total} ${E(T(P('tests passed','tests réussis')))}</small></td><td><b>${E(rec?.owner||s.bpo||'TBD')}</b>${rec?.signoffBy&&rec?.signoffDate?`<small class="v15-sign">✓ ${E(rec.signoffBy)} · ${E(rec.signoffDate)}</small>`:''}</td><td><div class="v15-row-actions"><button type="button" class="btn tiny" data-v15-start="${E(stream)}|${E(r.l2)}">${r.tasks.length?E(T(P('Refresh actions','Actualiser actions'))):E(T(P('Start / actions','Démarrer / actions')))}</button><button type="button" class="btn tiny" data-v15-edit-ws="${E(stream)}|${E(r.l2)}">${E(T(P('Edit','Modifier')))}</button></div></td></tr>`}).join('')}</tbody></table></div><div class="v15-ws-rule"><b>${E(T(P('Lifecycle','Cycle')))}:</b> ${WORKSHOP_STATUSES.map(x=>E(T({
      'Not discussed':P('Not discussed','Non discuté'),'Discussed':P('Discussed','Discuté'),'Decision required':P('Decision required','Décision requise'),'Designed':P('Designed','Conçu'),'Configured':P('Configured','Configuré'),'Tested':P('Tested','Testé'),'Signed off':P('Signed off','Approuvé')
    }[x]))).join(' → ')}</div></section>`;
  }

  function latestModal(){return [...document.querySelectorAll('.modal-backdrop')].at(-1)}
  function editWorkshop(stream,l2,requestedStatus){
    const r=wrec(stream,l2,true),s=streamDef(stream);if(requestedStatus)r._requestedStatus=requestedStatus;
    const m=modal(T(P('L2 workshop readiness','Préparation atelier L2')),`<div class="form-grid v15-ws-form"><label class="full">L1 / L2<input disabled value="${E(stream)} · ${E(l2)}"></label><label>${T(P('Entity scope','Portée entité'))}<input disabled value="${E(r.entityScope||'All entities')}"></label><label>${T(P('BPO / owner','BPO / responsable'))}<input name="owner" value="${E(r.owner||s.bpo||'')}"></label><label>${T(P('Status','Statut'))}<select name="status">${optionRows(requestedStatus||r.status)}</select></label><label>${T(P('Next workshop','Prochain atelier'))}<input type="date" name="nextWorkshopDate" value="${E(r.nextWorkshopDate||'')}"></label><label>${T(P('Linked decision ID','ID décision liée'))}<input name="decisionId" value="${E(r.decisionId||'')}"></label><label>${T(P('Signed off by','Approuvé par'))}<input name="signoffBy" value="${E(r.signoffBy||'')}"></label><label>${T(P('Sign-off date','Date approbation'))}<input type="date" name="signoffDate" value="${E(r.signoffDate||'')}"></label><label class="full">${T(P('Workshop notes / unresolved questions','Notes atelier / questions non résolues'))}<textarea name="notes" rows="5">${E(r.notes||'')}</textarea></label></div><div class="notice">${T(P('Signed off requires an approver and date. Use the linked decision ID when a design question needs formal governance.','Le statut Approuvé exige un approbateur et une date. Utilisez l’ID décision lorsqu’une question de conception requiert une gouvernance formelle.'))}</div>`);
    const save=m.querySelector('.modal-save');save.onclick=()=>{const q=n=>m.querySelector(`[name="${n}"]`),status=q('status')?.value||r.status,by=q('signoffBy')?.value.trim()||'',dt=q('signoffDate')?.value||'';if(status==='Signed off'&&(!by||!dt)){alert(T(P('Signed off requires Signed off by and Sign-off date.','Approuvé exige Approuvé par et Date approbation.')));return}Object.assign(r,{owner:q('owner')?.value||'',status,nextWorkshopDate:q('nextWorkshopDate')?.value||'',decisionId:q('decisionId')?.value||'',signoffBy:by,signoffDate:dt,notes:q('notes')?.value||''});if(status!=='Signed off'&&r._requestedStatus==='Signed off'){r.signoffBy='';r.signoffDate=''}delete r._requestedStatus;mark('registers');m.remove();render()};
  }

  function num(v){const n=Number(String(v??'').replace(/[$,\s]/g,''));return Number.isFinite(n)?n:0}
  function impactAmount(d){if(num(d.financialImpactAmount))return num(d.financialImpactAmount);const s=String(d.financialImpact||'').toLowerCase().replace(/,/g,''),m=s.match(/(-?\d+(?:\.\d+)?)\s*(k|m)?/);if(!m)return 0;let n=Number(m[1]);if(m[2]==='k')n*=1000;if(m[2]==='m')n*=1000000;return Math.abs(n)}
  function scheduleDays(d){if(num(d.scheduleImpactDays))return Math.abs(num(d.scheduleImpactDays));const m=String(d.scheduleImpact||'').match(/-?\d+(?:\.\d+)?/);return m?Math.abs(Number(m[0])):0}
  function streamCount(d){if(num(d.impactedStreamCount))return num(d.impactedStreamCount);if(Array.isArray(d.impactedStreams))return d.impactedStreams.length;return String(d.impactedStreams||'').split(/[,;|]/).map(x=>x.trim()).filter(Boolean).length}
  function bool(v){return v===true||v==='Yes'||v==='true'||v==='1'||v==='on'}
  function riskRank(v){return ({None:0,Low:1,Medium:2,High:3,Critical:4}[v]||0)}
  function overdueDays(d){if(!d.due||['Decided','Closed'].includes(d.status))return 0;const a=new Date(d.due+'T00:00:00'),b=new Date(TODAY()+'T00:00:00');return a<b?Math.floor((b-a)/86400000):0}
  function decisionEscalation(d){
    const p=policy(),reasons=[];if(d.escalateToSteering===true||d.escalateToSteering==='Yes')reasons.push(T(P('Manually escalated','Escalade manuelle')));
    if(d.decisionAuthority==='Steering Committee')reasons.push(T(P('Decision authority = Steering Committee','Autorité = Comité directeur')));
    const fin=impactAmount(d);if(fin>=Number(p.financialImpactAmount||0)&&Number(p.financialImpactAmount)>0)reasons.push(`${T(P('Financial impact','Impact financier'))} ${fin.toLocaleString()} ≥ ${Number(p.financialImpactAmount).toLocaleString()} ${p.currency||''}`);
    const sd=scheduleDays(d);if(sd>=Number(p.scheduleImpactDays||0)&&Number(p.scheduleImpactDays)>0)reasons.push(`${T(P('Schedule impact','Impact échéancier'))} ${sd}d ≥ ${p.scheduleImpactDays}d`);
    const sc=streamCount(d);if(sc>=Number(p.impactedStreamCount||0)&&Number(p.impactedStreamCount)>0)reasons.push(`${T(P('Cross-stream impact','Impact multi-chaînes'))} ${sc} ≥ ${p.impactedStreamCount}`);
    const rr=d.riskRating||d.riskLevel||'';if(rr&&riskRank(rr)>=riskRank(p.riskRating||'Critical'))reasons.push(`${T(P('Risk rating','Niveau de risque'))}: ${rr}`);
    const od=overdueDays(d);if(od>=Number(p.overdueDays||0)&&Number(p.overdueDays)>0)reasons.push(`${T(P('Decision overdue','Décision en retard'))} ${od}d ≥ ${p.overdueDays}d`);
    if(p.enterpriseImpact&&bool(d.enterpriseImpact))reasons.push(T(P('Enterprise-wide / all-entity impact','Impact entreprise / toutes entités')));
    if(p.majorDesignDeviation&&bool(d.majorDesignDeviation))reasons.push(T(P('Material design deviation / customization','Écart de conception / personnalisation significatif')));
    if(p.goLiveCritical&&bool(d.goLiveCritical))reasons.push(T(P('Go-live / cutover critical decision','Décision critique go-live / bascule')));
    if(p.regulatoryImpact&&bool(d.regulatoryImpact))reasons.push(T(P('Regulatory / compliance impact','Impact réglementaire / conformité')));
    return {escalate:reasons.length>0,reasons,automatic:reasons.some(x=>x!==T(P('Manually escalated','Escalade manuelle')))};
  }
  function ensureEscalationRecord(d,reasons){
    ensureRegisters();state.registers.escalations=state.registers.escalations||[];let x=state.registers.escalations.find(z=>z.relatedId===d.id);
    if(!x){x={id:`ESC-${d.id}`,type:'Decision',relatedId:d.id,title:d.title||d.id,status:'Open'};state.registers.escalations.push(x)}
    x.title=d.title||x.title;x.owner=d.owner||x.owner;x.recommendation=d.recommendation||x.recommendation;x.reason=reasons.join(' · ');x.due=d.due||x.due;x.status=['Closed','Decided'].includes(d.status)?'Resolved':(x.status||'Open');
  }
  function persistQualifyingDecisions(){let changed=false;(D().decisions||[]).forEach(d=>{const x=decisionEscalation(d);if(x.escalate&&!(d.escalateToSteering===true||d.escalateToSteering==='Yes')){d.escalateToSteering='Yes';d.autoEscalatedOn=TODAY();d.autoEscalationReasons=x.reasons.join(' · ');ensureEscalationRecord(d,x.reasons);changed=true}});if(changed)mark('registers');return changed}
  function withComputedSteering(fn){const xs=D().decisions||[],restore=xs.map(d=>[d,d.escalateToSteering]);xs.forEach(d=>{if(decisionEscalation(d).escalate)d.escalateToSteering='Yes'});try{return fn()}finally{restore.forEach(([d,v])=>{if(v===undefined)delete d.escalateToSteering;else d.escalateToSteering=v})}}
  function policyHtml(){const p=policy(),auto=(D().decisions||[]).filter(d=>decisionEscalation(d).automatic&&!['Decided','Closed'].includes(d.status));return `<section class="v15-policy card"><div class="v15-policy-head"><div><span>${E(T(P('STEERING ESCALATION CONTROL','CONTRÔLE D’ESCALADE AU COMITÉ')))}</span><h2>${E(T(P('Automatic decision escalation thresholds','Seuils automatiques d’escalade des décisions')))}</h2><p>${E(T(P('These are program governance thresholds, not D365 product rules. When a decision crosses any active threshold it is routed to the Steering Committee; manual escalation remains available at any time.','Ce sont des seuils de gouvernance du programme, pas des règles produit D365. Lorsqu’une décision franchit un seuil actif, elle est dirigée vers le Comité directeur; l’escalade manuelle demeure toujours disponible.')))}</p></div><button type="button" class="btn" id="v15EditPolicy">${E(T(P('Edit thresholds','Modifier les seuils')))}</button></div><div class="v15-threshold-grid"><div><span>${E(T(P('Financial impact','Impact financier')))}</span><b>≥ ${Number(p.financialImpactAmount).toLocaleString()} ${E(p.currency||'')}</b></div><div><span>${E(T(P('Schedule impact','Impact échéancier')))}</span><b>≥ ${E(p.scheduleImpactDays)} ${E(T(P('days','jours')))}</b></div><div><span>${E(T(P('Value streams impacted','Chaînes impactées')))}</span><b>≥ ${E(p.impactedStreamCount)}</b></div><div><span>${E(T(P('Risk rating','Niveau risque')))}</span><b>≥ ${E(p.riskRating)}</b></div><div><span>${E(T(P('Decision overdue','Décision en retard')))}</span><b>≥ ${E(p.overdueDays)} ${E(T(P('days','jours')))}</b></div><div><span>${E(T(P('Always-trigger flags','Déclencheurs automatiques')))}</span><b>${[p.enterpriseImpact&&T(P('Enterprise','Entreprise')),p.majorDesignDeviation&&T(P('Design deviation','Écart design')),p.goLiveCritical&&T(P('Go-live','Go-live')),p.regulatoryImpact&&T(P('Compliance','Conformité'))].filter(Boolean).map(E).join(' · ')}</b></div></div><div class="v15-auto-decisions"><div class="v15-subhead"><b>${E(T(P('Decisions currently meeting an automatic threshold','Décisions rencontrant actuellement un seuil automatique')))}</b><span>${auto.length}</span></div>${auto.length?auto.map(d=>{const x=decisionEscalation(d);return `<button type="button" data-edit-decision="${E(d.id)}"><span><b>${E(d.id)} · ${E(d.title||'')}</b><small>${E(x.reasons.join(' · '))}</small></span><em>${E(T(P('Steering','Comité')))}</em></button>`}).join(''):`<div class="empty mini">${E(T(P('No open decisions currently meet an automatic threshold.','Aucune décision ouverte ne rencontre actuellement un seuil automatique.')))}</div>`}</div></section>`}
  function editPolicy(){const p=policy(),m=modal(T(P('Steering escalation thresholds','Seuils d’escalade au Comité')),`<div class="form-grid v15-policy-form"><label>${T(P('Reporting currency','Devise de référence'))}<input name="currency" value="${E(p.currency)}"></label><label>${T(P('Financial impact threshold','Seuil impact financier'))}<input type="number" min="0" step="1000" name="financialImpactAmount" value="${E(p.financialImpactAmount)}"></label><label>${T(P('Schedule impact threshold (days)','Seuil impact échéancier (jours)'))}<input type="number" min="0" step="1" name="scheduleImpactDays" value="${E(p.scheduleImpactDays)}"></label><label>${T(P('Impacted value streams threshold','Seuil chaînes impactées'))}<input type="number" min="1" step="1" name="impactedStreamCount" value="${E(p.impactedStreamCount)}"></label><label>${T(P('Decision overdue threshold (days)','Seuil décision en retard (jours)'))}<input type="number" min="0" step="1" name="overdueDays" value="${E(p.overdueDays)}"></label><label>${T(P('Risk threshold','Seuil risque'))}<select name="riskRating">${['High','Critical'].map(x=>`<option ${p.riskRating===x?'selected':''}>${x}</option>`).join('')}</select></label><label class="check"><input type="checkbox" name="enterpriseImpact" ${p.enterpriseImpact?'checked':''}> ${T(P('Enterprise-wide impact always escalates','Impact entreprise escalade toujours'))}</label><label class="check"><input type="checkbox" name="majorDesignDeviation" ${p.majorDesignDeviation?'checked':''}> ${T(P('Major design deviation/customization always escalates','Écart design/personnalisation majeur escalade toujours'))}</label><label class="check"><input type="checkbox" name="goLiveCritical" ${p.goLiveCritical?'checked':''}> ${T(P('Go-live/cutover critical always escalates','Critique go-live/bascule escalade toujours'))}</label><label class="check"><input type="checkbox" name="regulatoryImpact" ${p.regulatoryImpact?'checked':''}> ${T(P('Regulatory/compliance impact always escalates','Impact réglementaire/conformité escalade toujours'))}</label></div><div class="notice">${T(P('Saving a lower threshold can immediately route existing open decisions to Steering. Once automatically escalated, the decision remains on the Steering record until formally resolved.','Enregistrer un seuil plus bas peut immédiatement diriger des décisions ouvertes existantes vers le Comité. Une fois automatiquement escaladée, la décision demeure au registre du Comité jusqu’à résolution formelle.'))}</div>`);m.querySelector('.modal-save').onclick=()=>{const q=n=>m.querySelector(`[name="${n}"]`);policySave({currency:q('currency').value||'CAD',financialImpactAmount:num(q('financialImpactAmount').value),scheduleImpactDays:num(q('scheduleImpactDays').value),impactedStreamCount:num(q('impactedStreamCount').value),overdueDays:num(q('overdueDays').value),riskRating:q('riskRating').value,enterpriseImpact:q('enterpriseImpact').checked,majorDesignDeviation:q('majorDesignDeviation').checked,goLiveCritical:q('goLiveCritical').checked,regulatoryImpact:q('regulatoryImpact').checked});persistQualifyingDecisions();m.remove();render()}}

  function injectDecisionThresholdFields(){
    const m=latestModal(),form=m?.querySelector('.form-grid');if(!m||!form||form.querySelector('[name="financialImpactAmount"]'))return;
    const add=(html,cls='')=>{const l=document.createElement('label');l.innerHTML=html;if(cls)l.className=cls;form.appendChild(l);return l};
    const existingId=form.querySelector('[name="id"]')?.value,rec=(D().decisions||[]).find(d=>d.id===existingId)||{};
    add(`${T(P('Financial impact amount','Montant impact financier'))} <small>${E(policy().currency)}</small><input type="number" min="0" step="1000" name="financialImpactAmount" value="${E(rec.financialImpactAmount||'')}">`);
    add(`${T(P('Schedule impact (days)','Impact échéancier (jours)'))}<input type="number" step="1" name="scheduleImpactDays" value="${E(rec.scheduleImpactDays||'')}">`);
    add(`${T(P('Risk rating','Niveau de risque'))}<select name="riskRating">${['None','Low','Medium','High','Critical'].map(x=>`<option ${rec.riskRating===x?'selected':''}>${x}</option>`).join('')}</select>`);
    add(`${T(P('Value streams impacted','Chaînes impactées'))}<input type="number" min="1" step="1" name="impactedStreamCount" value="${E(rec.impactedStreamCount||'1')}">`);
    add(`<input type="checkbox" name="enterpriseImpact" ${bool(rec.enterpriseImpact)?'checked':''}> ${T(P('Enterprise-wide / all-entity impact','Impact entreprise / toutes entités'))}`,'check');
    add(`<input type="checkbox" name="majorDesignDeviation" ${bool(rec.majorDesignDeviation)?'checked':''}> ${T(P('Material design deviation / customization','Écart de conception / personnalisation significatif'))}`,'check');
    add(`<input type="checkbox" name="goLiveCritical" ${bool(rec.goLiveCritical)?'checked':''}> ${T(P('Go-live / cutover critical decision','Décision critique go-live / bascule'))}`,'check');
    add(`<input type="checkbox" name="regulatoryImpact" ${bool(rec.regulatoryImpact)?'checked':''}> ${T(P('Regulatory / compliance impact','Impact réglementaire / conformité'))}`,'check');
    const hidden=document.createElement('input');hidden.type='hidden';hidden.name='autoEscalationReasons';hidden.value=rec.autoEscalationReasons||'';form.appendChild(hidden);
    const hiddenDate=document.createElement('input');hiddenDate.type='hidden';hiddenDate.name='autoEscalatedOn';hiddenDate.value=rec.autoEscalatedOn||'';form.appendChild(hiddenDate);
    const box=document.createElement('div');box.className='notice full v15-decision-threshold-result';form.appendChild(box);
    const snapshot=()=>{const q=n=>form.querySelector(`[name="${n}"]`);return {...rec,due:q('due')?.value||rec.due,status:q('status')?.value||rec.status,decisionAuthority:q('decisionAuthority')?.value||rec.decisionAuthority,financialImpactAmount:q('financialImpactAmount')?.value,scheduleImpactDays:q('scheduleImpactDays')?.value,riskRating:q('riskRating')?.value,impactedStreamCount:q('impactedStreamCount')?.value,enterpriseImpact:q('enterpriseImpact')?.checked,majorDesignDeviation:q('majorDesignDeviation')?.checked,goLiveCritical:q('goLiveCritical')?.checked,regulatoryImpact:q('regulatoryImpact')?.checked,escalateToSteering:q('escalateToSteering')?.checked}};
    const refresh=()=>{const x=decisionEscalation(snapshot());box.innerHTML=`<b>${E(T(P('Steering escalation','Escalade Comité')))}: ${E(x.escalate?T(P('YES','OUI')):T(P('No','Non')))}</b>${x.reasons.length?`<br>${E(x.reasons.join(' · '))}`:`<br>${E(T(P('No automatic threshold is currently triggered.','Aucun seuil automatique n’est actuellement déclenché.')))}`}`};
    form.querySelectorAll('input,select,textarea').forEach(x=>x.addEventListener('input',refresh));refresh();
    const save=m.querySelector('.modal-save'),orig=save?.onclick;if(save&&orig&&!save.dataset.v15Wrapped){save.dataset.v15Wrapped='1';save.onclick=e=>{const snap=snapshot(),x=decisionEscalation(snap),flag=form.querySelector('[name="escalateToSteering"]');if(x.automatic&&flag){flag.checked=true;hidden.value=x.reasons.join(' · ');if(!hiddenDate.value)hiddenDate.value=TODAY()}orig.call(save,e)}}
  }

  const _editDecision=editDecision;
  editDecision=function(id){_editDecision(id);injectDecisionThresholdFields()};

  const _renderGovernance=renderGovernance;
  renderGovernance=function(){return withComputedSteering(()=>{const base=_renderGovernance(),addon=policyHtml();return base.includes('<div class="grid kpi">')?base.replace('<div class="grid kpi">',addon+'<div class="grid kpi">'):addon+base})};
  const _renderSteering=renderSteering;
  renderSteering=function(){return withComputedSteering(()=>_renderSteering())};

  function decorateGuide(){
    const app=document.getElementById('app');if(!app||app.querySelector('.v15-workshop'))return;const active=[...document.querySelectorAll('.v13-stream-nav button')].find(b=>b.classList.contains('active')),stream=active?.dataset.v13GuideStream||selectedStream;if(!streamDef(stream)?.l2?.length)return;const detail=app.querySelector('.v14-guide-detail');if(detail)detail.insertAdjacentHTML('beforebegin',workshopHtml(stream));else app.insertAdjacentHTML('beforeend',workshopHtml(stream));
  }

  const _render=render;
  render=function(){_render();if(view==='d365guide')decorateGuide()};
  const _bindPage=bindPage;
  bindPage=function(){
    _bindPage();
    document.querySelectorAll('[data-v15-ws-status]').forEach(sel=>{if(sel.dataset.v15Bound)return;sel.dataset.v15Bound='1';sel.onchange=()=>{const [stream,...rest]=sel.dataset.v15WsStatus.split('|'),l2=rest.join('|'),r=wrec(stream,l2,true);if(sel.value==='Signed off'&&(!r.signoffBy||!r.signoffDate)){editWorkshop(stream,l2,'Signed off');return}r.status=sel.value;if(sel.value==='Discussed')r.lastWorkshopDate=TODAY();mark('registers');render()}});
    document.querySelectorAll('[data-v15-start]').forEach(b=>{if(b.dataset.v15Bound)return;b.dataset.v15Bound='1';b.onclick=()=>{const [stream,...rest]=b.dataset.v15Start.split('|'),l2=rest.join('|');createGuideActions(stream,l2);render()}});
    document.querySelectorAll('[data-v15-edit-ws]').forEach(b=>{if(b.dataset.v15Bound)return;b.dataset.v15Bound='1';b.onclick=()=>{const [stream,...rest]=b.dataset.v15EditWs.split('|');editWorkshop(stream,rest.join('|'))}});
    document.querySelectorAll('[data-v15-generate-all]').forEach(b=>{if(b.dataset.v15Bound)return;b.dataset.v15Bound='1';b.onclick=()=>{const stream=b.dataset.v15GenerateAll,caps=streamDef(stream).l2||[];if(!confirm(T(P(`Generate the missing design, data and test actions for all ${caps.length} L2 capabilities?`,`Générer les actions de conception, données et tests manquantes pour les ${caps.length} capacités L2?`))))return;let n=0;caps.forEach(l2=>n+=createGuideActions(stream,l2));render()}});
    const ep=document.getElementById('v15EditPolicy');if(ep&&!ep.dataset.v15Bound){ep.dataset.v15Bound='1';ep.onclick=editPolicy}
  };

  window.D365_WORKSHOP_MODEL={statuses:WORKSHOP_STATUSES,get:wrec,summary:workshopSummary,generateActions:createGuideActions};
  window.D365_STEERING_POLICY={policy,decisionEscalation,persistQualifyingDecisions};
  try{if(view==='d365guide')decorateGuide()}catch(err){console.warn('[V15] workshop',err)}
})();
