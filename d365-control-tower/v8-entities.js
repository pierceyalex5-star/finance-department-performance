(function(){
  const ENTITY_STORAGE='ifast-d365-entity-context';
  const ENTITIES=['Infasco','Infasco Nut','DSI (IFASTGROUP USA)'];
  const SCOPES=[
    'All entities',
    'Infasco',
    'Infasco Nut',
    'DSI (IFASTGROUP USA)',
    'Infasco + Infasco Nut',
    'Infasco + DSI (IFASTGROUP USA)',
    'Infasco Nut + DSI (IFASTGROUP USA)'
  ];
  let currentEntity=localStorage.getItem(ENTITY_STORAGE)||'All entities';
  if(currentEntity!=='All entities'&&!ENTITIES.includes(currentEntity))currentEntity='All entities';

  function isFr(){return document.documentElement.lang==='fr'}
  function tr(en,fr){return isFr()?fr:en}
  function scopeParts(scope){
    const s=String(scope||'All entities').trim();
    if(!s||s==='All entities')return ENTITIES.slice();
    return ENTITIES.filter(e=>s.includes(e));
  }
  function entityScope(x){return x?.entityScope||'All entities'}
  function entityMatches(x,entity=currentEntity){return entity==='All entities'||scopeParts(entityScope(x)).includes(entity)}
  function scopeDisplay(scope){
    const s=scope||'All entities';
    if(s==='All entities')return tr('All entities','Toutes les entités');
    return s;
  }
  function sourceScope(defaults){
    if(defaults?.entityScope)return defaults.entityScope;
    const id=defaults?.sourceId;if(!id)return '';
    for(const key of ['painPoints','opportunities','requirements','decisions','fitGap']){
      const x=(state.registers?.[key]||[]).find(z=>z.id===id);if(x?.entityScope)return x.entityScope;
    }
    return '';
  }
  function scopeOptions(current='All entities'){
    return SCOPES.map(s=>`<option value="${esc(s)}" ${s===current?'selected':''}>${esc(scopeDisplay(s))}</option>`).join('');
  }
  function injectEntityField(mm,current='All entities'){
    if(!mm)return;const form=mm.querySelector('.v5-task-form')||mm.querySelector('.form-grid');if(!form||form.querySelector('[name="entityScope"]'))return;
    const label=document.createElement('label');label.className='v8-entity-field';label.innerHTML=`${tr('Entity / scope','Entité / portée')}<select name="entityScope">${scopeOptions(current||'All entities')}</select>`;
    const stream=form.querySelector('[name="stream"]')?.closest('label');
    if(stream)stream.after(label);else form.prepend(label);
    const helper=document.createElement('small');helper.className='v8-entity-help';helper.textContent=tr('Choose one entity, an entity combination, or All entities.','Choisir une entité, une combinaison d’entités ou Toutes les entités.');label.appendChild(helper);
  }
  function lastModal(){return [...document.querySelectorAll('.modal-backdrop')].at(-1)}

  // Entity context filters the project records shown in the dashboard. Records without an explicit scope are group-wide.
  const _v8Data=data;
  data=function(){
    const d=_v8Data();if(currentEntity==='All entities')return d;
    const out={...d};
    for(const key of ['tasks','painPoints','opportunities','requirements','decisions','fitGap','raid','dataObjects','integrations','reports','controls','escalations']){
      if(Array.isArray(d[key]))out[key]=d[key].filter(x=>entityMatches(x));
    }
    return out;
  };

  // Add entity scope to execution tasks while preserving the L1/L2/L3 and milestone editors layered before V8.
  const _v8EditTask=editTask;
  editTask=function(id,stream=selectedStream,ownerDefault='',defaults={}){
    const existing=(state.tasks?.tasks||[]).find(t=>t.id===id);
    const scope=existing?.entityScope||sourceScope(defaults)||defaults?.entityScope||'All entities';
    _v8EditTask(id,stream,ownerDefault,defaults);injectEntityField(lastModal(),scope);
  };

  const _v8EditPain=editPain;
  editPain=function(id,kind='Pain point'){
    const key=kind==='Opportunity'?'opportunities':'painPoints',x=(state.registers?.[key]||[]).find(z=>z.id===id);
    _v8EditPain(id,kind);injectEntityField(lastModal(),x?.entityScope||'All entities');
  };

  const _v8EditRequirement=editRequirement;
  editRequirement=function(id){const x=(state.registers?.requirements||[]).find(z=>z.id===id);_v8EditRequirement(id);injectEntityField(lastModal(),x?.entityScope||'All entities')};

  const _v8EditDecision=editDecision;
  editDecision=function(id){const x=(state.registers?.decisions||[]).find(z=>z.id===id);_v8EditDecision(id);injectEntityField(lastModal(),x?.entityScope||'All entities')};

  function wrapRegisterEditor(name,key){
    const old=window[name];if(typeof old!=='function')return;
    window[name]=function(id,...args){const x=(state.registers?.[key]||[]).find(z=>z.id===id);old.call(this,id,...args);injectEntityField(lastModal(),x?.entityScope||'All entities')};
  }
  wrapRegisterEditor('editRaid','raid');
  wrapRegisterEditor('editDataObject','dataObjects');
  wrapRegisterEditor('editIntegration','integrations');
  wrapRegisterEditor('editReport','reports');
  wrapRegisterEditor('editControl','controls');
  wrapRegisterEditor('editEscalation','escalations');
  wrapRegisterEditor('editFitGap','fitGap');

  function ensureEntitySelector(){
    const top=document.querySelector('.top-actions');if(!top)return;
    let wrap=document.getElementById('v8EntityWrap');
    if(!wrap){
      wrap=document.createElement('label');wrap.id='v8EntityWrap';wrap.className='v8-entity-context';
      const select=document.createElement('select');select.id='v8EntityContext';
      wrap.appendChild(document.createElement('span'));wrap.appendChild(select);top.prepend(wrap);
      select.onchange=()=>{currentEntity=select.value;localStorage.setItem(ENTITY_STORAGE,currentEntity);render()};
    }
    wrap.querySelector('span').textContent=tr('Entity','Entité');
    const sel=wrap.querySelector('select'),opts=['All entities',...ENTITIES];
    sel.innerHTML=opts.map(s=>`<option value="${esc(s)}" ${currentEntity===s?'selected':''}>${esc(scopeDisplay(s))}</option>`).join('');
    sel.title=tr('Filter dashboard records by legal entity','Filtrer les éléments du tableau de bord par entité juridique');
  }

  function addScopeTag(target,scope){
    if(!target||target.querySelector('.v8-scope-tag'))return;
    const tag=document.createElement('span');tag.className='v8-scope-tag';tag.textContent=scopeDisplay(scope);target.appendChild(tag);
  }
  function decorateScopes(){
    document.querySelectorAll('.v5-execution-table tr[data-edit-task]').forEach(row=>{
      const t=(state.tasks?.tasks||[]).find(x=>x.id===row.dataset.editTask);if(!t)return;addScopeTag(row.querySelector('td:nth-child(2)')||row.querySelector('td'),entityScope(t));
    });
    document.querySelectorAll('tr[data-edit-pain]').forEach(row=>{
      const id=row.dataset.editPain,x=[...(state.registers?.painPoints||[]),...(state.registers?.opportunities||[])].find(z=>z.id===id);if(x)addScopeTag(row.querySelector('td:nth-child(3)')||row.querySelector('td'),entityScope(x));
    });
    document.querySelectorAll('tr[data-edit-req]').forEach(row=>{const x=(state.registers?.requirements||[]).find(z=>z.id===row.dataset.editReq);if(x)addScopeTag(row.querySelector('td:nth-child(3)')||row.querySelector('td'),entityScope(x))});
    document.querySelectorAll('tr[data-edit-decision]').forEach(row=>{const x=(state.registers?.decisions||[]).find(z=>z.id===row.dataset.editDecision);if(x)addScopeTag(row.querySelector('td:nth-child(2)')||row.querySelector('td'),entityScope(x))});
    document.querySelectorAll('.v6-task-rollup tr[data-edit-task]').forEach(row=>{const x=(state.tasks?.tasks||[]).find(z=>z.id===row.dataset.editTask);if(x)addScopeTag(row.querySelector('td:first-child'),entityScope(x))});
  }

  function addContextNotice(){
    if(currentEntity==='All entities')return;
    const app=document.getElementById('app');if(!app||app.querySelector('.v8-context-notice'))return;
    const n=document.createElement('div');n.className='v8-context-notice';n.innerHTML=`<b>${tr('Entity context','Contexte entité')}:</b> ${esc(currentEntity)} <span>${tr('Only records applicable to this entity are shown; group-wide records remain visible.','Seuls les éléments applicables à cette entité sont affichés; les éléments de portée groupe demeurent visibles.')}</span>`;
    app.prepend(n);
  }

  const _v8Bind=bindPage;
  bindPage=function(){_v8Bind();ensureEntitySelector();decorateScopes();addContextNotice()};

  const _v8Render=render;
  render=function(){_v8Render();ensureEntitySelector()};

  window.D365_ENTITY_MODEL={entities:ENTITIES.slice(),scopes:SCOPES.slice(),getContext:()=>currentEntity};
  setTimeout(()=>{ensureEntitySelector();if(document.getElementById('app')?.children.length)render()},80);
})();
