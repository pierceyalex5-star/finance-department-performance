/* Finance Control Tower · client performance + compatibility shim
   Legacy GitHub-token SOP uploader retired. SOP/Backup are handled by the shared Worker/Neon modal in index.html. */
(function(){
  "use strict";

  // Do not override the current SOP functions. The previous version of this file
  // replaced sopButton/importSOP with an obsolete GitHub-token workflow.

  function installPerformanceClient(){
    if(typeof action!=="function" || typeof applyLocal!=="function" || typeof apiUrl!=="function") return;
    if(window.__FCT_PERF_V3__) return;
    window.__FCT_PERF_V3__=true;

    // Optimistic actions: update the screen immediately, then reconcile with
    // the authoritative shared state. Roll back visibly if the server rejects it.
    window.action=async function(a){
      if(typeof serverMode!=="undefined" && serverMode){
        const before=structuredClone(state);
        applyLocal(a);
        renderSharedChrome();
        renderPage(activePageId());
        checkAlerts(true);
        try{
          const r=await fetch(apiUrl("/api/action"),{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify(a)
          });
          if(!r.ok){
            const j=await r.json().catch(()=>({}));
            state=before;
            renderSharedChrome();renderPage(activePageId());checkAlerts(true);
            toast("Update failed"+(j.error?": "+j.error:""));
            return false;
          }
          state=await r.json();
          renderSharedChrome();checkAlerts(true);
          return true;
        }catch(e){
          state=before;
          renderSharedChrome();renderPage(activePageId());checkAlerts(true);
          toast("Update failed — connection unavailable");
          return false;
        }
      }
      applyLocal(a);renderSharedChrome();renderPage(activePageId());checkAlerts(true);return true;
    };

    // The Worker sends a lightweight version event. Only fetch /api/state when
    // that version is actually newer than the browser's state.
    window.connectEvents=function(){
      if(typeof serverMode==="undefined" || !serverMode) return;
      if(typeof eventSource!=="undefined" && eventSource){try{eventSource.close()}catch(e){}}
      eventSource=new EventSource(apiUrl("/api/events"));
      eventSource.onmessage=async function(e){
        try{
          const meta=JSON.parse(e.data||"{}");
          if(Number(meta.version||0)<=Number(state.version||0)) return;
          const r=await fetch(apiUrl("/api/state"),{cache:"no-store"});
          if(!r.ok) return;
          const next=await r.json();
          if(Number(next.version||0)<=Number(state.version||0)) return;
          state=next;renderSharedChrome();renderPage(activePageId());checkAlerts(true);
        }catch(err){}
      };
    };

    // Skip controlled-document status calls on pages that do not display file
    // indicators. The original function keeps its cache for relevant pages.
    if(typeof refreshFileStatus==="function"){
      const originalRefreshFileStatus=refreshFileStatus;
      window.refreshFileStatus=function(force=false){
        const page=typeof activePageId==="function"?activePageId():"";
        if(!force && !["cockpit","workflow","headOffice","team","managerKpi"].includes(page)) return Promise.resolve();
        return originalRefreshFileStatus(force);
      };
    }

    // If the initial async boot connected before this shim loaded, replace that
    // connection with the version-aware one once server mode is known.
    setTimeout(function(){
      try{if(typeof serverMode!=="undefined" && serverMode) window.connectEvents()}catch(e){}
    },1500);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",installPerformanceClient,{once:true});
  else installPerformanceClient();
})();
