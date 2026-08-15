(()=>{
const app=document.getElementById('app'),title=document.getElementById('viewTitle');if(!app||!title)return;
const today=()=>new Date().toISOString().slice(0,10);
const monthEnd=m=>{const [y,mo]=String(m||'').split('-').map(Number);if(!y||!mo)return today();return new Date(Date.UTC(y,mo,0)).toISOString().slice(0,10)};
function currentWindow(){const oldMonth=document.getElementById('v6Month')?.value||'2026-08';const end=localStorage.getItem('fiCostCompareEndDate')||monthEnd(oldMonth);const start=localStorage.getItem('fiCostCompareStartDate')||`${end.slice(0,4)}-01-01`;const rule=localStorage.getItem('fiCostObsRule')||'NEAREST';return {start,end,rule}}
function syncPeers(k,v){const ids=k==='start'?['v10Start','v20Start','v19Start']:k==='end'?['v10End','v20End','v19End']:['v10ObsRule','v20Rule','v19Rule'];for(const id of ids){const el=document.getElementById(id);if(el&&el.value!==v){el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}))}}}
function kick(){const model=document.getElementById('v6Model');if(model){model.dataset.v10sig='';model.dataset.v21window=Date.now().toString()}const n=document.createElement('i');n.hidden=true;n.className='v21-kick';app.appendChild(n);requestAnimationFrame(()=>n.remove())}
function bind(win){const s=win.querySelector('#v21Start'),e=win.querySelector('#v21End'),r=win.querySelector('#v21Rule');
 s?.addEventListener('change',ev=>{let v=ev.target.value;if(e&&e.value<v){e.value=v;localStorage.setItem('fiCostCompareEndDate',v);syncPeers('end',v)}localStorage.setItem('fiCostCompareStartDate',v);if(e)e.min=v;syncPeers('start',v);kick()});
 e?.addEventListener('change',ev=>{let v=ev.target.value;if(s&&s.value>v){s.value=v;localStorage.setItem('fiCostCompareStartDate',v);syncPeers('start',v)}localStorage.setItem('fiCostCompareEndDate',v);if(s)s.max=v;const m=document.getElementById('v6Month');if(m)m.value=v.slice(0,7);syncPeers('end',v);kick()});
 r?.addEventListener('change',ev=>{localStorage.setItem('fiCostObsRule',ev.target.value);syncPeers('rule',ev.target.value);kick()});
}
function ensure(){if(!title.textContent.includes('Imports & Trade'))return;const layer=app.querySelector('.v6-trade-layer');if(!layer)return;
 document.getElementById('v19CompareTop')?.remove();
 const oldMonth=document.getElementById('v6Month');if(oldMonth?.closest('label'))oldMonth.closest('label').classList.add('v21-hide-month');
 const fh=layer.querySelector('.v6-factor-head span');if(fh)fh.textContent='Unchecked = hold that driver at the selected starting-date level.';
 const hp=layer.querySelector('.v6-head p');if(hp)hp.textContent='Choose a start date and end date, then isolate the material, FX, tariff, freight and conversion movements you want to explain.';
 let win=layer.querySelector('.v21-date-window');const w=currentWindow();
 if(!win){win=document.createElement('div');win.className='v21-date-window';win.innerHTML=`<div class="v21-window-title"><strong>Comparison window</strong><span>The selected Start date is the 100.0 baseline. Each driver uses the closest source observation, or the latest observation on/before the date if selected.</span></div><label><span>Start date</span><input id="v21Start" type="date" min="2019-01-01" max="${w.end}" value="${w.start}"></label><div class="v21-arrow">→</div><label><span>End date</span><input id="v21End" type="date" min="${w.start}" max="${today()}" value="${w.end}"></label><label><span>Observation rule</span><select id="v21Rule"><option value="NEAREST" ${w.rule==='NEAREST'?'selected':''}>Closest available</option><option value="PRIOR" ${w.rule==='PRIOR'?'selected':''}>On or before date</option></select></label><div class="v21-base"><b>START = 100</b><small>Prior-year comparison of the selected End date is shown below the bridge.</small></div>`;layer.querySelector('.v6-head')?.insertAdjacentElement('afterend',win);bind(win);localStorage.setItem('fiCostCompareStartDate',w.start);localStorage.setItem('fiCostCompareEndDate',w.end);localStorage.setItem('fiCostObsRule',w.rule);kick()}else{
   const s=win.querySelector('#v21Start'),e=win.querySelector('#v21End'),r=win.querySelector('#v21Rule');if(s&&document.activeElement!==s)s.value=w.start;if(e&&document.activeElement!==e)e.value=w.end;if(r&&document.activeElement!==r)r.value=w.rule;
 }
 const controls=layer.querySelector('.v6-controls');if(controls)controls.classList.add('v21-controls');
}
let timer;function schedule(){clearTimeout(timer);timer=setTimeout(ensure,35)}
new MutationObserver(schedule).observe(app,{childList:true,subtree:true});new MutationObserver(schedule).observe(title,{childList:true,subtree:true,characterData:true});
window.addEventListener('pageshow',schedule);schedule();
})();