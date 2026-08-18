(()=>{
  const INTERVAL_MS = 120000;
  const FOCUS_STALE_MS = 30000;
  let lastSync = 0;
  let syncing = false;

  const badge = document.createElement('div');
  badge.id = 'autosyncStatus';
  badge.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:9999;background:rgba(255,255,255,.94);border:1px solid #e5e7eb;border-radius:999px;padding:6px 10px;font-size:10px;color:#6b7280;box-shadow:0 2px 10px rgba(0,0,0,.06);pointer-events:none';
  badge.textContent = 'Auto-sync on';
  document.body.appendChild(badge);

  function stamp(label){
    const t = new Date();
    badge.textContent = `${label} · ${t.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
  }

  async function sync(reason='Auto-sync'){
    if(syncing || document.hidden || typeof load !== 'function') return;
    syncing = true;
    badge.textContent = 'Syncing…';
    try{
      await load();
      lastSync = Date.now();
      stamp(reason);
    }catch(e){
      badge.textContent = 'Sync issue · retrying';
    }finally{
      syncing = false;
    }
  }

  setInterval(()=>sync('Synced'), INTERVAL_MS);
  window.addEventListener('focus', ()=>{
    if(Date.now() - lastSync > FOCUS_STALE_MS) sync('Synced');
  });
  document.addEventListener('visibilitychange', ()=>{
    if(!document.hidden && Date.now() - lastSync > FOCUS_STALE_MS) sync('Synced');
  });
  setTimeout(()=>sync('Synced'), 3000);
})();
