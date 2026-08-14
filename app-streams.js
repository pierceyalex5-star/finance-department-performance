  function currentStream(){ return state.streams.find(s=>s.id===selectedStream)||state.streams[0]; }
  function renderStreams(root){
    const s=currentStream();
    root.innerHTML=`<div class="value-chain">${state.streams.map(streamChip).join('')}</div>
      <div class="card hero-card" style="margin-top:16px"><div class="hero-top"><div><span class="tag">${s.id}</span><h2>${esc(s.name)}</h2><p>BPO: <strong>${esc(s.bpo)}</strong> · ${esc(s.status)}</p></div><div style="min-width:210px"><div class="alloc"><span>Stream progress</span><strong>${s.progress||0}%</strong></div><div class="progress"><span style="width:${s.progress||0}%"></span></div></div></div></div>
      <div class="tabs">${[['overview','Overview'],['asis','As-Is'],['pain','Pain Points'],['requirements','Requirements'],['tobe','To-Be / Fit-Gap']].map(([id,l])=>`<button class="tab ${streamTab===id?'active':''}" data-stab="${id}">${l}</button>`).join('')}</div>
      <div id="streamPanel" style="margin-top:16px"></div>`;
    attachStreamChips(); $$('[data-stab]').forEach(b=>b.onclick=()=>{streamTab=b.dataset.stab;renderStreams(root)});
    const panel=$('#streamPanel');
    if(streamTab==='overview') renderStreamOverview(panel,s); else if(streamTab==='asis') renderAsIs(panel,s); else if(streamTab==='pain') renderPain(panel,s); else if(streamTab==='requirements') renderRequirements(panel,s); else renderToBe(panel,s);
  }
  function renderStreamOverview(root,s){
    const blue=library.blueprints[s.id]||[], pp=library.painPoints.filter(x=>x.stream===s.id), flows=library.flows.filter(x=>x.stream===s.id), req=state.requirements.filter(x=>x.stream===s.id);
    root.innerHTML=`<div class="stream-overview"><div class="card pad"><div class="section-head" style="margin:0 0 10px"><div><h2>L2 process blueprint</h2><p>Enterprise value-stream taxonomy from the project structure.</p></div></div><ol style="columns:2;column-gap:30px;padding-left:22px">${blue.map(x=>`<li style="font-size:12px;margin:7px 0;break-inside:avoid">${esc(x)}</li>`).join('')}</ol></div>
      <div class="grid"><div class="card metric"><div class="label">Imported Visio pages</div><div class="value">${flows.length}</div><div class="sub">Editable flow view available</div></div><div class="card metric"><div class="label">Pain points / opportunities</div><div class="value">${pp.length}</div><div class="sub">Structured from current-state package</div></div><div class="card metric"><div class="label">Draft requirements</div><div class="value">${req.length}</div><div class="sub">Traceable back to source issue</div></div></div></div>
      <div class="section-head"><div><h2>Handoff / boundary</h2><p>Use the end-to-end value stream as the governance boundary, not the department org chart.</p></div></div><div class="card pad"><strong>${esc(s.name)}</strong><p class="muted" style="font-size:12px;line-height:1.55">Process decisions, pain points and requirements should be owned here even when activities cross Sales, Operations, Supply Chain, Finance, IT or Quality. Cross-functional Master Data and Quality remain linked capabilities.</p></div>`;
  }

  function flowsForStream(id){ return library.flows.filter(f=>f.stream===id); }
  function summariesForStream(id){ return library.summaries.filter(x=>x.stream===id); }
  function renderAsIs(root,s){
    const flows=flowsForStream(s.id), sums=summariesForStream(s.id);
    if(!selectedFlow || !flows.some(f=>f.id===selectedFlow)) selectedFlow=flows[0]?.id||null;
    if(!selectedSummary || !sums.some(x=>x.id===selectedSummary)) selectedSummary=sums[0]?.id||null;
    root.innerHTML=`<div class="toolbar" style="justify-content:space-between;margin-bottom:10px"><div class="toolbar"><div class="segmented"><button data-view="text" class="${asIsView==='text'?'active':''}">Process text</button><button data-view="flow" class="${asIsView==='flow'?'active':''}">Flow chart</button></div>
      ${asIsView==='text'?`<select id="summarySelect">${sums.map(x=>`<option value="${x.id}" ${x.id===selectedSummary?'selected':''}>${esc(x.title)}</option>`).join('')}</select>`:`<select id="flowSelect">${flows.map(x=>`<option value="${x.id}" ${x.id===selectedFlow?'selected':''}>${esc(x.pageName)} · ${esc(x.title)}</option>`).join('')}</select>`}</div>
      ${asIsView==='flow'?'<button id="addFlowNode" class="btn primary small">+ Add step</button>':''}</div><div id="asisBody"></div>`;
    $$('[data-view]').forEach(b=>b.onclick=()=>{asIsView=b.dataset.view;renderAsIs(root,s)});
    if(asIsView==='text'){ $('#summarySelect')?.addEventListener('change',e=>{selectedSummary=e.target.value;renderAsIs(root,s)}); renderTextProcess($('#asisBody'),s,sums); }
    else { $('#flowSelect')?.addEventListener('change',e=>{selectedFlow=e.target.value; selectedNode=null; renderAsIs(root,s)}); $('#addFlowNode').onclick=()=>addFlowNode(s); renderFlow($('#asisBody'),s,flows); }
  }
  function renderTextProcess(root,s,sums){
    const rec=sums.find(x=>x.id===selectedSummary); const noteKey=`${s.id}:${rec?.id||'general'}`; const note=state.processNotes?.[noteKey]||'';
    if(!rec){root.innerHTML=`<div class="card pad"><h3>No structured current-state summary imported for ${s.id}</h3><p class="muted">The enterprise blueprint is available. Add validation notes below while the detailed map is prepared.</p><div class="note-editor"><textarea id="procNote">${esc(note)}</textarea><button id="saveProcNote" class="btn primary small" style="margin-top:8px">Save note</button></div></div>`; $('#saveProcNote').onclick=()=>mutate({type:'process_note',key:noteKey,note:$('#procNote').value}); return;}
    const box=(title,items)=>`<div class="summary-box"><h4>${esc(title)}</h4>${items?.length?`<ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p class="muted" style="font-size:12px">No items captured.</p>'}</div>`;
    root.innerHTML=`<div class="card pad"><div class="section-head" style="margin:0 0 12px"><div><h2>${esc(rec.title)}</h2><p>Imported current-state consolidation summary; BPO/SME validation is still required.</p></div><span class="tag amber">As-Is draft</span></div><div class="summary-grid">${box('Systems used',rec['Systèmes utilisés'])}${box('Key observations',rec['Points retenus'])}${box('Pain points',rec['Points de douleur'])}${box('Opportunities',rec['Opportunités'])}</div>
      <div class="section-head"><div><h2>Validation / process narrative</h2><p>Editable team notes; auto-saved to the shared project database.</p></div></div><div class="note-editor"><textarea id="procNote" placeholder="Document trigger, inputs, roles, controls, exceptions, current workarounds, and validation notes…">${esc(note)}</textarea><button id="saveProcNote" class="btn primary small" style="margin-top:8px">Save note</button></div></div>`;
    $('#saveProcNote').onclick=()=>mutate({type:'process_note',key:noteKey,note:$('#procNote').value});
  }

  function mergedFlow(flow){
    const ov=state.processOverrides?.[flow.id]||{}; const nodeOverrides=ov.nodes||{};
    let nodes=flow.nodes.filter(n=>!nodeOverrides[n.id]?.deleted).map(n=>({...n,...nodeOverrides[n.id]}));
    nodes=nodes.concat((ov.addedNodes||[]).filter(n=>!n.deleted));
    const ids=new Set(nodes.map(n=>n.id)); let edges=flow.edges.filter(e=>ids.has(e.from)&&ids.has(e.to)); edges=edges.concat((ov.addedEdges||[]).filter(e=>ids.has(e.from)&&ids.has(e.to)));
    return {nodes,edges,ov};
  }
  function renderFlow(root,s,flows){
    const flow=flows.find(f=>f.id===selectedFlow); if(!flow){root.innerHTML='<div class="card pad"><p class="muted">No Visio process map has been imported for this value stream yet.</p></div>';return;}
    const {nodes,edges}=mergedFlow(flow);
    root.innerHTML=`<div class="flow-shell"><div class="flow-scroll"><div id="flowCanvas" class="flow-canvas"><svg id="flowSvg" class="flow-svg"><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#8aa0b9"></path></marker></defs></svg>${nodes.map(n=>`<div class="flow-node ${esc(n.kind)} ${selectedNode===n.id?'selected':''}" data-node="${n.id}" style="left:${n.x*1320+60}px;top:${n.y*680+35}px"><div class="system">${esc(n.system||'')}</div><div>${esc(n.label)}</div></div>`).join('')}</div></div><div id="flowInspector" class="flow-inspector"></div></div>`;
    const canvas=$('#flowCanvas'); drawEdges(edges,nodes); $$('.flow-node',canvas).forEach(el=>makeDraggable(el,flow)); renderInspector(flow,nodes);
  }
  function drawEdges(edges,nodes){
    const svg=$('#flowSvg'); if(!svg)return; const map=Object.fromEntries(nodes.map(n=>[n.id,n]));
    const lines=edges.map(e=>{const a=map[e.from],b=map[e.to];if(!a||!b)return'';const x1=a.x*1320+149,y1=a.y*680+62,x2=b.x*1320+149,y2=b.y*680+62;return `<path d="M${x1},${y1} C${(x1+x2)/2},${y1} ${(x1+x2)/2},${y2} ${x2},${y2}" fill="none" stroke="#8aa0b9" stroke-width="1.4" marker-end="url(#arrow)"/>`;}).join('');
    svg.insertAdjacentHTML('beforeend',lines);
  }
  function makeDraggable(el,flow){
    el.onclick=e=>{e.stopPropagation();selectedNode=el.dataset.node;renderAsIs($('#streamPanel'),currentStream())};
    let dragging=false,ox=0,oy=0;
    el.addEventListener('pointerdown',e=>{dragging=true;el.setPointerCapture(e.pointerId);ox=e.clientX-el.offsetLeft;oy=e.clientY-el.offsetTop;});
    el.addEventListener('pointermove',e=>{if(!dragging)return; const rect=$('#flowCanvas').getBoundingClientRect(); const left=Math.max(5,Math.min(1315,e.clientX-rect.left-ox)); const top=Math.max(5,Math.min(690,e.clientY-rect.top-oy));el.style.left=left+'px';el.style.top=top+'px';});
    el.addEventListener('pointerup',async e=>{if(!dragging)return;dragging=false;const id=el.dataset.node; const x=(parseFloat(el.style.left)-60)/1320,y=(parseFloat(el.style.top)-35)/680; await saveNodeOverride(flow,id,{x:Math.max(.01,Math.min(.97,x)),y:Math.max(.01,Math.min(.95,y))},false); renderAsIs($('#streamPanel'),currentStream());});
  }
  function renderInspector(flow,nodes){
    const box=$('#flowInspector'); const n=nodes.find(x=>x.id===selectedNode);
    if(!n){box.innerHTML=`<h3>Flow editor</h3><p class="muted" style="font-size:12px;line-height:1.5">Drag process steps to reposition them. Click a step to edit its text/system or remove it. Changes are stored as overrides, preserving the imported Visio baseline.</p><div class="tag">${flow.nodes.length} imported nodes</div><div class="tag gray" style="margin-left:4px">${flow.edges.length} connectors</div>`;return;}
    box.innerHTML=`<h3>Edit process step</h3><div class="field"><label>Activity</label><textarea id="nodeLabel">${esc(n.label)}</textarea></div><div class="field"><label>System / tool</label><input id="nodeSystem" value="${esc(n.system||'')}" /></div><div class="field"><label>Type</label><select id="nodeKind">${['activity','decision','start','end','document','label'].map(k=>`<option ${n.kind===k?'selected':''}>${k}</option>`).join('')}</select></div><div class="toolbar"><button id="saveNode" class="btn primary small">Save step</button><button id="deleteNode" class="btn danger small">Remove</button></div>`;
    $('#saveNode').onclick=async()=>{await saveNodeOverride(flow,n.id,{label:$('#nodeLabel').value,system:$('#nodeSystem').value,kind:$('#nodeKind').value});};
    $('#deleteNode').onclick=async()=>{if(confirm('Remove this step from the editable As-Is view? The imported baseline is preserved.')){await saveNodeOverride(flow,n.id,{deleted:true});selectedNode=null;}};
  }
  async function saveNodeOverride(flow,id,patch,rerender=true){
    const ov=structuredClone(state.processOverrides?.[flow.id]||{}); ov.nodes ||= {};
    const added=(ov.addedNodes||[]).find(n=>n.id===id);
    if(added) Object.assign(added,patch); else ov.nodes[id]={...(ov.nodes[id]||{}),...patch};
    await mutate({type:'process_override',flowId:flow.id,override:ov},rerender); if(rerender)renderAsIs($('#streamPanel'),currentStream());
  }
  function addFlowNode(s){
    const flow=flowsForStream(s.id).find(f=>f.id===selectedFlow); if(!flow)return;
    const id=uid('USR'); const ov=structuredClone(state.processOverrides?.[flow.id]||{}); ov.addedNodes ||= []; ov.addedNodes.push({id,label:'New process step',system:'',kind:'activity',x:.5,y:.5}); selectedNode=id;
    mutate({type:'process_override',flowId:flow.id,override:ov}).then(()=>renderAsIs($('#streamPanel'),s));
  }

  function renderPain(root,s){
    const pp=library.painPoints.filter(x=>x.stream===s.id);
    root.innerHTML=`<div class="card table-wrap"><table class="table"><thead><tr><th>ID</th><th>Subprocess</th><th>Type</th><th>Description / source text</th><th>Priority</th><th>Phase</th></tr></thead><tbody>${pp.map(p=>`<tr><td class="nowrap"><strong>${esc(p.id)}</strong></td><td>${esc(p.subprocessCode)} ${esc(p.subprocess)}</td><td><span class="tag ${p.type==='Pain point'?'red':'green'}">${esc(p.type)}</span></td><td style="min-width:420px">${esc(p.text)}</td><td>${esc(p.priority||'—')}</td><td>${esc(p.phase||'—')}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function renderRequirements(root,s){
    const rows=state.requirements.filter(x=>x.stream===s.id);
    root.innerHTML=`<div class="section-head" style="margin-top:0"><div><h2>Requirements traceability</h2><p>Pain Point → Requirement → D365 fit/gap → build/configuration → test.</p></div><button id="addReq" class="btn primary small">+ Requirement</button></div><div class="card table-wrap"><table class="table"><thead><tr><th>ID</th><th>Process</th><th>Requirement</th><th>Source</th><th>Fit / Gap</th><th>Status</th><th>Owner</th></tr></thead><tbody>${rows.map(r=>`<tr class="clickable" data-req="${r.id}"><td><strong>${esc(r.id)}</strong></td><td>${esc(r.process)}</td><td style="min-width:350px">${esc(r.requirement)}</td><td>${esc(r.source||'')}</td><td><span class="tag gray">${esc(r.fitGap||'TBD')}</span></td><td>${esc(r.status)}</td><td>${esc(r.owner||'—')}</td></tr>`).join('')}</tbody></table></div>`;
    $('#addReq').onclick=()=>editEntity('requirements',{id:uid('REQ'),stream:s.id,process:'',requirement:'',source:'',fitGap:'TBD',status:'Draft',owner:'',priority:'Medium'},'New requirement');
    $$('[data-req]').forEach(tr=>tr.onclick=()=>editEntity('requirements',state.requirements.find(x=>x.id===tr.dataset.req),'Edit requirement'));
  }
  function renderToBe(root,s){
    const rows=state.requirements.filter(x=>x.stream===s.id); const counts={};rows.forEach(r=>counts[r.fitGap||'TBD']=(counts[r.fitGap||'TBD']||0)+1);
    root.innerHTML=`<div class="grid cols-4">${['Standard Fit','Configuration','Process Change','Extension / Custom','Integration','Reporting','TBD'].slice(0,4).map(k=>metric(k,counts[k]||0,'requirements')).join('')}</div><div class="section-head"><div><h2>To-Be design workspace</h2><p>This becomes the future-state design and fit/gap record as workshops progress.</p></div></div><div class="card pad"><p class="muted" style="font-size:12px;line-height:1.6">Use Requirements to classify each need as standard D365 fit, configuration, process change, extension, integration or reporting. Once To-Be maps are defined, they can use the same editable flow model as As-Is and be compared visually against the baseline.</p></div>`;
  }

