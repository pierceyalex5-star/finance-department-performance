// D365 Control Tower V2 executive refinements.
// Keeps the static GitHub Pages architecture and adds Business Owner / Steering Committee governance aids.

const _ensureV2StateExecutive = ensureV2State;
ensureV2State = function(){
  _ensureV2StateExecutive();
  const decisions=vreg('decisions');
  const seed={
    id:'DEC-PRG-007',category:'Governance',stream:'Program',
    title:'Use an explicit Steering Committee escalation and decision-capture workflow in the D365 Control Tower.',
    background:'The Business Owner requested that Steering Committee escalations be visible directly in the Steering Committee view and that project decisions be documented from this point forward.',
    options:'Track escalations and decisions outside the Control Tower; show them only in Governance; manage them explicitly in both Governance and Steering Committee views.',
    recommendation:'Use explicit escalation objects linked to decisions or RAID items, with committee date, recommendation, resolution and status.',
    decisionOutcome:'Approved: Steering Committee escalations and documented decisions are managed directly in the Control Tower.',
    rationale:'This creates a durable governance record and keeps executive action items separate from ordinary project tasks.',
    owner:'Business Owner',status:'Decided',decisionDate:'2026-08-14',escalateToSteering:false
  };
  if(!decisions.some(x=>x.id===seed.id))decisions.push(clone(seed));
};

function businessOwnerInboxHtml(){
  const d=data();
  const decisions=(d.decisions||[]).filter(x=>!['Closed','Decided'].includes(x.status));
  const escalations=(d.escalations||[]).filter(x=>!['Closed','Resolved'].includes(x.status));
  const highRaid=(d.raid||[]).filter(x=>!['Closed','Resolved'].includes(x.status)&&['High','Critical'].includes(x.severity));
  const blocked=(d.tasks||[]).filter(x=>!['Closed','Approved'].includes(x.status)&&(x.status==='Waiting'||x.status==='Blocked'));
  const total=decisions.length+escalations.length+highRaid.length+blocked.length;
  return `<div class="section-title"><h2>Business Owner inbox</h2><span>${total} item${total===1?'':'s'} requiring management attention</span></div>
  <div class="grid four-col bo-inbox">
    <div class="card pad"><div class="inbox-head"><span>Decisions</span><b>${decisions.length}</b></div>${decisions.slice(0,5).map(x=>`<button class="inbox-row" data-edit-decision="${x.id}"><b>${esc(x.title)}</b><small>${esc(x.stream||'Program')} · ${esc(x.owner||'')} ${x.due?'· '+esc(x.due):''}</small></button>`).join('')||'<div class="empty mini">No open decisions.</div>'}</div>
    <div class="card pad"><div class="inbox-head"><span>Steering escalations</span><b>${escalations.length}</b></div>${escalations.slice(0,5).map(x=>`<button class="inbox-row" data-edit-escalation="${x.id}"><b>${esc(x.title)}</b><small>${esc(x.type||'Escalation')} · ${esc(x.committeeDate||'date TBD')}</small></button>`).join('')||'<div class="empty mini">No open escalations.</div>'}</div>
    <div class="card pad"><div class="inbox-head"><span>High / critical RAID</span><b>${highRaid.length}</b></div>${highRaid.slice(0,5).map(x=>`<button class="inbox-row" data-edit-raid="${x.id}"><b>${esc(x.title||x.description)}</b><small>${esc(x.stream||'Program')} · ${esc(x.severity)}</small></button>`).join('')||'<div class="empty mini">No high-priority RAID items.</div>'}</div>
    <div class="card pad"><div class="inbox-head"><span>Blocked / waiting</span><b>${blocked.length}</b></div>${blocked.slice(0,5).map(x=>`<button class="inbox-row" data-edit-task="${x.id}"><b>${esc(x.title)}</b><small>${esc(x.stream||'Program')} · ${esc(x.owner||'')}</small></button>`).join('')||'<div class="empty mini">No blocked tasks.</div>'}</div>
  </div>`;
}

const _renderCockpitExecutive = renderCockpit;
renderCockpit = function(){
  const html=_renderCockpitExecutive();
  const marker='<div class="section-title"><h2>30 / 60 / 90 day outlook</h2>';
  return html.includes(marker)?html.replace(marker,businessOwnerInboxHtml()+marker):html+businessOwnerInboxHtml();
};

const _renderSteeringExecutive = renderSteering;
renderSteering = function(){
  let html=_renderSteeringExecutive();
  const oldButton='<button class="btn primary" id="addEscalation">+ Escalate to Steering Committee</button>';
  const newButtons='<div class="button-row"><button class="btn" id="addDecision">+ Document decision</button><button class="btn primary" id="addEscalation">+ Escalate to Steering Committee</button></div>';
  html=html.replace(oldButton,newButtons);
  const guide=`<div class="card steering-guide"><div><b>1 · Escalate</b><small>Raise a decision, risk, issue, dependency, scope, schedule or resource item.</small></div><div><b>2 · Committee action</b><small>Record the recommendation, committee date and required decision.</small></div><div><b>3 · Resolve</b><small>Capture the committee resolution and close or return the item for analysis.</small></div></div>`;
  const marker='<div class="section-title"><h2>Steering Committee escalations</h2>';
  return html.includes(marker)?html.replace(marker,guide+marker):html+guide;
};
