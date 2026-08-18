(function(){
  'use strict';

  const RACI_VERSION='2026-08-18-raci-v1';
  const ROLES=[
    {id:'BO',label:'Business Owner',detail:'Enterprise accountability'},
    {id:'BPO',label:'Value Stream BPO',detail:'End-to-end process owner'},
    {id:'SME',label:'SMEs',detail:'Business expertise'},
    {id:'PM',label:'Project / Implementation',detail:'PM + implementation partner'},
    {id:'MDM',label:'Master Data',detail:'Data governance'},
    {id:'QM',label:'Quality',detail:'Quality governance'},
    {id:'IT',label:'IT / Technical',detail:'Architecture & technical delivery'},
    {id:'SC',label:'Steering Committee',detail:'Executive authority'}
  ];
  const DEFAULT_ROWS=[
    {id:'RACI-01',category:'Program governance',activity:'Program governance, priorities and management by exception',a:{BO:'A',BPO:'C',SME:'I',PM:'R',MDM:'C',QM:'C',IT:'C',SC:'I'}},
    {id:'RACI-02',category:'Current state',activity:'Validate current-state value-stream process and pain points',a:{BO:'I',BPO:'A',SME:'R',PM:'C',MDM:'C',QM:'C',IT:'I',SC:''}},
    {id:'RACI-03',category:'Requirements',activity:'Define, prioritize and approve business requirements',a:{BO:'C',BPO:'A',SME:'R',PM:'C',MDM:'C',QM:'C',IT:'C',SC:'I'}},
    {id:'RACI-04',category:'Solution design',activity:'Design To-Be process and complete D365 fit-to-standard / fit-gap',a:{BO:'C',BPO:'A',SME:'C',PM:'R',MDM:'C',QM:'C',IT:'C',SC:'I'}},
    {id:'RACI-05',category:'Enterprise design',activity:'Resolve cross-stream process conflicts and enterprise design choices',a:{BO:'A',BPO:'R',SME:'C',PM:'C',MDM:'C',QM:'C',IT:'C',SC:'I'}},
    {id:'RACI-06',category:'Governance',activity:'Approve material scope, budget, schedule or risk threshold exceptions',a:{BO:'R',BPO:'C',SME:'I',PM:'C',MDM:'I',QM:'I',IT:'C',SC:'A'}},
    {id:'RACI-07',category:'Data',activity:'Define master-data governance, ownership, standards and migration acceptance',a:{BO:'I',BPO:'R',SME:'C',PM:'C',MDM:'A',QM:'C',IT:'C',SC:'I'}},
    {id:'RACI-08',category:'Quality',activity:'Define quality process, controls, specifications and release requirements',a:{BO:'I',BPO:'R',SME:'R',PM:'C',MDM:'C',QM:'A',IT:'C',SC:'I'}},
    {id:'RACI-09',category:'Technical',activity:'Approve integration, security and technical architecture design',a:{BO:'I',BPO:'C',SME:'C',PM:'R',MDM:'C',QM:'C',IT:'A',SC:'I'}},
    {id:'RACI-10',category:'Controls & reporting',activity:'Define business controls, reporting requirements and ownership',a:{BO:'C',BPO:'A',SME:'R',PM:'C',MDM:'C',QM:'C',IT:'C',SC:'I'}},
    {id:'RACI-11',category:'Testing',activity:'Plan and execute end-to-end SIT; manage defects to exit criteria',a:{BO:'I',BPO:'R',SME:'R',PM:'A',MDM:'R',QM:'R',IT:'R',SC:'I'}},
    {id:'RACI-12',category:'Testing',activity:'Execute UAT and approve value-stream business acceptance',a:{BO:'I',BPO:'A',SME:'R',PM:'C',MDM:'C',QM:'C',IT:'C',SC:'I'}},
    {id:'RACI-13',category:'Change',activity:'Prepare work instructions, training and user adoption readiness',a:{BO:'I',BPO:'A',SME:'R',PM:'R',MDM:'C',QM:'C',IT:'C',SC:'I'}},
    {id:'RACI-14',category:'Cutover',activity:'Confirm integrated business cutover readiness and residual risks',a:{BO:'A',BPO:'R',SME:'C',PM:'R',MDM:'R',QM:'C',IT:'R',SC:'I'}},
    {id:'RACI-15',category:'Go-live',activity:'Make final go / no-go decision',a:{BO:'R',BPO:'C',SME:'I',PM:'C',MDM:'C',QM:'C',IT:'C',SC:'A'}},
    {id:'RACI-16',category:'Benefits',activity:'Track benefits realization and transition ownership after hypercare',a:{BO:'A',BPO:'R',SME:'C',PM:'C',MDM:'I',QM:'I',IT:'I',SC:'I'}}
  ];
  const CYCLE=['','R','A','C','I','A/R'];
  const e=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cloneSafe=o=>JSON.parse(JSON.stringify(o));

  function raci(){
    state.registers=state.registers||{};
    if(!state.registers.raciMatrix){
      state.registers.raciMatrix={version:RACI_VERSION,roles:cloneSafe(ROLES),rows:cloneSafe(DEFAULT_ROWS),notes:'Role-based program RACI. Value Stream BPO and SME columns apply to the BPO/SMEs of the affected stream. Maintain one Accountable role per activity.',updatedAt:''};
    }
    const r=state.registers.raciMatrix;
    r.roles=r.roles?.length?r.roles:cloneSafe(ROLES);r.rows=r.rows?.length?r.rows:cloneSafe(DEFAULT_ROWS);
    return r;
  }

  function raciClass(v){return v==='A'||v==='A/R'?'is-a':v==='R'?'is-r':v==='C'?'is-c':v==='I'?'is-i':'is-empty'}
  function raciSection(){
    const r=raci();
    return `<section class="v30-raci"><div class="section-title"><div><h2>Program RACI Matrix</h2><span>role clarity across governance, design, testing and cutover</span></div><div class="button-row"><button class="btn" id="v30ResetRaci">Reset baseline</button><button class="btn primary" id="v30AddRaci">+ Activity</button></div></div><div class="notice"><b>RACI discipline:</b> each activity should have one Accountable role. Responsible roles execute the work; Consulted roles provide two-way input; Informed roles receive the outcome. Click any matrix cell to change its assignment.</div><div class="v30-raci-legend"><span class="is-a"><b>A</b> Accountable</span><span class="is-r"><b>R</b> Responsible</span><span class="is-c"><b>C</b> Consulted</span><span class="is-i"><b>I</b> Informed</span><span><b>A/R</b> Accountable + Responsible</span></div><div class="v30-raci-wrap"><table class="v30-raci-table"><thead><tr><th class="activity">Activity</th>${r.roles.map(x=>`<th><b>${e(x.label)}</b><small>${e(x.detail||'')}</small></th>`).join('')}<th></th></tr></thead><tbody>${r.rows.map(row=>`<tr><td class="activity"><span>${e(row.category||'Program')}</span><b>${e(row.activity)}</b><small>${e(row.id)}</small></td>${r.roles.map(role=>{const v=row.a?.[role.id]||'';return `<td><button class="v30-raci-cell ${raciClass(v)}" data-raci-row="${e(row.id)}" data-raci-role="${e(role.id)}" title="Click to change">${e(v||'—')}</button></td>`}).join('')}<td><button class="icon-btn" data-raci-edit="${e(row.id)}" title="Edit activity">⋯</button></td></tr>`).join('')}</tbody></table></div><div class="v30-raci-foot"><span><b>Value Stream BPO / SME:</b> applies to the owner and SMEs for the affected value stream rather than one named individual.</span><span>${r.updatedAt?`Last updated ${e(new Date(r.updatedAt).toLocaleString())}`:'Baseline matrix — review and ratify with the project team.'}</span></div></section>`
  }

  function setRaci(rowId,roleId){
    const r=raci(),row=r.rows.find(x=>x.id===rowId);if(!row)return;row.a=row.a||{};
    const cur=row.a[roleId]||'',next=CYCLE[(CYCLE.indexOf(cur)+1)%CYCLE.length];
    if(next==='A'||next==='A/R'){
      r.roles.forEach(role=>{if(role.id===roleId)return;const v=row.a[role.id];if(v==='A')row.a[role.id]='';else if(v==='A/R')row.a[role.id]='R'});
    }
    row.a[roleId]=next;r.updatedAt=new Date().toISOString();mark('registers');render();
  }

  function editRaci(id){
    const r=raci(),existing=r.rows.find(x=>x.id===id),row=existing||{id:`RACI-${String(r.rows.length+1).padStart(2,'0')}`,category:'',activity:'',a:{}};
    const m=modal(existing?'Edit RACI activity':'Add RACI activity',`<div class="form-grid"><label>Category<input name="category" value="${e(row.category||'')}"></label><label>ID<input name="id" value="${e(row.id)}" ${existing?'disabled':''}></label><label class="full">Activity / decision right<input name="activity" value="${e(row.activity||'')}"></label></div><div class="notice"><b>Tip:</b> create RACI rows at the level of a meaningful deliverable, decision right or control point—not every detailed task.</div>`);
    if(existing){const del=document.createElement('button');del.className='btn danger';del.textContent='Delete';m.querySelector('.modal-actions').prepend(del);del.onclick=()=>{if(!confirm('Delete this RACI activity?'))return;r.rows=r.rows.filter(x=>x.id!==row.id);r.updatedAt=new Date().toISOString();mark('registers');m.remove();render()}}
    m.querySelector('.modal-save').onclick=()=>{const v=vals(m);if(!String(v.activity||'').trim()){alert('Enter the activity or decision right.');return}if(!existing){row.id=String(v.id||row.id).trim();if(r.rows.some(x=>x.id===row.id)){alert('That RACI ID already exists.');return}r.rows.push(row)}row.category=v.category||'Program';row.activity=v.activity;row.a=row.a||{};r.updatedAt=new Date().toISOString();mark('registers');m.remove();render()}
  }

  function resetRaci(){if(!confirm('Reset the RACI matrix to the recommended program baseline?'))return;state.registers.raciMatrix={version:RACI_VERSION,roles:cloneSafe(ROLES),rows:cloneSafe(DEFAULT_ROWS),notes:'Role-based program RACI.',updatedAt:new Date().toISOString()};mark('registers');render()}

  function upgradeAcademyLayout(){
    if(view!=='bpoacademy')return;const academy=document.querySelector('.v21-academy');if(!academy||academy.querySelector('.v30-academy-layout'))return;
    const hero=academy.querySelector('.v21-hero'),nav=academy.querySelector('.v21-section-nav');if(!hero||!nav)return;
    const summary=document.createElement('div');summary.className='v30-academy-summary';summary.innerHTML=`<div><span>FORMAT</span><b>1 focused day</b><small>Training + working session</small></div><div><span>LEARNING PATH</span><b>9 modules</b><small>From value chain to commitments</small></div><div><span>OUTPUT</span><b>Decisions + working rules</b><small>Saved back to the Control Tower</small></div>`;hero.after(summary);
    const layout=document.createElement('div');layout.className='v30-academy-layout';const aside=document.createElement('aside');aside.className='v30-academy-aside';const main=document.createElement('div');main.className='v30-academy-main';
    const title=document.createElement('div');title.className='v30-academy-aside-title';title.innerHTML='<span>OFFSITE PLAYBOOK</span><b>Jump to module</b>';aside.appendChild(title);aside.appendChild(nav);
    const move=[...academy.children].filter(x=>x!==hero&&x!==summary&&x!==nav&&x!==layout);move.forEach(x=>main.appendChild(x));layout.appendChild(aside);layout.appendChild(main);summary.after(layout);
    main.querySelectorAll('.v21-block').forEach((block,i)=>{block.dataset.module=String(i+1).padStart(2,'0')});
  }

  if(typeof renderGovernance==='function'){const prevGov=renderGovernance;renderGovernance=function(){return prevGov()+raciSection()}}

  document.addEventListener('click',ev=>{
    const cell=ev.target.closest('[data-raci-row][data-raci-role]');if(cell){ev.preventDefault();setRaci(cell.dataset.raciRow,cell.dataset.raciRole);return}
    const edit=ev.target.closest('[data-raci-edit]');if(edit){ev.preventDefault();editRaci(edit.dataset.raciEdit);return}
    if(ev.target.closest('#v30AddRaci')){ev.preventDefault();editRaci();return}
    if(ev.target.closest('#v30ResetRaci')){ev.preventDefault();resetRaci();return}
  });

  const prevRender=render;render=function(){const out=prevRender.apply(this,arguments);if(view==='bpoacademy')requestAnimationFrame(upgradeAcademyLayout);return out};
  window.D365_RACI={get:raci,version:RACI_VERSION};
})();
