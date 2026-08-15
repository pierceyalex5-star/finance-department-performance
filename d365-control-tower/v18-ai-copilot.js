(function(){
  'use strict';

  const ENDPOINT_KEY='d365_ai_proxy_url';
  const BASELINE_KEY='d365_ai_comparison_baseline';
  const CLOSED_TASK=['Approved','Closed'];
  const CLOSED_GENERIC=['Closed','Resolved','Decided','Passed','Complete','Validated','Ready'];
  const fr=()=>document.documentElement.lang==='fr';
  const tr=(en,frText)=>fr()?frText:en;
  const e=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const d=()=>typeof data==='function'?data():{};
  const todayIso=()=>typeof today==='function'?today():new Date().toISOString().slice(0,10);
  const days=(date)=>{if(!date)return null;return Math.floor((new Date(date+'T00:00:00')-new Date(todayIso()+'T00:00:00'))/86400000)};
  const streams=()=>typeof allStreams==='function'?allStreams():[...(state.framework?.valueStreams||[]),...(state.framework?.crossFunctional||[])];
  const streamDef=id=>streams().find(s=>s.id===id)||{id,name:id,bpo:'',l2:[]};
  const tasks=()=>d().tasks||[];
  const decisions=()=>d().decisions||[];
  const raid=()=>d().raid||[];
  const reqs=()=>d().requirements||[];
  const dataObjects=()=>d().dataObjects||[];
  const tests=()=>state.registers?.testScenarios||[];
  const workshops=()=>state.registers?.workshopReadiness||[];
  const isOpenTask=t=>!CLOSED_TASK.includes(t.status);
  const taskDue=t=>t.forecastDue||t.due||'';
  const overdueTask=t=>isOpenTask(t)&&taskDue(t)&&days(taskDue(t))<0;
  const high=(x)=>['High','Critical'].includes(x);
  const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

  function currentGate(){
    try{if(typeof currentMilestone==='function'){const m=currentMilestone();if(m)return {m,readiness:typeof gateReadiness==='function'?gateReadiness(m):null,status:typeof gateStatus==='function'?gateStatus(m):m.status}}catch(_){ }
    const ms=(d().milestones||[]).slice().sort((a,b)=>String(a.start||'').localeCompare(String(b.start||'')));
    const m=ms.find(x=>x.start<=todayIso()&&x.end>=todayIso())||ms.find(x=>x.end>=todayIso())||ms.at(-1);
    return {m,readiness:null,status:m?.status||'—'};
  }

  function personCapacity(p){
    try{if(window.D365_CAPACITY_MODEL?.personCapacity)return window.D365_CAPACITY_MODEL.personCapacity(p)}catch(_){ }
    const own=tasks().filter(t=>t.owner===p.name&&isOpenTask(t)),h=own.filter(t=>{const n=days(taskDue(t));return n!==null&&n>=0&&n<=30}),demand=h.reduce((s,t)=>s+Math.max(0,(Number(t.estimatedHours)||0)*(1-(Number(t.progress)||0)/100)),0),available=160*(Number(p.capacityPct)||0)/100,unestimated=h.filter(t=>!(Number(t.estimatedHours)>0)).length;
    return {horizon:h,demand,available,load:available?100*demand/available:0,unestimated,missingRatio:h.length?unestimated/h.length:0,status:available&&demand>available?'Over capacity':unestimated&&unestimated/h.length>.2?'Needs estimates':'Within capacity'};
  }

  function capacitySignals(){
    return (d().people||[]).filter(p=>/bpo|sme/i.test(String(p.role||''))).map(p=>({p,c:personCapacity(p)})).filter(x=>x.c.load>85||x.c.missingRatio>.20).sort((a,b)=>(b.c.load-a.c.load)||(b.c.missingRatio-a.c.missingRatio));
  }

  function programSignals(){
    const out=[];
    tasks().filter(t=>t.status==='Blocked').forEach(t=>out.push({score:100,tone:'bad',kind:'task',id:t.id,stream:t.stream,title:t.title,meta:tr('Blocked task','Tâche bloquée')}));
    tasks().filter(overdueTask).forEach(t=>out.push({score:t.priority==='Critical'?98:82,tone:'bad',kind:'task',id:t.id,stream:t.stream,title:t.title,meta:`${tr('Overdue','En retard')} · ${taskDue(t)}`}));
    raid().filter(x=>!['Closed','Resolved'].includes(x.status)&&high(x.severity)).forEach(x=>out.push({score:x.severity==='Critical'?97:78,tone:x.severity==='Critical'?'bad':'warn',kind:'raid',id:x.id,stream:x.stream,title:x.title||x.description,meta:`${x.severity} ${x.type||'RAID'}`}));
    decisions().filter(x=>!['Closed','Decided'].includes(x.status)).forEach(x=>{const od=x.due&&days(x.due)<0,steer=x.escalateToSteering===true||x.escalateToSteering==='Yes'||x.decisionAuthority==='Steering Committee';if(od||steer||x.status==='Recommended')out.push({score:steer?90:od?85:68,tone:steer||od?'bad':'warn',kind:'decision',id:x.id,stream:x.stream,title:x.title,meta:steer?tr('Steering decision','Décision comité'):od?tr('Decision overdue','Décision en retard'):tr('Recommendation awaiting decision','Recommandation en attente')} )});
    tests().filter(x=>['Failed','Blocked'].includes(x.status)).forEach(x=>out.push({score:x.criticality==='Critical'?94:80,tone:'bad',kind:'test',id:x.id,stream:x.stream,title:x.scenario,meta:`${x.testType||'Test'} · ${x.status}`}));
    capacitySignals().forEach(({p,c})=>out.push({score:c.load>100?92:62,tone:c.load>100?'bad':'warn',kind:'person',id:p.id,stream:p.stream,title:p.name,meta:c.load>100?`${Math.round(c.load)}% ${tr('30-day measured load','charge mesurée 30 jours')}`:`${Math.round(c.missingRatio*100)}% ${tr('near-term tasks unestimated','tâches court terme non estimées')}`}));
    dataObjects().filter(x=>!['Validated','Complete'].includes(x.mappingStatus)||!['Validated','Complete'].includes(x.cleansingStatus)).slice(0,12).forEach(x=>{if(x.quality==='Poor'||x.quality==='TBD'||x.cutoverReady!==true&&x.cutoverReady!=='Yes')out.push({score:x.quality==='Poor'?76:58,tone:'warn',kind:'data',id:x.id,stream:x.stream,title:x.object||x.id,meta:tr('Data readiness incomplete','Préparation données incomplète')})});
    workshops().filter(x=>x.status==='Decision required').forEach(x=>out.push({score:64,tone:'warn',kind:'workshop',id:x.id,stream:x.stream,title:`${x.stream} · ${x.l2}`,meta:tr('L2 workshop requires a decision','Atelier L2 requiert une décision')}));
    return out.sort((a,b)=>b.score-a.score);
  }

  function evidenceItem(x){return {kind:x.kind,id:x.id,stream:x.stream,title:x.title,meta:x.meta,tone:x.tone||'neutral'};}
  function topSignals(n=6){return programSignals().slice(0,n)}

  function programContext(){
    const gate=currentGate(),caps=capacitySignals(),sig=topSignals(10);
    return {
      asOf:todayIso(),
      currentGate:gate.m?{id:gate.m.id,name:gate.m.name,start:gate.m.start,end:gate.m.end,status:gate.status,readiness:gate.readiness}:null,
      counts:{openTasks:tasks().filter(isOpenTask).length,blockedTasks:tasks().filter(t=>t.status==='Blocked').length,overdueTasks:tasks().filter(overdueTask).length,openDecisions:decisions().filter(x=>!['Closed','Decided'].includes(x.status)).length,highCriticalRaid:raid().filter(x=>!['Closed','Resolved'].includes(x.status)&&high(x.severity)).length,failedBlockedTests:tests().filter(x=>['Failed','Blocked'].includes(x.status)).length,dataObjects:dataObjects().length},
      topSignals:sig.map(x=>({kind:x.kind,id:x.id,stream:x.stream,title:x.title,meta:x.meta,score:x.score})),
      capacity:caps.slice(0,10).map(({p,c})=>({person:p.name,stream:p.stream,normalCapacityPct:p.capacityPct,loadPct:Math.round(c.load),unestimated:c.unestimated,missingRatio:Math.round(c.missingRatio*100)})),
      openDecisions:decisions().filter(x=>!['Closed','Decided'].includes(x.status)).slice(0,20).map(x=>({id:x.id,title:x.title,stream:x.stream,status:x.status,due:x.due,steering:x.escalateToSteering===true||x.escalateToSteering==='Yes'||x.decisionAuthority==='Steering Committee'})),
      raid:raid().filter(x=>!['Closed','Resolved'].includes(x.status)).slice(0,20).map(x=>({id:x.id,type:x.type,severity:x.severity,title:x.title||x.description,stream:x.stream,status:x.status,due:x.due})),
      data:dataObjects().slice(0,30).map(x=>({id:x.id,object:x.object,stream:x.stream,quality:x.quality,mapping:x.mappingStatus,cleansing:x.cleansingStatus,migration:x.migrationStatus,cutoverReady:x.cutoverReady})),
      tests:tests().slice(0,30).map(x=>({id:x.id,stream:x.stream,l2:x.l2,type:x.testType,criticality:x.criticality,status:x.status,scenario:x.scenario}))
    };
  }

  function streamContext(stream,l2=''){
    const s=streamDef(stream),match=x=>x.stream===stream&&(!l2||!x.l2||x.l2===l2);
    return {stream:s.id,name:s.name,bpo:s.bpo,l2,findings:[...(d().painPoints||[]),...(d().opportunities||[])].filter(x=>x.stream===stream).slice(0,25),requirements:reqs().filter(match).slice(0,25),decisions:decisions().filter(match).slice(0,25),tasks:tasks().filter(x=>(x.stream||x.l1)===stream&&(!l2||!x.l2||x.l2===l2)).slice(0,35),tests:tests().filter(match).slice(0,25),data:dataObjects().filter(x=>x.stream===stream||x.stream==='ALL').slice(0,25),workshops:workshops().filter(x=>x.stream===stream&&(!l2||x.l2===l2)).slice(0,25)};
  }

  function answer(title,summary,sections=[],evidence=[]){return {title,summary,sections,evidence,mode:'local'};}

  function attentionAnswer(){
    const xs=topSignals(7),gate=currentGate();
    const summary=xs.length?tr(`${xs.length} program signals deserve attention. The list is ranked by likely delivery impact, not by how recently the record was entered.`,`${xs.length} signaux du programme méritent une attention. La liste est classée selon l’impact probable sur la livraison, et non selon la date de saisie.`):tr('No major exception is currently detected from the structured registers.','Aucune exception majeure n’est actuellement détectée dans les registres structurés.');
    const gateText=gate.m?`${gate.m.id} · ${gate.m.name} · ${gate.readiness!==null?Math.round(gate.readiness)+'% · ':''}${gate.status}`:tr('No current gate identified','Aucun jalon actuel identifié');
    return answer(tr('Program attention brief','Brief des points d’attention'),summary,[{heading:tr('Current stage gate','Jalon actuel'),items:[gateText]},{heading:tr('Highest-priority signals','Signaux prioritaires'),items:xs.map(x=>`${x.meta}: ${x.title}`)}],xs.map(evidenceItem));
  }

  function capacityAnswer(person){
    if(person){const c=personCapacity(person),own=tasks().filter(t=>t.owner===person.name&&isOpenTask(t)),near=own.filter(t=>{const n=days(taskDue(t));return n!==null&&n<=30}).sort((a,b)=>String(taskDue(a)).localeCompare(String(taskDue(b))));return answer(`${person.name} — ${tr('capacity','capacité')}`,tr(`${Math.round(c.load||0)}% measured 30-day load against ${c.available||0} available project hours. ${c.unestimated||0} near-term task(s) still have no effort estimate.`,`${Math.round(c.load||0)} % de charge mesurée sur 30 jours contre ${c.available||0} heures projet disponibles. ${c.unestimated||0} tâche(s) à court terme n’ont toujours pas d’estimation d’effort.`),[{heading:tr('Capacity status','Statut capacité'),items:[`${Number(person.capacityPct)||0}% ${tr('normal allocation','allocation normale')} · ${Number(person.peakCapacityPct)||0}% ${tr('peak','pointe')} · ${Math.round(c.load||0)}% ${tr('measured load','charge mesurée')}`]},{heading:tr('Near-term work','Travail à court terme'),items:near.slice(0,8).map(t=>`${t.id} · ${t.title} · ${taskDue(t)||tr('no due date','sans échéance')} · ${Number(t.estimatedHours)>0?`${t.estimatedHours}h`:tr('unestimated','non estimée')}`)}],near.slice(0,8).map(t=>evidenceItem({kind:'task',id:t.id,stream:t.stream,title:t.title,meta:taskDue(t)||''})));}
    const xs=capacitySignals(),summary=xs.length?tr(`${xs.length} person(s) have either measured load above 85% or insufficient near-term effort estimates.`,`${xs.length} personne(s) ont soit une charge mesurée supérieure à 85 %, soit des estimations d’effort court terme insuffisantes.`):tr('No capacity exception is currently detected.','Aucune exception de capacité n’est actuellement détectée.');
    return answer(tr('Capacity risk brief','Brief des risques de capacité'),summary,[{heading:tr('People requiring review','Personnes à revoir'),items:xs.slice(0,10).map(({p,c})=>`${p.name} · ${p.stream} · ${Math.round(c.load)}% ${tr('load','charge')} · ${c.unestimated} ${tr('unestimated','non estimée(s)')}`)}],xs.slice(0,10).map(({p,c})=>evidenceItem({kind:'person',id:p.id,stream:p.stream,title:p.name,meta:`${Math.round(c.load)}%`})));
  }

  function decisionsAnswer(){
    const xs=decisions().filter(x=>!['Closed','Decided'].includes(x.status)).sort((a,b)=>{const sa=(a.escalateToSteering===true||a.escalateToSteering==='Yes'||a.decisionAuthority==='Steering Committee')?2:(a.due&&days(a.due)<0)?1:0,sb=(b.escalateToSteering===true||b.escalateToSteering==='Yes'||b.decisionAuthority==='Steering Committee')?2:(b.due&&days(b.due)<0)?1:0;return sb-sa||String(a.due||'9999').localeCompare(String(b.due||'9999'))});
    return answer(tr('Decision brief','Brief des décisions'),tr(`${xs.length} open decision(s). Steering and overdue decisions are shown first.`,`${xs.length} décision(s) ouverte(s). Les décisions comité et en retard sont affichées en premier.`),[{heading:tr('Open decisions','Décisions ouvertes'),items:xs.slice(0,10).map(x=>`${x.id} · ${x.title} · ${x.status||'Open'}${x.due?' · '+x.due:''}${x.escalateToSteering===true||x.escalateToSteering==='Yes'?' · Steering':''}`)}],xs.slice(0,10).map(x=>evidenceItem({kind:'decision',id:x.id,stream:x.stream,title:x.title,meta:x.status})));
  }

  function dataAnswer(){
    const xs=dataObjects().filter(x=>!['Validated','Complete'].includes(x.mappingStatus)||!['Validated','Complete'].includes(x.cleansingStatus)||!['Tested','Validated'].includes(x.migrationStatus)||!(x.cutoverReady===true||x.cutoverReady==='Yes'));
    const byStream={};xs.forEach(x=>{const k=x.stream||'ALL';byStream[k]=(byStream[k]||0)+1});
    return answer(tr('Data-readiness brief','Brief préparation des données'),xs.length?tr(`${xs.length} registered data object(s) still have an incomplete mapping, cleansing, migration or cutover state.`,`${xs.length} objet(s) de données enregistré(s) ont encore un état incomplet de mapping, nettoyage, migration ou bascule.`):tr('All registered data objects currently meet the tracked readiness states.','Tous les objets de données enregistrés répondent actuellement aux états de préparation suivis.'),[{heading:tr('Open readiness by stream','Préparation ouverte par chaîne'),items:Object.entries(byStream).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}: ${v}`)},{heading:tr('Highest-risk objects','Objets les plus à risque'),items:xs.slice(0,10).map(x=>`${x.id} · ${x.object||''} · ${x.stream||'ALL'} · ${x.quality||'TBD'} · ${x.mappingStatus||'Not Started'} / ${x.cleansingStatus||'Not Started'}`)}],xs.slice(0,10).map(x=>evidenceItem({kind:'data',id:x.id,stream:x.stream,title:x.object||x.id,meta:x.quality||'TBD'})));
  }

  function gateAnswer(){
    const g=currentGate();if(!g.m)return answer(tr('Stage-gate explanation','Explication du jalon'),tr('No active or upcoming milestone could be identified from the current roadmap.','Aucun jalon actif ou à venir n’a pu être identifié dans la feuille de route actuelle.'));
    let criteria=[];try{if(typeof gateCriteria==='function')criteria=gateCriteria(g.m)}catch(_){ }
    criteria=criteria.slice().sort((a,b)=>(a.score||0)-(b.score||0));
    const ev=[evidenceItem({kind:'milestone',id:g.m.id,stream:g.m.stream,title:g.m.name,meta:g.status})];
    return answer(tr('Current stage gate','Jalon actuel'),`${g.m.id} · ${g.m.name} · ${g.readiness!==null?Math.round(g.readiness)+'% · ':''}${g.status}`,[{heading:tr('Timing','Échéancier'),items:[`${g.m.start||'—'} → ${g.m.end||'—'}`]},{heading:tr('Weakest gate criteria','Critères de jalon les plus faibles'),items:criteria.slice(0,6).map(c=>`${fr()&&c.fr?c.fr:c.text||c.rule}: ${Math.round(c.score||0)}% · ${c.evidence||''}`)}],ev);
  }

  function steeringAnswer(){
    const dec=decisions().filter(x=>!['Closed','Decided'].includes(x.status)&&(x.escalateToSteering===true||x.escalateToSteering==='Yes'||x.decisionAuthority==='Steering Committee'||x.status==='Recommended'));
    const rr=raid().filter(x=>!['Closed','Resolved'].includes(x.status)&&high(x.severity));
    const sig=topSignals(6);
    return answer(tr('Steering Committee preparation','Préparation comité directeur'),tr(`${dec.length} decision(s) are potential committee agenda items and ${rr.length} high/critical RAID item(s) require executive visibility.`,`${dec.length} décision(s) sont des éléments potentiels d’ordre du jour et ${rr.length} élément(s) RAID élevé(s)/critique(s) exigent une visibilité exécutive.`),[{heading:tr('Decisions / asks','Décisions / demandes'),items:dec.slice(0,8).map(x=>`${x.id} · ${x.requestedDecision||x.title} · ${x.recommendation||tr('recommendation required','recommandation requise')}`)},{heading:tr('Top RAID','RAID principaux'),items:rr.slice(0,8).map(x=>`${x.id} · ${x.severity} ${x.type||'RAID'} · ${x.title||x.description}`)},{heading:tr('Program signals to explain','Signaux programme à expliquer'),items:sig.slice(0,5).map(x=>`${x.meta}: ${x.title}`)}],[...dec.slice(0,8).map(x=>evidenceItem({kind:'decision',id:x.id,stream:x.stream,title:x.title,meta:'Steering'})),...rr.slice(0,8).map(x=>evidenceItem({kind:'raid',id:x.id,stream:x.stream,title:x.title||x.description,meta:x.severity}))]);
  }

  function streamAnswer(stream){
    const c=streamContext(stream),s=streamDef(stream),openTasks=c.tasks.filter(isOpenTask),blocked=openTasks.filter(x=>x.status==='Blocked'),over=openTasks.filter(overdueTask),openDec=c.decisions.filter(x=>!['Closed','Decided'].includes(x.status)),openReq=c.requirements.filter(x=>!['Approved','Closed'].includes(x.status)||!x.fitGap||x.fitGap==='TBD'),failed=c.tests.filter(x=>['Failed','Blocked'].includes(x.status)),wr=c.workshops.filter(x=>x.status!=='Signed off');
    const person=(d().people||[]).find(p=>p.name===s.bpo),cap=person?personCapacity(person):null;
    return answer(`${stream} · ${s.name}`,tr(`BPO ${s.bpo||'TBD'} has ${openTasks.length} open task(s), ${openDec.length} open decision(s), ${openReq.length} requirement(s) still needing approval or fit/gap completion, and ${wr.length} L2 workshop(s) not signed off.`,`Le BPO ${s.bpo||'TBD'} a ${openTasks.length} tâche(s) ouverte(s), ${openDec.length} décision(s) ouverte(s), ${openReq.length} exigence(s) nécessitant encore approbation ou fit/gap, et ${wr.length} atelier(s) L2 non approuvé(s).`),[{heading:tr('Immediate BPO attention','Attention immédiate BPO'),items:[...blocked.slice(0,4).map(x=>`${tr('Blocked','Bloquée')}: ${x.id} · ${x.title}`),...over.slice(0,4).map(x=>`${tr('Overdue','En retard')}: ${x.id} · ${x.title}`),...openDec.slice(0,4).map(x=>`${tr('Decision','Décision')}: ${x.id} · ${x.title}`),...(failed.slice(0,3).map(x=>`${tr('Test','Test')}: ${x.id} · ${x.status}`))].slice(0,8)},{heading:tr('Capacity','Capacité'),items:[cap?`${Math.round(cap.load||0)}% ${tr('30-day measured load','charge mesurée 30 jours')} · ${cap.unestimated||0} ${tr('unestimated near-term task(s)','tâche(s) court terme non estimée(s)')}`:tr('No BPO capacity record found.','Aucun enregistrement de capacité BPO trouvé.')]},{heading:tr('Next lifecycle focus','Prochain focus du cycle'),items:wr.slice(0,6).map(x=>`${x.l2}: ${x.status}`)}],[...blocked.slice(0,4).map(x=>evidenceItem({kind:'task',id:x.id,stream,title:x.title,meta:x.status})),...over.slice(0,4).map(x=>evidenceItem({kind:'task',id:x.id,stream,title:x.title,meta:taskDue(x)})),...openDec.slice(0,4).map(x=>evidenceItem({kind:'decision',id:x.id,stream,title:x.title,meta:x.status}))]);
  }

  function personFromQuestion(q){const n=normalize(q);return (d().people||[]).find(p=>n.includes(normalize(p.name))||normalize(p.name).split(' ').filter(x=>x.length>3).some(x=>n.includes(x)));}
  function streamFromQuestion(q){const n=normalize(q);return streams().find(s=>n.includes(normalize(s.id))||n.includes(normalize(s.name)));}

  function snapshot(){
    const item=(kind,x)=>({kind,id:x.id,status:x.status||'',due:x.due||x.forecastDue||'',title:x.title||x.scenario||x.object||x.description||''});
    return {asOf:new Date().toISOString(),items:[...tasks().map(x=>item('task',x)),...decisions().map(x=>item('decision',x)),...raid().map(x=>item('raid',x)),...reqs().map(x=>item('requirement',x)),...tests().map(x=>item('test',x))]};
  }
  function saveBaseline(){localStorage.setItem(BASELINE_KEY,JSON.stringify(snapshot()));}
  function changedAnswer(){
    let b=null;try{b=JSON.parse(localStorage.getItem(BASELINE_KEY)||'null')}catch(_){ }
    if(!b?.items?.length)return answer(tr('What changed?','Qu’est-ce qui a changé?'),tr('No local comparison baseline exists yet. Use “Set comparison baseline” once, then this question will compare statuses and newly created records against that snapshot.','Aucune référence locale de comparaison n’existe encore. Utilisez « Définir la référence » une fois; cette question comparera ensuite les statuts et nouveaux enregistrements à cet instantané.'));
    const now=snapshot(),old=new Map(b.items.map(x=>[`${x.kind}|${x.id}`,x])),cur=new Map(now.items.map(x=>[`${x.kind}|${x.id}`,x])),added=[],changed=[];
    cur.forEach((x,k)=>{if(!old.has(k))added.push(x);else{const o=old.get(k);if(o.status!==x.status||o.due!==x.due)changed.push({x,o})}});
    return answer(tr('Changes since comparison baseline','Changements depuis la référence'),tr(`Baseline: ${new Date(b.asOf).toLocaleString()}. ${added.length} new record(s) and ${changed.length} status/date change(s) detected in this browser.`,`Référence : ${new Date(b.asOf).toLocaleString()}. ${added.length} nouvel/nouveaux enregistrement(s) et ${changed.length} changement(s) de statut/date détecté(s) dans ce navigateur.`),[{heading:tr('New records','Nouveaux enregistrements'),items:added.slice(0,10).map(x=>`${x.kind} · ${x.id} · ${x.title}`)},{heading:tr('Changed status / date','Statut / date modifiés'),items:changed.slice(0,10).map(({x,o})=>`${x.kind} · ${x.id} · ${o.status||'—'} → ${x.status||'—'}${o.due!==x.due?` · ${o.due||'—'} → ${x.due||'—'}`:''}`)}],[...added.slice(0,6).map(x=>evidenceItem(x)),...changed.slice(0,6).map(z=>evidenceItem(z.x))]);
  }

  function localAnswer(q){
    const query=String(q||'').trim(),n=normalize(query),p=personFromQuestion(query),s=streamFromQuestion(query);
    if(p)return capacityAnswer(p);
    if(s&&n.length>normalize(s.id).length)return streamAnswer(s.id);
    if(n.includes('change')||n.includes('changed')||n.includes('changé')||n.includes('changement'))return changedAnswer();
    if(n.includes('steering')||n.includes('committee')||n.includes('comité'))return steeringAnswer();
    if(n.includes('capacity')||n.includes('workload')||n.includes('charge')||n.includes('capacité'))return capacityAnswer();
    if(n.includes('data')||n.includes('migration')||n.includes('cleansing')||n.includes('donnée')||n.includes('nettoyage'))return dataAnswer();
    if(n.includes('decision')||n.includes('décision'))return decisionsAnswer();
    if(n.includes('gate')||n.includes('milestone')||n.includes('jalon'))return gateAnswer();
    return attentionAnswer();
  }

  function endpoint(){return (localStorage.getItem(ENDPOINT_KEY)||'').trim();}
  function setEndpoint(url){if(url)localStorage.setItem(ENDPOINT_KEY,url.trim());else localStorage.removeItem(ENDPOINT_KEY);}
  async function remoteRequest(mode,payload){
    const url=endpoint();if(!url)throw new Error('AI backend not configured');
    const r=await fetch(url,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,locale:fr()?'fr':'en',asOf:todayIso(),context:mode==='program_copilot'?programContext():payload?.context||null,payload})});
    if(!r.ok)throw new Error(`AI backend ${r.status}`);return r.json();
  }
  async function request(mode,payload,fallback){
    if(endpoint()){
      try{return await remoteRequest(mode,payload)}catch(err){const x=typeof fallback==='function'?fallback():fallback;if(x&&typeof x==='object')x.remoteError=err.message;return x;}
    }
    return typeof fallback==='function'?fallback():fallback;
  }
  async function ask(q){return request('program_copilot',{question:q},()=>localAnswer(q));}

  function renderEvidence(ev){if(!ev?.length)return'';return `<div class="v18-evidence"><span>${tr('Evidence / drill-down','Preuves / forage')}</span>${ev.map(x=>`<button type="button" data-v18-ev-kind="${e(x.kind)}" data-v18-ev-id="${e(x.id||'')}" data-v18-ev-stream="${e(x.stream||'')}"><b>${e(x.id||x.stream||x.kind)}</b><small>${e(x.title||'')}${x.meta?' · '+e(x.meta):''}</small></button>`).join('')}</div>`;}
  function renderAnswer(a){
    if(!a)return'';const sections=(a.sections||[]).map(s=>`<section><h4>${e(s.heading||'')}</h4><ul>${(s.items||[]).filter(Boolean).map(x=>`<li>${e(typeof x==='string'?x:x.text||'')}</li>`).join('')||`<li>${tr('No items','Aucun élément')}</li>`}</ul></section>`).join('');
    return `<div class="v18-answer"><div class="v18-answer-head"><div><span>${a.mode==='remote'?tr('AI analysis','Analyse IA'):tr('Evidence-derived analysis','Analyse fondée sur les preuves')}</span><h3>${e(a.title||tr('Program intelligence','Intelligence programme'))}</h3></div>${a.remoteError?`<em>${tr('Secure AI unavailable — local evidence engine used','IA sécurisée indisponible — moteur local utilisé')}</em>`:''}</div><p class="v18-answer-summary">${e(a.summary||'')}</p><div class="v18-answer-grid">${sections}</div>${renderEvidence(a.evidence||[])}</div>`;
  }

  function quickPrompts(){return [
    [tr('What needs attention?','Que faut-il surveiller?'),'attention'],
    [tr('Explain current gate','Expliquer le jalon actuel'),'gate'],
    [tr('Decision brief','Brief décisions'),'decisions'],
    [tr('Capacity risks','Risques capacité'),'capacity'],
    [tr('Data risks','Risques données'),'data'],
    [tr('Prepare Steering','Préparer comité'),'steering'],
    [tr('What changed?','Qu’est-ce qui a changé?'),'changed']
  ];}
  function promptQuestion(k){return ({attention:tr('What should I worry about right now?','De quoi dois-je me préoccuper maintenant?'),gate:tr('Explain the current stage gate and weakest criteria.','Explique le jalon actuel et les critères les plus faibles.'),decisions:tr('What decisions require attention?','Quelles décisions requièrent une attention?'),capacity:tr('Where do we have capacity risk?','Où avons-nous un risque de capacité?'),data:tr('Where do we have data-readiness risk?','Où avons-nous un risque de préparation des données?'),steering:tr('Prepare the Steering Committee agenda.','Prépare l’ordre du jour du comité directeur.'),changed:tr('What changed since my comparison baseline?','Qu’est-ce qui a changé depuis ma référence de comparaison?')})[k]||k;}

  function intelligenceHtml(){
    const initial=attentionAnswer(),connected=!!endpoint();
    return `<section class="v18-intel card"><div class="v18-intel-head"><div><span>${tr('PROGRAM INTELLIGENCE','INTELLIGENCE PROGRAMME')}</span><h2>${tr('Ask the D365 Program','Interroger le programme D365')}</h2><p>${tr('Read-only copilot grounded in the Control Tower registers. Answers expose the records and metrics behind the conclusion.','Copilote en lecture seule fondé sur les registres du Control Tower. Les réponses exposent les enregistrements et mesures derrière la conclusion.')}</p></div><div class="v18-ai-mode ${connected?'connected':''}"><b>${connected?tr('Secure AI connected','IA sécurisée connectée'):tr('Evidence engine','Moteur de preuves')}</b><small>${connected?tr('LLM + dashboard evidence','LLM + preuves du tableau'):tr('Works now · no external model call','Fonctionne maintenant · aucun appel modèle externe')}</small></div></div><div class="v18-ask"><input id="v18AskInput" placeholder="${tr('Ask: What should I worry about? Why is Diane yellow? What needs my decision?','Demandez : Que dois-je surveiller? Pourquoi Diane est jaune? Quelles décisions me concernent?')}"><button class="btn primary" id="v18AskBtn">${tr('Ask','Demander')}</button></div><div class="v18-quick">${quickPrompts().map(([lab,k])=>`<button type="button" data-v18-prompt="${e(k)}">${e(lab)}</button>`).join('')}</div><div id="v18Answer">${renderAnswer(initial)}</div><div class="v18-ai-actions"><button class="btn tiny" type="button" id="v18SetBaseline">${tr('Set comparison baseline','Définir la référence')}</button><button class="btn tiny" type="button" id="v18AiSettings">${tr('AI connection settings','Paramètres connexion IA')}</button></div></section>`;
  }

  function openEvidence(kind,id,stream){
    if(kind==='task'&&typeof editTask==='function')return editTask(id);
    if(kind==='decision'&&typeof editDecision==='function')return editDecision(id);
    if(kind==='raid'&&typeof editRaid==='function')return editRaid(id);
    if(kind==='requirement'&&typeof editRequirement==='function')return editRequirement(id);
    if(kind==='test'&&typeof editTest==='function')return editTest(id);
    if(kind==='milestone'&&typeof editMilestone==='function')return editMilestone(id);
    if(kind==='change'&&typeof editChange==='function')return editChange(id);
    if(kind==='escalation'&&typeof editEscalation==='function')return editEscalation(id);
    if(kind==='person'){view='people';document.querySelectorAll('#mainNav [data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='people'));return render();}
    if(kind==='data'){view='architecture';document.querySelectorAll('#mainNav [data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='architecture'));return render();}
    if(stream&&typeof openStream==='function')return openStream(stream);
  }
  function bindEvidence(root=document){root.querySelectorAll('[data-v18-ev-kind]').forEach(b=>b.onclick=()=>openEvidence(b.dataset.v18EvKind,b.dataset.v18EvId,b.dataset.v18EvStream));}

  function decorateCockpit(){
    const app=document.querySelector('#app'),head=app?.querySelector('.page-head');if(!app||!head||app.querySelector('.v18-intel'))return;
    head.insertAdjacentHTML('afterend',intelligenceHtml());bindIntelligence();
  }
  function streamCoachBar(){
    const s=streamDef(selectedStream),ans=streamAnswer(selectedStream),sig=(ans.sections?.[0]?.items||[]).length,person=(d().people||[]).find(p=>p.name===s.bpo),cap=person?personCapacity(person):null;
    return `<section class="v18-coach-bar card"><div><span>${tr('BPO COACH','COACH BPO')}</span><b>${e(s.bpo||'TBD')}</b><small>${e(selectedStream)} · ${e(s.name)}</small></div><div><b>${sig}</b><small>${tr('immediate attention item(s)','élément(s) d’attention immédiate')}</small></div><div><b>${cap?Math.round(cap.load||0)+'%':'—'}</b><small>${tr('30-day measured load','charge mesurée 30 jours')}</small></div><div class="v18-coach-actions"><button type="button" class="btn" data-v18-coach="${e(selectedStream)}">${tr('What should I do next?','Que dois-je faire ensuite?')}</button></div></section>`;
  }
  function decorateStream(){const app=document.querySelector('#app'),head=app?.querySelector('.stream-header');if(!app||!head||app.querySelector('.v18-coach-bar'))return;head.insertAdjacentHTML('afterend',streamCoachBar());document.querySelector('[data-v18-coach]')?.addEventListener('click',()=>openCoach(selectedStream));}
  function openCoach(stream){const a=streamAnswer(stream),m=modal(`${stream} — ${tr('BPO Coach','Coach BPO')}`,`<div class="v18-coach-modal">${renderAnswer(a)}<div class="v18-coach-foot"><span>${tr('Coach logic is read-only. Use the linked evidence to update the source record.','La logique du coach est en lecture seule. Utilisez les preuves liées pour mettre à jour l’enregistrement source.')}</span></div></div>`);m.querySelector('.modal-save').textContent=tr('Close','Fermer');m.querySelector('.modal-save').onclick=()=>m.remove();bindEvidence(m);}

  function aiSettings(){
    const m=modal(tr('Secure AI connection','Connexion IA sécurisée'),`<div class="form-grid"><label class="full">${tr('AI proxy endpoint','Point de terminaison proxy IA')}<input name="endpoint" value="${e(endpoint())}" placeholder="https://.../api/d365-ai"></label><div class="notice full"><b>${tr('Security rule','Règle de sécurité')}:</b> ${tr('Enter only a corporate AI proxy URL. Do not enter an API key or secret here. The proxy must keep model credentials server-side and enforce authentication/authorization.','Saisissez uniquement une URL de proxy IA corporatif. N’entrez aucune clé API ni secret ici. Le proxy doit conserver les identifiants du modèle côté serveur et appliquer l’authentification/autorisation.')}</div><div class="notice full">${tr('Until a secure endpoint is configured, the dashboard uses the local evidence engine. Phase 2/3 workflows remain usable but generative wording is template/rule based.','Jusqu’à la configuration d’un point de terminaison sécurisé, le tableau utilise le moteur local de preuves. Les flux Phase 2/3 restent utilisables, mais la formulation générative est basée sur des modèles/règles.')}</div></div>`);
    m.querySelector('.modal-save').onclick=()=>{const u=m.querySelector('[name="endpoint"]').value.trim();setEndpoint(u);m.remove();render();};
  }

  function bindIntelligence(){
    const root=document.querySelector('.v18-intel');if(!root)return;
    const input=root.querySelector('#v18AskInput'),btn=root.querySelector('#v18AskBtn'),out=root.querySelector('#v18Answer');
    const run=async q=>{if(!q.trim())return;out.innerHTML=`<div class="v18-thinking">${tr('Analyzing the Control Tower evidence…','Analyse des preuves du Control Tower…')}</div>`;const a=await ask(q);if(a&&!a.mode)a.mode=endpoint()?'remote':'local';out.innerHTML=renderAnswer(a);bindEvidence(out);};
    btn.onclick=()=>run(input.value);input.addEventListener('keydown',ev=>{if(ev.key==='Enter')run(input.value)});
    root.querySelectorAll('[data-v18-prompt]').forEach(b=>b.onclick=()=>{const q=promptQuestion(b.dataset.v18Prompt);input.value=q;run(q)});
    root.querySelector('#v18SetBaseline').onclick=()=>{saveBaseline();alert(tr('Comparison baseline saved in this browser. “What changed?” will compare against it.','Référence sauvegardée dans ce navigateur. « Qu’est-ce qui a changé? » comparera à cette référence.'));};
    root.querySelector('#v18AiSettings').onclick=aiSettings;bindEvidence(root);
  }

  function decorate(){if(view==='cockpit')decorateCockpit();if(view==='streams')decorateStream();}
  const baseRender=render;
  render=function(){baseRender();decorate();};
  try{decorate()}catch(err){console.warn('[V18] AI Copilot',err)}

  window.D365_AI={endpoint,setEndpoint,request,remoteRequest,ask,localAnswer,programContext,streamContext,renderAnswer,openEvidence,saveBaseline,streamAnswer,capacityAnswer,dataAnswer,decisionsAnswer,gateAnswer,steeringAnswer};
})();
