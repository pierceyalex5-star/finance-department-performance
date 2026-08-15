(function(){
  'use strict';

  const HPM=160;
  const CLOSED=['Approved','Closed'];
  const STORE='d365_v17_capacity_horizon';
  const fr=()=>document.documentElement.lang==='fr';
  const tr=(en,frText)=>fr()?frText:en;
  const e=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const d=()=>typeof data==='function'?data():{};
  const todayIso=()=>typeof today==='function'?today():new Date().toISOString().slice(0,10);
  const people=()=>d().people||[];
  const tasks=()=>d().tasks||[];
  const isProjectPerson=p=>/bpo|sme/i.test(String(p?.role||''));
  const isOpen=t=>!CLOSED.includes(t.status);
  const progress=t=>Math.max(0,Math.min(100,typeof taskProgress==='function'?Number(taskProgress(t))||0:Number(t.progress)||0));
  const remaining=t=>Math.max(0,(Number(t.estimatedHours)||0)*(1-progress(t)/100));
  const parse=s=>s?new Date(`${s}T00:00:00`):null;
  const iso=x=>x.toISOString().slice(0,10);
  const monthKey=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`;
  const monthStart=k=>new Date(+k.slice(0,4),+k.slice(5,7)-1,1);
  const monthEnd=k=>new Date(+k.slice(0,4),+k.slice(5,7),0);
  const label=k=>new Intl.DateTimeFormat(fr()?'fr-CA':'en-CA',{month:'short',year:'numeric'}).format(monthStart(k));
  const addMonths=(x,n)=>new Date(x.getFullYear(),x.getMonth()+n,1);
  const maxDate=(a,b)=>a>b?a:b;
  const minDate=(a,b)=>a<b?a:b;

  function workdays(a,b){
    if(!a||!b||a>b)return 0;let n=0,x=new Date(a);
    while(x<=b){const day=x.getDay();if(day!==0&&day!==6)n++;x.setDate(x.getDate()+1)}
    return n;
  }
  function currentMonthProration(k){
    const now=parse(todayIso()),ms=monthStart(k),me=monthEnd(k);if(monthKey(now)!==k)return 1;
    const all=workdays(ms,me),left=workdays(maxDate(now,ms),me);return all?left/all:1;
  }
  function monthsFor(mode){
    const start=new Date();start.setDate(1);start.setHours(0,0,0,0);
    let count=mode==='6'?6:mode==='12'?12:null;
    if(!count){
      const dates=[...(d().milestones||[]).map(x=>parse(x.end)),...tasks().map(x=>parse(x.forecastDue||x.due))].filter(Boolean);
      const end=dates.length?new Date(Math.max(...dates.map(x=>x.getTime()))):addMonths(start,17);
      count=Math.max(1,Math.min(30,(end.getFullYear()-start.getFullYear())*12+end.getMonth()-start.getMonth()+1));
    }
    return Array.from({length:count},(_,i)=>monthKey(addMonths(start,i)));
  }
  function taskRange(t){
    const now=parse(todayIso()),rawStart=parse(t.start)||now,due=parse(t.forecastDue||t.due);
    if(!due)return {start:maxDate(rawStart,now),due:null,overdue:false};
    if(due<now)return {start:now,due:now,overdue:true};
    return {start:maxDate(rawStart,now),due,overdue:false};
  }
  function allocationForTask(t,keys){
    const out=Object.fromEntries(keys.map(k=>[k,0])),rem=remaining(t),range=taskRange(t);
    if(!isOpen(t)||rem<=0||!range.due)return out;
    const total=workdays(range.start,range.due);
    if(!total){const k=monthKey(range.due);if(k in out)out[k]=rem;return out}
    keys.forEach(k=>{
      const a=maxDate(range.start,monthStart(k)),b=minDate(range.due,monthEnd(k));const wd=workdays(a,b);if(wd)out[k]=rem*wd/total;
    });
    return out;
  }
  function personMonth(p,k,keys){
    const cap=HPM*(Number(p.capacityPct)||0)/100*currentMonthProration(k);
    const peak=HPM*(Number(p.peakCapacityPct)||0)/100*currentMonthProration(k);
    const own=tasks().filter(t=>t.owner===p.name&&isOpen(t));let need=0,estimated=0,unestimated=0,contrib=[];
    own.forEach(t=>{
      const alloc=allocationForTask(t,keys),hours=alloc[k]||0;
      if(hours>0){need+=hours;estimated++;contrib.push({t,hours})}
      if(!(Number(t.estimatedHours)>0)){
        const due=t.forecastDue||t.due;if(due&&due.slice(0,7)===k)unestimated++;
      }
    });
    return {cap,peak,need,estimated,unestimated,load:cap?100*need/cap:0,gap:cap-need,contrib};
  }
  function totalMonths(keys){
    const ps=people().filter(isProjectPerson);
    return keys.map(k=>{let cap=0,peak=0,need=0,unestimated=0,over=0;ps.forEach(p=>{const x=personMonth(p,k,keys);cap+=x.cap;peak+=x.peak;need+=x.need;unestimated+=x.unestimated;if(x.cap&&x.need>x.cap)over++});return {k,cap,peak,need,load:cap?100*need/cap:0,gap:cap-need,unestimated,over};});
  }
  function fmt(n){return `${Math.round(n)}h`}
  function tone(load){return load>100?'bad':load>85?'warn':'ok'}

  function chartHtml(rows){
    const max=Math.max(1,...rows.flatMap(r=>[r.cap,r.need,r.peak]));
    return `<div class="v17-chart-wrap"><div class="v17-chart-legend"><span><i class="cap"></i>${tr('Normal capacity','Capacité normale')}</span><span><i class="need"></i>${tr('Estimated need','Besoin estimé')}</span><span><i class="peak"></i>${tr('Peak ceiling','Plafond de pointe')}</span></div><div class="v17-chart">${rows.map(r=>{const ch=100*r.cap/max,nh=100*r.need/max,ph=100*r.peak/max;return `<div class="v17-month" title="${e(label(r.k))} · ${tr('Capacity','Capacité')} ${fmt(r.cap)} · ${tr('Need','Besoin')} ${fmt(r.need)}"><div class="v17-bars"><div class="v17-bar cap" style="height:${ch}%"><span>${fmt(r.cap)}</span></div><div class="v17-bar need ${tone(r.load)}" style="height:${nh}%"><span>${r.need?fmt(r.need):''}</span></div><div class="v17-peak-line" style="bottom:${ph}%"></div></div><b>${e(label(r.k).replace(/\s\d{4}/,''))}</b><small>${Math.round(r.load)}%</small>${r.unestimated?`<em>${r.unestimated} ${tr('unestimated','non estimée(s)')}</em>`:''}</div>`}).join('')}</div></div>`;
  }
  function totalTable(rows){return `<div class="v17-table-wrap"><table class="v17-table"><thead><tr><th>${tr('Month','Mois')}</th><th>${tr('Normal capacity','Capacité normale')}</th><th>${tr('Estimated need','Besoin estimé')}</th><th>${tr('Gap','Écart')}</th><th>${tr('Load','Charge')}</th><th>${tr('Peak ceiling','Plafond pointe')}</th><th>${tr('Unestimated tasks due','Tâches dues non estimées')}</th><th>${tr('People over capacity','Personnes en surcharge')}</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${e(label(r.k))}</b></td><td>${fmt(r.cap)}</td><td>${fmt(r.need)}</td><td class="${r.gap<0?'v17-negative':''}">${fmt(r.gap)}</td><td><span class="v17-load ${tone(r.load)}">${Math.round(r.load)}%</span></td><td>${fmt(r.peak)}</td><td>${r.unestimated||'—'}</td><td>${r.over||'—'}</td></tr>`).join('')}</tbody></table></div>`}
  function personRows(keys){
    return people().filter(isProjectPerson).map(p=>{const ms=keys.map(k=>({k,...personMonth(p,k,keys)}));const peak=ms.reduce((a,b)=>b.load>a.load?b:a,ms[0]||{load:0,k:keys[0]}),need=ms.reduce((s,x)=>s+x.need,0),cap=ms.reduce((s,x)=>s+x.cap,0),unestimated=ms.reduce((s,x)=>s+x.unestimated,0);return {p,ms,peak,need,cap,unestimated}}).sort((a,b)=>b.peak.load-a.peak.load||a.p.name.localeCompare(b.p.name));
  }
  function peopleTable(keys){
    const rows=personRows(keys);return `<div class="v17-table-wrap"><table class="v17-table v17-people"><thead><tr><th>${tr('Person','Personne')}</th><th>${tr('Role / stream','Rôle / chaîne')}</th><th>${tr('Normal capacity','Capacité normale')}</th><th>${tr('Peak month','Mois de pointe')}</th><th>${tr('Peak load','Charge de pointe')}</th><th>${tr('Horizon need','Besoin horizon')}</th><th>${tr('Unestimated','Non estimées')}</th><th></th></tr></thead><tbody>${rows.map(x=>`<tr data-v17-person="${e(x.p.id)}"><td><b>${e(x.p.name)}</b></td><td>${e(x.p.role||'')}<small>${e(x.p.stream||'')}</small></td><td>${Number(x.p.capacityPct)||0}%<small>${fmt(HPM*(Number(x.p.capacityPct)||0)/100)}/${tr('month','mois')}</small></td><td>${e(label(x.peak.k))}</td><td><span class="v17-load ${tone(x.peak.load)}">${Math.round(x.peak.load)}%</span></td><td>${fmt(x.need)}</td><td>${x.unestimated||'—'}</td><td><button class="btn tiny" type="button" data-v17-drill="${e(x.p.id)}">${tr('Drill down','Détailler')}</button></td></tr>`).join('')}</tbody></table></div>`}
  function monthlySection(mode){
    const keys=monthsFor(mode),rows=totalMonths(keys),totalCap=rows.reduce((s,x)=>s+x.cap,0),totalNeed=rows.reduce((s,x)=>s+x.need,0),unest=rows.reduce((s,x)=>s+x.unestimated,0),maxLoad=rows.reduce((m,x)=>Math.max(m,x.load),0);
    return `<div class="v17-monthly"><div class="v17-monthly-head"><div><span>${tr('MONTHLY RESOURCE PLAN','PLAN MENSUEL DES RESSOURCES')}</span><h3>${tr('Capacity vs. project need','Capacité vs besoin projet')}</h3><p>${tr('Estimated task effort is spread across the remaining working days between the task start date and forecast due date. Current-month capacity is prorated for remaining working days.','L’effort estimé des tâches est réparti sur les jours ouvrables restants entre la date de début et l’échéance prévue. La capacité du mois courant est ajustée selon les jours ouvrables restants.')}</p></div><div class="v17-horizon"><button class="${mode==='6'?'active':''}" data-v17-horizon="6">6M</button><button class="${mode==='12'?'active':''}" data-v17-horizon="12">12M</button><button class="${mode==='project'?'active':''}" data-v17-horizon="project">${tr('Project','Projet')}</button></div></div><div class="v17-summary"><div><span>${tr('Capacity in horizon','Capacité horizon')}</span><b>${fmt(totalCap)}</b></div><div><span>${tr('Estimated need','Besoin estimé')}</span><b>${fmt(totalNeed)}</b></div><div><span>${tr('Highest monthly load','Charge mensuelle max')}</span><b>${Math.round(maxLoad)}%</b></div><div><span>${tr('Unestimated tasks due','Tâches dues non estimées')}</span><b>${unest}</b></div></div>${unest?`<div class="notice warning v17-warning"><b>${tr('Demand is understated.','Le besoin est sous-estimé.')}</b> ${tr('Tasks without estimated hours cannot be converted into monthly resource need. Estimate them in Execution or from the person drill-down.','Les tâches sans heures estimées ne peuvent pas être converties en besoin mensuel. Estimez-les dans Exécution ou depuis le détail par personne.')}</div>`:''}<div class="card v17-panel"><div class="v17-panel-head"><h3>${tr('Total program capacity vs need by month','Capacité totale du programme vs besoin par mois')}</h3><span>${tr('Normal allocation compared with scheduled remaining task effort','Allocation normale comparée à l’effort restant planifié')}</span></div>${chartHtml(rows)}${totalTable(rows)}</div><div class="card v17-panel"><div class="v17-panel-head"><h3>${tr('Drill down by person','Détail par personne')}</h3><span>${tr('Click a person to see monthly capacity, need and the tasks creating the demand','Cliquez une personne pour voir la capacité, le besoin et les tâches qui créent la demande')}</span></div>${peopleTable(keys)}</div></div>`;
  }
  function personDrill(id,mode){
    const p=people().find(x=>x.id===id);if(!p)return;const keys=monthsFor(mode),rows=keys.map(k=>({k,...personMonth(p,k,keys)}));const own=tasks().filter(t=>t.owner===p.name&&isOpen(t));
    const taskRows=own.map(t=>{const alloc=allocationForTask(t,keys),parts=keys.filter(k=>alloc[k]>0).map(k=>`${label(k)} ${fmt(alloc[k])}`).join(' · ');return {t,parts}});
    const m=modal(`${p.name} — ${tr('monthly capacity','capacité mensuelle')}`,`<div class="v17-person-modal"><div class="v17-person-summary"><div><span>${tr('Normal allocation','Allocation normale')}</span><b>${Number(p.capacityPct)||0}% · ${fmt(HPM*(Number(p.capacityPct)||0)/100)}/${tr('month','mois')}</b></div><div><span>${tr('Peak allocation','Allocation pointe')}</span><b>${Number(p.peakCapacityPct)||0}% · ${fmt(HPM*(Number(p.peakCapacityPct)||0)/100)}/${tr('month','mois')}</b></div><div><span>${tr('BAU relief','Dégagement BAU')}</span><b>${p.bauReliefPct?`${e(p.bauReliefPct)}%`:tr('Not confirmed','Non confirmé')}</b></div></div>${chartHtml(rows)}${totalTable(rows)}<div class="section-title"><h2>${tr('Open task contribution','Contribution des tâches ouvertes')}</h2><span>${tr('Click a task to edit its estimate or dates','Cliquez une tâche pour modifier son estimation ou ses dates')}</span></div><div class="v17-table-wrap"><table class="v17-table"><thead><tr><th>${tr('Task','Tâche')}</th><th>${tr('Dates','Dates')}</th><th>${tr('Estimate','Estimation')}</th><th>${tr('Progress','Avancement')}</th><th>${tr('Remaining','Restant')}</th><th>${tr('Monthly allocation','Répartition mensuelle')}</th></tr></thead><tbody>${taskRows.map(x=>`<tr data-v17-task="${e(x.t.id)}"><td><b>${e(x.t.title)}</b><small>${e(x.t.id)}</small></td><td>${e(x.t.start||'—')} → ${e(x.t.forecastDue||x.t.due||'—')}</td><td>${Number(x.t.estimatedHours)>0?fmt(Number(x.t.estimatedHours)):`<span class="v17-missing">${tr('Missing','Manquante')}</span>`}</td><td>${Math.round(progress(x.t))}%</td><td>${Number(x.t.estimatedHours)>0?fmt(remaining(x.t)):'—'}</td><td>${e(x.parts||'—')}</td></tr>`).join('')}</tbody></table></div></div>`);
    m.classList.add('v17-modal');
    m.querySelectorAll('[data-v17-task]').forEach(r=>r.onclick=()=>{const tid=r.dataset.v17Task;m.remove();editTask(tid)});
  }
  function decorate(){
    const cap=document.querySelector('.v16-capacity-section');if(!cap||cap.querySelector('.v17-monthly'))return;
    const mode=localStorage.getItem(STORE)||'12';cap.insertAdjacentHTML('beforeend',monthlySection(mode));
    cap.querySelectorAll('[data-v17-horizon]').forEach(b=>b.onclick=()=>{localStorage.setItem(STORE,b.dataset.v17Horizon);render()});
    cap.querySelectorAll('[data-v17-drill]').forEach(b=>b.onclick=e2=>{e2.stopPropagation();personDrill(b.dataset.v17Drill,mode)});
    cap.querySelectorAll('[data-v17-person]').forEach(r=>r.ondblclick=()=>personDrill(r.dataset.v17Person,mode));
  }

  const baseRender=render;
  render=function(){baseRender();if(view==='cockpit')decorate()};
  try{if(view==='cockpit')decorate()}catch(err){console.warn('[V17] monthly capacity',err)}
  window.D365_MONTHLY_CAPACITY={monthsFor,allocationForTask,personMonth,totalMonths};
})();