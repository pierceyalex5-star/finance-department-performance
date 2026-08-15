(()=>{
const app=document.getElementById('app');
const title=document.getElementById('viewTitle');
const D=window.FI_DATA||{};
if(!app||!title)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function openSource(id){const modal=document.getElementById('sourceModal'),input=document.getElementById('sourceSearch');if(!modal||!input)return;modal.classList.add('open');modal.setAttribute('aria-hidden','false');input.value=id;input.dispatchEvent(new Event('input',{bubbles:true}));}
function bindSources(root){root.querySelectorAll('[data-v4-source]').forEach(b=>{if(b.dataset.v4bound)return;b.dataset.v4bound='1';b.addEventListener('click',e=>{e.stopPropagation();openSource(b.dataset.v4Source)})})}
function src(id,label){return `<button class="v4-src" data-v4-source="${esc(id)}">${esc(label||id)}</button>`}
function evidence(type='derived'){return `<span class="v4-tag ${type}">${type.toUpperCase()}</span>`}

function tradeMap(){
 const lanes=(D.trade||[]).map(r=>r[0]);
 return `<svg class="v4-trade-map" viewBox="0 0 900 360" role="img" aria-label="North America trade flow schematic">
 <defs><marker id="v4arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#6b91b2"/></marker></defs>
 <path d="M220 95 C330 30 505 40 600 105 C655 145 676 220 620 276 C548 326 394 322 286 267 C202 225 167 155 220 95Z" fill="#112a3d" stroke="#31536d" stroke-width="2" opacity=".9"/>
 <path d="M500 270 C560 264 618 292 620 333 L542 336 C530 317 519 294 500 270Z" fill="#112a3d" stroke="#31536d" opacity=".75"/>
 <rect class="v4-node na" x="382" y="135" rx="10" ry="10" width="150" height="64"/><text class="v4-map-label" x="457" y="160" text-anchor="middle">NORTH AMERICA</text><text class="v4-map-small" x="457" y="179" text-anchor="middle">manufacturing + distribution</text>
 <rect class="v4-node med" x="72" y="76" rx="9" width="128" height="54"/><text class="v4-map-label" x="136" y="99" text-anchor="middle">EUROPE</text><text class="v4-map-small" x="136" y="116" text-anchor="middle">freight / tariff</text>
 <rect class="v4-node high" x="700" y="77" rx="9" width="124" height="54"/><text class="v4-map-label" x="762" y="99" text-anchor="middle">CHINA</text><text class="v4-map-small" x="762" y="116" text-anchor="middle">duty / AD-CVD</text>
 <rect class="v4-node high" x="716" y="222" rx="9" width="124" height="54"/><text class="v4-map-label" x="778" y="244" text-anchor="middle">TAIWAN</text><text class="v4-map-small" x="778" y="261" text-anchor="middle">FX / duty</text>
 <rect class="v4-node med" x="366" y="286" rx="9" width="126" height="50"/><text class="v4-map-label" x="429" y="307" text-anchor="middle">MEXICO</text><text class="v4-map-small" x="429" y="323" text-anchor="middle">USMCA / origin</text>
 <path class="v4-flow med" d="M200 104 C275 111 320 129 380 158" marker-end="url(#v4arrow)"/><path class="v4-flow high" d="M700 104 C622 111 590 128 535 156" marker-end="url(#v4arrow)"/><path class="v4-flow high" d="M716 246 C637 230 590 205 532 180" marker-end="url(#v4arrow)"/><path class="v4-flow med" d="M427 286 C429 250 440 225 449 202" marker-end="url(#v4arrow)"/>
 <text class="v4-map-small" x="72" y="334">Schematic flow map · risk reflects current dashboard trade register, not shipment volume</text>
 </svg>`;
}
function riskMatrix(){
 const rows=(D.trade||[]).slice(0,5).map(r=>{
  const lane=r[0],cond=(r[1]||'').toLowerCase();
  const tariff=cond.includes('tariff')||cond.includes('duty')||cond.includes('ad-cvd')?'high':cond.includes('origin')?'med':'low';
  const fx=lane.includes('Taiwan')?'high':lane.includes('Europe')||lane.includes('Canada')?'med':'low';
  const freight=lane.includes('Taiwan')||lane.includes('China')||lane.includes('Europe')?'high':'med';
  const origin=cond.includes('origin')||cond.includes('usmca')?'high':'med';
  return `<div class="v4-risk-cell lane">${esc(lane)}</div><div class="v4-risk-cell ${tariff}">${tariff.toUpperCase()}</div><div class="v4-risk-cell ${fx}">${fx.toUpperCase()}</div><div class="v4-risk-cell ${freight}">${freight.toUpperCase()}</div><div class="v4-risk-cell ${origin}">${origin.toUpperCase()}</div>`;
 }).join('');
 return `<div class="v4-risk-grid"><div class="v4-risk-cell head">Lane</div><div class="v4-risk-cell head">Tariff</div><div class="v4-risk-cell head">FX</div><div class="v4-risk-cell head">Freight</div><div class="v4-risk-cell head">Origin</div>${rows}</div>`;
}
function waterfallMarkup(vals={base:100,fx:0,freight:8,duty:25,special:0,inland:4}){
 const seq=[['Base',vals.base,'base'],['FX',vals.fx,'add'],['Ocean',vals.freight,'add'],['Duty',vals.duty,'add'],['Special',vals.special,'add'],['Inland',vals.inland,'add']];
 const total=seq.reduce((a,x)=>a+Number(x[1]||0),0);const max=Math.max(total,...seq.map(x=>Math.abs(Number(x[1]||0))),100);
 return `<div class="v4-waterfall" id="v4Waterfall">${seq.map(x=>`<div class="v4-wbar ${x[2]}" style="height:${Math.max(6,Math.abs(x[1])/max*170)}px"><span>${x[1]>=0?'+':''}${Number(x[1]).toFixed(0)}</span><label>${x[0]}</label></div>`).join('')}<div class="v4-wbar total" style="height:${Math.max(8,total/max*170)}px"><span>${total.toFixed(0)}</span><label>Landed</label></div></div>`;
}
function tradeVisuals(){
 if(app.querySelector('.v4-trade-visuals'))return;
 const wrap=document.createElement('div');wrap.className='v4-visual-stack v4-trade-visuals';
 wrap.innerHTML=`<section class="v4-card v4-span-8"><h2>North America Trade Flow & Origin Risk</h2><div class="v4-sub">Visualizes the sourcing lanes already in the trade register. Arrow width does not represent shipment volume.</div>${tradeMap()}<div class="v4-evidence">${evidence('inference')} ${src('US_TARIFF','Trade policy')} ${src('TWD','USD/TWD')} ${src('DREWRY','Ocean freight')}</div></section>
 <section class="v4-card v4-span-4"><h2>Origin / Landed-Cost Risk Matrix</h2><div class="v4-sub">Qualitative risk decomposition by lane. Click underlying sources for provenance.</div>${riskMatrix()}<div class="v4-evidence">${evidence('derived')} Based on trade-register conditions; not an import-volume estimate.</div></section>
 <section class="v4-card v4-span-7"><h2>Landed Cost Waterfall — Scenario Lab</h2><div class="v4-sub">Normalize supplier base price to 100, then pressure-test FX, freight, duty, special tariff / AD-CVD and inland cost.</div>${waterfallMarkup()}<div class="v4-scenario-controls"><label>Base index<input data-wf="base" type="number" value="100"></label><label>FX impact %<input data-wf="fx" type="number" value="0"></label><label>Ocean / freight<input data-wf="freight" type="number" value="8"></label><label>Duty / tariff<input data-wf="duty" type="number" value="25"></label><label>Special / AD-CVD<input data-wf="special" type="number" value="0"></label><label>Inland / carry<input data-wf="inland" type="number" value="4"></label></div><div class="v4-evidence">${evidence('derived')} User scenario — no default assumption is treated as actual Infasco landed cost.</div></section>
 <section class="v4-card v4-span-5"><h2>Localization Decision Lens</h2><div class="v4-sub">Use the visual to separate structural localization from temporary landed-cost noise.</div><div class="v4-cap-grid"><div class="v4-cap-item"><strong>High duty + long freight</strong><p>Strongest localization pressure when origin rules and qualification support conversion.</p><div class="v4-cap-status"><i class="expand" style="width:88%"></i></div></div><div class="v4-cap-item"><strong>Low duty + favourable FX</strong><p>Imported supply can remain advantaged despite domestic capacity.</p><div class="v4-cap-status"><i style="width:56%"></i></div></div><div class="v4-cap-item"><strong>OEM program sourcing</strong><p>Qualification, tooling, validation and recovery terms can dominate simple unit-cost math.</p><div class="v4-cap-status"><i class="refocus" style="width:76%"></i></div></div><div class="v4-cap-item"><strong>Distributor sourcing</strong><p>Inventory carrying cost and service level can shift the economic break-even.</p><div class="v4-cap-status"><i style="width:67%"></i></div></div></div><div class="v4-evidence">${evidence('inference')} Management decision framework.</div></section>`;
 const grid=app.querySelector('.dashboard-grid');app.insertBefore(wrap,grid||app.firstChild);bindSources(wrap);
 wrap.querySelectorAll('[data-wf]').forEach(inp=>inp.addEventListener('input',()=>{const vals={};wrap.querySelectorAll('[data-wf]').forEach(x=>vals[x.dataset.wf]=Number(x.value)||0);const old=wrap.querySelector('#v4Waterfall');if(old)old.outerHTML=waterfallMarkup(vals)}));
}

function capacityMap(){return `<div class="v4-capacity-map"><svg class="v4-na-shape" viewBox="0 0 700 420"><path d="M90 80 C160 25 285 23 360 63 C430 28 525 55 575 119 C613 167 599 227 554 248 C528 280 499 297 478 347 L400 354 C366 320 336 291 287 278 C233 283 177 256 142 218 C99 189 56 130 90 80Z" fill="#18354a" stroke="#4d6e88" stroke-width="3"/><path d="M356 277 C405 276 455 303 463 371 L395 390 C376 353 365 315 356 277Z" fill="#18354a" stroke="#4d6e88" stroke-width="2"/></svg><button class="v4-pin upstream" style="left:43%;top:38%" data-v4-source="NUCOR_Q2">Nucor · steel capacity</button><button class="v4-pin expand" style="left:56%;top:48%" data-v4-source="PKOH_CALL">Supply Tech · DC expansion</button><button class="v4-pin refocus" style="left:31%;top:53%" data-v4-source="BULTEN_Q2">Bulten · portfolio</button><button class="v4-pin expand" style="left:62%;top:31%" data-v4-source="LISI_H1">LISI · investment</button><button class="v4-pin refocus" style="left:47%;top:67%" data-v4-source="TRIFAST_FY">Trifast · footprint</button><div class="v4-map-legend"><span>● expansion / investment</span><span>● refocus / optimization</span><span>● upstream capacity leverage</span><span>Schematic — not exact plant coordinates</span></div></div>`}
function capacityVisuals(){
 if(app.querySelector('.v4-capacity-visuals'))return;
 const rows=[['Nucor','North American steel capacity','Upstream leverage','upstream',86,'NUCOR_Q2'],['Supply Technologies','North American distribution centre','Expansion / automation','expand',82,'PKOH_CALL'],['Bulten','Precision fastener + C-parts network','Portfolio refocus','refocus',67,'BULTEN_Q2'],['LISI','Aerospace / automotive industrial footprint','Capacity + productivity investment','expand',78,'LISI_H1'],['Trifast','Global engineered fastener footprint','Margin / footprint optimization','refocus',63,'TRIFAST_FY'],['ArcelorMittal','North American upstream steel footprint','Strategic investment watch','upstream',72,'AM_Q2']];
 const wrap=document.createElement('div');wrap.className='v4-visual-stack v4-capacity-visuals';
 wrap.innerHTML=`<section class="v4-card v4-span-8"><h2>North America Capacity & Footprint Map</h2><div class="v4-sub">Source-controlled schematic of the capacity actions tracked in this dashboard. It intentionally avoids fabricated facility coordinates or unsupported tonnage.</div>${capacityMap()}<div class="v4-evidence">${evidence('fact')} Company-reported footprint / investment signals · ${evidence('inference')} map placement is schematic.</div></section><section class="v4-card v4-span-4"><h2>Capacity Action Watch</h2><div class="v4-sub">Direction and strategic significance rather than invented capacity tonnes.</div><div class="v4-cap-grid" style="grid-template-columns:1fr">${rows.map(r=>`<div class="v4-cap-item"><strong>${esc(r[0])}</strong><p>${esc(r[1])} · ${esc(r[2])}</p><div class="v4-cap-status"><i class="${r[3]}" style="width:${r[4]}%"></i></div><div class="v4-evidence">${src(r[5],'source')}</div></div>`).join('')}</div></section><section class="v4-card v4-span-6"><h2>Capacity Signal Matrix</h2><div class="v4-sub">Where current public signals sit in the expansion → optimization → upstream-pricing spectrum.</div><div class="v4-risk-grid" style="grid-template-columns:150px repeat(3,1fr)"><div class="v4-risk-cell head">Entity</div><div class="v4-risk-cell head">Expand</div><div class="v4-risk-cell head">Optimize</div><div class="v4-risk-cell head">Upstream leverage</div>${rows.map(r=>`<div class="v4-risk-cell lane">${esc(r[0])}</div><div class="v4-risk-cell ${r[3]==='expand'?'high':'low'}">${r[3]==='expand'?'ACTIVE':'—'}</div><div class="v4-risk-cell ${r[3]==='refocus'?'med':'low'}">${r[3]==='refocus'?'ACTIVE':'—'}</div><div class="v4-risk-cell ${r[3]==='upstream'?'high':'low'}">${r[3]==='upstream'?'HIGH':'—'}</div>`).join('')}</div></section><section class="v4-card v4-span-6"><h2>Management Use</h2><div class="v4-sub">Translate capacity intelligence into sourcing and commercial actions.</div><div class="v4-cap-grid"><div class="v4-cap-item"><strong>Commercial</strong><p>Track competitor expansions, customer localization and service-capacity investments before quote cycles.</p></div><div class="v4-cap-item"><strong>Procurement</strong><p>Use upstream utilization and new capacity as context for wire rod / steel negotiations.</p></div><div class="v4-cap-item"><strong>Operations</strong><p>Compare external capacity signals with internal bottlenecks before committing to growth programs.</p></div><div class="v4-cap-item"><strong>Strategy</strong><p>Distinguish real structural capacity additions from footprint optimization and portfolio reshaping.</p></div></div><div class="v4-evidence">${evidence('inference')} Decision framework.</div></section>`;
 const grid=app.querySelector('.dashboard-grid');app.insertBefore(wrap,grid||app.firstChild);bindSources(wrap);
}

function compactPulse(){
 const grid=app.querySelector('.dashboard-grid');if(!grid||grid.classList.contains('v4-pulse-packed'))return;grid.classList.add('v4-pulse-packed');
 const cards=[...grid.children].filter(x=>x.classList.contains('card'));
 cards.forEach((c,i)=>{const txt=(c.querySelector('h2')?.textContent||c.textContent||'').toLowerCase();c.classList.remove('v4-half','v4-full','v4-eight','v4-four');
  if(c.querySelector('.weather-grid'))c.classList.add('v4-eight');
  else if(i===1||txt.includes('decision balance'))c.classList.add('v4-four');
  else if(txt.includes('how to read')){c.classList.add('v4-full','v4-legend-compact')}
  else if(c.querySelector('table')&&c.querySelectorAll('th').length>=7)c.classList.add('v4-full');
  else c.classList.add('v4-half');
 });
 const halves=cards.filter(c=>c.classList.contains('v4-half'));if(halves.length%2===1)halves[halves.length-1].classList.replace('v4-half','v4-full');
}
function enhance(){const t=title.textContent.trim();if(t==='Imports & Trade')tradeVisuals();else if(t==='Capacity Map')capacityVisuals();else if(t==='Industry Pulse')compactPulse();bindSources(app)}
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})};
const obs=new MutationObserver(schedule);obs.observe(app,{childList:true,subtree:true});obs.observe(title,{childList:true,subtree:true,characterData:true});
setTimeout(enhance,120);
})();
