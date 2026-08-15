(()=>{
const app=document.getElementById('app');if(!app)return;
const NS='http://www.w3.org/2000/svg';
const customers=[
 {company:'General Fasteners Company',site:'Corporate office',place:'Livonia, MI',lat:42.37,lon:-83.35,kind:'Customer / distributor',src:'https://www.genfast.com/locations'},
 {company:'General Fasteners Company',site:'Mexico operation',place:'Querétaro, Mexico',lat:20.59,lon:-100.39,kind:'Customer / distributor',src:'https://www.genfast.com/locations'},
 {company:'Facil',site:'North America HQ',place:'Independence, OH',lat:41.39,lon:-81.64,kind:'Customer / supply-chain manager',src:'https://www.facil.be/en-gb/contact/'},
 {company:'Facil',site:'U.S. branch',place:'Tulsa, OK',lat:36.15,lon:-95.99,kind:'Customer / supply-chain manager',src:'https://www.facil.be/en-gb/highlight/facil-celebrates-opening-of-new-branches/'},
 {company:'Facil',site:'U.S. branch',place:'San Antonio, TX',lat:29.42,lon:-98.49,kind:'Customer / supply-chain manager',src:'https://www.facil.be/en-gb/highlight/facil-celebrates-opening-of-new-branches/'},
 {company:'Facil',site:'Mexico branch',place:'Escobedo, Nuevo León',lat:25.80,lon:-100.32,kind:'Customer / supply-chain manager',src:'https://www.facil.be/en-gb/highlight/facil-celebrates-opening-of-new-branches/'},
 {company:'Facil',site:'Mexico branch',place:'Saltillo, Coahuila',lat:25.44,lon:-101.00,kind:'Customer / supply-chain manager',src:'https://www.facil.be/en-gb/highlight/facil-celebrates-opening-of-new-branches/'},
 {company:'Amcan Jumax',site:'Head office / warehouse',place:'Saint-Hubert, QC',lat:45.49,lon:-73.42,kind:'Customer / distributor',src:'https://www.amcanjumax.com/en/contact'},
 {company:'Amcan Jumax',site:'Warehouse / sales',place:'Brampton, ON',lat:43.73,lon:-79.73,kind:'Customer / distributor',src:'https://www.amcanjumax.com/en/contact'},
 {company:'Amcan Jumax',site:'Warehouse / sales',place:'Edmonton, AB',lat:53.56,lon:-113.54,kind:'Customer / distributor',src:'https://www.amcanjumax.com/en/contact'},
 {company:'Fastenal',site:'Distribution center',place:'Akron, OH',lat:41.08,lon:-81.52,kind:'Customer / distributor',src:'https://www.fastenal.com/locations/all'},
 {company:'Fastenal',site:'Distribution center',place:'Atlanta, GA',lat:33.74,lon:-84.50,kind:'Customer / distributor',src:'https://www.fastenal.com/locations/all'},
 {company:'Fastenal',site:'Distribution center',place:'Denton, TX',lat:33.21,lon:-97.13,kind:'Customer / distributor',src:'https://www.fastenal.com/locations/all'},
 {company:'Birmingham Fastener',site:'Manufacturing / distribution hub',place:'Birmingham, AL',lat:33.52,lon:-86.86,kind:'Customer / fastener distributor',src:'https://bhamfast.com/locations/birmingham-al-distribution'},
 {company:'Optimas',site:'North America headquarters',place:'Wood Dale, IL',lat:41.96,lon:-87.98,kind:'Customer / manufacturer-distributor',src:'https://optimas.com/locations/'},
 {company:'Optimas',site:'North America operation',place:'Columbus, IN',lat:39.20,lon:-85.92,kind:'Customer / manufacturer-distributor',src:'https://optimas.com/locations/'},
 {company:'Optimas',site:'North America operation',place:'Grove City, OH',lat:39.88,lon:-83.09,kind:'Customer / manufacturer-distributor',src:'https://optimas.com/locations/'},
 {company:'Optimas',site:'North America operation',place:'Fort Worth, TX',lat:32.99,lon:-97.31,kind:'Customer / manufacturer-distributor',src:'https://optimas.com/locations/'},
 {company:'Optimas',site:'Mexico operation',place:'Querétaro, Mexico',lat:20.59,lon:-100.39,kind:'Customer / manufacturer-distributor',src:'https://optimas.com/locations/'},
 {company:'Optimas',site:'Mexico operation',place:'Monterrey, Mexico',lat:25.78,lon:-100.21,kind:'Customer / manufacturer-distributor',src:'https://optimas.com/locations/'},
 {company:'Lawson Products',site:'Distribution center',place:'McCook, IL',lat:41.80,lon:-87.83,kind:'Customer / MRO distributor',src:'https://investor.lawsonproducts.com/news-releases/news-release-details/lawson-products-announces-closure-its-fairfield-new-jersey'},
 {company:'Meritor / Cummins-Meritor',site:'Troy headquarters',place:'Troy, MI',lat:42.57,lon:-83.15,kind:'Customer / commercial vehicle',src:'https://www.sec.gov/Archives/edgar/data/1113256/000114036122027939/ny20004927x1_8k.htm'},
 {company:'Tacoma Screw Products',site:'Distribution center',place:'Gig Harbor, WA',lat:47.32,lon:-122.58,kind:'Customer / distributor',src:'https://www.tacomascrew.com/AboutUs'},
 {company:'Tacoma Screw Products',site:'Headquarters',place:'Tacoma, WA',lat:47.24,lon:-122.48,kind:'Customer / distributor',src:'https://www.tacomascrew.com/branchfinder'}
];
let tip=document.getElementById('fiGeoTooltip');if(!tip){tip=document.createElement('div');tip.id='fiGeoTooltip';tip.className='v15-geo-tip';document.body.appendChild(tip)}
function showTip(evt,text,source){tip.innerHTML=`<strong>${text.split(' | ')[0]}</strong>${text.split(' | ').slice(1).map(x=>`<span>${x}</span>`).join('')}${source?'<small>Click marker to open source</small>':''}`;tip.classList.add('show');moveTip(evt)}
function moveTip(evt){tip.style.left=Math.min(window.innerWidth-280,evt.clientX+14)+'px';tip.style.top=Math.min(window.innerHeight-130,evt.clientY+14)+'px'}
function hideTip(){tip.classList.remove('show')}
function bindMarker(c){if(c.dataset.v15tip)return;c.dataset.v15tip='1';const t=c.querySelector('title')?.textContent||c.dataset.tooltip||'Location';c.addEventListener('mouseenter',e=>showTip(e,t,c.dataset.source));c.addEventListener('mousemove',moveTip);c.addEventListener('mouseleave',hideTip);if(c.dataset.source)c.addEventListener('click',()=>window.open(c.dataset.source,'_blank','noopener'))}
function mode(){const b=[...app.querySelectorAll('.v13-cap-controls button')].find(x=>x.classList.contains('active'));const t=(b?.textContent||'').toLowerCase();if(t.includes('customer'))return'CUSTOMER';if(t.includes('peer manufacturing'))return'MFG';if(t.includes('peer distribution'))return'DIST';return'ALL'}
function addCustomers(svg){const g=window.FI_GEO_MAP;if(!g||!svg.querySelector('.v14-country-layer'))return;svg.querySelectorAll('.v15-customer-layer').forEach(x=>x.remove());if(!['ALL','CUSTOMER'].includes(mode()))return;const layer=document.createElementNS(NS,'g');layer.setAttribute('class','v15-customer-layer');for(const s of customers){const [x,y]=g.naXY(s.lat,s.lon);if(x<0||x>1000||y<0||y>560)continue;const grp=document.createElementNS(NS,'g');grp.setAttribute('class','v15-customer-point');const c=document.createElementNS(NS,'circle');c.setAttribute('cx',x.toFixed(1));c.setAttribute('cy',y.toFixed(1));c.setAttribute('r','7');c.setAttribute('class','v15-customer-circle');c.dataset.source=s.src;c.dataset.tooltip=`${s.company} | ${s.site} | ${s.place} | ${s.kind}`;const title=document.createElementNS(NS,'title');title.textContent=c.dataset.tooltip;c.appendChild(title);grp.appendChild(c);layer.appendChild(grp);bindMarker(c)}svg.appendChild(layer)}
function addCustomerNote(){const cap=app.querySelector('.v13-capacity');if(!cap||cap.querySelector('.v15-customer-note'))return;const n=document.createElement('div');n.className='v15-customer-note';n.innerHTML='<strong>Customer footprint:</strong> the customer universe is prioritized from Infasco internal commercial/sales coverage, but this public map publishes only company names and verified public locations — no Infasco tons, revenue, price or margin.';const controls=cap.querySelector('.v13-cap-controls');controls?.insertAdjacentElement('afterend',n)}
function enhance(){app.querySelectorAll('svg.v13-na').forEach(svg=>{if(window.FI_GEO_MAP)window.FI_GEO_MAP.upgradeNA(svg);setTimeout(()=>{addCustomers(svg);svg.querySelectorAll('.v13-cap-point circle').forEach(bindMarker)},80)});app.querySelectorAll('svg.v13-world .v13-origin').forEach(bindMarker);addCustomerNote()}
let timer;function schedule(){clearTimeout(timer);timer=setTimeout(enhance,60)}
new MutationObserver(schedule).observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
app.addEventListener('click',e=>{if(e.target.closest('.v13-cap-controls button'))setTimeout(schedule,10)},true);
schedule();
})();