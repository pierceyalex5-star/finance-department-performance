(function(){
  'use strict';

  function fr(){return document.documentElement.lang==='fr'}
  function tr(en,frText){return fr()?frText:en}
  function esc12(v){return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function project(){return typeof data==='function'?data():{}}
  function today12(){return typeof today==='function'?today():new Date().toISOString().slice(0,10)}
  function dateObj(s){return s?new Date(`${s}T00:00:00`):null}
  function daysAway(s){const d=dateObj(s),t=dateObj(today12());return d&&t?Math.ceil((d-t)/86400000):null}
  function progress(t){return typeof taskProgress==='function'?taskProgress(t):(Number(t.progress)||(['Approved','Closed'].includes(t.status)?100:0))}
  function taskDate(t){return t.forecastDue||t.due||''}
  function openTask(t){return !['Approved','Closed'].includes(t.status)}
  function taskPath(t){
    const l1=t.l1||t.stream||'Program',l2=t.l2||'',l3=t.l3ProcessId?(String(t.l3ProcessId)+(t.l3ProcessName?` · ${t.l3ProcessName}`:'')):(t.l3ProcessName||'');
    return {l1,l2,l3};
  }
  function normalizeTitle(s){return String(s||'').toLowerCase().replace(/\s+/g,' ').replace(/[–—]/g,'-').trim()}
  function familyKey(t){return [normalizeTitle(t.title),t.milestoneId||'',t.phase||'',t.type||''].join('¦')}
  function unique(xs){return [...new Set(xs.filter(Boolean))]}
  function statusTone(tasks){
    if(tasks.some(t=>t.status==='Blocked'))return ['Blocked','bad'];
    if(tasks.some(t=>t.status==='Waiting'))return ['Waiting','warn'];
    if(tasks.some(t=>['Ready for Review','BPO Review'].includes(t.status)))return ['Review','warn'];
    if(tasks.some(t=>progress(t)>0))return ['In Progress','warn'];
    return ['Not Started',''];
  }
  function signoffMini(t){
    if(t.approvedBy&&t.approvedAt)return `<span class="v12-signed">✓ ${tr('Approved','Approuvé')} · ${esc12(t.approvedBy)} · ${esc12(t.approvedAt)}</span>`;
    if(t.completedBy&&t.completedAt)return `<span class="v12-finished">✓ ${tr('Finished','Terminé')} · ${esc12(t.completedBy)} · ${esc12(t.completedAt)}</span>`;
    return '';
  }
  function fmtRange(a,b){if(!a)return '—';return a===b?a:`${a} → ${b}`}

  function groupedOutlook(){
    const candidates=(project().tasks||[]).filter(openTask).map(t=>({t,n:daysAway(taskDate(t))})).filter(x=>x.n!==null&&x.n>=0&&x.n<=90);
    const map=new Map();
    candidates.forEach(({t,n})=>{const k=familyKey(t);if(!map.has(k))map.set(k,[]);map.get(k).push({t,n})});
    return [...map.entries()].map(([key,rows])=>{
      rows.sort((a,b)=>a.n-b.n||String(a.t.stream||'').localeCompare(String(b.t.stream||'')));
      const tasks=rows.map(x=>x.t),dates=tasks.map(taskDate).filter(Boolean).sort(),owners=unique(tasks.map(t=>t.owner)),streams=unique(tasks.map(t=>t.stream||t.l1)),l2s=unique(tasks.map(t=>t.l2)),avg=tasks.length?Math.round(tasks.reduce((s,t)=>s+Number(progress(t)||0),0)/tasks.length):0,[status,tone]=statusTone(tasks);
      return {__v12Group:true,key,title:tasks[0]?.title||'',milestoneId:tasks[0]?.milestoneId||'',phase:tasks[0]?.phase||'',type:tasks[0]?.type||'',tasks,minDays:rows[0]?.n??999,minDate:dates[0]||'',maxDate:dates.at(-1)||'',owners,streams,l2s,avg,status,tone};
    }).sort((a,b)=>a.minDays-b.minDays||a.title.localeCompare(b.title));
  }

  // Override the legacy outlook feed so a repeated cross-BPO deliverable appears once.
  // A family is assigned to the horizon containing its earliest upcoming due date; the
  // expanded group still shows every BPO/workstream assignment due within the 90-day horizon.
  taskOutlook=function(min,max){return groupedOutlook().filter(g=>g.minDays>=min&&g.minDays<=max)};

  function taskRow(t){
    const p=taskPath(t),due=taskDate(t),l2=p.l2?`<button type="button" class="v12-l2-link" data-jump-l2="${esc12(p.l1)}|${esc12(p.l2)}">L2 · ${esc12(p.l2)}</button>`:`<span class="v12-muted">${tr('Stream-level','Niveau chaîne')}</span>`;
    return `<tr data-v12-task="${esc12(t.id)}"><td><b>${esc12(p.l1)}</b><small>${esc12(t.id)}</small></td><td>${l2}${p.l3?`<small>L3 · ${esc12(p.l3)}</small>`:''}</td><td>${esc12(t.owner||tr('Unassigned','Non assigné'))}</td><td>${esc12(due||'—')}</td><td><span class="v12-status ${t.status==='Blocked'?'bad':['Waiting','Ready for Review','BPO Review','In Progress'].includes(t.status)?'warn':''}">${esc12(t.status||'Not Started')}</span><small>${Math.round(progress(t))}%</small>${signoffMini(t)}</td></tr>`;
  }
  function groupHtml(g){
    const bpoCount=g.owners.length,streamCount=g.streams.length,cap=g.l2s.length,done=g.tasks.filter(t=>Number(progress(t))>=99.9).length;
    return `<details class="v12-outlook-family"><summary><div class="v12-outlook-main"><span>${esc12(g.milestoneId||g.phase||g.type||tr('Execution','Exécution'))}</span><b>${esc12(g.title)}</b><small>${g.tasks.length} ${tr('assignments','affectations')} · ${bpoCount} ${tr('owners','responsables')} · ${streamCount} ${tr('workstreams','chaînes')} · ${cap} L2</small></div><div class="v12-outlook-score"><strong>${g.avg}%</strong><span class="v12-status ${g.tone}">${esc12(g.status)}</span><small>${done}/${g.tasks.length} ${tr('finished','terminées')} · ${esc12(fmtRange(g.minDate,g.maxDate))}</small></div></summary><div class="v12-outlook-detail"><div class="v12-family-meta"><span><b>${tr('Workstreams','Chaînes')}:</b> ${esc12(g.streams.join(', ')||'—')}</span><span><b>${tr('Owners','Responsables')}:</b> ${esc12(g.owners.join(', ')||'—')}</span>${g.l2s.length?`<span><b>L2:</b> ${esc12(g.l2s.join(', '))}</span>`:''}</div><div class="v12-table-wrap"><table><thead><tr><th>L1 / ID</th><th>L2 / L3</th><th>${tr('Owner','Responsable')}</th><th>${tr('Due','Échéance')}</th><th>${tr('Status / sign-off','Statut / approbation')}</th></tr></thead><tbody>${g.tasks.map(taskRow).join('')}</tbody></table></div><div class="v12-drill-note">${tr('Click a task row to edit it. Click an L2 capability to open its detailed workspace.','Cliquez une tâche pour la modifier. Cliquez une capacité L2 pour ouvrir son espace de travail détaillé.')}</div></div></details>`;
  }

  outlookCard=function(title,items){
    const groups=(items||[]).filter(x=>x&&x.__v12Group);
    return `<div class="card pad v12-outlook-card"><div class="v12-outlook-card-head"><div><h3>${esc12(title)}</h3><small>${groups.length} ${tr('task families','familles de tâches')} · ${groups.reduce((s,g)=>s+g.tasks.length,0)} ${tr('assignments','affectations')}</small></div><span>${tr('grouped by deliverable','regroupé par livrable')}</span></div>${groups.length?groups.map(groupHtml).join(''):`<div class="empty mini">${tr('No dated tasks in this window.','Aucune tâche datée dans cette période.')}</div>`}</div>`;
  };

  // Bind task rows. L2 buttons intentionally use the existing V4 data-jump-l2 contract,
  // so they inherit the established L2 workspace drill-down rather than creating a second model.
  const _v12Bind=bindPage;
  bindPage=function(){
    _v12Bind();
    document.querySelectorAll('[data-v12-task]').forEach(row=>{if(row.dataset.v12Bound)return;row.dataset.v12Bound='1';row.addEventListener('click',e=>{if(e.target.closest('[data-jump-l2]'))return;const id=row.dataset.v12Task;if(typeof editTask==='function')editTask(id)})});
  };
})();
