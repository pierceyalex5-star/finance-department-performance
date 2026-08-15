(function(){
  'use strict';

  const fr=()=>document.documentElement.lang==='fr';
  const tr=(en,frText)=>fr()?frText:en;
  const e=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const d=()=>typeof data==='function'?data():{};
  const streams=()=>typeof allStreams==='function'?allStreams():[...(d().valueStreams||[]),...(d().crossFunctional||[])];
  const todayIso=()=>typeof today==='function'?today():new Date().toISOString().slice(0,10);
  const CLOSED_TASK=new Set(['Approved','Closed']);
  const CLOSED_RAID=new Set(['Closed','Resolved']);
  const CLOSED_DECISION=new Set(['Closed','Decided']);

  const NAV=[
    ['cockpit','⌂',tr('Cockpit','Cockpit')],
    ['businessowner','◎',tr('My Focus','Mes priorités')],
    ['streams','◫',tr('Value Streams','Chaînes de valeur')],
    ['execution','▣',tr('Execution','Exécution')],
    ['governance','◇',tr('Governance','Gouvernance')],
    ['architecture','▤',tr('Data & Solution','Données & Solution')],
    ['d365guide','◉',tr('D365 Guide','Guide D365')],
    ['steering','⚖',tr('Steering','Comité directeur')],
    ['roadmap','▥',tr('Roadmap','Feuille de route')]
  ];

  function route(target){
    const btn=document.querySelector(`#mainNav [data-view="${target}"]`);
    if(btn){btn.click();return}
    try{view=target;render()}catch(_){ }
  }

  function ensureSidebar(){
    let side=document.getElementById('v24Sidebar');
    if(!side){
      side=document.createElement('aside');side.id='v24Sidebar';side.className='v24-sidebar';
      side.innerHTML=`<div class="v24-side-nav">${NAV.map(([id,icon,label])=>`<button type="button" data-v24-view="${id}"><span>${icon}</span><b>${e(label)}</b></button>`).join('')}</div><div class="v24-side-bottom"><button type="button" data-v24-people><span>♙</span><b>${e(tr('People','Personnes'))}</b></button><button type="button" data-v24-sync><span>↻</span><b>${e(tr('GitHub sync','Sync GitHub'))}</b></button><small>${e(tr('Program','Programme'))}<b>D365 Implementation</b></small></div>`;
      document.body.appendChild(side);
      side.addEventListener('click',ev=>{
        const b=ev.target.closest('[data-v24-view]');if(b){route(b.dataset.v24View);return}
        if(ev.target.closest('[data-v24-people]')){route('people');return}
        if(ev.target.closest('[data-v24-sync]')){try{view='sync';document.querySelectorAll('#mainNav button').forEach(x=>x.classList.remove('active'));render()}catch(_){ }}
      });
    }
    side.querySelectorAll('[data-v24-view]').forEach(b=>b.classList.toggle('active',b.dataset.v24View===String(window.view||view)));
  }

  function daysUntil(x){if(!x)return null;const a=new Date(todayIso()+'T00:00:00'),b=new Date(x+'T00:00:00');return Math.ceil((b-a)/86400000)}
  function milestone(){
    const ms=(d().milestones||[]).slice().filter(x=>x.end||x.due).sort((a,b)=>String(a.end||a.due).localeCompare(String(b.end||b.due)));
    return ms.find(x=>(x.end||x.due)>=todayIso())||ms.at(-1)||null;
  }
  function gate(){
    try{if(typeof currentMilestone==='function'){const m=currentMilestone();if(m)return {m,score:typeof gateReadiness==='function'?Math.round(Number(gateReadiness(m))||0):null,status:typeof gateStatus==='function'?gateStatus(m):m.status}}catch(_){ }
    const m=milestone();return {m,score:null,status:m?.status||'—'};
  }
  function programHealth(){
    if(!window.D365_V23?.metricsFor)return null;
    const vals=[];streams().forEach(s=>{const m=window.D365_V23.metricsFor(s);['asis','requirements','fitgap','design','execution','testing','dataReady'].forEach(k=>{if(Number.isFinite(m?.[k]))vals.push(m[k])})});
    return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;
  }
  function currentCapacity(){
    try{
      const model=window.D365_MONTHLY_CAPACITY;if(!model)return null;
      const key=todayIso().slice(0,7),rows=model.totalMonths([key]);return rows?.[0]||null;
    }catch(_){return null}
  }
  function severityTone(n){return n>=80?'bad':n>=50?'warn':'good'}
  function scoreTone(n){return n===null?'neutral':n>=80?'good':n>=50?'warn':'bad'}

  function kpis(){
    const health=programHealth(),g=gate(),m=milestone(),raid=(d().raid||[]).filter(x=>!CLOSED_RAID.has(x.status)),crit=raid.filter(x=>x.severity==='Critical').length,dec=(d().decisions||[]).filter(x=>!CLOSED_DECISION.has(x.status)),overDec=dec.filter(x=>x.due&&x.due<todayIso()).length,cap=currentCapacity(),capLoad=cap?Math.round(cap.load||0):null;
    const nextDays=m?daysUntil(m.end||m.due):null;
    return [
      {label:tr('Program Health','Santé du programme'),value:health===null?'—':`${health}%`,sub:health===null?tr('Evidence still building','Preuves en construction'):health>=80?tr('On track','Sur la bonne voie'):health>=50?tr('Attention required','Attention requise'):tr('At risk','À risque'),tone:scoreTone(health),go:'businessowner'},
      {label:tr('Stage Gate Readiness','Préparation au jalon'),value:g.score===null?'—':`${g.score}%`,sub:g.m?`${g.m.id||''} ${g.m.name||''}`.trim():tr('No active gate','Aucun jalon actif'),tone:scoreTone(g.score),go:'businessowner'},
      {label:tr('Next Milestone','Prochain jalon'),value:nextDays===null?'—':Math.max(0,nextDays),sub:m?`${tr('days ·','jours ·')} ${m.name||m.id||''}`:tr('No milestone','Aucun jalon'),tone:nextDays!==null&&nextDays<14?'warn':'neutral',go:'roadmap'},
      {label:tr('Critical RAID','RAID critiques'),value:crit,sub:`${raid.length} ${tr('open RAID','RAID ouverts')}`,tone:crit?'bad':'good',go:'governance'},
      {label:tr('Decisions Required','Décisions requises'),value:dec.length,sub:`${overDec} ${tr('overdue','en retard')}`,tone:overDec?'bad':dec.length?'warn':'good',go:'governance'},
      {label:tr('Capacity · This Month','Capacité · Ce mois'),value:capLoad===null?'—':`${capLoad}%`,sub:cap?`${Math.round(cap.need||0)}h / ${Math.round(cap.cap||0)}h`:tr('Estimate task hours','Estimer les heures'),tone:capLoad===null?'neutral':capLoad>100?'bad':capLoad>85?'warn':'good',go:'people'}
    ];
  }

  function kpiHtml(){return `<div class="v24-kpis">${kpis().map(x=>`<button type="button" class="v24-kpi ${x.tone}" data-v24-kpi-go="${x.go}"><span>${e(x.label)}</span><strong>${e(x.value)}</strong><small>${e(x.sub)}</small><i></i></button>`).join('')}</div>`}

  function timelineHtml(){
    const ms=(d().milestones||[]).slice().filter(x=>x.start&&(x.end||x.due)).sort((a,b)=>String(a.start).localeCompare(String(b.start))).slice(0,10);
    if(!ms.length)return `<div class="v24-empty">${tr('No milestone dates available.','Aucune date de jalon disponible.')}</div>`;
    const starts=ms.map(x=>new Date(x.start+'T00:00:00').getTime()),ends=ms.map(x=>new Date((x.end||x.due)+'T00:00:00').getTime()),min=Math.min(...starts),max=Math.max(...ends),span=Math.max(86400000,max-min),now=new Date(todayIso()+'T00:00:00').getTime(),todayPct=Math.max(0,Math.min(100,100*(now-min)/span));
    return `<div class="v24-timeline"><div class="v24-today-line" style="left:calc(150px + (100% - 165px)*${todayPct/100})"><span>${tr('Today','Aujourd’hui')}</span></div>${ms.map((m,i)=>{const a=100*(new Date(m.start+'T00:00:00').getTime()-min)/span,b=100*(new Date((m.end||m.due)+'T00:00:00').getTime()-min)/span,w=Math.max(2,b-a);return `<div class="v24-timeline-row"><b>${e(m.id||`M${i+1}`)} <small>${e(m.name||'')}</small></b><div><i class="c${i%5}" style="left:${a}%;width:${w}%"></i></div></div>`}).join('')}</div>`;
  }

  function capacityHtml(){
    try{
      const model=window.D365_MONTHLY_CAPACITY;if(!model)return `<div class="v24-empty">${tr('Monthly capacity model is loading.','Le modèle mensuel de capacité se charge.')}</div>`;
      const keys=model.monthsFor('6'),rows=model.totalMonths(keys),mx=Math.max(1,...rows.flatMap(r=>[r.cap,r.need,r.peak]));
      return `<div class="v24-cap-chart">${rows.map(r=>{const cap=100*r.cap/mx,need=100*r.need/mx,peak=100*r.peak/mx;return `<div class="v24-cap-month"><div class="v24-cap-bars"><i class="peak" style="height:${peak}%"></i><i class="cap" style="height:${cap}%"></i><i class="need ${r.load>100?'bad':r.load>85?'warn':''}" style="height:${need}%"></i></div><b>${e(new Intl.DateTimeFormat(fr()?'fr-CA':'en-CA',{month:'short'}).format(new Date(r.k+'-01T00:00:00')))}</b><small class="${r.load>100?'bad':r.load>85?'warn':''}">${Math.round(r.load)}%</small></div>`}).join('')}</div><div class="v24-legend"><span><i class="cap"></i>${tr('Capacity','Capacité')}</span><span><i class="need"></i>${tr('Need','Besoin')}</span><span><i class="peak"></i>${tr('Peak ceiling','Plafond pointe')}</span></div>`;
    }catch(_){return `<div class="v24-empty">${tr('Capacity visual unavailable. Open detailed capacity below.','Visuel de capacité indisponible. Ouvrez le détail ci-dessous.')}</div>`}
  }

  function exceptions(){
    const out=[],taskDue=t=>t.forecastDue||t.due||'';
    (d().tasks||[]).filter(t=>!CLOSED_TASK.has(t.status)).forEach(t=>{if(t.status==='Blocked')out.push({score:100,tone:'bad',kind:'task',id:t.id,title:t.title,meta:`${t.stream||''} · ${tr('Blocked','Bloquée')}`});else if(taskDue(t)&&taskDue(t)<todayIso())out.push({score:t.priority==='Critical'?98:88,tone:'bad',kind:'task',id:t.id,title:t.title,meta:`${t.stream||''} · ${tr('Overdue','En retard')}`})});
    (d().raid||[]).filter(x=>!CLOSED_RAID.has(x.status)&&['High','Critical'].includes(x.severity)).forEach(x=>out.push({score:x.severity==='Critical'?99:82,tone:x.severity==='Critical'?'bad':'warn',kind:'raid',id:x.id,title:x.title||x.description,meta:`${x.stream||''} · ${x.severity}`}));
    (d().decisions||[]).filter(x=>!CLOSED_DECISION.has(x.status)).forEach(x=>{const steering=x.escalateToSteering===true||x.escalateToSteering==='Yes'||x.decisionAuthority==='Steering Committee',late=x.due&&x.due<todayIso();if(steering||late)out.push({score:steering?96:86,tone:steering||late?'bad':'warn',kind:'decision',id:x.id,title:x.title,meta:steering?tr('Steering decision','Décision comité'):tr('Decision overdue','Décision en retard')})});
    (state.registers?.testScenarios||[]).filter(x=>['Failed','Blocked'].includes(x.status)).forEach(x=>out.push({score:x.criticality==='Critical'?95:84,tone:'bad',kind:'test',id:x.id,title:x.scenario||x.title||x.id,meta:`${x.stream||''} · ${x.status}`}));
    try{(d().people||[]).filter(p=>/bpo|sme/i.test(String(p.role||''))).forEach(p=>{const c=window.D365_CAPACITY_MODEL?.personCapacity?.(p);if(c?.load>100)out.push({score:91,tone:'bad',kind:'person',id:p.id,title:`${p.name} · ${tr('capacity','capacité')}`,meta:`${Math.round(c.load)}% · ${p.stream||''}`})})}catch(_){ }
    return out.sort((a,b)=>b.score-a.score).slice(0,6);
  }

  function exceptionHtml(){const xs=exceptions();return xs.length?`<div class="v24-exceptions">${xs.map(x=>`<button type="button" data-v24-record="${x.kind}|${e(x.id)}"><i class="${x.tone}">${x.tone==='bad'?'!':'•'}</i><span><b>${e(x.title)}</b><small>${e(x.meta)}</small></span><em>›</em></button>`).join('')}</div>`:`<div class="v24-empty">${tr('No major exception detected from the structured registers.','Aucune exception majeure détectée dans les registres structurés.')}</div>`}

  function focusItems(){
    const rank={Critical:0,High:1,Medium:2,Low:3};
    return (d().tasks||[]).filter(t=>!CLOSED_TASK.has(t.status)).sort((a,b)=>{const ab=a.status==='Blocked'?-2:(a.forecastDue||a.due||'9999')<todayIso()?-1:rank[a.priority]??4,bb=b.status==='Blocked'?-2:(b.forecastDue||b.due||'9999')<todayIso()?-1:rank[b.priority]??4;return ab-bb||String(a.forecastDue||a.due||'9999').localeCompare(String(b.forecastDue||b.due||'9999'))}).slice(0,6);
  }
  function focusHtml(){const xs=focusItems();return `<div class="v24-focus-tabs"><span class="active">${tr('Priority now','Priorité maintenant')}</span><span>${xs.filter(x=>(x.forecastDue||x.due||'')<todayIso()).length} ${tr('overdue','en retard')}</span></div><div class="v24-focus-list">${xs.map(t=>`<button type="button" data-v24-record="task|${e(t.id)}"><span><b>${e(t.title)}</b><small>${e(t.stream||'')} · ${e(t.owner||tr('Unassigned','Non assignée'))}</small></span><em>${e(t.forecastDue||t.due||'—')}</em></button>`).join('')}</div>`}

  function datesHtml(){
    const items=[];
    (d().milestones||[]).forEach(x=>{const dt=x.end||x.due;if(dt&&dt>=todayIso())items.push({date:dt,title:x.name||x.id,type:tr('Milestone','Jalon')})});
    (state.registers?.workshopReadiness||[]).forEach(x=>{const dt=x.nextWorkshopDate;if(dt&&dt>=todayIso())items.push({date:dt,title:`${x.stream} · ${x.l2}`,type:tr('Workshop','Atelier')})});
    (d().decisions||[]).filter(x=>!CLOSED_DECISION.has(x.status)).forEach(x=>{if(x.due&&x.due>=todayIso())items.push({date:x.due,title:x.title,type:tr('Decision','Décision')})});
    items.sort((a,b)=>a.date.localeCompare(b.date));
    return `<div class="v24-dates">${items.slice(0,6).map(x=>{const dt=new Date(x.date+'T00:00:00'),day=String(dt.getDate()).padStart(2,'0'),mon=new Intl.DateTimeFormat(fr()?'fr-CA':'en-CA',{month:'short'}).format(dt).toUpperCase();return `<div><time><small>${e(mon)}</small><b>${day}</b></time><span><b>${e(x.title)}</b><small>${e(x.type)} · ${Math.max(0,daysUntil(x.date))} ${tr('days','jours')}</small></span></div>`}).join('')||`<div class="v24-empty">${tr('No upcoming key dates.','Aucune date clé à venir.')}</div>`}</div>`;
  }

  function metricHtml(){
    const req=(d().requirements||[]),fit=req.filter(x=>x.fitGap&&!['TBD','Pending',''].includes(String(x.fitGap))).length,tests=state.registers?.testScenarios||[],passed=tests.filter(x=>['Passed','Approved','Complete'].includes(x.status)).length,objects=d().dataObjects||[],ready=objects.filter(x=>['Validated','Complete'].includes(x.cleansingStatus)&&['Validated','Complete'].includes(x.mappingStatus)).length,openRaid=(d().raid||[]).filter(x=>!CLOSED_RAID.has(x.status)).length;
    const cards=[[tr('Requirements','Exigences'),req.length,req.length?`${Math.round(100*req.filter(x=>['Approved','Validated','Complete'].includes(x.status)).length/req.length)}% ${tr('approved','approuvées')}`:'—'],['Fit/Gap',req.length?`${Math.round(100*fit/req.length)}%`:'—',`${fit}/${req.length}`],[tr('Tests passed','Tests réussis'),passed,`${passed}/${tests.length}`],[tr('Data objects ready','Objets données prêts'),objects.length?`${Math.round(100*ready/objects.length)}%`:'—',`${ready}/${objects.length}`],[tr('Open RAID','RAID ouverts'),openRaid,tr('derived register','registre dérivé')],[tr('Process maps','Cartographies'),Object.values(d().subprocesses||{}).flat().length,tr('current-state','état actuel')]];
    return `<div class="v24-metrics">${cards.map(x=>`<div><span>${e(x[0])}</span><b>${e(x[1])}</b><small>${e(x[2])}</small></div>`).join('')}</div>`;
  }

  function panel(title,body,action='',cls=''){return `<section class="v24-panel ${cls}"><header><h3>${e(title)}</h3>${action}</header>${body}</section>`}

  function cockpitShell(){
    return `<div class="v24-cockpit">
      ${kpiHtml()}
      <div class="v24-grid v24-row-main">
        ${panel(tr('Program Timeline','Échéancier du programme'),timelineHtml(),`<button data-v24-go="roadmap">${tr('View roadmap','Voir feuille de route')} →</button>`,'v24-span-5')}
        ${panel(tr('Monthly Capacity vs Need','Capacité mensuelle vs besoin'),capacityHtml(),`<button data-v24-open-cap>${tr('View capacity','Voir capacité')} →</button>`,'v24-span-4')}
        ${panel(tr('Top Exceptions','Principales exceptions'),exceptionHtml(),`<button data-v24-go="businessowner">${tr('View all','Voir tout')}</button>`,'v24-span-3')}
      </div>
      <div class="v24-grid v24-row-mid"><div class="v24-heat-slot v24-span-8"></div>${panel(tr('My Focus','Mes priorités'),focusHtml(),`<button data-v24-go="execution">${tr('View execution','Voir exécution')}</button>`,'v24-span-4')}</div>
      <div class="v24-grid v24-row-bottom">${panel(tr('Upcoming Key Dates','Dates clés à venir'),datesHtml(),`<button data-v24-go="roadmap">${tr('View roadmap','Voir feuille de route')}</button>`,'v24-span-5')}${panel(tr('Program Metrics · Summary','Indicateurs programme · Sommaire'),metricHtml(),`<button data-v24-open-detail>${tr('View full workspace','Voir espace complet')} →</button>`,'v24-span-7')}</div>
    </div>`;
  }

  function openRecord(kind,id){
    try{
      if(kind==='task'&&typeof editTask==='function'){editTask(id);return}
      if(kind==='decision'&&typeof editDecision==='function'){editDecision(id);return}
      if(kind==='raid'&&typeof editRaid==='function'){editRaid(id);return}
      if(kind==='person'){route('people');return}
      if(kind==='test'){route('governance');return}
    }catch(_){ }
    route(kind==='task'?'execution':'governance');
  }

  function organizeCockpit(){
    const app=document.getElementById('app');if(!app||app.querySelector('.v24-cockpit'))return;
    const heat=app.querySelector('.v23-heatmap-shell');
    const frag=document.createDocumentFragment();while(app.firstChild)frag.appendChild(app.firstChild);
    const shell=document.createElement('div');shell.innerHTML=cockpitShell();app.appendChild(shell.firstElementChild);
    const slot=app.querySelector('.v24-heat-slot');
    if(heat){slot.appendChild(heat);heat.classList.add('v24-embedded-heatmap')}
    else slot.innerHTML=panel(tr('Program Readiness Heatmap','Carte thermique de préparation'),`<div class="v24-empty">${tr('Readiness heatmap is loading.','La carte thermique de préparation se charge.')}</div>`,'','');
    const detail=document.createElement('details');detail.className='v24-detail-workspace';detail.innerHTML=`<summary><span><b>${e(tr('Detailed Program Workspace','Espace programme détaillé'))}</b><small>${e(tr('All original functions, registers, drill-downs and controls','Toutes les fonctions, registres, forages et contrôles d’origine'))}</small></span><em>${e(tr('Open full detail','Ouvrir le détail'))} ▾</em></summary><div class="v24-detail-body"></div>`;
    detail.querySelector('.v24-detail-body').appendChild(frag);app.appendChild(detail);
    app.querySelectorAll('[data-v24-go]').forEach(b=>b.addEventListener('click',()=>route(b.dataset.v24Go)));
    app.querySelectorAll('[data-v24-kpi-go]').forEach(b=>b.addEventListener('click',()=>route(b.dataset.v24KpiGo)));
    app.querySelectorAll('[data-v24-record]').forEach(b=>b.addEventListener('click',()=>{const [k,id]=b.dataset.v24Record.split('|');openRecord(k,id)}));
    app.querySelector('[data-v24-open-detail]')?.addEventListener('click',()=>{detail.open=true;detail.scrollIntoView({behavior:'smooth',block:'start'})});
    app.querySelector('[data-v24-open-cap]')?.addEventListener('click',()=>{detail.open=true;const cap=detail.querySelector('.v17-monthly,.v16-capacity-section');(cap||detail).scrollIntoView({behavior:'smooth',block:'start'})});
  }

  function compactOtherPages(){
    const app=document.getElementById('app');if(!app||view==='cockpit'||app.querySelector('.v24-page-tools'))return;
    const head=app.querySelector('.page-head,.stream-header');if(!head)return;
    const tools=document.createElement('div');tools.className='v24-page-tools';tools.innerHTML=`<button type="button" class="active" data-v24-density="focus">${e(tr('Focused view','Vue ciblée'))}</button><button type="button" data-v24-density="full">${e(tr('Show all detail','Afficher tout'))}</button>`;
    head.appendChild(tools);
    app.classList.add('v24-focused');
    tools.addEventListener('click',ev=>{const b=ev.target.closest('[data-v24-density]');if(!b)return;const full=b.dataset.v24Density==='full';app.classList.toggle('v24-full',full);tools.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));});
  }

  function apply(){
    document.body.classList.add('v24-clarity');ensureSidebar();
    try{if(view==='cockpit')organizeCockpit();else compactOtherPages()}catch(err){console.warn('[V24] clarity layout skipped',err)}
  }

  const baseRender=render;
  render=function(){const out=baseRender.apply(this,arguments);try{apply()}catch(err){console.warn('[V24] render enhancement',err)}return out};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
  window.D365_V24={apply,organizeCockpit};
})();