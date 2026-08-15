(function(){
  'use strict';

  const STORE='d365_v25_ui_filters';
  const fr=()=>document.documentElement.lang==='fr';
  const tr=(en,frText)=>fr()?frText:en;
  const escHtml=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const project=()=>typeof data==='function'?data():{};
  const streams=()=>typeof allStreams==='function'?allStreams():[...(project().valueStreams||[]),...(project().crossFunctional||[])];
  const todayIso=()=>typeof today==='function'?today():new Date().toISOString().slice(0,10);
  const currentView=()=>{try{return view}catch(_){return 'cockpit'}};
  const CLOSED_TASK=new Set(['Approved','Closed']);
  const CLOSED_GENERIC=new Set(['Closed','Resolved','Decided','Approved','Validated','Complete','Completed','Passed','Signed off']);
  let filters={stream:'ALL',owner:'ALL',phase:'ALL',status:'ALL'};
  try{filters={...filters,...JSON.parse(localStorage.getItem(STORE)||'{}')}}catch(_){ }

  const NAV=[
    ['cockpit','⌂',tr('Cockpit','Cockpit')],
    ['businessowner','◎',tr('My Focus','Mes priorités')],
    ['streams','▦',tr('Value Streams','Chaînes de valeur')],
    ['execution','▣',tr('Execution','Exécution')],
    ['governance','◇',tr('Governance','Gouvernance')],
    ['architecture','▤',tr('Data & Solution','Données & Solution')],
    ['d365guide','◉',tr('D365 Guide','Guide D365')],
    ['steering','⚖',tr('Steering','Comité directeur')],
    ['roadmap','▥',tr('Roadmap','Feuille de route')]
  ];

  function saveFilters(){localStorage.setItem(STORE,JSON.stringify(filters))}
  function route(target){
    const btn=document.querySelector(`#mainNav [data-view="${target}"]`);
    if(btn){btn.click();return}
    try{view=target;render()}catch(_){ }
  }
  function openRecord(kind,id){
    try{
      if(kind==='task'&&typeof editTask==='function'){editTask(id);return}
      if(kind==='decision'&&typeof editDecision==='function'){editDecision(id);return}
      if(kind==='raid'&&typeof editRaid==='function'){editRaid(id);return}
      if(kind==='person'&&typeof editPerson==='function'){editPerson(id);return}
      if(kind==='requirement'&&typeof editRequirement==='function'){editRequirement(id);return}
    }catch(_){ }
    route(kind==='task'?'execution':'governance');
  }

  function rebuildChrome(){
    document.body.classList.remove('v24-clarity');document.body.classList.add('v25-ui');
    document.getElementById('v24Sidebar')?.remove();
    const top=document.querySelector('.topbar'),nav=document.getElementById('mainNav');
    if(!top||!nav)return;
    const mark=top.querySelector('.brand-mark');if(mark)mark.textContent='iFAST';
    const title=top.querySelector('.brand strong');if(title)title.textContent='D365 Control Tower';
    const bo=nav.querySelector('[data-view="businessowner"]');if(bo)bo.textContent=tr('My Focus','Mes priorités');
    const steering=nav.querySelector('[data-view="steering"]');if(steering)steering.textContent=tr('Steering','Comité');
    const people=nav.querySelector('[data-view="people"]');if(people)people.classList.add('v25-top-hidden');
    if(nav.parentElement!==top)top.querySelector('.brand')?.after(nav);
    ensureSidebar();
  }

  function ensureSidebar(){
    let side=document.getElementById('v25Sidebar');
    if(!side){
      side=document.createElement('aside');side.id='v25Sidebar';side.className='v25-sidebar';
      side.innerHTML=`<nav>${NAV.map(([id,icon,label])=>`<button type="button" data-v25-view="${id}"><span>${icon}</span><b>${escHtml(label)}</b></button>`).join('')}</nav>
        <div class="v25-side-tools">
          <button type="button" data-v25-ai><span>✧</span><b>${escHtml(tr('AI Copilot','Copilote IA'))}</b><em>BETA</em></button>
          <button type="button" data-v25-people><span>♙</span><b>${escHtml(tr('People & Capacity','Personnes & capacité'))}</b></button>
          <button type="button" data-v25-sync><span>↻</span><b>${escHtml(tr('GitHub sync','Sync GitHub'))}</b></button>
          <div class="v25-program-info"><small>${escHtml(tr('PROGRAM','PROGRAMME'))}</small><b>D365 Implementation</b><span>${escHtml(tr('Live control tower','Tour de contrôle active'))}</span></div>
        </div>`;
      document.body.appendChild(side);
      side.addEventListener('click',ev=>{
        const b=ev.target.closest('[data-v25-view]');if(b){route(b.dataset.v25View);return}
        if(ev.target.closest('[data-v25-people]')){route('people');return}
        if(ev.target.closest('[data-v25-sync]')){try{view='sync';document.querySelectorAll('#mainNav button').forEach(x=>x.classList.remove('active'));render()}catch(_){ }return}
        if(ev.target.closest('[data-v25-ai]')){openAi();}
      });
    }
    const v=currentView();side.querySelectorAll('[data-v25-view]').forEach(b=>b.classList.toggle('active',b.dataset.v25View===v));
  }

  function openAi(){
    if(currentView()!=='cockpit'){route('cockpit');setTimeout(openAi,120);return}
    const detail=document.getElementById('v25FullWorkspace');if(detail)detail.open=true;
    const ai=document.querySelector('#v25FullWorkspace .v18-intel,.v18-intel');
    if(ai){ai.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>ai.querySelector('input')?.focus(),300)}
  }

  function streamOptions(){return [`<option value="ALL">${escHtml(tr('All Streams','Toutes les chaînes'))}</option>`,...streams().map(s=>`<option value="${escHtml(s.id)}" ${filters.stream===s.id?'selected':''}>${escHtml(s.id)} · ${escHtml(s.name)}</option>`)].join('')}
  function ownerOptions(){const names=[...new Set((project().people||[]).map(p=>p.name).filter(Boolean))].sort();return [`<option value="ALL">${escHtml(tr('All Owners','Tous les responsables'))}</option>`,...names.map(n=>`<option value="${escHtml(n)}" ${filters.owner===n?'selected':''}>${escHtml(n)}</option>`)].join('')}
  function phaseOptions(){const ms=project().milestones||[];return [`<option value="ALL">${escHtml(tr('All Phases','Toutes les phases'))}</option>`,...ms.map(m=>`<option value="${escHtml(m.id)}" ${filters.phase===m.id?'selected':''}>${escHtml(m.id)} · ${escHtml(m.name||'')}</option>`)].join('')}
  function statusOptions(){const vals=['Not Started','In Progress','Waiting','Blocked','Ready for Review','BPO Review','Approved','Closed'];return [`<option value="ALL">${escHtml(tr('All Statuses','Tous les statuts'))}</option>`,...vals.map(x=>`<option ${filters.status===x?'selected':''}>${escHtml(x)}</option>`)].join('')}

  function globalFilters(){
    return `<div class="v25-filterbar">
      <div class="v25-filter-slot" id="v25EntitySlot"><label>${escHtml(tr('Entity','Entité'))}</label></div>
      <label>${escHtml(tr('Value Stream','Chaîne de valeur'))}<select data-v25-filter="stream">${streamOptions()}</select></label>
      <label>${escHtml(tr('Phase','Phase'))}<select data-v25-filter="phase">${phaseOptions()}</select></label>
      <label>${escHtml(tr('Owner','Responsable'))}<select data-v25-filter="owner">${ownerOptions()}</select></label>
      <label>${escHtml(tr('Status','Statut'))}<select data-v25-filter="status">${statusOptions()}</select></label>
      <button type="button" data-v25-reset>${escHtml(tr('Reset','Réinitialiser'))}</button>
      <button type="button" class="v25-help" data-v25-help>ⓘ ${escHtml(tr('How to use','Comment utiliser'))}</button>
    </div>`;
  }

  function recordVisible(x){
    if(filters.stream!=='ALL'&&(x.stream||x.l1)!==filters.stream)return false;
    if(filters.owner!=='ALL'&&x.owner!==filters.owner&&x.bpo!==filters.owner)return false;
    if(filters.phase!=='ALL'&&x.milestoneId!==filters.phase&&x.phase!==filters.phase)return false;
    if(filters.status!=='ALL'&&x.status!==filters.status)return false;
    return true;
  }
  function taskOpen(t){return !CLOSED_TASK.has(t.status)}
  function taskDue(t){return t.forecastDue||t.due||''}
  function daysUntil(x){if(!x)return null;const a=new Date(todayIso()+'T00:00:00'),b=new Date(x+'T00:00:00');return Math.ceil((b-a)/86400000)}
  function pct(a,b){return b?Math.round(100*a/b):null}
  function scoreTone(n){return n===null?'neutral':n>=80?'good':n>=50?'warn':'bad'}

  function gateInfo(){
    try{
      if(typeof currentMilestone==='function'){
        const m=currentMilestone();
        if(m){const score=typeof gateReadiness==='function'?Math.round(Number(gateReadiness(m))||0):null;return {m,score,status:typeof gateStatus==='function'?gateStatus(m):(m.status||'—')}}
      }
    }catch(_){ }
    const ms=(project().milestones||[]).slice().filter(m=>m.end||m.due).sort((a,b)=>String(a.end||a.due).localeCompare(String(b.end||b.due)));
    const m=ms.find(x=>(x.end||x.due)>=todayIso())||ms.at(-1)||null;return {m,score:null,status:m?.status||'—'};
  }
  function nextMilestone(){const ms=(project().milestones||[]).filter(m=>(m.end||m.due)>=todayIso()).sort((a,b)=>String(a.end||a.due).localeCompare(String(b.end||b.due)));return ms[0]||null}
  function programHealth(){
    try{
      if(!window.D365_V23?.metricsFor)return null;const vals=[];
      streams().forEach(s=>{const m=window.D365_V23.metricsFor(s);['asis','requirements','fitgap','design','execution','testing','dataReady'].forEach(k=>{if(Number.isFinite(m?.[k]))vals.push(m[k])})});
      return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;
    }catch(_){return null}
  }
  function selectedPeople(){return (project().people||[]).filter(p=>/bpo|sme/i.test(String(p.role||''))).filter(p=>(filters.stream==='ALL'||p.stream===filters.stream)&&(filters.owner==='ALL'||p.name===filters.owner))}
  function capacityForMonth(key){
    try{
      const model=window.D365_MONTHLY_CAPACITY;if(!model)return null;const ps=selectedPeople();
      if(!ps.length&&filters.stream==='ALL'&&filters.owner==='ALL')return model.totalMonths([key])?.[0]||null;
      let cap=0,peak=0,need=0,unestimated=0,over=0;
      ps.forEach(p=>{const x=model.personMonth(p,key,[key]);cap+=x.cap;peak+=x.peak;need+=x.need;unestimated+=x.unestimated;if(x.cap&&x.need>x.cap)over++});
      return {k:key,cap,peak,need,unestimated,over,load:cap?100*need/cap:0,gap:cap-need};
    }catch(_){return null}
  }

  function iconSvg(kind){
    const paths={health:'M12 2l7 3v5c0 5-3.4 9.4-7 11-3.6-1.6-7-6-7-11V5l7-3zm-3 10 2 2 4-5',gate:'M4 4h16v4H4zm2 6h12v10H6z',calendar:'M5 3v3m14-3v3M3 8h18v13H3z',raid:'M12 3 2 21h20L12 3zm0 6v5m0 3v1',decision:'M4 5h16M8 5 4 15h8L8 5zm8 0-4 10h8L16 5zM12 3v18',capacity:'M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 2a3 3 0 1 0 0-6m-14 12c0-4 3-6 6-6s6 2 6 6m1 0c0-2 .8-4 3-5'};
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[kind]||paths.health}"/></svg>`;
  }
  function progressRing(n){const val=Number.isFinite(n)?Math.max(0,Math.min(100,n)):0;return `<span class="v25-ring" style="--p:${val}"><i></i></span>`}
  function kpiCards(){
    const d=project(),health=programHealth(),g=gateInfo(),m=nextMilestone(),raid=(d.raid||[]).filter(x=>!CLOSED_GENERIC.has(x.status)&&recordVisible(x)),crit=raid.filter(x=>x.severity==='Critical').length,dec=(d.decisions||[]).filter(x=>!['Closed','Decided'].includes(x.status)&&recordVisible(x)),over=dec.filter(x=>x.due&&x.due<todayIso()).length,cap=capacityForMonth(todayIso().slice(0,7)),capLoad=cap?Math.round(cap.load):null,nextDays=m?Math.max(0,daysUntil(m.end||m.due)):null;
    const cards=[
      ['health',tr('Program Health','Santé du programme'),health===null?'—':health+'%',health===null?tr('Evidence building','Preuves en construction'):health>=80?tr('On track','Sur la bonne voie'):health>=50?tr('Attention required','Attention requise'):tr('At risk','À risque'),scoreTone(health),'businessowner',health],
      ['gate',tr('Stage Gate Readiness','Préparation au jalon'),g.score===null?'—':g.score+'%',g.m?`${g.m.id||''} · ${g.m.name||''}`:tr('No active gate','Aucun jalon actif'),scoreTone(g.score),'businessowner',g.score],
      ['calendar',tr('Next Milestone','Prochain jalon'),nextDays===null?'—':nextDays,tr('days to target','jours avant cible')+(m?` · ${m.end||m.due}`:''),nextDays!==null&&nextDays<14?'warn':'neutral','roadmap',null],
      ['raid',tr('Critical RAID','RAID critiques'),crit,`${raid.length} ${tr('open','ouverts')}`,crit?'bad':'good','governance',null],
      ['decision',tr('Decisions Required','Décisions requises'),dec.length,`${over} ${tr('overdue','en retard')}`,over?'bad':dec.length?'warn':'good','governance',null],
      ['capacity',tr('Capacity · This Month','Capacité · Ce mois'),capLoad===null?'—':capLoad+'%',cap?`${Math.round(cap.need)}h ${tr('need','besoin')} / ${Math.round(cap.cap)}h ${tr('capacity','capacité')}`:tr('Estimate task hours','Estimer les heures'),capLoad===null?'neutral':capLoad>100?'bad':capLoad>85?'warn':'good','people',capLoad]
    ];
    return `<div class="v25-kpis">${cards.map(c=>`<button class="v25-kpi ${c[4]}" type="button" data-v25-go="${c[5]}"><span class="v25-kpi-icon">${iconSvg(c[0])}</span><span class="v25-kpi-copy"><small>${escHtml(c[1])}</small><strong>${escHtml(c[2])}</strong><em>${escHtml(c[3])}</em></span>${Number.isFinite(c[6])?progressRing(c[6]):'<span class="v25-kpi-arrow">›</span>'}</button>`).join('')}</div>`;
  }

  function timelineHtml(){
    const ms=(project().milestones||[]).slice().filter(x=>x.start&&(x.end||x.due)).sort((a,b)=>String(a.start).localeCompare(String(b.start))).slice(0,9);
    if(!ms.length)return `<div class="v25-empty">${escHtml(tr('No milestone dates available.','Aucune date de jalon disponible.'))}</div>`;
    const starts=ms.map(x=>new Date(x.start+'T00:00:00').getTime()),ends=ms.map(x=>new Date((x.end||x.due)+'T00:00:00').getTime()),min=Math.min(...starts),max=Math.max(...ends),span=Math.max(86400000,max-min),now=new Date(todayIso()+'T00:00:00').getTime(),todayPct=Math.max(0,Math.min(100,100*(now-min)/span));
    return `<div class="v25-timeline"><div class="v25-quarter-head"><span></span><b>2025 Q4</b><b>2026 Q1</b><b>Q2</b><b>Q3</b><b>Q4</b></div><div class="v25-today" style="left:calc(142px + (100% - 154px)*${todayPct/100})"><span>${escHtml(tr('Today','Aujourd’hui'))}</span></div>${ms.map((m,i)=>{const a=100*(new Date(m.start+'T00:00:00').getTime()-min)/span,b=100*(new Date((m.end||m.due)+'T00:00:00').getTime()-min)/span,w=Math.max(2,b-a);return `<div class="v25-time-row"><label>${escHtml(m.id||'')} <small>${escHtml(m.name||'')}</small></label><div><i class="c${i%6}" style="left:${a}%;width:${w}%"></i></div></div>`}).join('')}</div>`;
  }

  function capacityChart(){
    try{
      const model=window.D365_MONTHLY_CAPACITY;if(!model)return `<div class="v25-empty">${escHtml(tr('Capacity model loading.','Modèle de capacité en chargement.'))}</div>`;
      const keys=model.monthsFor('6'),rows=keys.map(capacityForMonth).filter(Boolean),mx=Math.max(1,...rows.flatMap(r=>[r.cap,r.need,r.peak]));
      return `<div class="v25-capacity-chart"><div class="v25-cap-y"><span>${Math.round(mx)}</span><span>${Math.round(mx*.66)}</span><span>${Math.round(mx*.33)}</span><span>0</span></div><div class="v25-cap-plot">${rows.map(r=>{const cap=100*r.cap/mx,need=100*r.need/mx,peak=100*r.peak/mx;return `<div class="v25-cap-col"><div class="v25-cap-bars"><i class="peak" style="bottom:${peak}%"></i><i class="cap" style="height:${cap}%"></i><i class="need ${r.load>100?'bad':r.load>85?'warn':''}" style="height:${need}%"></i></div><b>${escHtml(new Intl.DateTimeFormat(fr()?'fr-CA':'en-CA',{month:'short'}).format(new Date(r.k+'-01T00:00:00')))}</b><small class="${r.load>100?'bad':r.load>85?'warn':''}">${Math.round(r.load)}%</small></div>`}).join('')}</div></div><div class="v25-legend"><span><i class="cap"></i>${escHtml(tr('Capacity','Capacité'))}</span><span><i class="need"></i>${escHtml(tr('Need','Besoin'))}</span><span><i class="peak"></i>${escHtml(tr('Peak ceiling','Plafond pointe'))}</span></div>`;
    }catch(_){return `<div class="v25-empty">${escHtml(tr('Capacity visual unavailable.','Visuel de capacité indisponible.'))}</div>`}
  }

  function exceptions(){
    const d=project(),out=[];
    (d.tasks||[]).filter(t=>taskOpen(t)&&recordVisible(t)).forEach(t=>{if(t.status==='Blocked')out.push({score:100,tone:'bad',kind:'task',id:t.id,title:t.title,meta:`${t.stream||''} · ${tr('Blocked','Bloquée')}`});else if(taskDue(t)&&taskDue(t)<todayIso())out.push({score:t.priority==='Critical'?98:88,tone:'bad',kind:'task',id:t.id,title:t.title,meta:`${t.stream||''} · ${tr('Overdue','En retard')}`})});
    (d.raid||[]).filter(x=>!CLOSED_GENERIC.has(x.status)&&['High','Critical'].includes(x.severity)&&recordVisible(x)).forEach(x=>out.push({score:x.severity==='Critical'?99:82,tone:x.severity==='Critical'?'bad':'warn',kind:'raid',id:x.id,title:x.title||x.description,meta:`${x.stream||''} · ${x.severity}`}));
    (d.decisions||[]).filter(x=>!['Closed','Decided'].includes(x.status)&&recordVisible(x)).forEach(x=>{const steering=x.escalateToSteering===true||x.escalateToSteering==='Yes'||x.decisionAuthority==='Steering Committee',late=x.due&&x.due<todayIso();if(steering||late)out.push({score:steering?96:86,tone:'warn',kind:'decision',id:x.id,title:x.title,meta:steering?tr('Steering decision','Décision comité'):tr('Decision overdue','Décision en retard')})});
    (state.registers?.testScenarios||[]).filter(x=>['Failed','Blocked'].includes(x.status)&&recordVisible(x)).forEach(x=>out.push({score:90,tone:'bad',kind:'test',id:x.id,title:x.scenario||x.title||x.id,meta:`${x.stream||''} · ${x.status}`}));
    return out.sort((a,b)=>b.score-a.score).slice(0,5);
  }
  function exceptionHtml(){const xs=exceptions();return xs.length?`<div class="v25-exception-list">${xs.map(x=>`<button type="button" data-v25-record="${x.kind}|${escHtml(x.id)}"><i class="${x.tone}">${x.tone==='bad'?'!':'▲'}</i><span><b>${escHtml(x.title)}</b><small>${escHtml(x.meta)}</small></span><em>›</em></button>`).join('')}</div>`:`<div class="v25-empty">${escHtml(tr('No major exception detected.','Aucune exception majeure détectée.'))}</div>`}

  function focusItems(){const rank={Critical:0,High:1,Medium:2,Low:3};return (project().tasks||[]).filter(t=>taskOpen(t)&&recordVisible(t)).sort((a,b)=>{const ad=a.status==='Blocked'?-3:taskDue(a)&&taskDue(a)<todayIso()?-2:(rank[a.priority]??4),bd=b.status==='Blocked'?-3:taskDue(b)&&taskDue(b)<todayIso()?-2:(rank[b.priority]??4);return ad-bd||String(taskDue(a)||'9999').localeCompare(String(taskDue(b)||'9999'))}).slice(0,5)}
  function focusHtml(){const xs=focusItems(),over=xs.filter(t=>taskDue(t)&&taskDue(t)<todayIso()).length;return `<div class="v25-pills"><span class="active">${escHtml(tr('Priority now','Priorité maintenant'))}</span><span>${over} ${escHtml(tr('overdue','en retard'))}</span></div><div class="v25-focus-list">${xs.map(t=>`<button type="button" data-v25-record="task|${escHtml(t.id)}"><i class="${t.status==='Blocked'?'bad':taskDue(t)&&taskDue(t)<todayIso()?'warn':'neutral'}"></i><span><b>${escHtml(t.title)}</b><small>${escHtml(t.stream||'')} · ${escHtml(t.owner||tr('Unassigned','Non assignée'))}</small></span><em>${escHtml(taskDue(t)||'—')}</em></button>`).join('')||`<div class="v25-empty">${escHtml(tr('No tasks match the filters.','Aucune tâche ne correspond aux filtres.'))}</div>`}</div>`}

  function upcomingDates(){
    const items=[];(project().milestones||[]).forEach(x=>{const dt=x.end||x.due;if(dt&&dt>=todayIso())items.push({date:dt,title:x.name||x.id,type:tr('Milestone','Jalon')})});
    (state.registers?.workshopReadiness||[]).forEach(x=>{const dt=x.nextWorkshopDate;if(dt&&dt>=todayIso()&&recordVisible(x))items.push({date:dt,title:`${x.stream} · ${x.l2}`,type:tr('Workshop','Atelier')})});
    (project().decisions||[]).filter(x=>!['Closed','Decided'].includes(x.status)&&recordVisible(x)).forEach(x=>{if(x.due&&x.due>=todayIso())items.push({date:x.due,title:x.title,type:tr('Decision','Décision')})});
    return items.sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  }
  function datesHtml(){const xs=upcomingDates();return `<div class="v25-date-list">${xs.map(x=>{const dt=new Date(x.date+'T00:00:00'),day=String(dt.getDate()).padStart(2,'0'),mon=new Intl.DateTimeFormat(fr()?'fr-CA':'en-CA',{month:'short'}).format(dt).toUpperCase();return `<div><time><small>${escHtml(mon)}</small><b>${day}</b></time><span><b>${escHtml(x.title)}</b><small>${escHtml(x.type)} · ${Math.max(0,daysUntil(x.date))} ${escHtml(tr('days','jours'))}</small></span></div>`}).join('')||`<div class="v25-empty">${escHtml(tr('No upcoming key dates.','Aucune date clé à venir.'))}</div>`}</div>`}

  function recentChanges(){
    const d=project(),items=[];
    const add=(arr,kind)=>{(arr||[]).forEach(x=>{const ts=x.updatedAt||x.modifiedAt||x.lastUpdated||x.updated||x.createdAt;if(ts)items.push({ts,title:x.title||x.object||x.scenario||x.name||x.id,meta:`${kind}${x.stream?' · '+x.stream:''}`})})};
    add(d.tasks,tr('Task','Tâche'));add(d.decisions,tr('Decision','Décision'));add(d.raid,'RAID');add(d.requirements,tr('Requirement','Exigence'));add(d.dataObjects,tr('Data','Données'));
    return items.sort((a,b)=>String(b.ts).localeCompare(String(a.ts))).slice(0,5);
  }
  function changesHtml(){const xs=recentChanges();return `<div class="v25-change-list">${xs.map(x=>`<div><span><b>${escHtml(x.title)}</b><small>${escHtml(x.meta)}</small></span><time>${escHtml(String(x.ts).replace('T',' ').slice(0,16))}</time></div>`).join('')||`<div class="v25-empty">${escHtml(tr('No timestamped register changes are available yet.','Aucun changement horodaté n’est disponible dans les registres.'))}</div>`}</div>`}

  function metricsHtml(){
    const d=project(),req=(d.requirements||[]).filter(recordVisible),approved=req.filter(x=>['Approved','Validated','Complete'].includes(x.status)).length,fit=req.filter(x=>x.fitGap&&!['TBD','Pending',''].includes(String(x.fitGap))).length,tests=(state.registers?.testScenarios||[]).filter(recordVisible),passed=tests.filter(x=>['Passed','Approved','Complete'].includes(x.status)).length,objects=(d.dataObjects||[]).filter(recordVisible),ready=objects.filter(x=>['Validated','Complete'].includes(x.cleansingStatus)&&['Validated','Complete'].includes(x.mappingStatus)).length,maps=filters.stream==='ALL'?Object.values(d.subprocesses||{}).flat().length:(d.subprocesses?.[filters.stream]||[]).length,openRaid=(d.raid||[]).filter(x=>!CLOSED_GENERIC.has(x.status)&&recordVisible(x)).length;
    const cards=[[tr('Requirements approved','Exigences approuvées'),approved,req.length?`${pct(approved,req.length)}%`:'—'],['Fit / Gap',req.length?`${pct(fit,req.length)}%`:'—',`${fit}/${req.length}`],[tr('Tests passed','Tests réussis'),passed,`${passed}/${tests.length}`],[tr('Data ready','Données prêtes'),objects.length?`${pct(ready,objects.length)}%`:'—',`${ready}/${objects.length}`],[tr('Process maps','Cartographies'),maps,tr('current-state','état actuel')],[tr('Active RAID','RAID actifs'),openRaid,tr('open records','éléments ouverts')]];
    return `<div class="v25-metrics">${cards.map(x=>`<div><span>${escHtml(x[0])}</span><b>${escHtml(x[1])}</b><small>${escHtml(x[2])}</small></div>`).join('')}</div>`;
  }
  function panel(title,body,action='',cls=''){return `<section class="v25-panel ${cls}"><header><h3>${escHtml(title)}</h3>${action}</header><div class="v25-panel-body">${body}</div></section>`}

  function buildCockpit(original){
    const heat=original.querySelector('.v23-heatmap-shell');if(heat)heat.remove();
    const shell=document.createElement('div');shell.className='v25-cockpit';
    shell.innerHTML=`${globalFilters()}${kpiCards()}
      <div class="v25-grid v25-main-row">${panel(tr('Program Timeline','Échéancier du programme'),timelineHtml(),`<button data-v25-go="roadmap">${escHtml(tr('View roadmap','Voir feuille de route'))} →</button>`,'span5')}${panel(tr('Monthly Capacity vs Need','Capacité mensuelle vs besoin'),capacityChart(),`<button data-v25-capacity>${escHtml(tr('View capacity','Voir capacité'))} →</button>`,'span4')}${panel(tr('Top Exceptions','Principales exceptions'),exceptionHtml(),`<button data-v25-go="businessowner">${escHtml(tr('View all','Voir tout'))}</button>`,'span3')}</div>
      <div class="v25-grid v25-middle-row"><div class="v25-heat-slot span8"></div>${panel(tr('My Focus','Mes priorités'),focusHtml(),`<button data-v25-go="execution">${escHtml(tr('View all','Voir tout'))}</button>`,'span4')}</div>
      <div class="v25-grid v25-bottom-row">${panel(tr('Recent Changes','Changements récents'),changesHtml(),'','span4')}${panel(tr('Upcoming Key Dates','Dates clés à venir'),datesHtml(),`<button data-v25-go="roadmap">${escHtml(tr('View calendar','Voir calendrier'))}</button>`,'span4')}${panel(tr('Program Metrics · Summary','Indicateurs programme · Sommaire'),metricsHtml(),`<button data-v25-detail>${escHtml(tr('View full dashboard','Voir tout'))} →</button>`,'span4')}</div>`;
    const heatSlot=shell.querySelector('.v25-heat-slot');
    if(heat){heat.classList.add('v25-heatmap');heatSlot.appendChild(heat)}else heatSlot.innerHTML=panel(tr('Program Readiness Heatmap','Carte thermique de préparation'),`<div class="v25-empty">${escHtml(tr('Readiness heatmap loading.','Carte thermique en chargement.'))}</div>`,'','');
    const detail=document.createElement('details');detail.id='v25FullWorkspace';detail.className='v25-full-workspace';detail.innerHTML=`<summary><span><b>${escHtml(tr('Full Program Workspace','Espace programme complet'))}</b><small>${escHtml(tr('All original registers, AI tools, drill-downs and controls','Tous les registres, outils IA, forages et contrôles existants'))}</small></span><em>${escHtml(tr('Open full detail','Ouvrir le détail'))} ▾</em></summary><div class="v25-full-body"></div>`;
    detail.querySelector('.v25-full-body').appendChild(original);
    const app=document.getElementById('app');app.innerHTML='';app.append(shell,detail);
    moveEntitySelector();bindCockpit();
  }

  function moveEntitySelector(){const entity=document.getElementById('v8EntityWrap'),slot=document.getElementById('v25EntitySlot');if(entity&&slot){entity.classList.add('v25-entity');slot.appendChild(entity);const span=entity.querySelector('span');if(span)span.style.display='none'}}
  function bindCockpit(){
    const app=document.getElementById('app');
    app.querySelectorAll('[data-v25-go]').forEach(b=>b.addEventListener('click',()=>route(b.dataset.v25Go)));
    app.querySelectorAll('[data-v25-record]').forEach(b=>b.addEventListener('click',()=>{const [kind,id]=b.dataset.v25Record.split('|');openRecord(kind,id)}));
    app.querySelectorAll('[data-v25-filter]').forEach(s=>s.addEventListener('change',()=>{filters[s.dataset.v25Filter]=s.value;saveFilters();render()}));
    app.querySelector('[data-v25-reset]')?.addEventListener('click',()=>{filters={stream:'ALL',owner:'ALL',phase:'ALL',status:'ALL'};saveFilters();render()});
    app.querySelector('[data-v25-help]')?.addEventListener('click',()=>{const detail=document.getElementById('v25FullWorkspace');if(detail){detail.open=true;(detail.querySelector('.v13-tab-help')||detail).scrollIntoView({behavior:'smooth',block:'start'})}});
    app.querySelector('[data-v25-detail]')?.addEventListener('click',()=>{const detail=document.getElementById('v25FullWorkspace');if(detail){detail.open=true;detail.scrollIntoView({behavior:'smooth',block:'start'})}});
    app.querySelector('[data-v25-capacity]')?.addEventListener('click',()=>{const detail=document.getElementById('v25FullWorkspace');if(detail){detail.open=true;const el=detail.querySelector('.v17-monthly,.v16-capacity-section');(el||detail).scrollIntoView({behavior:'smooth',block:'start'})}});
    app.querySelectorAll('.v25-heatmap tr[data-v23-stream]').forEach(r=>r.addEventListener('click',()=>{const id=r.dataset.v23Stream;if(id){selectedStream=id;route('streams')}}));
  }

  function sectionNav(){
    const app=document.getElementById('app');if(!app||currentView()==='cockpit'||app.querySelector('.v25-page-nav'))return;
    const head=app.querySelector('.page-head,.stream-header');if(!head)return;
    const titles=[...app.querySelectorAll('.section-title h2,.v9-section-title h2,.v15-section-title h2,.card>h3')].filter(x=>x.offsetParent!==null).slice(0,9);
    if(!titles.length)return;
    titles.forEach((x,i)=>{if(!x.id)x.id=`v25-section-${i}`});
    const nav=document.createElement('div');nav.className='v25-page-nav';nav.innerHTML=`<span>${escHtml(tr('Jump to','Aller à'))}</span>${titles.map(x=>`<button type="button" data-target="${x.id}">${escHtml((x.textContent||'').trim().slice(0,34))}</button>`).join('')}`;
    head.after(nav);nav.addEventListener('click',ev=>{const b=ev.target.closest('[data-target]');if(b)document.getElementById(b.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'})});
  }
  function pageHeaderPolish(){
    const app=document.getElementById('app');if(!app||currentView()==='cockpit')return;
    app.classList.add('v25-workspace');
    const help=app.querySelector('.v13-tab-help');if(help)help.open=false;
    sectionNav();
  }

  function apply(){
    rebuildChrome();ensureSidebar();
    const app=document.getElementById('app');if(!app)return;
    if(currentView()==='cockpit'&&!app.querySelector('.v25-cockpit')){
      const original=document.createElement('div');original.className='v25-original';while(app.firstChild)original.appendChild(app.firstChild);buildCockpit(original);
    }else pageHeaderPolish();
    const side=document.getElementById('v25Sidebar');if(side)side.querySelectorAll('[data-v25-view]').forEach(b=>b.classList.toggle('active',b.dataset.v25View===currentView()));
  }

  const baseRender=render;
  render=function(){const out=baseRender.apply(this,arguments);try{apply()}catch(err){console.warn('[V25] UI shell',err)}return out};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,0));else setTimeout(apply,0);
  window.D365_V25={apply,filters};
})();