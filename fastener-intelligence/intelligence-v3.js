(()=>{
const D=window.FI_DATA||{};
const TD=window.FI_TREND_DATA||{series:{}};
const app=document.getElementById('app');
const viewTitle=document.getElementById('viewTitle');
const sideNav=document.getElementById('sideNav');
if(!app||!viewTitle)return;

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=(a,b)=>a!=null&&b!=null&&b!==0?(a/b-1)*100:null;
function latest(id){const s=TD.series?.[id];return s?.data?.length?s.data[s.data.length-1]:null}
function prior(id,months=12){const s=TD.series?.[id];if(!s?.data?.length)return null;const last=new Date(s.data[s.data.length-1][0]+'T00:00:00Z');const target=new Date(last);target.setUTCMonth(target.getUTCMonth()-months);let best=null,dist=Infinity;for(const p of s.data){const d=Math.abs(Date.parse(p[0])-target.getTime());if(d<dist){dist=d;best=p}}return best}
function fmt(id,v){const s=TD.series?.[id];if(v==null)return '—';const u=s?.units||'';if(u.includes('USD per metric ton'))return '$'+Math.round(v).toLocaleString()+'/t';if(u.includes('USD/bbl'))return '$'+v.toFixed(2)+'/bbl';if(u.includes('USD/MMBtu'))return '$'+v.toFixed(2);if(u.includes('USD/gallon'))return '$'+v.toFixed(2)+'/gal';if(u.includes('cents per cubic'))return v.toFixed(2)+'¢/m³';if(u.includes('Percent'))return v.toFixed(2)+'%';if(u.includes('CAD per'))return v.toFixed(4);if(u.includes('TWD per'))return v.toFixed(2);if(Math.abs(v)>1000)return v.toLocaleString(undefined,{maximumFractionDigits:1});return v.toFixed(2)}
function yoy(id){const a=latest(id),b=prior(id,12);return a&&b?pct(a[1],b[1]):null}
function deltaClass(v,invert=false){if(v==null)return'neutral';const good=invert?v<0:v>0;return good?'positive':v===0?'neutral':'cautious'}
function sourceButton(id,label){return `<button class="fi-source-button v3-source" data-v3-source="${esc(id)}">${esc(label||id)}</button>`}
function openSource(id){const modal=document.getElementById('sourceModal'),input=document.getElementById('sourceSearch');if(!modal||!input)return;modal.classList.add('open');modal.setAttribute('aria-hidden','false');input.value=id;input.dispatchEvent(new Event('input',{bubbles:true}));}
function openTrend(ids){const valid=ids.filter(id=>TD.series?.[id]).slice(0,6);let st={};try{st=JSON.parse(localStorage.getItem('fiTrendState')||'{}')}catch(e){}st.selected=valid;st.range=st.range||'3Y';st.transform=valid.length>1?'Rebased 100':(st.transform||'Actual');localStorage.setItem('fiTrendState',JSON.stringify(st));const b=sideNav?.querySelector('[data-view="trend"]');if(b)b.click();}
function openEntity(id){const bound=[...document.querySelectorAll(`[data-enh-entity="${id}"]`)].find(x=>x.dataset.bound==='1');if(bound){bound.click();return}const nav=sideNav?.querySelector('[data-view="customers"]');if(nav){nav.click();setTimeout(()=>{const b=[...document.querySelectorAll(`[data-entity="${id}"],[data-enh-entity="${id}"]`)].find(x=>x.dataset.bound==='1');if(b)b.click()},60)}}

// Runtime source extensions keep provenance available without inventing internal data.
Object.assign(D.sources||(D.sources={}),{
  STATCAN_NG:{title:'Natural gas, monthly sales – Québec industrial unit price',publisher:'Statistics Canada',date:'Monthly',period:'Monthly',class:'fact',kind:'Government statistics',url:'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=2510003301',usedFor:'Québec industrial natural gas cost trend',notes:'Table 25-10-0033-01. Provincial industrial sales unit-price series.'},
  USGS_TUNGSTEN:{title:'Tungsten Statistics and Information',publisher:'U.S. Geological Survey',date:'Latest public MIS through Dec-2025',period:'Monthly / publication transition',class:'fact',kind:'Government mineral statistics',url:'https://www.usgs.gov/centers/national-minerals-information-center/tungsten-statistics-and-information',usedFor:'Tungsten cost and supply-risk monitoring',notes:'USGS states monthly Mineral Industry Survey posting is temporarily paused after December 2025. Dashboard does not fabricate a 2026 numeric series.'},
  GVR_MARKET:{title:'North America Industrial Fasteners Market Size & Outlook',publisher:'Grand View Research',date:'2026',period:'2025 base / 2026–2033 forecast',class:'est',kind:'Third-party market estimate',url:'https://www.grandviewresearch.com/horizon/outlook/industrial-fasteners-market/north-america',usedFor:'North America market-size and growth triangulation',notes:'Estimate depends on publisher taxonomy; use as one point in a range, not an audited fact.'},
  STRAITS_MARKET:{title:'North America Industrial Fasteners Market',publisher:'Straits Research',date:'2026-07-08',period:'2025 base / 2026–2034 forecast',class:'est',kind:'Third-party market estimate',url:'https://straitsresearch.com/report/industrial-fasteners-market/north-america',usedFor:'Market-size / growth triangulation and segmentation taxonomy',notes:'Estimate definition differs from other market-research publishers.'},
  MORDOR_MARKET:{title:'North America Industrial Fasteners Market',publisher:'Mordor Intelligence / Research and Markets listing',date:'2026-01',period:'2025 base / 2026–2031 forecast',class:'est',kind:'Third-party market estimate',url:'https://www.researchandmarkets.com/report/north-america-industrial-fasteners-market',usedFor:'Market-size / growth triangulation and structural drivers',notes:'Market-research estimate; taxonomy may differ from other providers.'},
  EMR_MARKET:{title:'North America Industrial Fasteners Market',publisher:'Expert Market Research',date:'2026-04-10',period:'2025 base / 2026–2035 forecast',class:'est',kind:'Third-party market estimate',url:'https://www.marketresearch.com/Expert-Market-Research-v4220/North-America-Industrial-Fasteners-Size-45227321/',usedFor:'Upper-bound market-size triangulation and driver cross-check',notes:'Market-research estimate; definition differs materially from other providers.'},
  GM_CALL:{title:'GM Q2 2026 Earnings Conference Call',publisher:'General Motors',date:'2026-07-21',period:'Q2 2026',class:'mgmt',kind:'Earnings call / webcast',url:'https://investor.gm.com/events/event-details/general-motors-company-q2-2026-earnings-conference-call',usedFor:'Management discussion of demand, pricing, sourcing, tariffs and outlook',notes:'Management commentary / webcast; separate from reported financial facts.'},
  STLA_CALL:{title:'Stellantis Q2 2026 Results Call with Management',publisher:'Stellantis',date:'2026-07-30',period:'Q2 2026',class:'mgmt',kind:'Earnings call / webcast',url:'https://www.stellantis.com/en/investors',usedFor:'Management discussion of North America recovery, inventory, tariffs and outlook',notes:'Management commentary / webcast.'},
  FORD_CALL:{title:'Ford Q2 2026 Earnings Webcast',publisher:'Ford Motor Company',date:'2026-07-28',period:'Q2 2026',class:'mgmt',kind:'Earnings call / webcast',url:'https://shareholder.ford.com/events/default.aspx',usedFor:'Management discussion of volumes, mix, tariffs, cost and outlook',notes:'Management commentary / webcast.'},
  GRAINGER_CALL:{title:'Grainger Q2 2026 Earnings Conference Call',publisher:'W.W. Grainger',date:'2026-08-04',period:'Q2 2026',class:'mgmt',kind:'Earnings call / webcast',url:'https://invest.grainger.com/events-and-presentations/event-details/2026/Q2-2026-Grainger-Earnings-Conference-Call/default.aspx',usedFor:'Management discussion of demand, pricing, gross margin and customer activity',notes:'Management commentary / webcast.'},
  MSC_CALL:{title:'MSC Industrial Fiscal Q3 2026 Earnings Webcast',publisher:'MSC Industrial',date:'2026-07-01',period:'Fiscal Q3 2026',class:'mgmt',kind:'Earnings call / webcast',url:'https://investor.mscdirect.com/events-presentations',usedFor:'Management discussion of metalworking/MRO demand, productivity program and pricing',notes:'Management commentary / webcast.'},
  AIT_CALL:{title:'Applied Industrial Technologies Fiscal 2026 Earnings Call / Webcast',publisher:'Applied Industrial Technologies',date:'2026',period:'Fiscal 2026',class:'mgmt',kind:'Earnings call / webcast',url:'https://ir.applied.com/events-and-presentations/default.aspx',usedFor:'Management discussion of industrial demand, orders, break-fix activity, capex and outlook',notes:'Management commentary / webcast.'}
});

const commentaryAdd={
 fastenal:[
  ['Demand quality','Management attributed Q2 daily-sales growth to share gains with larger customers, pricing actions and broad-based demand across core end markets.','mgmt','FAST_CALL'],
  ['Price / cost','Gross-margin pressure remained tied to unfavorable price/cost even as operating-margin leverage offset part of the pressure.','mgmt','FAST_CALL'],
  ['Customer penetration','Management continues to emphasize key-account wins, onsite growth and digital penetration as structural share-gain mechanisms.','mgmt','FAST_CALL']
 ],
 supplytech:[
  ['End-market mix','Management described improving demand across selected heavy-truck, agriculture, aerospace and infrastructure-related channels, with end markets remaining uneven.','mgmt','PKOH_CALL'],
  ['Network investment','The North American distribution-centre and automation program is intended to improve service, productivity and scalability.','mgmt','PKOH_CALL'],
  ['Make vs buy','Management commentary indicates continued attention to sourcing economics and make-versus-buy decisions, relevant to domestic fastener conversion opportunities.','mgmt','PKOH_CALL']
 ],
 gm:[
  ['North America economics','Management continues to frame North America around disciplined pricing, mix, product launches and cost execution rather than volume alone.','mgmt','GM_CALL'],
  ['Localization / sourcing','GM continues to emphasize North American sourcing and manufacturing resilience, increasing the strategic importance of local supply reliability.','mgmt','GM_CALL'],
  ['Tariff / cost recovery','Tariffs and supply-chain cost changes remain management-level variables that can affect sourcing, pricing and program economics.','mgmt','GM_CALL']
 ],
 stellantis:[
  ['North America recovery','Management highlighted North America as the primary driver of Q2 revenue improvement while reaffirming the broader turnaround plan.','mgmt','STLA_CALL'],
  ['Tariff exposure','Stellantis disclosed a material 2026 net tariff headwind estimate, making localization and sourcing economics important supplier considerations.','mgmt','STLA_CALL'],
  ['Cash / execution','Management emphasized operating-performance recovery, product launches and cash improvement while maintaining 2026 guidance.','mgmt','STLA_CALL']
 ],
 ford:[
  ['Operating focus','Management discussion around Q2 emphasizes mix, cost execution, product launches and tariff effects alongside vehicle demand.','mgmt','FORD_CALL'],
  ['Supplier implication','Ford’s North American manufacturing footprint and cost agenda keep localization, launch reliability and productivity central to supplier positioning.','inference','FORD_CALL']
 ],
 grainger:[
  ['Demand read-through','The Q2 conference call provides a broad MRO/industrial demand read-through across manufacturing and commercial customers.','mgmt','GRAINGER_CALL'],
  ['Pricing / margin','Management commentary on pricing, product mix and gross margin is a useful external reference for distributor pricing power.','mgmt','GRAINGER_CALL']
 ],
 msc:[
  ['Metalworking cycle','MSC’s Q3 webcast is a relevant read-through for metalworking and manufacturing demand, particularly small and mid-sized industrial customers.','mgmt','MSC_CALL'],
  ['Productivity / margin','Management’s productivity and profitability program provides context on distributor operating leverage and pricing discipline.','mgmt','MSC_CALL']
 ],
 applied:[
  ['Industrial demand','Management reported favorable U.S. industrial macro signals, firmer break-fix activity and gradually improving customer capital spending.','mgmt','AIT_CALL'],
  ['Orders / funnel','Management described orders and business-funnel activity as favorable while still incorporating trade-policy and geopolitical uncertainty into the outlook.','mgmt','AIT_CALL']
 ]
};
Object.entries(commentaryAdd).forEach(([id,rows])=>{const e=D.entities?.[id];if(!e)return;e.commentary=e.commentary||[];for(const r of rows){if(!e.commentary.some(x=>x[0]===r[0]))e.commentary.push(r);if(e.sources&&!e.sources.includes(r[3]))e.sources.push(r[3])}});

const cycle={
  2022:{fastenal:[76,56],supplytech:[62,50],gm:[58,42],stellantis:[54,38],ford:[60,44],grainger:[72,54],msc:[68,48],applied:[69,52],bulten:[58,45],lisi:[55,46],trifast:[47,41]},
  2023:{fastenal:[62,61],supplytech:[53,58],gm:[64,50],stellantis:[58,46],ford:[57,49],grainger:[61,60],msc:[54,55],applied:[52,57],bulten:[51,51],lisi:[58,55],trifast:[44,47]},
  2024:{fastenal:[50,66],supplytech:[45,61],gm:[60,55],stellantis:[40,46],ford:[48,53],grainger:[52,64],msc:[43,57],applied:[48,60],bulten:[46,55],lisi:[62,63],trifast:[42,50]},
  2025:{fastenal:[59,70],supplytech:[54,63],gm:[56,60],stellantis:[35,50],ford:[44,57],grainger:[55,67],msc:[48,59],applied:[55,64],bulten:[52,60],lisi:[66,68],trifast:[51,57]},
  2026:{fastenal:[70,73],supplytech:[66,67],gm:[59,64],stellantis:[48,60],ford:[52,58],grainger:[64,69],msc:[57,62],applied:[67,70],bulten:[61,64],lisi:[72,72],trifast:[60,63]}
};
const cycleNames={fastenal:'Fastenal',supplytech:'Supply Tech',gm:'GM',stellantis:'Stellantis',ford:'Ford',grainger:'Grainger',msc:'MSC',applied:'Applied',bulten:'Bulten',lisi:'LISI',trifast:'Trifast'};
let cycleYear=Number(localStorage.getItem('fiCycleYear')||2026);

const marketSegments=[
 ['Automotive','Large / mature','3–5%','Vehicle production, platform launches, EV architecture, localization, tariff rules','ALTSALES','GM_CALL'],
 ['Aerospace & defense','High-value / specialty','5–7%','Aircraft build rates, backlog, defense budgets, qualification barriers','IPMAN','LISI_H1'],
 ['Construction & infrastructure','Large / cyclical','3–5%','Nonresidential construction, infrastructure, data-centre/electrical buildout','TLNRESCONS','AIT_CALL'],
 ['Industrial machinery / MRO','Broad / fragmented','3–5%','Manufacturing output, capex, utilization, maintenance cycle','IPMAN','FAST_CALL'],
 ['Heavy truck / transportation','Cyclical','2–4%','Class 8 demand, fleet age, freight activity, emissions cycles','HTRUCKSSAAR','PKOH_CALL'],
 ['Electrical / data centres','Fast-growing niche','6–9%','Grid investment, AI/data-centre capex, power equipment and automation','IPG3344S','PKOH_CALL'],
 ['Energy / mining','Cyclical / specialized','3–5%','Commodity prices, project capex, drilling/mining activity','DCOILWTICO','NUCOR_Q2']
];

const demandSources={
 'Automotive':[['ALTSALES','Vehicle SAAR'],['GM_Q2','GM results'],['GM_CALL','GM call'],['STLA_Q2','Stellantis'],['FORD_Q2','Ford']],
 'Heavy truck':[['HTRUCKSSAAR','Truck SAAR'],['PKOH_Q2','Supply Tech'],['PKOH_CALL','ST call'],['TSIFRGHT','Freight index']],
 'Construction':[['TTLCONS','Construction'],['TLNRESCONS','Non-res'],['AIT_Q3','Applied'],['AIT_CALL','AIT call']],
 'Machinery / industrial':[['IPMAN','Mfg output'],['CUMFNS','Utilization'],['AMTMNO','Orders'],['FAST_ER','Fastenal'],['AIT_CALL','Applied']],
 'Aerospace':[['LISI_H1','LISI'],['PKOH_Q2','Supply Tech'],['PKOH_CALL','ST call'],['IPMAN','Mfg output']],
 'Energy':[['DCOILWTICO','WTI'],['DHHNGSP','Nat gas'],['PKOH_CALL','ST call']],
 'Agriculture':[['PKOH_Q2','Supply Tech'],['PKOH_CALL','ST call'],['AMTMNO','Mfg orders']],
 'Electrical / Data Centres':[['IPG3344S','Electronics prod.'],['AIT_CALL','Applied'],['PKOH_CALL','Supply Tech'],['AMTMNO','Orders']]
};
function sourceHref(id){const s=D.sources?.[id];if(s?.url)return s.url;const t=TD.series?.[id];return t?.url||''}
function sourceStack(name){const arr=demandSources[name]||[];return `<div class="v3-source-stack">${arr.map(([id,l])=>{const u=sourceHref(id);return u?`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(l)}</a>`:`<span>${esc(l)}</span>`}).join('')}</div>`}

function costCard(id,label,role,invert=false){const s=TD.series?.[id],a=latest(id),y=yoy(id);return `<article class="v3-cost-card" data-v3-trend="${id}"><div class="v3-card-head"><span>${esc(role)}</span><b>${esc(label||s?.name||id)}</b></div><strong>${a?fmt(id,a[1]):'Source tracked'}</strong><div class="v3-delta ${deltaClass(y,invert)}">${y==null?'YoY —':`${y>=0?'+':''}${y.toFixed(1)}% YoY`}</div><small>${a?esc(a[0]):esc(s?.error||'No current numeric observation')}</small><div class="v3-source-line">${s?.source?esc(s.source):id}</div></article>`}
function renderCostMonitor(){return `<section class="card v3-cost-monitor"><div class="fi-visual-title"><div><h2>Manufacturing Input-Cost Monitor</h2><p>Energy · metals · freight · inflation · FX</p></div><button class="fi-source-button" data-v3-trend-multi="WPU101,PZINCUSDM,QC_NATGAS,WPU3012,DEXCAUS">Open cost basket in Trend Lab →</button></div><div class="v3-cost-grid">
${costCard('QC_NATGAS','Québec industrial natural gas','Plant energy',true)}
${costCard('DHHNGSP','Henry Hub natural gas','Energy',true)}
${costCard('PZINCUSDM','Zinc','Plating',true)}
${costCard('PCOPPUSDM','Copper','Industrial metal',true)}
${costCard('PALUMUSDM','Aluminum','Industrial metal',true)}
${costCard('PNICKUSDM','Nickel','Alloy',true)}
${costCard('WPU101','Iron & steel PPI','Steel',true)}
${costCard('WPU102','Nonferrous PPI','Alloys / plating',true)}
${costCard('GASDESW','On-highway diesel','Truck fuel',true)}
${costCard('WPU3012','Truck freight PPI','Inbound / outbound',true)}
${costCard('PCU4831114831115','Deep-sea freight PPI','Imports',true)}
${costCard('TSIFRGHT','Freight services index','Freight activity',false)}
<article class="v3-cost-card stale"><div class="v3-card-head"><span>Tooling</span><b>Tungsten</b></div><strong>USGS tracked</strong><div class="v3-delta cautious">Monthly series publication paused</div><small>Latest public MIS: Dec-2025</small><div class="v3-source-line">${sourceButton('USGS_TUNGSTEN','USGS source')}</div></article>
${costCard('CPIAUCSL','U.S. CPI','Inflation',true)}
${costCard('PPIACO','U.S. PPI','Producer inflation',true)}
${costCard('DEXCAUS','USD/CAD','FX',true)}
${costCard('DEXTAUS','USD/TWD','Taiwan sourcing FX',true)}
</div><div class="fi-matrix-note">Cost direction is not the same as Infasco exposure. The internal layer should apply purchase mix, contract lags, hedges, conversion usage and recovery clauses before translating these indices into $/ton impact.</div></section>`}

function renderEconomicDrivers(){const ids=['IPMAN','CUMFNS','AMTMNO','AMTMIS','ALTSALES','HTRUCKSSAAR','TTLCONS','TLNRESCONS','CPIAUCSL','PPIACO','TSIFRGHT','TRUCKD11','DGS10','DEXCAUS'];return `<section class="card v3-econ"><div class="fi-visual-title"><div><h2>Economic Drivers of Fastener Demand</h2><p>Macro → end market → customer demand → fastener consumption</p></div><button class="fi-source-button" data-v3-trend-multi="IPMAN,AMTMNO,ALTSALES,HTRUCKSSAAR,TLNRESCONS,PPIACO">Compare in Trend Lab →</button></div><div class="v3-econ-grid">${ids.map(id=>{const s=TD.series?.[id],a=latest(id),y=yoy(id);return `<button class="v3-econ-card" data-v3-trend="${id}"><span>${esc(s?.group||'Indicator')}</span><b>${esc(s?.name||id)}</b><strong>${a?fmt(id,a[1]):'—'}</strong><i class="${deltaClass(y)}">${y==null?'YoY —':`${y>=0?'+':''}${y.toFixed(1)}% YoY`}</i><small>${esc(s?.relevance||'')}</small><em>${a?esc(a[0]):'refresh pending'} · ${esc(s?.source||'')}</em></button>`}).join('')}</div></section>`}

function renderCycle(){const rows=cycle[cycleYear]||cycle[2026];return `<div class="fi-visual-title"><div><h2>Customer, Distributor & Peer Cycle</h2><p>Normalized analytical reconstruction · click company for dossier</p></div><div class="v3-year-control">${Object.keys(cycle).map(y=>`<button class="tl-btn ${Number(y)===cycleYear?'active':''}" data-v3-year="${y}">${y}</button>`).join('')}</div></div><div class="v3-cycle-wrap"><div class="fi-quadrant v3-quadrant"><span class="fi-q-label tl">leaner / improving</span><span class="fi-q-label tr">growth + inventory build</span><span class="fi-q-label bl">weak / destocking</span><span class="fi-q-label br">inventory risk</span>${Object.entries(rows).map(([id,p],i)=>`<button class="v3-cycle-bubble ${['fastenal','supplytech','grainger','msc','applied'].includes(id)?'dist':['bulten','lisi','trifast'].includes(id)?'peer':'oem'}" style="--x:${p[0]}%;--y:${p[1]}%;--n:${i}" data-v3-entity="${id}">${esc(cycleNames[id])}</button>`).join('')}<div class="fi-axis-x">Demand / revenue momentum →</div><div class="fi-axis-y">Inventory / operating-cycle quality →</div></div><div class="v3-cycle-legend"><span><i class="dist"></i>Distributor / industrial channel</span><span><i class="oem"></i>OEM customer</span><span><i class="peer"></i>Peer / fastener manufacturer</span></div></div><div class="fi-matrix-note"><span class="evidence derived">DERIVED</span> Historical positions are normalized directional reconstructions from public filings, earnings materials and management commentary. They are designed to show cycle migration, not to imply identical accounting definitions across companies. Coverage is strongest from 2024 onward.</div>`}

function renderMarketSize(){const estimates=[['Grand View Research','$24.4B','2025 North America','3.7%','2026–33','GVR_MARKET'],['Mordor','$21.4B','2025 North America','4.0%','2026–31','MORDOR_MARKET'],['Straits Research','$18.2B','2025 North America','6.3%','2026–34','STRAITS_MARKET'],['Expert Market Research','$28.5B','2025 North America','3.9%','to 2035','EMR_MARKET']];return `<section class="card v3-market-size"><div class="fi-visual-title"><div><h2>Fastener Industry Size, Segmentation & Growth</h2><p>Triangulated external estimates · definition-sensitive</p></div><span class="evidence est">ESTIMATE</span></div><div class="v3-market-top"><div class="v3-market-range"><label>Published 2025 North America range</label><strong>$18B–$29B</strong><small>Different publishers include/exclude different product classes, channels and specialty fasteners.</small></div><div class="v3-market-range"><label>Published total-market CAGR range</label><strong>~3.7%–6.3%</strong><small>Use range rather than a single point estimate for planning.</small></div></div><div class="v3-estimates">${estimates.map(e=>`<div><b>${e[0]}</b><strong>${e[1]}</strong><span>${e[2]}</span><em>${e[3]} CAGR · ${e[4]}</em>${sourceButton(e[5],'source')}</div>`).join('')}</div><h3 class="v3-subhead">Planning view by end market</h3><div class="v3-segment-table"><div class="head">Segment</div><div class="head">Position</div><div class="head">Derived growth range</div><div class="head">Core drivers</div><div class="head">Evidence</div>${marketSegments.map(r=>`<div><b>${r[0]}</b></div><div>${r[1]}</div><div><span class="v3-growth">${r[2]}</span> <span class="evidence derived">DERIVED</span></div><div>${r[3]}</div><div>${sourceStack(r[0].startsWith('Industrial')?'Machinery / industrial':r[0].startsWith('Electrical')?'Electrical / Data Centres':r[0].startsWith('Heavy')?'Heavy truck':r[0].startsWith('Construction')?'Construction':r[0].startsWith('Aerospace')?'Aerospace':r[0].startsWith('Automotive')?'Automotive':'Energy')}</div>`).join('')}</div><div class="fi-matrix-note">Segment growth ranges are dashboard planning estimates derived from published total-market forecasts plus current end-market evidence; they are not publisher-reported segment CAGRs. This distinction is intentional.</div></section>`}

function renderDemandConfidence(card){if(!card)return;const rows=D.demand||[];card.innerHTML=`<div class="fi-visual-title"><div><h2>End-Market Demand & Confidence Map</h2><p>Direction plus corroborating source stack</p></div><button class="fi-source-button" data-v3-trend-multi="IPMAN,ALTSALES,HTRUCKSSAAR,TLNRESCONS,IPG3344S">Open drivers in Trend Lab →</button></div><div class="v3-demand-table"><div class="head">End market</div><div class="head">Current</div><div class="head">Trend</div><div class="head">12M outlook</div><div class="head">Confidence</div><div class="head">Corroborating evidence</div>${rows.map(r=>{const n=(demandSources[r[0]]||[]).length;const conf=n>=5?'High':n>=4?'Med-High':'Medium';return `<div><b>${esc(r[0])}</b></div><div><span class="chip ${r[1]==='Strong'||r[1]==='Improving'?'positive':r[1]==='Mixed'||r[1]==='Volatile'?'cautious':'neutral'}">${esc(r[1])}</span></div><div>${esc(r[2])}</div><div>${esc(r[3])}</div><div><strong>${conf}</strong><small>${n} sources</small></div><div>${sourceStack(r[0])}</div>`}).join('')}</div><div class="fi-matrix-note">Confidence increases when macro, customer/distributor, peer and end-market evidence agree. Conflicting signals remain visible rather than averaged away.</div>`}

function addTrendPresets(){if(viewTitle.textContent.trim()!=='Trend Lab')return;const box=document.querySelector('.tl-presets');if(!box||box.dataset.v3)return;box.dataset.v3='1';const presets={Inflation:['CPIAUCSL','PPIACO','WPU10','WPU101','WPU102'],'Commodities':['PZINCUSDM','PCOPPUSDM','PALUMUSDM','PNICKUSDM','DCOILWTICO'],'Freight':['TSIFRGHT','TRUCKD11','WPU3012','PCU4831114831115','GASDESW'],'Energy / Québec':['QC_NATGAS','DHHNGSP','DCOILWTICO','GASDESW','DEXCAUS'],'Fastener cost basket':['WPU101','PZINCUSDM','QC_NATGAS','WPU3012','DEXCAUS','DEXTAUS'],'Macro + inflation':['IPMAN','AMTMNO','CPIAUCSL','PPIACO','CUMFNS','DGS10']};Object.entries(presets).forEach(([name,ids])=>{const b=document.createElement('button');b.className='tl-btn v3-preset';b.textContent=name;b.addEventListener('click',()=>openTrend(ids));box.appendChild(b)});const note=document.querySelector('.tl-note');if(note&&!note.dataset.v3){note.dataset.v3='1';note.insertAdjacentHTML('beforeend','<br><b>Expanded:</b> Québec natural gas · CPI/PPI · metals · freight · diesel · tungsten source status.');}}

function enhancePulse(){if(viewTitle.textContent.trim()!=='Industry Pulse')return;const root=app.querySelector('.fi-command-center');if(!root)return;
  const demand=root.querySelector('.fi-demand');if(demand&&!demand.dataset.v3){demand.dataset.v3='1';renderDemandConfidence(demand)}
  const cycleCard=root.querySelector('.fi-cycle');if(cycleCard){cycleCard.dataset.v3='1';cycleCard.innerHTML=renderCycle()}
  if(!root.querySelector('.v3-econ')){const weather=root.querySelector('.fi-weather');weather?.insertAdjacentHTML('afterend',renderEconomicDrivers())}
  if(!root.querySelector('.v3-cost-monitor')){const cost=root.querySelector('.fi-cost');cost?.insertAdjacentHTML('afterend',renderCostMonitor())}
  if(!root.querySelector('.v3-market-size')){const competition=root.querySelector('.fi-competition');competition?.insertAdjacentHTML('afterend',renderMarketSize())}
  bindV3(root);
}
function bindV3(root=document){root.querySelectorAll('[data-v3-source]').forEach(b=>{if(b.dataset.v3b)return;b.dataset.v3b='1';b.addEventListener('click',e=>{e.stopPropagation();openSource(b.dataset.v3Source)})});root.querySelectorAll('[data-v3-trend]').forEach(b=>{if(b.dataset.v3b)return;b.dataset.v3b='1';b.addEventListener('click',()=>openTrend([b.dataset.v3Trend]))});root.querySelectorAll('[data-v3-trend-multi]').forEach(b=>{if(b.dataset.v3b)return;b.dataset.v3b='1';b.addEventListener('click',()=>openTrend(b.dataset.v3TrendMulti.split(',')))});root.querySelectorAll('[data-v3-entity]').forEach(b=>{if(b.dataset.v3b)return;b.dataset.v3b='1';b.addEventListener('click',()=>openEntity(b.dataset.v3Entity))});root.querySelectorAll('[data-v3-year]').forEach(b=>{if(b.dataset.v3b)return;b.dataset.v3b='1';b.addEventListener('click',()=>{cycleYear=Number(b.dataset.v3Year);localStorage.setItem('fiCycleYear',cycleYear);const c=app.querySelector('.fi-cycle');if(c){c.innerHTML=renderCycle();bindV3(c)}})})}
function apply(){enhancePulse();addTrendPresets();bindV3(document)}
const obs=new MutationObserver(()=>queueMicrotask(apply));obs.observe(app,{childList:true,subtree:true});obs.observe(viewTitle,{childList:true,subtree:true,characterData:true});setTimeout(apply,80);
})();
