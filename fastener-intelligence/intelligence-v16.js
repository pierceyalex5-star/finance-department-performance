(()=>{
const app=document.getElementById('app');if(!app)return;
const NS='http://www.w3.org/2000/svg';
const extra=[
 {company:'General Motors',site:'Oshawa Assembly',place:'Oshawa, ON',lat:43.87,lon:-78.85,kind:'Customer / OEM assembly',src:'https://www.gm.ca/en/home/company/canada/oshawa.html'},
 {company:'General Motors',site:'Flint Assembly',place:'Flint, MI',lat:42.98,lon:-83.69,kind:'Customer / OEM assembly',src:'https://www.gm.com/company/facilities/flint-assembly'},
 {company:'General Motors',site:'Fort Wayne Assembly',place:'Roanoke, IN',lat:40.96,lon:-85.37,kind:'Customer / OEM assembly',src:'https://www.gm.com/company/us-operations'},
 {company:'General Motors',site:'Factory ZERO',place:'Detroit, MI',lat:42.37,lon:-83.04,kind:'Customer / OEM assembly',src:'https://www.gm.com/company/us-operations'},
 {company:'Stellantis',site:'Toledo Assembly Complex',place:'Toledo, OH',lat:41.68,lon:-83.55,kind:'Customer / OEM assembly',src:'https://www.stellantis.com/en/news/press-releases/2025/october/stellantis-to-invest-13-billion-to-grow-in-the-united-states'},
 {company:'Stellantis',site:'Warren Truck Assembly',place:'Warren, MI',lat:42.52,lon:-83.03,kind:'Customer / OEM assembly',src:'https://www.stellantis.com/en/news/press-releases/2025/october/stellantis-to-invest-13-billion-to-grow-in-the-united-states'},
 {company:'Stellantis',site:'Detroit Assembly Complex',place:'Detroit, MI',lat:42.40,lon:-83.04,kind:'Customer / OEM assembly',src:'https://www.stellantis.com/en/news/press-releases/2025/october/stellantis-to-invest-13-billion-to-grow-in-the-united-states'},
 {company:'Stellantis',site:'Windsor Assembly',place:'Windsor, ON',lat:42.30,lon:-83.02,kind:'Customer / OEM assembly',src:'https://www.media.stellantis.com/em-en/corporate/press/stellantis-announces-155-million-investment-in-three-indiana-plants-to-support-north-american-electrification-goals'},
 {company:'General Fasteners Company',site:'Chillicothe operation',place:'Chillicothe, OH',lat:39.33,lon:-82.98,kind:'Customer / distributor',src:'https://www.genfast.com/locations'},
 {company:'General Fasteners Company',site:'Hebron operation',place:'Hebron, OH',lat:39.96,lon:-82.49,kind:'Customer / distributor',src:'https://www.genfast.com/locations'},
 {company:'General Fasteners Company',site:'Portage operation',place:'Portage, MI',lat:42.20,lon:-85.58,kind:'Customer / distributor',src:'https://www.genfast.com/locations'},
 {company:'General Fasteners Company',site:'Denton operation',place:'Denton, TX',lat:33.21,lon:-97.13,kind:'Customer / distributor',src:'https://www.genfast.com/locations'},
 {company:'General Fasteners Company',site:'Kent operation',place:'Kent, WA',lat:47.38,lon:-122.23,kind:'Customer / distributor',src:'https://www.genfast.com/locations'},
 {company:'General Fasteners Company',site:'Charlotte operation',place:'Charlotte, NC',lat:35.11,lon:-80.94,kind:'Customer / distributor',src:'https://www.genfast.com/locations'},
 {company:'General Fasteners Company',site:'Evans operation',place:'Evans, GA',lat:33.54,lon:-82.13,kind:'Customer / distributor',src:'https://www.genfast.com/locations'},
 {company:'General Fasteners Company',site:'San Luis Potosí operation',place:'San Luis Potosí, Mexico',lat:22.16,lon:-100.99,kind:'Customer / distributor',src:'https://www.genfast.com/locations'},
 {company:'General Fasteners Company',site:'Mexicali operation',place:'Mexicali, Mexico',lat:32.62,lon:-115.45,kind:'Customer / distributor',src:'https://www.genfast.com/locations'},
 {company:'General Fasteners Company',site:'Monterrey operation',place:'Santa Catarina, Nuevo León',lat:25.67,lon:-100.46,kind:'Customer / distributor',src:'https://www.genfast.com/locations'},
 {company:'General Fasteners Company',site:'Laval operation',place:'Laval, QC',lat:45.61,lon:-73.75,kind:'Customer / distributor',src:'https://www.genfast.com/locations'},
 {company:'General Fasteners Company',site:'Mississauga operation',place:'Mississauga, ON',lat:43.62,lon:-79.62,kind:'Customer / distributor',src:'https://www.genfast.com/locations'},
 {company:'Optimas',site:'San Jose',place:'San Jose, CA',lat:37.39,lon:-121.90,kind:'Customer / manufacturer-distributor',src:'https://optimas.com/locations/'},
 {company:'Optimas',site:'Grand Island',place:'Grand Island, NE',lat:40.93,lon:-98.36,kind:'Customer / manufacturer-distributor',src:'https://optimas.com/locations/'},
 {company:'Optimas',site:'Jamestown',place:'Jamestown, NY',lat:42.10,lon:-79.24,kind:'Customer / manufacturer-distributor',src:'https://optimas.com/locations/'},
 {company:'Optimas',site:'Rocky Mount / Battleboro',place:'Battleboro, NC',lat:36.05,lon:-77.75,kind:'Customer / manufacturer-distributor',src:'https://optimas.com/locations/'},
 {company:'Optimas',site:'Allentown',place:'Allentown, PA',lat:40.58,lon:-75.62,kind:'Customer / manufacturer-distributor',src:'https://optimas.com/locations/'},
 {company:'Optimas',site:'Greenville',place:'Greenville, SC',lat:34.80,lon:-82.30,kind:'Customer / manufacturer-distributor',src:'https://optimas.com/locations/'},
 {company:'Optimas',site:'Laredo',place:'Laredo, TX',lat:27.53,lon:-99.49,kind:'Customer / manufacturer-distributor',src:'https://optimas.com/locations/'},
 {company:'Optimas',site:'Sturtevant',place:'Sturtevant, WI',lat:42.70,lon:-87.90,kind:'Customer / manufacturer-distributor',src:'https://optimas.com/locations/'},
 {company:'Birmingham Fastener',site:'Hanceville Distribution Center',place:'Hanceville, AL',lat:34.06,lon:-86.77,kind:'Customer / fastener distributor',src:'https://bhamfast.com/locations/hanceville-al'},
 {company:'Tacoma Screw Products',site:'Gig Harbor Distribution Center',place:'Gig Harbor, WA',lat:47.32,lon:-122.58,kind:'Customer / distributor',src:'https://www.tacomascrew.com/ghdc'}
];
function mode(){const b=[...app.querySelectorAll('.v13-cap-controls button')].find(x=>x.classList.contains('active'));const t=(b?.textContent||'').toLowerCase();return t.includes('customer')?'CUSTOMER':t.includes('peer manufacturing')?'MFG':t.includes('peer distribution')?'DIST':'ALL'}
function tip(){return document.getElementById('fiGeoTooltip')}
function show(e,s){const t=tip();if(!t)return;t.innerHTML=`<strong>${s.company}</strong><span>${s.site}</span><span>${s.place}</span><span>${s.kind}</span><small>Click marker to open public source</small>`;t.classList.add('show');move(e)}
function move(e){const t=tip();if(!t)return;t.style.left=Math.min(window.innerWidth-280,e.clientX+14)+'px';t.style.top=Math.min(window.innerHeight-130,e.clientY+14)+'px'}
function hide(){tip()?.classList.remove('show')}
function addExtra(svg){const geo=window.FI_GEO_MAP;if(!geo||!svg.querySelector('.v14-country-layer'))return;svg.querySelectorAll('.v16-extra-customer-layer').forEach(x=>x.remove());if(!['ALL','CUSTOMER'].includes(mode()))return;const layer=document.createElementNS(NS,'g');layer.setAttribute('class','v16-extra-customer-layer');for(const s of extra){const [x,y]=geo.naXY(s.lat,s.lon);if(x<0||x>1000||y<0||y>560)continue;const g=document.createElementNS(NS,'g');g.setAttribute('class','v16-extra-customer');const c=document.createElementNS(NS,'circle');c.setAttribute('cx',x.toFixed(1));c.setAttribute('cy',y.toFixed(1));c.setAttribute('r',s.kind.includes('OEM')?'8':'6');c.setAttribute('class',s.kind.includes('OEM')?'v16-oem':'v16-commercial');c.dataset.source=s.src;const title=document.createElementNS(NS,'title');title.textContent=`${s.company} — ${s.site} | ${s.place} | ${s.kind}`;c.appendChild(title);c.addEventListener('mouseenter',e=>show(e,s));c.addEventListener('mousemove',move);c.addEventListener('mouseleave',hide);c.addEventListener('click',()=>window.open(s.src,'_blank','noopener'));g.appendChild(c);layer.appendChild(g)}svg.appendChild(layer)}
function legend(){const cap=app.querySelector('.v13-capacity');if(!cap)return;let l=cap.querySelector('.v16-map-legend');if(!l){l=document.createElement('div');l.className='v16-map-legend';l.innerHTML='<span><i class="oem"></i> OEM assembly / manufacturing</span><span><i class="commercial"></i> Customer distributor / supply-chain footprint</span><span><i class="peer"></i> Peer footprint (existing layer)</span>';cap.querySelector('.v15-customer-note')?.insertAdjacentElement('afterend',l)}l.style.display=['ALL','CUSTOMER'].includes(mode())?'flex':'none'}
function reinforce(){window.FI_GEO_MAP?.schedule();setTimeout(()=>{app.querySelectorAll('svg.v13-na').forEach(addExtra);legend()},90)}
let timer;function schedule(){clearTimeout(timer);timer=setTimeout(reinforce,50)}
new MutationObserver(schedule).observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
app.addEventListener('click',e=>{if(e.target.closest('.v13-cap-controls button')){setTimeout(window.FI_GEO_MAP?.schedule,0);setTimeout(window.FI_GEO_MAP?.schedule,100);setTimeout(schedule,180)}},true);
schedule();
})();