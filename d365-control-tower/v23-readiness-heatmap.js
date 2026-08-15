(function(){
  'use strict';

  const fr=()=>document.documentElement.lang==='fr';
  const tr=(en,frText)=>fr()?frText:en;
  const escHtml=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const getData=()=>typeof data==='function'?data():{};
  const completed=new Set(['Approved','Validated','Complete','Completed','Closed','Passed','Signed off','Ready']);
  const workshopWeight={'Not discussed':0,'Discussed':15,'Decision required':25,'Designed':50,'Configured':70,'Tested':85,'Signed off':100};

  function allProjectStreams(){
    try{if(typeof allStreams==='function')return allStreams()}catch(_){ }
    const d=getData();return [...(d.valueStreams||[]),...(d.crossFunctional||[])];
  }
  function statusDone(x){return completed.has(String(x||''))}
  function progressOf(t){
    try{if(typeof taskProgress==='function')return Math.max(0,Math.min(100,Number(taskProgress(t))||0))}catch(_){ }
    return Math.max(0,Math.min(100,Number(t.progress)||0));
  }
  function pct(a,b){return b?Math.round(100*a/b):null}
  function avg(xs){const n=xs.filter(Number.isFinite);return n.length?Math.round(n.reduce((a,b)=>a+b,0)/n.length):null}
  function tone(score){return score===null?'na':score>=80?'good':score>=50?'watch':'risk'}
  function cell(label,score,detail=''){
    const cls=tone(score);return `<td class="${cls}"><b>${escHtml(label)}</b>${detail?`<small>${escHtml(detail)}</small>`:''}</td>`;
  }

  function metricsFor(stream){
    const d=getData(),id=stream.id;
    const subs=(d.subprocesses?.[id]||state.processes?.subprocesses?.[id]||[]);
    const subDone=subs.filter(x=>statusDone(x.status)).length;
    const asis=subs.length?pct(subDone,subs.length):null;

    const findings=[...(d.painPoints||[]),...(d.opportunities||[])].filter(x=>x.stream===id);
    const req=(d.requirements||[]).filter(x=>x.stream===id);
    const reqApproved=req.filter(x=>statusDone(x.status)).length;
    const requirements=req.length?pct(reqApproved,req.length):(findings.length?0:null);
    const classified=req.filter(x=>x.fitGap&& !['TBD','Pending',''].includes(String(x.fitGap))).length;
    const fitgap=req.length?pct(classified,req.length):null;

    const ws=(state.registers?.workshopReadiness||[]).filter(x=>x.stream===id);
    const design=ws.length?avg(ws.map(x=>workshopWeight[x.status]??0)):null;
    const signed=ws.filter(x=>x.status==='Signed off').length;

    const tasks=(d.tasks||[]).filter(x=>(x.stream||x.l1)===id);
    const execution=tasks.length?avg(tasks.map(progressOf)):null;

    const tests=(state.registers?.testScenarios||[]).filter(x=>x.stream===id);
    const passed=tests.filter(x=>['Passed','Approved','Complete'].includes(x.status)).length;
    const testing=tests.length?pct(passed,tests.length):null;

    const objs=(d.dataObjects||[]).filter(x=>x.stream===id||x.stream==='ALL');
    const objectScores=objs.map(x=>{
      let s=0,n=0;
      [['mappingStatus',['Validated','Complete']],['cleansingStatus',['Validated','Complete']],['migrationStatus',['Tested','Validated','Complete']]].forEach(([k,ok])=>{if(x[k]!==undefined&&x[k]!==null&&x[k]!==''){n++;if(ok.includes(x[k]))s++}});
      if(x.cutoverReady!==undefined&&x.cutoverReady!==null&&x.cutoverReady!==''){n++;if(x.cutoverReady===true||x.cutoverReady==='Yes'||x.cutoverReady==='Ready')s++}
      return n?100*s/n:null;
    });
    const dataReady=avg(objectScores);

    return {id,name:stream.name||id,bpo:stream.bpo||'',asis,subDone,subTotal:subs.length,requirements,reqApproved,reqTotal:req.length,fitgap,classified,design,signed,wsTotal:ws.length,execution,taskTotal:tasks.length,testing,passed,testTotal:tests.length,dataReady,dataTotal:objs.length};
  }

  function row(m){
    const reqLabel=m.reqTotal?`${m.reqApproved}/${m.reqTotal}`:'—';
    const fitLabel=m.reqTotal?`${m.classified}/${m.reqTotal}`:'—';
    return `<tr data-v23-stream="${escHtml(m.id)}">
      <td><b>${escHtml(m.id)} · ${escHtml(m.name)}</b><small>${escHtml(m.bpo||tr('BPO TBD','BPO à déterminer'))}</small></td>
      ${cell(m.subTotal?`${m.subDone}/${m.subTotal}`:'—',m.asis,tr('validated maps','cartos validées'))}
      ${cell(reqLabel,m.requirements,tr('requirements approved','exigences approuvées'))}
      ${cell(fitLabel,m.fitgap,tr('classified','classifiées'))}
      ${cell(m.wsTotal?`${Math.round(m.design||0)}%`:'—',m.design,tr('L2 design maturity','maturité conception L2'))}
      ${cell(m.taskTotal?`${Math.round(m.execution||0)}%`:'—',m.execution,`${m.taskTotal} ${tr('tasks','tâches')}`)}
      ${cell(m.testTotal?`${m.passed}/${m.testTotal}`:'—',m.testing,tr('tests passed','tests réussis'))}
      ${cell(m.dataTotal?`${Math.round(m.dataReady||0)}%`:'—',m.dataReady,`${m.dataTotal} ${tr('objects','objets')}`)}
      ${cell(m.wsTotal?`${m.signed}/${m.wsTotal}`:'—',m.wsTotal?pct(m.signed,m.wsTotal):null,tr('L2 signed off','L2 approuvés'))}
    </tr>`;
  }

  function enhancedHeatmap(){
    const ms=allProjectStreams().map(metricsFor);
    const scores=ms.flatMap(m=>[m.asis,m.requirements,m.fitgap,m.design,m.execution,m.testing,m.dataReady,m.wsTotal?pct(m.signed,m.wsTotal):null]).filter(Number.isFinite);
    const overall=avg(scores);
    const atRisk=ms.filter(m=>[m.asis,m.requirements,m.fitgap,m.design,m.execution,m.testing,m.dataReady].some(x=>Number.isFinite(x)&&x<50)).length;
    const signed=ms.reduce((s,m)=>s+m.signed,0),wsTotal=ms.reduce((s,m)=>s+m.wsTotal,0);
    const passed=ms.reduce((s,m)=>s+m.passed,0),testTotal=ms.reduce((s,m)=>s+m.testTotal,0);
    return `<div class="card v23-heatmap-shell">
      <div class="v23-heatmap-head"><div><h3>${tr('Program readiness heatmap','Carte thermique de préparation du programme')}</h3><p>${tr('Derived from the existing process, requirement, fit/gap, workshop, task, testing and data registers. Click a stream to drill down.','Dérivée des registres existants de processus, exigences, fit/gap, ateliers, tâches, tests et données. Cliquez une chaîne pour forer.')}</p></div><div class="v23-heatmap-legend"><span class="v23-legend"><i class="good"></i>80–100%</span><span class="v23-legend"><i class="watch"></i>50–79%</span><span class="v23-legend"><i class="risk"></i>&lt;50%</span><span class="v23-legend"><i class="na"></i>${tr('No evidence','Sans preuve')}</span></div></div>
      <div class="v23-heatmap-summary"><div><span>${tr('Derived readiness','Préparation dérivée')}</span><b>${overall===null?'—':overall+'%'}</b></div><div><span>${tr('Streams with a red dimension','Chaînes avec dimension rouge')}</span><b>${atRisk}</b></div><div><span>${tr('L2 signed off','L2 approuvés')}</span><b>${signed}/${wsTotal||0}</b></div><div><span>${tr('Tests passed','Tests réussis')}</span><b>${passed}/${testTotal||0}</b></div></div>
      <div class="v23-heatmap-scroll"><table class="v23-heatmap"><thead><tr><th>${tr('Value stream','Chaîne de valeur')}</th><th>As-Is</th><th>${tr('Requirements','Exigences')}</th><th>Fit/Gap</th><th>${tr('Design','Conception')}</th><th>${tr('Execution','Exécution')}</th><th>${tr('Testing','Tests')}</th><th>${tr('Data','Données')}</th><th>${tr('L2 sign-off','Approbation L2')}</th></tr></thead><tbody>${ms.map(row).join('')}</tbody></table></div>
    </div>`;
  }

  function applyHeatmap(){
    if(typeof view!=='undefined'&&view!=='cockpit')return;
    const heading=[...document.querySelectorAll('.section-title h2')].find(x=>/Transformation heatmap|Carte thermique/i.test(x.textContent||''));
    if(!heading)return;
    const section=heading.closest('.section-title');
    if(section){heading.textContent=tr('Transformation readiness','Préparation de la transformation');const note=section.querySelector('span');if(note)note.textContent=tr('evidence-driven heatmap','carte thermique fondée sur les preuves')}
    const old=section?.nextElementSibling;
    if(!old)return;
    const wrap=document.createElement('div');wrap.innerHTML=enhancedHeatmap();const next=wrap.firstElementChild;old.replaceWith(next);
    next.querySelectorAll('[data-v23-stream]').forEach(r=>r.addEventListener('click',()=>{
      const id=r.dataset.v23Stream;
      try{if(typeof openStream==='function'){openStream(id);return}}catch(_){ }
      try{selectedStream=id;view='streams';render()}catch(_){ }
    }));
  }

  function install(){
    document.body.classList.add('v23-option6');
    if(typeof render==='function'){
      const base=render;
      window.render=function(){const out=base.apply(this,arguments);try{applyHeatmap()}catch(err){console.warn('V23 heatmap enhancement skipped',err)}return out};
      try{applyHeatmap()}catch(_){ }
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  window.D365_V23={metricsFor,applyHeatmap};
})();
