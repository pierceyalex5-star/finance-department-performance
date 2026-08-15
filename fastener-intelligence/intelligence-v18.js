(()=>{
const app=document.getElementById('app');if(!app)return;const NS='http://www.w3.org/2000/svg';
const ford=[
 {company:'Ford Motor Company',site:'Dearborn Truck Plant',place:'Dearborn, MI',lat:42.31,lon:-83.18,detail:'F-150 / Raptor assembly',src:'https://corporate.ford.com/operations/locations/global-plants/'},
 {company:'Ford Motor Company',site:'Kansas City Assembly Plant',place:'Claycomo, MO',lat:39.20,lon:-94.48,detail:'F-150 / Transit / E-Transit assembly',src:'https://corporate.ford.com/operations/locations/global-plants/'},
 {company:'Ford Motor Company',site:'Kentucky Truck Plant',place:'Louisville, KY',lat:38.34,lon:-85.55,detail:'Super Duty / Expedition / Navigator assembly',src:'https://corporate.ford.com/operations/locations/global-plants/'},
 {company:'Ford Motor Company',site:'Michigan Assembly Plant',place:'Wayne, MI',lat:42.28,lon:-83.39,detail:'Ranger / Bronco assembly',src:'https://corporate.ford.com/operations/locations/global-plants/'}
];
function mode(){const b=[...app.querySelectorAll('.v13-cap-controls button')].find(x=>x.classList.contains('active'));const t=(b?.textContent||'').toLowerCase();return t.includes('customer')?'CUSTOMER':t.includes('peer manufacturing')?'MFG':t.includes('peer distribution')?'DIST':'ALL'}
function tip(){return document.getElementById('fiGeoTooltip')}
function move(e){const t=tip();if(!t)return;t.style.left=Math.min(window.innerWidth-300,e.clientX+14)+'px';t.style.top=Math.min(window.innerHeight-150,e.clientY+14)+'px'}
function show(e,s){const t=tip();if(!t)return;t.innerHTML=`<strong>${s.company}</strong><span>${s.site}</span><span>${s.place}</span><span>Customer / OEM assembly</span><span>${s.detail}</span><small>Click marker to open Ford source</small>`;t.classList.add('show');move(e)}
function hide(){tip()?.classList.remove('show')}
function addFord(svg){const geo=window.FI_GEO_MAP;if(!geo)return;svg.querySelectorAll('.v18-ford-layer').forEach(x=>x.remove());if(!['ALL','CUSTOMER'].includes(mode()))return;const layer=document.createElementNS(NS,'g');layer.setAttribute('class','v18-ford-layer');for(const s of ford){const [x,y]=geo.naXY(s.lat,s.lon);const c=document.createElementNS(NS,'circle');c.setAttribute('cx',x.toFixed(1));c.setAttribute('cy',y.toFixed(1));c.setAttribute('r','8');c.setAttribute('class','v18-ford');const title=document.createElementNS(NS,'title');title.textContent=`${s.company} — ${s.site} | ${s.place} | ${s.detail}`;c.appendChild(title);c.addEventListener('mouseenter',e=>show(e,s));c.addEventListener('mousemove',move);c.addEventListener('mouseleave',hide);c.addEventListener('click',()=>window.open(s.src,'_blank','noopener'));layer.appendChild(c)}svg.appendChild(layer)}
function enhance(){app.querySelectorAll('svg.v13-na').forEach(addFord)}
let timer;function schedule(){clearTimeout(timer);timer=setTimeout(enhance,80)}new MutationObserver(schedule).observe(app,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});app.addEventListener('click',e=>{if(e.target.closest('.v13-cap-controls button'))setTimeout(schedule,120)},true);schedule();
})();