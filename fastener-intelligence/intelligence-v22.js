(()=>{
const app=document.getElementById('app'),title=document.getElementById('viewTitle');
if(!app||!title)return;
const today=()=>new Date().toISOString().slice(0,10);
const monthEnd=m=>{const [y,mo]=String(m||'').split('-').map(Number);if(!y||!mo)return today();return new Date(Date.UTC(y,mo,0)).toISOString().slice(0,10)};
const validDate=s=>/^20\d\d-\d\d-\d\d$/.test(String(s||''))&&!Number.isNaN(Date.parse(String(s)+'T00:00:00Z'));
function windowState(){
  const oldMonth=document.getElementById('v6Month')?.value||'2026-08';
  let end=localStorage.getItem('fiCostCompareEndDate');
  if(!validDate(end))end=monthEnd(oldMonth);
  let start=localStorage.getItem('fiCostCompareStartDate');
  if(!validDate(start)){const legacy=localStorage.getItem('fiCostCompareStart');start=legacy&&/^20\d\d-\d\d/.test(legacy)?legacy.slice(0,7)+'-01':end.slice(0,4)+'-01-01'}
  if(start>end)start=end;
  const rule=localStorage.getItem('fiCostObsRule')==='PRIOR'?'PRIOR':'NEAREST';
  localStorage.setItem('fiCostCompareStartDate',start);localStorage.setItem('fiCostCompareEndDate',end);localStorage.setItem('fiCostObsRule',rule);
  return {start,end,rule};
}
function kick(){const box=document.getElementById('v6Model');if(box){box.dataset.v10sig='';box.innerHTML='<div class="v22-loading">Recalculating start/end bridge…</div>'}const n=document.createElement('i');n.hidden=true;n.className='v22-kick';app.appendChild(n);requestAnimationFrame(()=>n.remove())}
function replaceNode(id){const old=document.getElementById(id);if(!old||old.dataset.v22clean)return old;const n=old.cloneNode(true);n.dataset.v22clean='1';old.replaceWith(n);return n}
function cleanLegacyHandlers(layer){
  ['v6Route','v6Fx','v6Material','v6Freight'].forEach(replaceNode);
  const factors=layer.querySelector('.v6-factors');if(factors&&!factors.dataset.v22clean){const n=factors.cloneNode(true);n.dataset.v22clean='1';factors.replaceWith(n)}
  const head=layer.querySelector('.v6-factor-head');if(head&&!head.dataset.v22clean){const n=head.cloneNode(true);n.dataset.v22clean='1';head.replaceWith(n)}
}
function setRouteDefaults(){const route=document.getElementById('v6Route'),fx=document.getElementById('v6Fx'),freight=document.getElementById('v6Freight');if(!route)return;if(route.value==='MFG_CA'){if(fx)fx.value='NONE';if(freight)freight.value='TRUCK'}else if(route.value==='IMPORT_TWD'){if(fx)fx.value='TWD';if(freight&&freight.value==='TRUCK')freight.value='COMPOSITE'}else if(route.value==='IMPORT_USD'){if(fx)fx.value='USD';if(freight&&freight.value==='TRUCK')freight.value='COMPOSITE'}}
function bindControls(layer){
  layer.querySelectorAll('#v6Route,#v6Fx,#v6Material,#v6Freight').forEach(el=>{if(el.dataset.v22bound)return;el.dataset.v22bound='1';el.addEventListener('change',()=>{if(el.id==='v6Route')setRouteDefaults();kick()})});
  layer.querySelectorAll('[data-factor]').forEach(el=>{if(el.dataset.v22bound)return;el.dataset.v22bound='1';el.addEventListener('change',kick)});
  layer.querySelectorAll('[data-solo]').forEach(b=>{if(b.dataset.v22bound)return;b.dataset.v22bound='1';b.addEventListener('click',e=>{e.preventDefault();const key=b.dataset.solo;layer.querySelectorAll('[data-factor]').forEach(x=>x.checked=x.dataset.factor===key);kick()})});
  const all=layer.querySelector('#v6All'),none=layer.querySelector('#v6None');if(all&&!all.dataset.v22bound){all.dataset.v22bound='1';all.addEventListener('click',e=>{e.preventDefault();layer.querySelectorAll('[data-factor]').forEach(x=>x.checked=true);kick()})}if(none&&!none.dataset.v22bound){none.dataset.v22bound='1';none.addEventListener('click',e=>{e.preventDefault();layer.querySelectorAll('[data-factor]').forEach(x=>x.checked=false);kick()})}
}
function dateWindow(layer){const w=windowState();let win=layer.querySelector('.v22-date-window');if(!win){win=document.createElement('div');win.className='v22-date-window';win.innerHTML=`<div class="v22-date-copy"><strong>Comparison window</strong><span>Start date is the 100.0 baseline. Source observations use the selected rule; exact dates and raw values reconcile in the audit trail below.</span></div><label><span>Start date</span><input id="v22Start" type="date" min="2019-01-01" max="${w.end}" value="${w.start}"></label><div class="v22-arrow">→</div><label><span>End date</span><input id="v22End" type="date" min="${w.start}" max="${today()}" value="${w.end}"></label><label><span>Observation rule</span><select id="v22Rule"><option value="NEAREST" ${w.rule==='NEAREST'?'selected':''}>Closest available</option><option value="PRIOR" ${w.rule==='PRIOR'?'selected':''}>On or before date</option></select></label><div class="v22-base"><b>START = 100</b><small>Same-date prior-year comparison appears below the bridge.</small></div>`;layer.querySelector('.v6-head')?.insertAdjacentElement('afterend',win)}
  const s=win.querySelector('#v22Start'),e=win.querySelector('#v22End'),r=win.querySelector('#v22Rule');
  if(!s.dataset.v22bound){s.dataset.v22bound='1';s.addEventListener('change',()=>{if(e.value<s.value)e.value=s.value;e.min=s.value;localStorage.setItem('fiCostCompareStartDate',s.value);localStorage.setItem('fiCostCompareEndDate',e.value);kick()})}
  if(!e.dataset.v22bound){e.dataset.v22bound='1';e.addEventListener('change',()=>{if(s.value>e.value)s.value=e.value;s.max=e.value;localStorage.setItem('fiCostCompareStartDate',s.value);localStorage.setItem('fiCostCompareEndDate',e.value);const m=document.getElementById('v6Month');if(m)m.value=e.value.slice(0,7);kick()})}
  if(!r.dataset.v22bound){r.dataset.v22bound='1';r.addEventListener('change',()=>{localStorage.setItem('fiCostObsRule',r.value);kick()})}
}
function stabilize(){if(!title.textContent.includes('Imports & Trade'))return;const layer=app.querySelector('.v6-trade-layer');if(!layer)return;
  document.getElementById('v19CompareTop')?.remove();layer.querySelectorAll('.v20-date-window,.v21-date-window').forEach(x=>x.remove());
  const month=document.getElementById('v6Month');if(month?.closest('label'))month.closest('label').style.display='none';
  const p=layer.querySelector('.v6-head p');if(p)p.textContent='Compare any two dates, then isolate material, FX, tariff, freight and conversion movements.';
  const hint=layer.querySelector('.v6-factor-head span');if(hint)hint.textContent='Unchecked = hold that driver at the selected starting-date level.';
  cleanLegacyHandlers(layer);dateWindow(layer);bindControls(layer);
  if(!layer.dataset.v22started){layer.dataset.v22started='1';kick()}
}
let timer;function schedule(){clearTimeout(timer);timer=setTimeout(stabilize,45)}
new MutationObserver(schedule).observe(app,{childList:true,subtree:true});new MutationObserver(schedule).observe(title,{childList:true,subtree:true,characterData:true});window.addEventListener('pageshow',schedule);schedule();
})();