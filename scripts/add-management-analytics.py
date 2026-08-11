from pathlib import Path
import re

index = Path('index.html')
worker = Path('cloudflare-worker/src/index.js')
html = index.read_text()
js = worker.read_text()

def must_replace(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing expected snippet: {label}')
    return text.replace(old, new, 1)

# Styling for clickable analytics and heatmap.
css = '''
.metric-link{background:transparent;border:0;color:inherit;font:inherit;font-weight:inherit;padding:0;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px}.metric-link:hover{color:var(--blue)}
.heat-table td,.heat-table th{text-align:center}.heat-table td:first-child,.heat-table th:first-child{text-align:left}.heat-cell{display:block;width:100%;border:1px solid var(--line);border-radius:7px;padding:8px 5px;color:var(--text);cursor:pointer;background:transparent;font-weight:800}.heat-cell:hover{border-color:var(--blue)}
.analytics-note{font-size:11px;color:var(--muted);margin-top:5px}.clickable-row{cursor:pointer}.clickable-row:hover{background:rgba(104,168,255,.06)}
'''
if '.metric-link{' not in html:
    html = html.replace('@media(max-width:1100px)', css + '@media(max-width:1100px)', 1)

# Expand line chart palette so the full team has distinct trend lines.
html = html.replace('x.strokeStyle=["#68a8ff","#45cf9a","#f4c75c","#b89cff"][si%4];', 'x.strokeStyle=["#68a8ff","#45cf9a","#f4c75c","#b89cff","#f28bb3","#7dd3fc","#a3e635","#fb923c"][si%8];', 1)

# Replace Manager KPI page with the expanded control-tower analytics view.
section_pattern = re.compile(r'\n  <section id="managerKpi" class="page">.*?\n  </section>\n\n  <section id="settings"', re.S)
if not section_pattern.search(html):
    raise SystemExit('Manager KPI section not found')
manager_section = r'''
  <section id="managerKpi" class="page">
    <div class="section"><h2>Manager KPI · Team performance</h2></div>
    <div class="help">Management view for <b>Akram, Dumitru and Alex</b>. All KPIs are derived from the shared workflow timestamps. Click underlined values, heatmap cells, bottleneck rows or a month on the trend charts to drill into the underlying tasks and deliverables.</div>
    <div class="grid three" style="margin-top:13px">
      <div class="card"><div class="kpi-label">Team tasks done</div><div class="kpi-value" id="managerTeamDone">0</div><div class="kpi-meta" id="managerTeamDoneMeta">—</div></div>
      <div class="card"><div class="kpi-label">Team completion rate</div><div class="kpi-value" id="managerTeamCompletion">—</div><div class="kpi-meta">Fully signed-off recurring tasks</div></div>
      <div class="card"><div class="kpi-label">Team average score</div><div class="kpi-value" id="managerTeamAvg">—</div><div class="kpi-meta">Weighted by completed task/deliverable observations</div></div>
    </div>

    <div class="section"><h2>Current month comparison</h2></div>
    <div class="table-wrap"><table><thead><tr><th>Team member</th><th>Assigned tasks</th><th>Tasks done</th><th>Completion %</th><th>Task timing score</th><th>Deliverable score</th><th>Average score</th></tr></thead><tbody id="managerKpiBody"></tbody></table></div>

    <div class="section"><h2>Performance score decomposition</h2></div>
    <div class="help">Separates execution from quality: completion %, on-time %, average lateness, first-time-right deliverables, corrections owned and composite score.</div>
    <div class="table-wrap"><table><thead><tr><th>Team member</th><th>Completion %</th><th>On-time %</th><th>Avg lateness</th><th>First-time-right</th><th>Corrections owned</th><th>Composite score</th></tr></thead><tbody id="scoreDecompBody"></tbody></table></div>

    <div class="section"><h2>Workload / capacity by working day</h2></div>
    <div class="grid three">
      <div class="card"><div class="kpi-label">Workflow actions scheduled</div><div class="kpi-value" id="workloadTotal">0</div><div class="kpi-meta">Enabled stages with a named owner</div></div>
      <div class="card"><div class="kpi-label">Peak person / WD</div><div class="kpi-value" id="workloadPeak">—</div><div class="kpi-meta" id="workloadPeakMeta">—</div></div>
      <div class="card"><div class="kpi-label">Most loaded WD</div><div class="kpi-value" id="workloadPeakDay">—</div><div class="kpi-meta" id="workloadPeakDayMeta">—</div></div>
    </div>
    <div class="table-wrap" style="margin-top:13px"><table class="heat-table"><thead id="workloadHead"></thead><tbody id="workloadBody"></tbody></table></div>
    <div class="analytics-note">Capacity is shown as count of scheduled workflow actions rather than invented hours. Each cell drills to the specific Preparation / Approval / Entry / Review actions.</div>

    <div class="section"><h2>Workflow bottleneck analytics</h2></div>
    <div class="grid three">
      <div class="card"><div class="kpi-label">Slowest handoff stage</div><div class="kpi-value" id="bottleneckStage">—</div><div class="kpi-meta" id="bottleneckStageMeta">—</div></div>
      <div class="card"><div class="kpi-label">Highest late sign-off rate</div><div class="kpi-value" id="bottleneckLate">—</div><div class="kpi-meta" id="bottleneckLateMeta">—</div></div>
      <div class="card"><div class="kpi-label">Total measured handoff time</div><div class="kpi-value" id="bottleneckHours">—</div><div class="kpi-meta">Between consecutive workflow sign-offs</div></div>
    </div>
    <div class="table-wrap" style="margin-top:13px"><table><thead><tr><th>Stage</th><th>Completed sign-offs</th><th>Late %</th><th>Avg late when late</th><th>Measured handoffs</th><th>Avg handoff time</th><th>Total handoff time</th></tr></thead><tbody id="bottleneckBody"></tbody></table></div>

    <div class="section"><h2>Monthly trends</h2></div>
    <div class="grid two">
      <div class="card chart-card"><div class="section"><h2>Tasks completed · monthly trend</h2></div><canvas class="chart" id="managerTaskTrendCanvas"></canvas><div id="managerTaskLegend" class="small" style="display:flex;gap:14px;flex-wrap:wrap;margin-top:4px"></div><div class="analytics-note">Click a month to open the team detail for that period.</div></div>
      <div class="card chart-card"><div class="section"><h2>Average score · monthly trend</h2></div><canvas class="chart" id="managerScoreTrendCanvas"></canvas><div id="managerScoreLegend" class="small" style="display:flex;gap:14px;flex-wrap:wrap;margin-top:4px"></div><div class="analytics-note">Click a month to open the team detail for that period.</div></div>
    </div>

    <div class="section"><h2>Monthly close scorecard / post-mortem</h2><span id="postmortemState" class="pill neutral">LIVE PREVIEW</span></div>
    <div class="help">When <b>Mark close complete now</b> is clicked, this scorecard is frozen with that period's close time, task completion, timeliness, score, corrections, manual JEs and bottlenecks. Clearing the close reopens the period and removes the frozen snapshot.</div>
    <div id="postmortemCards" class="grid three" style="margin-top:13px"></div>
    <div class="grid two" style="margin-top:13px">
      <div class="card"><div class="section"><h2>Top post-mortem issues</h2></div><div id="postmortemIssues"></div></div>
      <div class="card"><div class="section"><h2>Close history</h2></div><div class="table-wrap"><table><thead><tr><th>Month</th><th>Close</th><th>Target</th><th>Completion</th><th>On-time</th><th>Avg score</th><th>Corrections</th></tr></thead><tbody id="postmortemHistory"></tbody></table></div></div>
    </div>
  </section>

  <section id="settings"'''
html = section_pattern.sub(manager_section, html, count=1)

# Replace Manager KPI renderer and inject analytics functions before renderAll.
manager_fn_pattern = re.compile(r'function renderManagerKPI\(\)\{.*?\n\}\nfunction renderAll\(\)', re.S)
if not manager_fn_pattern.search(html):
    raise SystemExit('renderManagerKPI block not found')
analytics_js = r'''function managerTaskDetails(person,period){
 return allTemplates().filter(t=>t.person===person).map(t=>{const stages=enabledStages(t),last=stages[stages.length-1],sign=last?pstate(period,t.id).stages?.[last]:null,due=finalDue(t,period),doneAt=sign?.doneAt||null,lateMinutes=doneAt&&due?Math.max(0,Math.round((new Date(doneAt)-due)/60000)):null;return {id:t.id,name:t.name,person:t.person,done:!!doneAt,doneAt,doneBy:sign?.doneBy||'',due,lateMinutes,score:doneAt?managerTimingScore(doneAt,due):null,closeCritical:!!t.closeCritical}})
}
function managerDeliverableDetails(person,period){
 const out=[],byBu=state.headOfficeHistory?.[period]||{};
 for(const h of (state.headOfficeTemplate||[]).filter(x=>x.active!==false&&hoPrepOwner(x)===person)){const ds=hoPState(period,h.id),due=finalDue(h,period);for(const [bu,scores] of Object.entries(byBu)){const score=numericScore(scores?.[h.activity]);if(score===null)continue;out.push({id:h.id,name:h.activity,bu,score,due,reviewedAt:ds.reviewedAt||null,reviewedBy:ds.reviewedDoneBy||'',manualOverride:!!ds.manualScoreOverride,autoScore:ds.autoScore??null})}}
 return out
}
function managerScoreDecomposition(person,period){
 const tasks=managerTaskDetails(person,period),completed=tasks.filter(x=>x.done),deliverables=managerDeliverableDetails(person,period),uniqueDeliverables=(state.headOfficeTemplate||[]).filter(h=>h.active!==false&&hoPrepOwner(h)===person).map(h=>({h,ds:hoPState(period,h.id)})).filter(x=>x.ds.reviewedAt);
 const timed=[...completed.filter(x=>x.due).map(x=>({at:x.doneAt,due:x.due})),...uniqueDeliverables.filter(x=>finalDue(x.h,period)).map(x=>({at:x.ds.reviewedAt,due:finalDue(x.h,period)}))];
 const late=timed.map(x=>Math.max(0,(new Date(x.at)-x.due)/60000)).filter(x=>x>0),onTime=timed.length?timed.filter(x=>new Date(x.at)<=x.due).length/timed.length:null;
 const ftrEligible=uniqueDeliverables.filter(x=>x.ds.autoScore!=null),ftr=ftrEligible.length?ftrEligible.filter(x=>!x.ds.manualScoreOverride).length/ftrEligible.length:null;
 const corrections=(state.corrections||[]).filter(x=>x.period===period&&personMatches(x.owner,person));
 return {completion:tasks.length?completed.length/tasks.length:null,onTime,avgLateness:late.length?late.reduce((a,b)=>a+b,0)/late.length:0,ftr,ftrN:ftrEligible.length,corrections,composite:managerMetrics(person,period).avg,tasks,deliverables}
}
function fmtMinutes(mins){if(mins==null)return '—';const m=Math.round(mins);if(m<60)return `${m}m`;const h=Math.floor(m/60),r=m%60;return `${h}h${r?` ${r}m`:''}`}
function openAnalyticsDrill(title,headers,rows){const body=rows.length?rows.map(r=>`<tr>${r.map(v=>`<td>${esc(v==null?'—':String(v))}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}" class="empty">No underlying records.</td></tr>`;openModal(title,`<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div><div class="modal-actions"><button type="button" class="btn" onclick="closeModal()">Close</button></div>`,async()=>{})}
function drillManager(person,kind,period=selectedPeriod){const tasks=managerTaskDetails(person,period),deliverables=managerDeliverableDetails(person,period),d=managerScoreDecomposition(person,period);let title=`${person} · ${monthName(period)}`,headers=[],rows=[];
 if(kind==='assigned'||kind==='completion'){headers=['Task','Due','Status','Final sign-off','Score'];rows=tasks.map(x=>[x.name,fmtDate(x.due),x.done?'Done':'Open',x.doneAt?fmtDate(x.doneAt):'—',x.score??'—'])}
 else if(kind==='done'||kind==='taskScore'){headers=['Task','Due','Signed off','By','Late','Score'];rows=tasks.filter(x=>x.done).map(x=>[x.name,fmtDate(x.due),fmtDate(x.doneAt),x.doneBy,fmtMinutes(x.lateMinutes),x.score])}
 else if(kind==='deliverable'){headers=['Deliverable','BU','Reviewed','Reviewer','Score','Override'];rows=deliverables.map(x=>[x.name,x.bu,x.reviewedAt?fmtDate(x.reviewedAt):'—',x.reviewedBy,x.score,x.manualOverride?'Yes':'No'])}
 else if(kind==='ontime'){headers=['Item','Type','Due','Signed off','Result'];rows=[...tasks.filter(x=>x.done&&x.due).map(x=>[x.name,'Task',fmtDate(x.due),fmtDate(x.doneAt),new Date(x.doneAt)<=x.due?'On time':`${fmtMinutes(x.lateMinutes)} late`]),...(state.headOfficeTemplate||[]).filter(h=>h.active!==false&&hoPrepOwner(h)===person).map(h=>({h,ds:hoPState(period,h.id)})).filter(x=>x.ds.reviewedAt&&finalDue(x.h,period)).map(x=>[x.h.activity,'Deliverable',fmtDate(finalDue(x.h,period)),fmtDate(x.ds.reviewedAt),new Date(x.ds.reviewedAt)<=finalDue(x.h,period)?'On time':`${fmtMinutes((new Date(x.ds.reviewedAt)-finalDue(x.h,period))/60000)} late`])]}
 else if(kind==='ftr'){headers=['Deliverable','Reviewed','Auto score','Manual override','First-time-right'];rows=(state.headOfficeTemplate||[]).filter(h=>h.active!==false&&hoPrepOwner(h)===person).map(h=>({h,ds:hoPState(period,h.id)})).filter(x=>x.ds.reviewedAt&&x.ds.autoScore!=null).map(x=>[x.h.activity,fmtDate(x.ds.reviewedAt),x.ds.autoScore,x.ds.manualScoreOverride?'Yes':'No',x.ds.manualScoreOverride?'No':'Yes'])}
 else if(kind==='corrections'){headers=['Date','Process','Amount','Root cause'];rows=d.corrections.map(x=>[x.date,x.process,money(x.amount),x.rootCause])}
 else{headers=['Item','Type','Score'];rows=[...tasks.filter(x=>x.done&&x.score!=null).map(x=>[x.name,'Task',x.score]),...deliverables.map(x=>[`${x.name} · ${x.bu}`,'Deliverable',x.score])]}
 openAnalyticsDrill(title,headers,rows)}
function openMonthDrill(period){const rows=managerKpiUsers().map(person=>{const m=managerMetrics(person,period),d=managerScoreDecomposition(person,period);return [person,m.task.assigned,m.task.done,d.completion==null?'—':Math.round(d.completion*100)+'%',d.onTime==null?'—':Math.round(d.onTime*100)+'%',m.avg==null?'—':m.avg.toFixed(2)]});openAnalyticsDrill(`Team performance · ${monthName(period)}`,['Team member','Assigned','Done','Completion','On-time','Avg score'],rows)}
function bindTrendDrill(canvasId,periods){const c=$(canvasId);if(!c)return;c.onclick=e=>{const r=c.getBoundingClientRect(),x=e.clientX-r.left,pad=40,cw=r.width-55;if(x<pad||x>pad+cw||!periods.length)return;const idx=Math.max(0,Math.min(periods.length-1,Math.round((x-pad)/cw*Math.max(periods.length-1,1))));openMonthDrill(periods[idx])}}
function renderManagerKPI(){
 const managers=managerKpiUsers(),metrics=managers.map(m=>managerMetrics(m,selectedPeriod));
 const assigned=metrics.reduce((a,x)=>a+x.task.assigned,0),done=metrics.reduce((a,x)=>a+x.task.done,0),scoreN=metrics.reduce((a,x)=>a+x.n,0),scoreSum=metrics.reduce((a,x)=>a+(x.avg===null?0:x.avg*x.n),0),teamAvg=scoreN?scoreSum/scoreN:null;
 $("managerTeamDone").textContent=`${done} / ${assigned}`;$("managerTeamDoneMeta").textContent=`${managers.length} active team members`;$("managerTeamCompletion").textContent=assigned?Math.round(done/assigned*100)+'%':'—';$("managerTeamAvg").textContent=teamAvg===null?'—':teamAvg.toFixed(2);
 $("managerKpiBody").innerHTML=metrics.map(x=>`<tr><td><b>${esc(x.person)}</b></td><td><button class="metric-link" onclick="drillManager('${escAttr(x.person)}','assigned')">${x.task.assigned}</button></td><td><button class="metric-link" onclick="drillManager('${escAttr(x.person)}','done')">${x.task.done}</button></td><td><button class="metric-link" onclick="drillManager('${escAttr(x.person)}','completion')">${x.task.completion===null?'—':Math.round(x.task.completion*100)+'%'}</button></td><td><button class="metric-link" onclick="drillManager('${escAttr(x.person)}','taskScore')">${x.task.avg===null?'—':x.task.avg.toFixed(2)}</button></td><td><button class="metric-link" onclick="drillManager('${escAttr(x.person)}','deliverable')">${x.deliverableAvg===null?'—':x.deliverableAvg.toFixed(2)}${x.deliverableScores.length?` (${x.deliverableScores.length})`:''}</button></td><td><button class="metric-link" onclick="drillManager('${escAttr(x.person)}','average')"><b>${x.avg===null?'—':x.avg.toFixed(2)}</b></button></td></tr>`).join('')||'<tr><td colspan="7" class="empty">No team KPI data.</td></tr>';
 const periods=managerTrendPeriods(selectedPeriod),labels=periods.map(p=>new Date(Number(p.slice(0,4)),Number(p.slice(5))-1,1).toLocaleDateString('en-CA',{month:'short'}));
 const taskSeries=managers.map(m=>({values:periods.map(p=>managerTaskMetrics(m,p).done)}));const maxTasks=Math.max(1,...taskSeries.flatMap(s=>s.values));drawLine('managerTaskTrendCanvas',labels,taskSeries,0,Math.ceil(maxTasks));
 const scoreSeries=managers.map(m=>({values:periods.map(p=>managerMetrics(m,p).avg)}));drawLine('managerScoreTrendCanvas',labels,scoreSeries,0,3);
 const legend=managerLegendHTML(managers);$("managerTaskLegend").innerHTML=legend;$("managerScoreLegend").innerHTML=legend;bindTrendDrill('managerTaskTrendCanvas',periods);bindTrendDrill('managerScoreTrendCanvas',periods)
}
function renderScoreDecomposition(){const people=managerKpiUsers();$("scoreDecompBody").innerHTML=people.map(p=>{const d=managerScoreDecomposition(p,selectedPeriod);return `<tr><td><b>${esc(p)}</b></td><td><button class="metric-link" onclick="drillManager('${escAttr(p)}','completion')">${d.completion==null?'—':Math.round(d.completion*100)+'%'}</button></td><td><button class="metric-link" onclick="drillManager('${escAttr(p)}','ontime')">${d.onTime==null?'—':Math.round(d.onTime*100)+'%'}</button></td><td>${fmtMinutes(d.avgLateness)}</td><td><button class="metric-link" onclick="drillManager('${escAttr(p)}','ftr')">${d.ftr==null?'—':Math.round(d.ftr*100)+'%'}${d.ftrN?` (${d.ftrN})`:''}</button></td><td><button class="metric-link" onclick="drillManager('${escAttr(p)}','corrections')">${d.corrections.length}</button></td><td><button class="metric-link" onclick="drillManager('${escAttr(p)}','average')"><b>${d.composite==null?'—':d.composite.toFixed(2)}</b></button></td></tr>`}).join('')}
function workloadActions(person,wd,period=selectedPeriod){const out=[];for(const t of allTemplates().filter(t=>parseWD(t.day)===wd)){for(const s of enabledStages(t)){const owner=stageOwner(t,s);if(!personMatches(owner,person))continue;const sign=pstate(period,t.id).stages?.[s];out.push({task:t.name,stage:s,due:stageDue(t,s,period),doneAt:sign?.doneAt||null,doneBy:sign?.doneBy||'',critical:!!t.closeCritical})}}return out}
function drillWorkload(person,wd){const rows=workloadActions(person,wd).map(x=>[x.task,x.stage,fmtDate(x.due),x.doneAt?fmtDate(x.doneAt):'Open',x.doneBy,x.critical?'Yes':'No']);openAnalyticsDrill(`${person} · WD${wd} workflow load`,['Task','Stage','Due','Status / sign-off','Signed by','Close critical'],rows)}
function renderWorkloadHeatmap(){const people=managerKpiUsers(),wds=[...new Set(allTemplates().map(t=>parseWD(t.day)).filter(x=>x!==null))].sort((a,b)=>a-b);const counts=[],dayTotals={};for(const p of people)for(const wd of wds){const n=workloadActions(p,wd).length;counts.push({p,wd,n});dayTotals[wd]=(dayTotals[wd]||0)+n}const max=Math.max(1,...counts.map(x=>x.n)),total=counts.reduce((a,x)=>a+x.n,0),peak=counts.slice().sort((a,b)=>b.n-a.n)[0],peakDay=Object.entries(dayTotals).sort((a,b)=>b[1]-a[1])[0];$("workloadTotal").textContent=total;$("workloadPeak").textContent=peak?peak.n:'—';$("workloadPeakMeta").textContent=peak?`${peak.p} · WD${peak.wd}`:'—';$("workloadPeakDay").textContent=peakDay?`WD${peakDay[0]}`:'—';$("workloadPeakDayMeta").textContent=peakDay?`${peakDay[1]} workflow actions`:'—';$("workloadHead").innerHTML=`<tr><th>Team member</th>${wds.map(w=>`<th>WD${w}</th>`).join('')}<th>Total</th></tr>`;$("workloadBody").innerHTML=people.map(p=>{const vals=wds.map(wd=>workloadActions(p,wd).length),sum=vals.reduce((a,b)=>a+b,0);return `<tr><td><b>${esc(p)}</b></td>${vals.map((n,i)=>{const alpha=n?(.10+.55*n/max).toFixed(2):0;return `<td><button class="heat-cell" style="background:rgba(104,168,255,${alpha})" onclick="drillWorkload('${escAttr(p)}',${wds[i]})">${n||'—'}</button></td>`}).join('')}<td><b>${sum}</b></td></tr>`}).join('')}
function stageBottleneckDetails(stage,period=selectedPeriod){const rows=[];for(const t of allTemplates().filter(t=>enabledStages(t).includes(stage))){const ps=pstate(period,t.id),sign=ps.stages?.[stage];if(!sign?.doneAt)continue;const due=stageDue(t,stage,period),lateMins=due?Math.max(0,(new Date(sign.doneAt)-due)/60000):0,stages=enabledStages(t),idx=stages.indexOf(stage),prev=idx>0?ps.stages?.[stages[idx-1]]:null,handoffMins=prev?.doneAt?Math.max(0,(new Date(sign.doneAt)-new Date(prev.doneAt))/60000):null;rows.push({task:t.name,person:t.person,owner:stageOwner(t,stage),doneAt:sign.doneAt,due,lateMins,handoffMins})}return rows}
function stageBottleneckStats(period=selectedPeriod){return STAGES.map(stage=>{const rows=stageBottleneckDetails(stage,period),late=rows.filter(x=>x.lateMins>0),handoffs=rows.filter(x=>x.handoffMins!=null);return {stage,rows,n:rows.length,latePct:rows.length?late.length/rows.length:null,avgLate:late.length?late.reduce((a,x)=>a+x.lateMins,0)/late.length:0,handoffN:handoffs.length,avgHandoff:handoffs.length?handoffs.reduce((a,x)=>a+x.handoffMins,0)/handoffs.length:null,totalHandoff:handoffs.reduce((a,x)=>a+x.handoffMins,0)}})}
function drillBottleneck(stage){const rows=stageBottleneckDetails(stage).map(x=>[x.task,x.person,x.owner,fmtDate(x.due),fmtDate(x.doneAt),fmtMinutes(x.lateMins),x.handoffMins==null?'—':fmtMinutes(x.handoffMins)]);openAnalyticsDrill(`${stage} bottleneck detail · ${monthName(selectedPeriod)}`,['Task','Task owner','Stage owner','Due','Signed off','Late','Handoff time'],rows)}
function renderBottlenecks(){const stats=stageBottleneckStats(),measured=stats.filter(x=>x.avgHandoff!=null),slow=measured.slice().sort((a,b)=>b.avgHandoff-a.avgHandoff)[0],late=stats.filter(x=>x.latePct!=null).slice().sort((a,b)=>b.latePct-a.latePct)[0],total=stats.reduce((a,x)=>a+x.totalHandoff,0);$("bottleneckStage").textContent=slow?slow.stage:'—';$("bottleneckStageMeta").textContent=slow?`${fmtMinutes(slow.avgHandoff)} avg handoff · ${slow.handoffN} measured`:'No measured handoffs';$("bottleneckLate").textContent=late?Math.round(late.latePct*100)+'%':'—';$("bottleneckLateMeta").textContent=late?`${late.stage} · ${late.n} sign-offs`:'—';$("bottleneckHours").textContent=fmtMinutes(total);$("bottleneckBody").innerHTML=stats.map(x=>`<tr class="clickable-row" onclick="drillBottleneck('${x.stage}')"><td><b>${x.stage}</b></td><td>${x.n}</td><td>${x.latePct==null?'—':Math.round(x.latePct*100)+'%'}</td><td>${fmtMinutes(x.avgLate)}</td><td>${x.handoffN}</td><td>${x.avgHandoff==null?'—':fmtMinutes(x.avgHandoff)}</td><td>${fmtMinutes(x.totalHandoff)}</td></tr>`).join('')}
function teamWeightedAverage(period){const metrics=managerKpiUsers().map(p=>managerMetrics(p,period)),n=metrics.reduce((a,x)=>a+x.n,0),sum=metrics.reduce((a,x)=>a+(x.avg==null?0:x.avg*x.n),0);return n?sum/n:null}
function buildCloseSnapshot(period,at){const all=managerKpiUsers().flatMap(p=>managerTaskDetails(p,period)),done=all.filter(x=>x.done),timed=done.filter(x=>x.due),onTime=timed.length?timed.filter(x=>new Date(x.doneAt)<=x.due).length/timed.length:null,target=targetClose(period),actual=new Date(at),stageStats=stageBottleneckStats(period),slow=stageStats.filter(x=>x.avgHandoff!=null).sort((a,b)=>b.avgHandoff-a.avgHandoff)[0],lateTasks=done.filter(x=>x.lateMinutes>0).sort((a,b)=>b.lateMinutes-a.lateMinutes);return {period,frozenAt:new Date().toISOString(),closeAt:at,targetAt:target.toISOString(),minutesVsTarget:Math.round((target-actual)/60000),assigned:all.length,done:done.length,completion:all.length?done.length/all.length:null,onTime,avgScore:teamWeightedAverage(period),corrections:(state.corrections||[]).filter(x=>x.period===period).length,manualJEs:(state.manualJEs||[]).filter(x=>x.period===period).length,bottleneck:slow?{stage:slow.stage,avgHandoff:slow.avgHandoff}:null,lateTasks:lateTasks.slice(0,5).map(x=>({name:x.name,person:x.person,lateMinutes:x.lateMinutes}))}}
function renderPostMortem(){const actual=state.closeActual?.[selectedPeriod],snap=state.closeSnapshots?.[selectedPeriod]||(actual?buildCloseSnapshot(selectedPeriod,actual):buildCloseSnapshot(selectedPeriod,new Date().toISOString())),frozen=!!state.closeSnapshots?.[selectedPeriod],target=new Date(snap.targetAt),close=new Date(snap.closeAt);$("postmortemState").className='pill '+(frozen?'good':'neutral');$("postmortemState").textContent=frozen?'FROZEN AT CLOSE':'LIVE PREVIEW';const status=snap.minutesVsTarget>=0?`${snap.minutesVsTarget} min ahead`:`${Math.abs(snap.minutesVsTarget)} min late`;$("postmortemCards").innerHTML=`<div class="card"><div class="kpi-label">Close actual</div><div class="kpi-value">${actual?close.toLocaleDateString('en-CA',{month:'short',day:'numeric'}):'Open'}</div><div class="kpi-meta">${actual?close.toLocaleTimeString('en-CA',{hour:'numeric',minute:'2-digit'})+' · '+status:'Target '+fmtDate(target)}</div></div><div class="card"><div class="kpi-label">Task completion</div><div class="kpi-value">${snap.completion==null?'—':Math.round(snap.completion*100)+'%'}</div><div class="kpi-meta">${snap.done} / ${snap.assigned} tasks</div></div><div class="card"><div class="kpi-label">On-time completion</div><div class="kpi-value">${snap.onTime==null?'—':Math.round(snap.onTime*100)+'%'}</div><div class="kpi-meta">Completed tasks vs final deadline</div></div><div class="card"><div class="kpi-label">Average score</div><div class="kpi-value">${snap.avgScore==null?'—':Number(snap.avgScore).toFixed(2)}</div><div class="kpi-meta">Team task + deliverable score</div></div><div class="card"><div class="kpi-label">Corrections</div><div class="kpi-value">${snap.corrections}</div><div class="kpi-meta">Current period</div></div><div class="card"><div class="kpi-label">Manual JEs</div><div class="kpi-value">${snap.manualJEs}</div><div class="kpi-meta">Current period</div></div>`;const issues=[];if(snap.bottleneck)issues.push(`<div><b>${esc(snap.bottleneck.stage)} bottleneck</b><div class="small">Average measured handoff ${fmtMinutes(snap.bottleneck.avgHandoff)}</div></div>`);for(const x of snap.lateTasks||[])issues.push(`<div style="margin-top:9px"><b>${esc(x.name)}</b><div class="small">${esc(x.person)} · ${fmtMinutes(x.lateMinutes)} late</div></div>`);if(snap.corrections)issues.push(`<div style="margin-top:9px"><b>${snap.corrections} correction${snap.corrections===1?'':'s'}</b><div class="small">Review Quality & Corrections for root causes.</div></div>`);$("postmortemIssues").innerHTML=issues.join('')||'<div class="empty">No material timing or correction issues identified.</div>';const periods=managerTrendPeriods(selectedPeriod);$("postmortemHistory").innerHTML=periods.map(p=>{const a=state.closeActual?.[p],s=state.closeSnapshots?.[p]||(a?buildCloseSnapshot(p,a):null);if(!s)return `<tr class="clickable-row" onclick="selectAnalyticsPeriod('${p}')"><td>${monthName(p)}</td><td>Open / not recorded</td><td>${fmtDate(targetClose(p))}</td><td>—</td><td>—</td><td>—</td><td>${(state.corrections||[]).filter(x=>x.period===p).length}</td></tr>`;return `<tr class="clickable-row" onclick="selectAnalyticsPeriod('${p}')"><td>${monthName(p)}</td><td>${fmtDate(new Date(s.closeAt))}</td><td>${s.minutesVsTarget>=0?'On target':'Late'}</td><td>${s.completion==null?'—':Math.round(s.completion*100)+'%'}</td><td>${s.onTime==null?'—':Math.round(s.onTime*100)+'%'}</td><td>${s.avgScore==null?'—':Number(s.avgScore).toFixed(2)}</td><td>${s.corrections}</td></tr>`}).join('')}
function selectAnalyticsPeriod(period){selectedPeriod=period;$("periodSelect").value=period;renderAll()}
function renderManagementAnalytics(){renderScoreDecomposition();renderWorkloadHeatmap();renderBottlenecks();renderPostMortem()}
function renderAll()'''
html = manager_fn_pattern.sub(analytics_js, html, count=1)

# Add the analytics renderer to renderAll.
html = must_replace(html,
    'function renderAll(){initUsers();renderCockpit();renderWorkflow();renderHeadOffice();renderTeam();renderQuality();renderAutomation();renderImprovements();renderManagerKPI();renderSettings();renderTeamManagement();refreshIntegrationStatus();updateAlertBanner()}',
    'function renderAll(){initUsers();renderCockpit();renderWorkflow();renderHeadOffice();renderTeam();renderQuality();renderAutomation();renderImprovements();renderManagerKPI();renderManagementAnalytics();renderSettings();renderTeamManagement();refreshIntegrationStatus();updateAlertBanner()}',
    'renderAll analytics call')

# Freeze a post-mortem snapshot when the period is marked closed.
html = must_replace(html,
    '$("markCloseBtn").onclick=()=>action({type:"close_set",period:selectedPeriod,at:new Date().toISOString()});$("clearCloseBtn").onclick=()=>action({type:"close_clear",period:selectedPeriod});',
    '$("markCloseBtn").onclick=()=>{const at=new Date().toISOString();action({type:"close_set",period:selectedPeriod,at,snapshot:buildCloseSnapshot(selectedPeriod,at)})};$("clearCloseBtn").onclick=()=>action({type:"close_clear",period:selectedPeriod});',
    'close snapshot click')

# Preserve snapshots in standalone mode too.
html = must_replace(html,
    'if(a.type==="close_set")state.closeActual[a.period]=a.at;\n if(a.type==="close_clear")delete state.closeActual[a.period];',
    'if(a.type==="close_set"){state.closeActual[a.period]=a.at;state.closeSnapshots??={};if(a.snapshot)state.closeSnapshots[a.period]=a.snapshot}\n if(a.type==="close_clear"){delete state.closeActual[a.period];if(state.closeSnapshots)delete state.closeSnapshots[a.period]}',
    'local close snapshot')

# Re-render management charts on resize.
html = html.replace('window.addEventListener("resize",()=>{drawHOTrend("hoTrendCanvas","Ifast");drawHOTrend("hoBUCanvas",$("buSelect").value);drawStageChart()})', 'window.addEventListener("resize",()=>{drawHOTrend("hoTrendCanvas","Ifast");drawHOTrend("hoBUCanvas",$("buSelect").value);drawStageChart();renderManagerKPI()})', 1)

# Worker persistence for frozen close scorecard.
js = must_replace(js,
    "  } else if (a.type === 'close_set') {\n    state.closeActual ??= {};\n    state.closeActual[a.period] = a.at;\n  } else if (a.type === 'close_clear') {\n    if (state.closeActual) delete state.closeActual[a.period];\n",
    "  } else if (a.type === 'close_set') {\n    state.closeActual ??= {};\n    state.closeActual[a.period] = a.at;\n    state.closeSnapshots ??= {};\n    if (a.snapshot) state.closeSnapshots[a.period] = a.snapshot;\n  } else if (a.type === 'close_clear') {\n    if (state.closeActual) delete state.closeActual[a.period];\n    if (state.closeSnapshots) delete state.closeSnapshots[a.period];\n",
    'worker close snapshot')

index.write_text(html)
worker.write_text(js)

# Extract inline dashboard JS for syntax validation in CI.
scripts = re.findall(r'<script>(.*?)</script>', html, re.S)
if not scripts:
    raise SystemExit('Inline script not found')
Path('/tmp/dashboard-inline.js').write_text(scripts[-1])
print('Management analytics patch applied.')
