(function(){
  'use strict';
  const BUILD='V22 · 2026-08-15';
  function ensure(){
    const mode=document.querySelector('#dataMode');
    if(mode&&!document.querySelector('#d365BuildBadge')){
      const b=document.createElement('span');
      b.id='d365BuildBadge';
      b.textContent=BUILD;
      b.style.cssText='margin-left:8px;padding:2px 7px;border:1px solid rgba(255,255,255,.28);border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.04em;opacity:.9';
      mode.insertAdjacentElement('afterend',b);
    }
    const nav=document.querySelector('#mainNav');
    if(!nav)return;
    let academy=nav.querySelector('[data-view="bpoacademy"]');
    if(!academy&&window.D365_BPO_ACADEMY){
      academy=document.createElement('button');academy.dataset.view='bpoacademy';academy.textContent='BPO Academy';
      const steering=nav.querySelector('[data-view="steering"]');steering?nav.insertBefore(academy,steering):nav.appendChild(academy);
    }
    let ai=nav.querySelector('#v22AiNav');
    if(!ai){
      ai=document.createElement('button');ai.id='v22AiNav';ai.type='button';ai.textContent='AI Copilot';
      const anchor=academy||nav.querySelector('[data-view="steering"]');anchor?nav.insertBefore(ai,anchor):nav.appendChild(ai);
      ai.addEventListener('click',()=>{
        view='cockpit';
        nav.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
        ai.classList.add('active');
        render();
        setTimeout(()=>document.querySelector('.v18-intel')?.scrollIntoView({behavior:'smooth',block:'start'}),60);
      });
    }
    if(!nav.dataset.v22Bound){
      nav.dataset.v22Bound='1';
      nav.addEventListener('click',ev=>{if(ev.target.closest('[data-view]'))nav.querySelector('#v22AiNav')?.classList.remove('active')},true);
    }
  }
  ensure();
  const prior=render;
  render=function(){const out=prior.apply(this,arguments);ensure();return out;};
  window.D365_BUILD=BUILD;
})();
