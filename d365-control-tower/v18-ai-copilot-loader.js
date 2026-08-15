(function(){
  'use strict';
  const BUILD='20260815.1';
  const source=`v18-ai-copilot.js?source=${BUILD}`;
  const broken="try{if(typeof currentMilestone==='function'){const m=currentMilestone();if(m)return {m,readiness:typeof gateReadiness==='function'?gateReadiness(m):null,status:typeof gateStatus==='function'?gateStatus(m):m.status}}catch(_){ }";
  const fixed="try{if(typeof currentMilestone==='function'){const m=currentMilestone();if(m)return {m,readiness:typeof gateReadiness==='function'?gateReadiness(m):null,status:typeof gateStatus==='function'?gateStatus(m):m.status}}}catch(_){ }";
  try{
    const xhr=new XMLHttpRequest();
    xhr.open('GET',source,false);
    xhr.send(null);
    if(!((xhr.status>=200&&xhr.status<300)||xhr.status===0))throw new Error(`V18 source load failed (${xhr.status})`);
    let code=xhr.responseText||'';
    if(code.includes(broken))code=code.replace(broken,fixed);
    if(!code.includes(fixed))throw new Error('V18 compatibility patch target was not found');
    new Function(code);
    (0,eval)(`${code}\n//# sourceURL=v18-ai-copilot.runtime.js`);
    window.D365_V18_LOADER={build:BUILD,loaded:true};
  }catch(err){
    console.error('[D365 V18 loader] AI Copilot could not initialize',err);
    window.D365_V18_LOADER={build:BUILD,loaded:false,error:String(err&&err.message||err)};
  }
})();
