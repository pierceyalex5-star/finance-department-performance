/* Finance Control Tower · shared SOP import/open support */
(function(){
  "use strict";
  const GH_REPO="pierceyalex5-star/finance-department-performance";
  const GH_BRANCH="main";
  const PAGES_BASE="https://pierceyalex5-star.github.io/finance-department-performance/";

  function say(msg){ if(typeof toast==="function") try{return toast(msg)}catch(e){}; console.log(msg); }
  function escHtml(s){return String(s||"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
  function getToken(){
    let t=localStorage.getItem("fct_gh_token");
    if(!t){
      t=prompt("Import SOP — paste your GitHub fine-grained token (Contents: read & write). It stays only in this browser.");
      if(t){t=t.trim();localStorage.setItem("fct_gh_token",t)}
    }
    return t||"";
  }
  function sanitizeExt(name){
    const m=String(name||"").toLowerCase().match(/\.([a-z0-9]{1,8})$/);
    return m?m[1]:"bin";
  }
  function toBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(",")[1]||"");r.onerror=reject;r.readAsDataURL(file)})}
  function locate(type,id){
    if(typeof state==="undefined") return null;
    return type==="task"?(state.taskTemplates||[]).find(x=>x.id===id):(state.headOfficeTemplate||[]).find(x=>x.id===id);
  }
  async function uploadToGitHub(path,file,token){
    const api=`https://api.github.com/repos/${GH_REPO}/contents/${path}`;
    let sha="";
    const cur=await fetch(api+`?ref=${GH_BRANCH}`,{headers:{Authorization:`Bearer ${token}`,Accept:"application/vnd.github+json"}});
    if(cur.ok) sha=(await cur.json()).sha||"";
    else if(cur.status!==404) throw new Error(`Unable to check existing SOP (${cur.status})`);
    const payload={message:`SOP upload · ${path}`,content:await toBase64(file),branch:GH_BRANCH};
    if(sha) payload.sha=sha;
    const r=await fetch(api,{method:"PUT",headers:{Authorization:`Bearer ${token}`,Accept:"application/vnd.github+json","Content-Type":"application/json"},body:JSON.stringify(payload)});
    if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.message||`GitHub upload failed (${r.status})`)}
  }
  window.importSOP=async function(type,id){
    const item=locate(type,id); if(!item) return say("Item not found.");
    const input=document.createElement("input"); input.type="file"; input.accept=".doc,.docx,.pdf,.xlsx,.xls,.pptx,.ppt,.txt";
    input.onchange=async()=>{
      const file=input.files&&input.files[0]; if(!file)return;
      if(file.size>20*1024*1024) return say("SOP file exceeds 20 MB.");
      const token=getToken(); if(!token)return;
      const ext=sanitizeExt(file.name);
      const path=`sops/${type}-${id}.${ext}`;
      try{
        say("Uploading SOP…");
        await uploadToGitHub(path,file,token);
        item.sopUrl=PAGES_BASE+path;
        item.sopFileName=file.name;
        item.sopUpdatedAt=new Date().toISOString();
        item.sopUpdatedBy=(typeof currentUser!=="undefined"?currentUser:"");
        state.updatedAt=new Date().toISOString();
        if(typeof saveLocal==="function") try{saveLocal()}catch(e){}
        if(typeof renderAll==="function") try{renderAll()}catch(e){}
        if(typeof fctSaveNow==="function") await fctSaveNow();
        say("SOP imported ✓ It may take a few seconds to become available to everyone.");
      }catch(e){say("SOP import failed: "+e.message)}
    };
    input.click();
  };
  window.sopButton=function(u,type,id){
    const href=typeof safeSOPUrl==="function"?safeSOPUrl(u):String(u||"");
    const item=locate(type,id)||{};
    const name=item.sopFileName?`<span class="small" title="${escHtml(item.sopFileName)}">${escHtml(item.sopFileName)}</span>`:"";
    if(href){
      return `<span style="display:flex;gap:5px;align-items:center;flex-wrap:wrap"><a class="btn ghost" href="${escHtml(href)}" target="_blank" rel="noopener">Open SOP</a><button type="button" class="btn ghost" onclick="importSOP('${type}','${id}')">Replace SOP</button><button type="button" class="btn ghost" onclick="openFinanceSOPTemplate()">Template</button>${name}</span>`;
    }
    return `<span style="display:flex;gap:5px;align-items:center;flex-wrap:wrap"><button type="button" class="btn ghost" onclick="importSOP('${type}','${id}')">Import SOP</button><button type="button" class="btn ghost" onclick="openFinanceSOPTemplate()">Template</button></span>`;
  };
})();
