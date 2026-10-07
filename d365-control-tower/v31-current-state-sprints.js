(function(){
'use strict';
const VIEW='currentstate';
const tr=(en,fr)=>document.documentElement.lang==='fr'?fr:en;
const escV=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TODAY=()=>typeof today==='function'?today():new Date().toISOString().slice(0,10);
const SPRINTS=[
 {w:1,start:'2026-10-05',end:'2026-10-11',en:'Scope & Process Inventory',fr:'Portée et inventaire des processus',outEn:'Scope, owners, systems and L0/L1 inventory',outFr:'Portée, responsables, systèmes et inventaire L0/L1'},
 {w:2,start:'2026-10-12',end:'2026-10-18',en:'Core Process Mapping · Part 1',fr:'Documentation des processus · Partie 1',outEn:'First major portion of end-to-end current state',outFr:'Première portion majeure de l’état actuel de bout en bout'},
 {w:3,start:'2026-10-19',end:'2026-10-25',en:'Core Process Mapping · Part 2',fr:'Documentation des processus · Partie 2',outEn:'Continue core transaction flow',outFr:'Poursuivre le flux transactionnel principal'},
 {w:4,start:'2026-10-26',end:'2026-11-01',en:'Core Process Mapping · Part 3',fr:'Documentation des processus · Partie 3',outEn:'Complete main operational flow',outFr:'Compléter le flux opérationnel principal'},
 {w:5,start:'2026-11-02',end:'2026-11-08',en:'Cross-Functional Interfaces',fr:'Interfaces interfonctionnelles',outEn:'Handoffs across functions, sites and entities',outFr:'Transferts entre fonctions, sites et entités'},
 {w:6,start:'2026-11-09',end:'2026-11-15',en:'Controls & Approvals',fr:'Contrôles et approbations',outEn:'Controls, approvals and segregation of duties',outFr:'Contrôles, approbations et séparation des tâches'},
 {w:7,start:'2026-11-16',end:'2026-11-22',en:'Systems & Manual Workarounds',fr:'Systèmes et contournements manuels',outEn:'Systems, spreadsheets, email and duplicate entry',outFr:'Systèmes, fichiers Excel, courriels et doubles saisies'},
 {w:8,start:'2026-11-23',end:'2026-11-29',en:'Exceptions & Variants',fr:'Exceptions et variantes',outEn:'Material exceptions and alternate scenarios',outFr:'Exceptions significatives et scénarios alternatifs'},
 {w:9,start:'2026-11-30',end:'2026-12-06',en:'Challenge & Completeness Review',fr:'Revue de complétude et défi',outEn:'SME challenge, contradictions and missing ownership',outFr:'Validation SME, contradictions et responsabilités manquantes'},
 {w:10,start:'2026-12-07',end:'2026-12-13',en:'End-to-End Validation & Sign-Off',fr:'Validation de bout en bout et approbation',outEn:'Validated current-state baseline',outFr:'Référence d’état actuel validée'}
];
const MILESTONE='2026-12-31';

function dataSafe(){try{return typeof data==='function'?data():{}}catch(_){return{}}}
function allProcesses(){const d=dataSafe(),out=[];Object.entries(d.subprocesses||{}).forEach(([stream,ps])=>(ps||[]).forEach(p=>out.push({...p,stream})));return out}
function sprintState(s){const t=TODAY();return t>s.end?'done':t>=s.start&&t<=s.end?'current':'future'}
function fmt(d){try{return new Intl.DateTimeFormat(document.documentElement.lang==='fr'?'fr-CA':'en-CA',{month:'short',day:'numeric'}).format(new Date(d+'T00:00:00'))}catch(_){return d}}
function milestonePct(){const start=new Date('2026-10-05T00:00:00'),end=new Date(MILESTONE+'T00:00:00'),now=new Date(TODAY()+'T00:00:00');return Math.max(0,Math.min(100,Math.round(100*(now-start)/(end-start))))}
function statusTone(s){const x=String(s||'').toLowerCase();return /valid|approv|complete|closed/.test(x)?'good':/block|overdue/.test(x)?'bad':/progress|review|draft/.test(x)?'warn':''}
function ownerFor(stream){const d=dataSafe();const s=[...(d.valueStreams||[]),...(d.crossFunctional||[])].find(x=>x.id===stream);return s?.bpo||'TBD'}
function processRows(){
 const ps=allProcesses();
 return ps.map((p,i)=>{
   const sw=Math.min(10,Math.max(2,2+(i%4)));
   return '<tr>'+
    '<td><b>'+escV(p.stream)+'</b></td>'+
    '<td>'+escV(p.id||'')+'</td>'+
    '<td><b>'+escV(p.name||'')+'</b></td>'+
    '<td>'+escV(ownerFor(p.stream))+'</td>'+
    '<td><span class="v31-pill">'+tr('TBD','À confirmer')+'</span></td>'+
    '<td><span class="v31-pill">'+tr('TBD','À confirmer')+'</span></td>'+
    '<td>'+sw+'</td>'+
    '<td><span class="v31-pill '+statusTone(p.status)+'">'+escV(p.status||tr('Not started','Non débuté'))+'</span></td>'+
    '<td class="muted">—</td><td class="muted">—</td><td class="muted">—</td><td class="muted">—</td>'+
    '<td>0</td><td class="muted">—</td><td class="muted">—</td><td class="muted">—</td>'+
   '</tr>'
 }).join('')
}
function renderPage(){
 const d=dataSafe(),ps=allProcesses(),validated=ps.filter(p=>/valid|approv|complete/i.test(p.status||'')).length,current=SPRINTS.find(s=>sprintState(s)==='current');
 const streams=new Set(ps.map(p=>p.stream)).size;
 return '<div class="v31-shell">'+
  '<div class="v31-hero">'+
   '<section class="v31-card"><h1>'+tr('Current-State Sprint Control','Contrôle des sprints · État actuel')+'</h1><p>'+tr('Common 10-week framework for all process streams. Focus: document and validate how the business operates today; future-state ideas remain parked for later design.','Cadre commun de 10 semaines pour tous les processus. Objectif : documenter et valider le fonctionnement actuel; les idées d’état futur demeurent dans le stationnement prévu à cet effet.')+'</p></section>'+
   '<section class="v31-card v31-milestone"><small>'+tr('Phase 0.1 milestone','Jalon Phase 0.1')+'</small><strong>'+tr('December 31, 2026','31 décembre 2026')+'</strong><span>'+tr('10-week sprint work completes by Dec 13, leaving validation buffer to month-end.','Les 10 semaines se terminent le 13 décembre, avec une marge de validation jusqu’à la fin du mois.')+'</span><div class="v31-progress"><i style="width:'+milestonePct()+'%"></i></div></section>'+
  '</div>'+
  '<div class="v31-kpis">'+
   '<div class="v31-kpi"><small>'+tr('Current sprint','Sprint actuel')+'</small><b>'+(current?'W'+current.w:'—')+'</b></div>'+
   '<div class="v31-kpi"><small>'+tr('Process streams','Processus / chaînes')+'</small><b>'+streams+'</b></div>'+
   '<div class="v31-kpi"><small>'+tr('Processes inventoried','Processus recensés')+'</small><b>'+ps.length+'</b></div>'+
   '<div class="v31-kpi"><small>'+tr('Validated / approved','Validés / approuvés')+'</small><b>'+validated+'</b></div>'+
   '<div class="v31-kpi"><small>'+tr('Phase 0.1 target','Cible Phase 0.1')+'</small><b>'+Math.max(0,Math.ceil((new Date(MILESTONE+'T00:00:00')-new Date(TODAY()+'T00:00:00'))/86400000))+'d</b></div>'+
  '</div>'+
  '<div class="v31-section-head"><div><h2>'+tr('10-week sprint plan','Plan de sprints · 10 semaines')+'</h2><p>'+tr('A common cadence; Weeks 2–5 are adapted to each process stream.','Une cadence commune; les semaines 2 à 5 sont adaptées à chaque processus.')+'</p></div></div>'+
  '<div class="v31-sprints">'+SPRINTS.map(s=>'<article class="v31-sprint '+sprintState(s)+'"><span class="state">'+(sprintState(s)==='done'?tr('Complete','Terminé'):sprintState(s)==='current'?tr('Current','Actuel'):tr('Upcoming','À venir'))+'</span><span class="wk">'+tr('Week','Semaine')+' '+s.w+'</span><h3>'+escV(tr(s.en,s.fr))+'</h3><p>'+escV(tr(s.outEn,s.outFr))+'</p><time>'+fmt(s.start)+' – '+fmt(s.end)+'</time></article>').join('')+'</div>'+
  '<div class="v31-section-head"><div><h2>'+tr('Process inventory / sprint tracker','Inventaire des processus / suivi des sprints')+'</h2><p>'+tr('Control Tower roll-up fields aligned to the current-state template.','Champs de suivi de la tour de contrôle alignés au gabarit d’état actuel.')+'</p></div></div>'+
  '<div class="v31-table-wrap"><table class="v31-table"><thead><tr>'+
   ['Process Stream','Process ID','Process Name','BPO','Process Owner','Materiality','Sprint Week','Status','Template Completed','Controls Reviewed','Exceptions Reviewed','Pain Points Logged','Open Questions','SME Validated','Owner Approved','Comments / Blockers'].map(x=>'<th>'+escV(tr(x,({'Process Stream':'Processus / chaîne','Process ID':'ID processus','Process Name':'Nom du processus','Process Owner':'Responsable du processus','Materiality':'Matérialité','Sprint Week':'Semaine sprint','Status':'Statut','Template Completed':'Gabarit complété','Controls Reviewed':'Contrôles revus','Exceptions Reviewed':'Exceptions revues','Pain Points Logged':'Irritants consignés','Open Questions':'Questions ouvertes','SME Validated':'Validé SME','Owner Approved':'Approuvé responsable','Comments / Blockers':'Commentaires / blocages'}[x]||x)))+'</th>').join('')+
   '</tr></thead><tbody>'+processRows()+'</tbody></table></div>'+
  '<div class="v31-section-head"><div><h2>'+tr('Standard documentation framework','Cadre standard de documentation')+'</h2></div></div>'+
  '<div class="v31-framework">'+
   '<div><b>'+tr('Process definition','Définition du processus')+'</b><span>'+tr('Objective · Trigger · Start / end · In / out of scope · Frequency · Volume · Sites / entities','Objectif · Déclencheur · Début / fin · Dans / hors portée · Fréquence · Volume · Sites / entités')+'</span></div>'+
   '<div><b>'+tr('Current-state detail','Détail de l’état actuel')+'</b><span>'+tr('Activities · Roles · Systems · Inputs / outputs · Decisions · Controls · Exceptions','Activités · Rôles · Systèmes · Entrées / sorties · Décisions · Contrôles · Exceptions')+'</span></div>'+
   '<div><b>'+tr('Supporting logs','Registres de soutien')+'</b><span>'+tr('Pain points · Open questions / gaps · Future-state parking lot · Cross-functional handoffs','Irritants · Questions / écarts · Stationnement état futur · Transferts interfonctionnels')+'</span></div>'+
  '</div>'+
 '</div>'
}
function ensureNav(){
 const nav=document.getElementById('mainNav');
 if(nav&&!nav.querySelector('[data-view="'+VIEW+'"]')){
   const b=document.createElement('button');b.dataset.view=VIEW;b.textContent=tr('Current State Sprints','Sprints État actuel');
   const exec=nav.querySelector('[data-view="execution"]');nav.insertBefore(b,exec||null);
 }
 const side=document.getElementById('v25Sidebar');
 if(side&&!side.querySelector('[data-v25-view="'+VIEW+'"]')){
   const b=document.createElement('button');b.type='button';b.dataset.v25View=VIEW;b.innerHTML='<span>▤</span><b>'+escV(tr('Current State','État actuel'))+'</b>';
   const exec=side.querySelector('[data-v25-view="execution"]');side.querySelector('nav')?.insertBefore(b,exec||null);
   b.addEventListener('click',()=>{try{view=VIEW;render()}catch(_){}});
 }
}
function apply(){
 ensureNav();
 let v='';try{v=view}catch(_){}
 if(v===VIEW){
   const app=document.getElementById('app');if(app)app.innerHTML=renderPage();
   document.querySelectorAll('#mainNav [data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===VIEW));
   document.querySelectorAll('#v25Sidebar [data-v25-view]').forEach(b=>b.classList.toggle('active',b.dataset.v25View===VIEW));
 }
}
const prev=render;
render=function(){const out=prev.apply(this,arguments);try{apply()}catch(e){console.warn('[V31]',e)}return out};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{ensureNav();apply()},0));else setTimeout(()=>{ensureNav();apply()},0);
window.D365_V31={apply,SPRINTS};
})();