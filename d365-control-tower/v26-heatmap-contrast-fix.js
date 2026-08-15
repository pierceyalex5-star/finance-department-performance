(function(){
  'use strict';
  const fr=()=>document.documentElement.lang==='fr';
  const tr=(en,frText)=>fr()?frText:en;
  const e=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const streams=()=>typeof allStreams==='function'?allStreams():[];
  const pct=(a,b)=>b?Math.round(100*a/b):null;
  const tone=n=>!Number.isFinite(n)?'na':n>=80?'good':n>=50?'watch':'risk';
  const label=(value,score,detail='')=>`<td class="${tone(score)}"><b>${e(value)}</b>${detail?`<small>${e(detail)}</small>`:''}</td>`;

  function metricRows(){
    const fn=window.D365_V23?.metricsFor;if(typeof fn!=='function')return [];
    return streams().map(s=>fn(s)).filter(Boolean);
  }
  function row(m){
    const sign=m.wsTotal?pct(m.signed,m.wsTotal):null;
    return `<tr data-v26-stream="${e(m.id)}"><td><b>${e(m.id)} · ${e(m.name||'')}</b><small>${e(m.bpo||tr('BPO TBD','BPO à déterminer'))}</small></td>${label(m.subTotal?`${m.subDone}/${m.subTotal}`:'—',m.asis,tr('validated maps','cartos validées'))}${label(m.reqTotal?`${m.reqApproved}/${m.reqTotal}`:'—',m.requirements,tr('approved','approuvées'))}${label(m.reqTotal?`${m.classified}/${m.reqTotal}`:'—',m.fitgap,tr('classified','classifiées'))}${label(m.wsTotal?`${Math.round(m.design||0)}%`:'—',m.design,tr('L2 maturity','maturité L2'))}${label(m.taskTotal?`${Math.round(m.execution||0)}%`:'—',m.execution,`${m.taskTotal} ${tr('tasks','tâches')}`)}${label(m.testTotal?`${m.passed}/${m.testTotal}`:'—',m.testing,tr('passed','réussis'))}${label(m.dataTotal?`${Math.round(m.dataReady||0)}%`:'—',m.dataReady,`${m.dataTotal} ${tr('objects','objets')}`)}${label(m.wsTotal?`${m.signed}/${m.wsTotal}`:'—',sign,tr('signed off','approuvés'))}</tr>`;
  }
  function heatmapHtml(){
    const ms=metricRows();
    if(!ms.length)return '';
    const vals=ms.flatMap(m=>[m.asis,m.requirements,m.fitgap,m.design,m.execution,m.testing,m.dataReady,m.wsTotal?pct(m.signed,m.wsTotal):null]).filter(Number.isFinite);
    const overall=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;
    return `<div class="card v23-heatmap-shell v25-heatmap v26-heatmap"><div class="v23-heatmap-head"><div><h3>${e(tr('Program Readiness Heatmap','Carte thermique de préparation du programme'))}</h3><p>${e(tr('Evidence-driven readiness across process, requirements, fit/gap, design, execution, testing and data. Click a value stream to drill down.','Préparation fondée sur les preuves : processus, exigences, fit/gap, conception, exécution, tests et données. Cliquez une chaîne pour forer.'))}</p></div><div class="v23-heatmap-legend"><span class="v23-legend"><i class="good"></i>80–100%</span><span class="v23-legend"><i class="watch"></i>50–79%</span><span class="v23-legend"><i class="risk"></i>&lt;50%</span><span class="v23-legend"><i class="na"></i>${e(tr('No evidence','Sans preuve'))}</span></div></div><div class="v26-heat-summary"><span>${e(tr('Derived readiness','Préparation dérivée'))}</span><b>${overall===null?'—':overall+'%'}</b></div><div class="v23-heatmap-scroll"><table class="v23-heatmap"><thead><tr><th>${e(tr('Value stream','Chaîne de valeur'))}</th><th>As-Is</th><th>${e(tr('Requirements','Exigences'))}</th><th>Fit/Gap</th><th>${e(tr('Design','Conception'))}</th><th>${e(tr('Execution','Exécution'))}</th><th>${e(tr('Testing','Tests'))}</th><th>${e(tr('Data','Données'))}</th><th>${e(tr('L2 sign-off','Approbation L2'))}</th></tr></thead><tbody>${ms.map(row).join('')}</tbody></table></div></div>`;
  }
  function repair(){
    let v;try{v=view}catch(_){v=''}
    if(v!=='cockpit')return;
    const slot=document.querySelector('.v25-heat-slot');if(!slot)return;
    const existing=slot.querySelector('.v23-heatmap-shell');
    if(existing&&existing.querySelector('tbody tr'))return;
    const html=heatmapHtml();if(!html)return;
    slot.innerHTML=html;
    slot.querySelectorAll('[data-v26-stream]').forEach(r=>r.addEventListener('click',()=>{const id=r.dataset.v26Stream;try{if(typeof openStream==='function'){openStream(id);return}}catch(_){ }try{selectedStream=id;view='streams';render()}catch(_){ }}));
  }
  const base=render;
  render=function(){const out=base.apply(this,arguments);setTimeout(repair,0);return out};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(repair,50));else setTimeout(repair,50);
  window.D365_V26={repair};
})();
