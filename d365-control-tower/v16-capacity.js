(function(){
  'use strict';

  const VERSION='2026-08-capacity-v1';
  const HPM=160;
  const PLAN={
    M2O:{normal:45,peak:70,sensitive:false},
    O2C:{normal:50,peak:80,sensitive:false},
    F2P:{normal:55,peak:80,sensitive:true},
    P2P:{normal:60,peak:100,sensitive:true},
    S2P:{normal:45,peak:70,sensitive:false},
    W2D:{normal:45,peak:80,sensitive:false},
    R2R:{normal:55,peak:100,sensitive:true},
    MDM:{normal:45,peak:80,sensitive:true},
    QM:{normal:35,peak:70,sensitive:false}
  };
  const SME_GUIDANCE=[
    ['General SME retained on team','5–10%'],
    ['Current state / requirements','10–20%'],
    ['Detailed design','20–30%'],
    ['Critical L2 configuration / testing','30–50%'],
    ['UAT super-user / process expert','40–60%'],
    ['Critical cutover SME','50–100%']
  ];
  const CLOSED=['Approved','Closed'];
  const fr=()=>document.documentElement.lang==='fr';
  const tr=(en,frText)=>fr()?frText:en;
  const e=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const d=()=>typeof data==='function'?data():{};
  const todayIso=()=>typeof today==='function'?today():new Date().toISOString().slice(0,10);

  function isBpo(p){return String(p?.role||'').toLowerCase().includes('bpo')}
  function applyRecommendedPlan(){
    const ps=state.framework?.people||[];
    ps.forEach(p=>{
      if(!isBpo(p)||!PLAN[p.stream])return;
      if(p.capacityPlanVersion===VERSION)return;
      p.capacityPct=PLAN[p.stream].normal;
      p.peakCapacityPct=PLAN[p.stream].peak;
      p.capacityPlanVersion=VERSION;
      p.capacityBasis='Recommended normal project allocation; peak is a temporary planning ceiling for heavy design/UAT/cutover periods.';
    });
  }

  function taskPct(t){
    if(typeof taskProgress==='function')return Math.max(0,Math.min(100,Number(taskProgress(t))||0));
    return Math.max(0,Math.min(100,Number(t.progress)||0));
  }
  function daysUntil(x){if(!x)return null;const a=new Date(todayIso()+'T00:00:00'),b=new Date(x+'T00:00:00');return Math.floor((b-a)/86400000)}
  function personCapacity(p){
    const tasks=(d().tasks||[]).filter(t=>t.owner===p.name&&!CLOSED.includes(t.status));
    const horizon=tasks.filter(t=>{const due=t.forecastDue||t.due,n=daysUntil(due);return n!==null&&n<=30});
    let demand=0,estimated=0,unestimated=0;
    horizon.forEach(t=>{
      const h=Number(t.estimatedHours)||0;
      if(h>0){estimated++;demand+=h*(1-taskPct(t)/100)}else unestimated++;
    });
    demand=Math.round(demand*10)/10;
    const alloc=Number(p.capacityPct)||0,peak=Number(p.peakCapacityPct)||0,available=Math.round(HPM*alloc/100),peakHours=Math.round(HPM*peak/100);
    const load=available?Math.round(1000*demand/available)/10:0;
    const miss=horizon.length?unestimated/horizon.length:0;
    let status='Available',tone='ok';
    if(!alloc){status='No allocation';tone='muted'}
    else if(load>100){status='Over capacity';tone='bad'}
    else if(miss>0.20){status='Needs estimates';tone='warn'}
    else if(load>85){status='Tight';tone='warn'}
    else if(horizon.length){status='Within capacity';tone='ok'}
    return {tasks,horizon,demand,estimated,unestimated,available,peakHours,load,missingRatio:miss,status,tone};
  }

  function capacityRows(filterBpo){
    return (d().people||[]).filter(p=>filterBpo?isBpo(p):!isBpo(p)).map(p=>({p,c:personCapacity(p)}));
  }
  function toneLabel(c){const labels={ok:tr('Within capacity','Dans la capacité'),warn:tr(c.status==='Tight'?'Tight':'Needs estimates',c.status==='Tight'?'Serré':'Estimations requises'),bad:tr('Over capacity','Surcharge'),muted:tr('No allocation','Aucune allocation')};return labels[c.tone]||c.status}
  function loadBar(c){const width=Math.min(100,Math.max(0,c.load));return `<div class="v16-loadbar"><span class="${c.tone}" style="width:${width}%"></span></div><small>${c.demand}h / ${c.available}h · ${Math.round(c.load)}%</small>`}
  function capTable(rows,kind){
    return `<div class="v16-cap-table-wrap"><table class="v16-cap-table"><thead><tr><th>${tr('Person','Personne')}</th><th>${tr('Stream','Chaîne')}</th><th>${tr('Normal','Normal')}</th><th>${tr('Peak','Pointe')}</th><th>${tr('Next-30-day demand','Demande 30 jours')}</th><th>${tr('Unestimated','Non estimées')}</th><th>${tr('Capacity status','Statut capacité')}</th></tr></thead><tbody>${rows.map(({p,c})=>`<tr data-v16-person="${e(p.id)}"><td><b>${e(p.name)}</b><small>${e(p.role||kind)}</small></td><td><b>${e(p.stream||'—')}</b>${PLAN[p.stream]?.sensitive?`<small class="v16-sensitive">${tr('capacity-sensitive','sensible à la capacité')}</small>`:''}</td><td><b>${Number(p.capacityPct)||0}%</b><small>${c.available}h/${tr('month','mois')}</small></td><td><b>${Number(p.peakCapacityPct)||0}%</b><small>${c.peakHours||'—'}h ${tr('temporary','temporaire')}</small></td><td>${loadBar(c)}</td><td><b>${c.unestimated}</b><small>${c.horizon.length?Math.round(c.missingRatio*100):0}% ${tr('of due/overdue','des tâches échues/à venir')}</small></td><td><span class="v16-cap-status ${c.tone}">${e(toneLabel(c))}</span>${p.bauReliefPct?`<small>${tr('BAU relief','Dégagement BAU')}: ${e(p.bauReliefPct)}%</small>`:`<small class="v16-bau-missing">${tr('BAU relief not confirmed','Dégagement BAU non confirmé')}</small>`}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function smeGuidance(){return `<div class="v16-sme-guidance"><div><b>${tr('SME capacity model','Modèle de capacité SME')}</b><p>${tr('SMEs should not carry one fixed allocation for the whole program. Baseline availability stays light and increases around the L2 capabilities where their expertise is actually required.','Les SME ne devraient pas conserver une allocation fixe pendant tout le programme. La disponibilité de base reste légère et augmente autour des capacités L2 où leur expertise est réellement requise.')}</p></div><div class="v16-sme-phases">${SME_GUIDANCE.map(x=>`<span><b>${tr(x[0],({'General SME retained on team':'SME retenu dans l’équipe','Current state / requirements':'État actuel / exigences','Detailed design':'Conception détaillée','Critical L2 configuration / testing':'Configuration / tests L2 critique','UAT super-user / process expert':'Super-utilisateur UAT / expert processus','Critical cutover SME':'SME critique à la bascule'})[x[0]])}</b><small>${x[1]}</small></span>`).join('')}</div></div>`}
  function cockpitCapacityHtml(){
    const bpos=capacityRows(true),smes=capacityRows(false),over=bpos.filter(x=>x.c.load>100).length,needs=bpos.filter(x=>x.c.missingRatio>0.20).length,total=bpos.reduce((s,x)=>s+x.c.available,0),confirmed=bpos.filter(x=>Number(x.p.bauReliefPct)>0).length;
    return `<section class="v16-capacity-section"><div class="section-title v16-cap-title"><div><h2>${tr('BPO & SME capacity','Capacité BPO & SME')}</h2><span>${tr('30-day workload versus agreed project allocation','Charge 30 jours versus allocation projet convenue')}</span></div><div class="v16-cap-actions"><button class="btn" type="button" data-v16-open-people>${tr('Manage capacity','Gérer la capacité')}</button></div></div><div class="v16-cap-kpis"><div class="card"><span>${tr('BPO project capacity','Capacité projet BPO')}</span><b>${total}h</b><small>${tr('available per month at normal allocation','disponibles par mois à allocation normale')}</small></div><div class="card"><span>${tr('Over capacity','En surcharge')}</span><b>${over}</b><small>${tr('BPOs above 100% measured load','BPO au-dessus de 100% de charge mesurée')}</small></div><div class="card"><span>${tr('Estimate quality','Qualité des estimations')}</span><b>${needs}</b><small>${tr('BPOs with >20% unestimated near-term tasks','BPO avec >20% de tâches court terme non estimées')}</small></div><div class="card"><span>${tr('BAU relief confirmed','Dégagement BAU confirmé')}</span><b>${confirmed}/${bpos.length}</b><small>${tr('capacity is only real when normal work is removed/delegated','la capacité est réelle seulement si le travail normal est retiré/délégué')}</small></div></div><div class="card v16-cap-card"><div class="v16-cap-card-head"><div><h3>${tr('BPO capacity plan','Plan de capacité BPO')}</h3><p>${tr('Normal allocation is the sustained project commitment. Peak is a temporary ceiling for heavy design, UAT and cutover periods—not the everyday expectation.','L’allocation normale est l’engagement projet soutenu. La pointe est un plafond temporaire pour conception intensive, UAT et bascule—pas l’attente quotidienne.')}</p></div><div class="v16-rule"><b>${tr('Cockpit rule','Règle Cockpit')}</b><span>${tr('A BPO is not considered green when measured load exceeds capacity or more than 20% of near-term work has no effort estimate.','Un BPO n’est pas considéré vert lorsque la charge mesurée dépasse la capacité ou que plus de 20% du travail court terme n’a pas d’estimation d’effort.')}</span></div></div>${capTable(bpos,'BPO')}</div>${smes.length?`<div class="card v16-cap-card"><div class="v16-cap-card-head"><div><h3>${tr('SME capacity','Capacité SME')}</h3><p>${tr('SME allocation should flex by active L2 and implementation phase.','L’allocation SME doit varier selon le L2 actif et la phase d’implantation.')}</p></div></div>${capTable(smes,'SME')}${smeGuidance()}</div>`:`<div class="card v16-cap-card">${smeGuidance()}<div class="empty mini">${tr('No SMEs are assigned yet. Add them in People or the BPO / SMEs workspace; new SMEs default to 10% normal capacity and a 50% temporary peak until adjusted for their L2 role.','Aucun SME n’est encore assigné. Ajoutez-les dans Personnes ou l’espace BPO / SME; les nouveaux SME sont créés à 10% de capacité normale et 50% de pointe temporaire jusqu’à ajustement selon leur rôle L2.')}</div></div>`}</section>`;
  }

  const baseCockpit=renderCockpit;
  renderCockpit=function(){
    applyRecommendedPlan();
    const base=baseCockpit();
    const marker=fr()?'<div class="section-title"><h2>Transformation heatmap':'<div class="section-title"><h2>Transformation heatmap';
    const cap=cockpitCapacityHtml();
    return base.includes(marker)?base.replace(marker,cap+marker):base+cap;
  };

  const baseResp=personResponsibilities;
  personResponsibilities=function(p){return isBpo(p)?(d().bpoResponsibilities||[]):baseResp(p)};
  const basePersonCard=personCard;
  personCard=function(p){
    const rs=p.responsibilities||personResponsibilities(p),c=personCapacity(p),peak=Number(p.peakCapacityPct)||0;
    return `<div class="card person-card v16-person-card" data-edit-person="${e(p.id)}"><div class="role-tag">${e(p.role)}</div><h3>${e(p.name)}</h3><div class="role">${e(p.stream)} · ${e(allStreams().find(s=>s.id===p.stream)?.name||'')}</div><ul>${rs.slice(0,7).map(x=>`<li>${e(x)}</li>`).join('')}</ul><div class="v16-person-cap"><span><b>${Number(p.capacityPct)||0}%</b><small>${tr('normal','normal')}</small></span><span><b>${peak||'—'}${peak?'%':''}</b><small>${tr('peak','pointe')}</small></span><span><b>${Math.round(c.load)}%</b><small>${tr('30d load','charge 30j')}</small></span></div><div class="load"><span style="width:${Math.min(100,Number(p.capacityPct)||0)}%"></span></div><small>${c.available}h/${tr('month','mois')} ${tr('planned project capacity','de capacité projet planifiée')}${p.backup?` · ${tr('Backup','Relève')}: ${e(p.backup)}`:''}</small></div>`;
  };

  const baseEditPerson=editPerson;
  editPerson=function(id,stream=selectedStream){
    applyRecommendedPlan();
    const existing=(state.framework.people||[]).find(p=>p.id===id);
    baseEditPerson(id,stream);
    const m=[...document.querySelectorAll('.modal-backdrop')].at(-1),form=m?.querySelector('.form-grid');if(!m||!form)return;
    const role=form.querySelector('[name="role"]'),cap=form.querySelector('[name="capacityPct"]'),streamEl=form.querySelector('[name="stream"]');
    if(role&&![...role.options].some(o=>o.value==='Cross-functional BPO'||o.text==='Cross-functional BPO')){const o=document.createElement('option');o.value='Cross-functional BPO';o.textContent='Cross-functional BPO';if(existing?.role==='Cross-functional BPO')o.selected=true;role.appendChild(o)}
    if(!existing&&cap)cap.value='10';
    const add=(html)=>{const l=document.createElement('label');l.innerHTML=html;form.appendChild(l);return l};
    if(!form.querySelector('[name="peakCapacityPct"]'))add(`${tr('Peak project capacity %','Capacité projet de pointe %')}<input type="number" min="0" max="100" name="peakCapacityPct" value="${e(existing?.peakCapacityPct??(!existing?50:''))}">`);
    if(!form.querySelector('[name="bauReliefPct"]'))add(`${tr('BAU workload removed / delegated %','Travail BAU retiré / délégué %')}<input type="number" min="0" max="100" name="bauReliefPct" value="${e(existing?.bauReliefPct??'')}">`);
    if(!form.querySelector('[name="backup"]'))add(`${tr('Backup / delegate','Relève / délégué')}<input name="backup" value="${e(existing?.backup??'')}">`);
    if(!form.querySelector('[name="capacityNotes"]')){const l=add(`${tr('Capacity notes / phase assumptions','Notes capacité / hypothèses de phase')}<textarea name="capacityNotes" rows="3">${e(existing?.capacityNotes??'')}</textarea>`);l.className='full'}
    const note=document.createElement('div');note.className='notice full';note.innerHTML=`<b>${tr('Capacity model','Modèle de capacité')}:</b> ${tr('BPO normal allocation is sustained; peak is temporary. SME baseline is typically 5–10%, increasing to 20–30% in design, 40–60% in UAT and up to 50–100% for critical cutover SMEs.','L’allocation normale BPO est soutenue; la pointe est temporaire. La base SME est typiquement 5–10%, augmente à 20–30% en conception, 40–60% en UAT et jusqu’à 50–100% pour les SME critiques à la bascule.')}`;form.appendChild(note);
    const setFromPlan=()=>{const st=streamEl?.value,p=PLAN[st],r=role?.value||'';if(p&&String(r).toLowerCase().includes('bpo')){cap.value=p.normal;form.querySelector('[name="peakCapacityPct"]').value=p.peak}else if(r==='SME'&&!existing){cap.value=10;form.querySelector('[name="peakCapacityPct"]').value=50}};
    role?.addEventListener('change',setFromPlan);streamEl?.addEventListener('change',setFromPlan);
  };

  function bindV16(){
    document.querySelectorAll('[data-v16-person]').forEach(x=>x.onclick=()=>editPerson(x.dataset.v16Person));
    document.querySelector('[data-v16-open-people]')?.addEventListener('click',()=>{view='people';document.querySelectorAll('#mainNav [data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='people'));render()});
  }

  const baseRender=render;
  render=function(){applyRecommendedPlan();baseRender();if(view==='cockpit')bindV16()};

  window.D365_CAPACITY_MODEL={version:VERSION,plan:PLAN,smeGuidance:SME_GUIDANCE,personCapacity,applyRecommendedPlan};
})();
