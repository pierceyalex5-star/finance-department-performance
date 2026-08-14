  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmtDate = s => s ? new Date(s+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) : '';
  const uid = p => `${p}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;

  let ACCESS = localStorage.getItem('d365_ct_key') || '';
  let state = null, library = null, page='cockpit', selectedStream='O2C', streamTab='overview', asIsView='text';
  let selectedFlow=null, selectedNode=null, selectedSummary=null, pollTimer=null;

  const navItems = [
    ['cockpit','Cockpit'],['streams','Value Streams'],['people','People'],['execution','Execution'],['governance','Governance'],['roadmap','Roadmap']
  ];

  function actor(){ return ($('#actorInput')?.value || localStorage.getItem('d365_ct_actor') || 'Team member').trim(); }
  function setSync(kind,text){ const dot=$('#syncDot'); if(!dot)return; dot.className='sync-dot '+kind; $('#syncText').textContent=text; }
  async function api(url, options={}){
    options.headers = {...(options.headers||{}),'X-D365-Key':ACCESS};
    if(options.body && typeof options.body !== 'string'){ options.headers['Content-Type']='application/json'; options.body=JSON.stringify(options.body); }
    const r=await fetch(url,options); const data=await r.json().catch(()=>({}));
    if(r.status===401){ lock(); throw new Error('Unauthorized'); }
    if(!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
    return data;
  }

  async function authenticate(){
    const key=$('#accessKeyInput').value.trim(); if(!key)return;
    $('#authError').textContent='';
    try{ ACCESS=key; const d=await api('/api/state?bundle=1'); state=d.state; library=d.library; localStorage.setItem('d365_ct_key',key); openApp(); }
    catch(e){ $('#authError').textContent='Access key not accepted.'; }
  }
  function lock(){ localStorage.removeItem('d365_ct_key'); ACCESS=''; state=null; library=null; clearInterval(pollTimer); $('#app').classList.add('hidden'); $('#authGate').classList.remove('hidden'); $('#accessKeyInput').value=''; }
  async function boot(){
    $('#accessBtn').addEventListener('click',authenticate); $('#accessKeyInput').addEventListener('keydown',e=>{if(e.key==='Enter')authenticate()});
    $('#modalClose').addEventListener('click',closeModal); $('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
    if(ACCESS){ try{const d=await api('/api/state?bundle=1'); state=d.state; library=d.library; openApp();}catch{} }
  }
  function openApp(){
    $('#authGate').classList.add('hidden'); $('#app').classList.remove('hidden');
    renderNav();
    const savedActor=localStorage.getItem('d365_ct_actor'); if(savedActor)$('#actorInput').value=savedActor;
    $('#actorInput').addEventListener('change',()=>localStorage.setItem('d365_ct_actor',actor()));
    $('#refreshBtn').onclick=refreshState; $('#lockBtn').onclick=lock;
    setSync('ok','Live · synced'); render();
    clearInterval(pollTimer); pollTimer=setInterval(refreshState,(state.settings?.refreshSeconds||30)*1000);
  }
  function renderNav(){ $('#nav').innerHTML=navItems.map(([id,label])=>`<button class="nav-btn ${page===id?'active':''}" data-page="${id}">${label}</button>`).join('');
    $$('.nav-btn').forEach(b=>b.onclick=()=>{page=b.dataset.page;renderNav();render();}); }
  async function refreshState(){
    if(!state)return; setSync('busy','Refreshing…');
    try{ const d=await api('/api/state?bundle=0'); if(d.state.version!==state.version){state=d.state;render();} setSync('ok','Live · synced'); }
    catch(e){setSync('bad','Sync error');}
  }
  async function mutate(action, rerender=true){
    action.actor=actor(); setSync('busy','Saving…');
    try{const d=await api('/api/action',{method:'POST',body:action}); state=d.state; setSync('ok','Saved'); if(rerender)render(); return true;}
    catch(e){setSync('bad','Save failed'); alert(e.message); return false;}
  }

  function titleForPage(){ return ({cockpit:'Executive Cockpit',streams:'Value Streams',people:'People & Ownership',execution:'Execution Control',governance:'Governance & Traceability',roadmap:'Program Roadmap'})[page]; }
  function render(){
    $('#pageTitle').textContent=titleForPage(); $('#breadcrumb').textContent=`D365 / ${titleForPage()}`;
    const content=$('#content');
    if(page==='cockpit') renderCockpit(content);
    else if(page==='streams') renderStreams(content);
    else if(page==='people') renderPeople(content);
    else if(page==='execution') renderExecution(content);
    else if(page==='governance') renderGovernance(content);
    else renderRoadmap(content);
  }

  function metric(label,value,sub=''){ return `<div class="card metric"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div><div class="sub">${esc(sub)}</div></div>`; }
  function streamChip(s){return `<button class="stream-chip ${selectedStream===s.id?'selected':''}" data-stream="${s.id}"><span class="code">${s.id}</span><strong>${esc(s.name)}</strong><small class="health ${s.health}">${esc(s.bpo)}</small></button>`;}
  function attachStreamChips(){ $$('.stream-chip').forEach(b=>b.onclick=()=>{selectedStream=b.dataset.stream; page='streams'; streamTab='overview'; renderNav();render();}); }

  function renderCockpit(root){
    const openTasks=state.tasks.filter(t=>!['Approved','Closed'].includes(t.status));
    const overdue=openTasks.filter(t=>t.due && new Date(t.due)<new Date());
    const openDec=state.decisions.filter(d=>d.status!=='Closed'); const highRisks=state.risks.filter(r=>r.status==='Open'&&r.impact==='High');
    const avg=Math.round(state.streams.reduce((a,s)=>a+(s.progress||0),0)/state.streams.length);
    root.innerHTML=`
      <div class="grid cols-4">${metric('Overall transformation progress',avg+'%','Current-state / mobilization weighted view')}${metric('Open tasks',openTasks.length,overdue.length+' overdue')}${metric('Open decisions',openDec.length,openDec.filter(x=>x.due).length+' with target dates')}${metric('High-impact risks',highRisks.length,'Requires active mitigation')}</div>
      <div class="section-head"><div><h2>Enterprise value chain</h2><p>Click a value stream to open its workspace.</p></div></div>
      <div class="value-chain">${state.streams.map(streamChip).join('')}</div>
      <div class="section-head"><div><h2>Transformation heatmap</h2><p>As-Is → pain points → requirements → To-Be → fit/gap → build → test → readiness.</p></div></div>
      <div class="card table-wrap"><table class="table heatmap"><thead><tr><th>Value stream</th><th>As-Is</th><th>Pain Points</th><th>Requirements</th><th>To-Be</th><th>Fit/Gap</th><th>Build</th><th>Testing</th><th>Readiness</th></tr></thead><tbody>${state.streams.map(s=>{
        const hasMap=library.flows.some(f=>f.stream===s.id), req=state.requirements.filter(r=>r.stream===s.id).length;
        return `<tr class="clickable" data-streamrow="${s.id}"><td><strong>${s.id}</strong> · ${esc(s.name)}</td><td class="hm ${hasMap?'active':'wait'}">${hasMap?'Validate':'Not loaded'}</td><td class="hm ${library.painPoints.some(p=>p.stream===s.id)?'active':'wait'}">${library.painPoints.filter(p=>p.stream===s.id).length||'—'}</td><td class="hm ${req?'active':'wait'}">${req||'—'}</td><td class="hm wait">Planned</td><td class="hm wait">Planned</td><td class="hm wait">—</td><td class="hm wait">—</td><td class="hm wait">—</td></tr>`}).join('')}</tbody></table></div>
      <div class="grid cols-2" style="margin-top:16px">
        <div class="card pad"><div class="section-head" style="margin:0 0 8px"><div><h2>Decisions blocking progress</h2></div></div>${openDec.slice(0,5).map(d=>`<div style="padding:10px 0;border-top:1px solid var(--line)"><div class="tag ${d.status==='Open'?'amber':'gray'}">${esc(d.status)}</div> <strong style="font-size:12px">${esc(d.title)}</strong><div class="muted" style="font-size:11px;margin-top:5px">${esc(d.impact||'')}</div></div>`).join('')||'<p class="muted">No open decisions.</p>'}</div>
        <div class="card pad"><div class="section-head" style="margin:0 0 8px"><div><h2>Key risks</h2></div></div>${highRisks.slice(0,5).map(r=>`<div style="padding:10px 0;border-top:1px solid var(--line)"><span class="tag red">${esc(r.probability)} / ${esc(r.impact)}</span> <strong style="font-size:12px">${esc(r.title)}</strong><div class="muted" style="font-size:11px;margin-top:5px">${esc(r.mitigation||'')}</div></div>`).join('')}</div>
      </div>`;
    attachStreamChips(); $$('[data-streamrow]').forEach(r=>r.onclick=()=>{selectedStream=r.dataset.streamrow;page='streams';renderNav();render();});
  }

