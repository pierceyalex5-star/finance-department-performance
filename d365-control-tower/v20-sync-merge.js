(function(){
  'use strict';

  const MERGEABLE_KEYS=new Set(['framework','processes','registers','tasks','milestones']);
  const copy=v=>v===undefined?undefined:clone(v);
  const same=(a,b)=>stable(a)===stable(b);
  const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const idArray=a=>Array.isArray(a)&&a.every(x=>plain(x)&&x.id!==undefined&&x.id!==null);

  function merge3(base,local,remote,path='record'){
    if(same(local,remote))return {value:copy(local),conflicts:[]};
    if(same(local,base))return {value:copy(remote),conflicts:[]};
    if(same(remote,base))return {value:copy(local),conflicts:[]};

    if(idArray(local)&&idArray(remote)&&(base===undefined||idArray(base))){
      const b=new Map((base||[]).map(x=>[String(x.id),x]));
      const l=new Map(local.map(x=>[String(x.id),x]));
      const r=new Map(remote.map(x=>[String(x.id),x]));
      const ids=[];
      remote.forEach(x=>{const id=String(x.id);if(!ids.includes(id))ids.push(id)});
      local.forEach(x=>{const id=String(x.id);if(!ids.includes(id))ids.push(id)});
      (base||[]).forEach(x=>{const id=String(x.id);if(!ids.includes(id))ids.push(id)});
      const out=[],conflicts=[];
      for(const id of ids){
        const m=merge3(b.get(id),l.get(id),r.get(id),`${path}[${id}]`);
        conflicts.push(...m.conflicts);
        if(m.value!==undefined)out.push(m.value);
      }
      return {value:out,conflicts};
    }

    if(plain(local)&&plain(remote)&&(base===undefined||plain(base))){
      const b=plain(base)?base:{};
      const keys=[...new Set([...Object.keys(b),...Object.keys(local),...Object.keys(remote)])];
      const out={},conflicts=[];
      for(const k of keys){
        const m=merge3(b[k],local[k],remote[k],path?`${path}.${k}`:k);
        conflicts.push(...m.conflicts);
        if(m.value!==undefined)out[k]=m.value;
      }
      return {value:out,conflicts};
    }

    // Primitive values, non-ID arrays, or delete-vs-edit cases changed differently on both sides.
    return {value:copy(local),conflicts:[path]};
  }

  function applyValue(k,value){
    if(MERGEABLE_KEYS.has(k))state[k]=copy(value);
    else if(flowChunks[k]){
      flowChunks[k]=copy(value).map(f=>({...f,_file:k}));
      rebuildFlows();
    }
  }

  function conflictMessage(k,conflicts){
    const shown=conflicts.slice(0,6).map(x=>`• ${x}`).join('\n');
    const extra=conflicts.length>6?`\n• +${conflicts.length-6} more`:'';
    return `A true same-field conflict remains in ${k}.\n\nBoth editors changed the same field differently:\n${shown}${extra}\n\nYour local edit is still saved in this browser. Refresh only after you have exported it or decided which version should win.`;
  }

  async function saveMergedKey(k,token){
    const path=syncKeyPath(k);
    let mergedConcurrent=false;
    for(let attempt=0;attempt<3;attempt++){
      let localValue=payloadFor(k);
      const remote=await ghRead(path,token);
      const base=syncBase[k];

      if(base!==undefined&&!same(remote.value,base)){
        if(!MERGEABLE_KEYS.has(k)){
          const err=Error(`Conflict on ${k}. The same flow/data file changed after your page was loaded.`);err.status=409;err.conflicts=[k];throw err;
        }
        const m=merge3(base,localValue,remote.value,k);
        if(m.conflicts.length){const err=Error(conflictMessage(k,m.conflicts));err.status=409;err.conflicts=m.conflicts;throw err}
        localValue=m.value;
        applyValue(k,localValue);
        // Remote is now the new merge base. This makes a subsequent retry safe if another
        // editor writes between this read and our PUT.
        syncBase[k]=copy(remote.value);
        saveLocal();
        mergedConcurrent=true;
      }

      try{
        await ghPut(path,localValue,remote.sha,token,`D365 Control Tower · ${k} · ${new Date().toISOString()}`);
        syncBase[k]=copy(localValue);
        dirtyFiles.delete(k);
        return {mergedConcurrent};
      }catch(e){
        if(e.status===409&&attempt<2)continue;
        throw e;
      }
    }
    const err=Error(`Could not save ${k} after repeated concurrent updates.`);err.status=409;throw err;
  }

  writeSyncStamp=async function(token,changedFiles){
    const path=GH_PREFIX+'data/sync.json';
    for(let attempt=0;attempt<3;attempt++){
      let sha='';
      try{sha=(await ghRead(path,token)).sha}catch(e){if(!String(e.message).includes('(404)'))throw e}
      const stamp={updatedAt:new Date().toISOString(),changedFiles,lastEditor:'Browser editor'};
      try{
        await ghPut(path,stamp,sha,token,`D365 shared sync · ${stamp.updatedAt}`);
        lastPushedStamp=stamp.updatedAt;lastDeployedStamp=stamp.updatedAt;return;
      }catch(e){if(e.status===409&&attempt<2)continue;throw e}
    }
  };

  pushGithub=async function(silent=false){
    if(!dirtyFiles.size)return;
    const token=getToken(!silent);if(!token){setSync('local changes · editor token required');return}
    const keys=[...dirtyFiles].filter(k=>syncKeyPath(k));if(!keys.length)return;
    setSync('saving to GitHub…');
    let mergedCount=0;
    try{
      for(const k of keys){const r=await saveMergedKey(k,token);if(r.mergedConcurrent)mergedCount++}
      await writeSyncStamp(token,keys);
      saveLocal();
      setSync(mergedCount?`saved ✓ · ${mergedCount} concurrent update${mergedCount===1?'':'s'} merged`:'saved for the team ✓');
      if(mergedCount&&!silent)render();
    }catch(e){
      if(e.status===409){
        setSync('same-field conflict · local change kept');saveLocal();
        if(!silent)alert(e.conflicts?e.message:`${e.message}\n\nYour local edit is still saved in this browser. Export it before refreshing if you need to preserve it.`);
      }else if(e.auth){
        localStorage.removeItem(TOKEN_KEY);saveLocal();setSync('editor token expired / unauthorized · local changes kept');
        if(!silent){
          const replacement=getToken(true);
          if(replacement){setSync('retrying save with new editor token…');return pushGithub(false)}
          alert('Your change is still saved locally in this browser. The GitHub editor token was invalid, expired, or did not have Contents: Read and write permission. Open GitHub sync and choose Save now when you have a valid token.');
        }
      }else{setSync('GitHub save error · local changes kept');saveLocal();if(!silent)alert(`${e.message}\n\nYour local edit has been kept in this browser.`)}
    }
  };

  const baseRenderSync=renderSync;
  renderSync=function(){
    const html=baseRenderSync();
    const old='stale same-area edits are blocked instead of silently overwriting another editor.';
    const newer='non-overlapping edits are merged automatically at record/field level; only true same-field conflicts are stopped for review.';
    return html.replace(old,newer).replace('different areas can be edited in parallel. For the same detailed flowchart, use one designated editor during a workshop to minimize conflicts.','task, people, milestone and governance records can now be edited concurrently when the edits do not change the same field. Detailed flowcharts remain single-file edits, so use one designated flow editor during a workshop.');
  };

  window.D365_SYNC_MERGE={merge3};
})();
