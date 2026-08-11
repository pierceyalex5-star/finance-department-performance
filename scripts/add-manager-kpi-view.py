from pathlib import Path

p = Path('index.html')
html = p.read_text()

def replace_once(old, new, label):
    global html
    if old not in html:
        raise SystemExit(f'Missing expected snippet: {label}')
    html = html.replace(old, new, 1)

replace_once(
'''    <button data-page="improvement">07 · Improvements</button>
    <button data-page="settings">08 · Settings</button>''',
'''    <button data-page="improvement">07 · Improvements</button>
    <button data-page="managerKpi">08 · Manager KPI</button>
    <button data-page="settings">09 · Settings</button>''',
'nav manager KPI'
)

manager_section = '''
  <section id="managerKpi" class="page">
    <div class="section"><h2>Manager KPI · Akram, Dumitru & Alex</h2></div>
    <div class="help">Task accountability follows the recurring <b>Person / task list</b> owner. A task is Done only when every enabled workflow stage is signed off. Average performance score combines completed task timing with deliverables where the manager is <b>Prepared by</b>: 3 = on time, 2 = up to 1h late, 1 = more than 1h late; deliverable manual overrides and 0 / Not sent are preserved.</div>
    <div id="managerKpiCards" class="grid three" style="margin-top:13px"></div>
    <div class="section"><h2>Current month comparison</h2></div>
    <div class="table-wrap"><table><thead><tr><th>Manager</th><th>Assigned tasks</th><th>Tasks done</th><th>Completion %</th><th>Task timing score</th><th>Deliverable score</th><th>Average score</th></tr></thead><tbody id="managerKpiBody"></tbody></table></div>
    <div class="grid two" style="margin-top:13px">
      <div class="card chart-card"><div class="section"><h2>Tasks completed · monthly trend</h2></div><canvas class="chart" id="managerTaskTrendCanvas"></canvas><div id="managerTaskLegend" class="small" style="display:flex;gap:14px;flex-wrap:wrap;margin-top:4px"></div></div>
      <div class="card chart-card"><div class="section"><h2>Average score · monthly trend</h2></div><canvas class="chart" id="managerScoreTrendCanvas"></canvas><div id="managerScoreLegend" class="small" style="display:flex;gap:14px;flex-wrap:wrap;margin-top:4px"></div></div>
    </div>
  </section>

'''
replace_once('  <section id="settings" class="page">', manager_section + '  <section id="settings" class="page">', 'manager section')

old_render_all = 'function renderAll(){initUsers();renderCockpit();renderWorkflow();renderHeadOffice();renderTeam();renderQuality();renderAutomation();renderImprovements();renderSettings();renderTeamManagement();refreshIntegrationStatus();updateAlertBanner()}'
manager_js = r'''const MANAGER_KPI_FIRST_NAMES=["Akram","Dumitru","Alex"];
function managerKpiUsers(){
 const users=state.users||[];
 return MANAGER_KPI_FIRST_NAMES.map(first=>users.find(u=>String(u).toLowerCase().startsWith(first.toLowerCase()))).filter(Boolean)
}
function managerTimingScore(at,due){
 if(!at||!due)return null;const mins=(new Date(at)-due)/60000;return mins<=0?3:mins<=60?2:1
}
function managerTaskMetrics(person,period){
 const tasks=allTemplates().filter(t=>t.person===person);let done=0;const scores=[];
 for(const t of tasks){const stages=enabledStages(t);if(!stages.length)continue;const last=stages[stages.length-1],sign=pstate(period,t.id).stages?.[last];if(!sign?.doneAt)continue;done++;const s=managerTimingScore(sign.doneAt,finalDue(t,period));if(s!==null)scores.push(s)}
 return {assigned:tasks.length,done,completion:tasks.length?done/tasks.length:null,scores,avg:scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null}
}
function managerDeliverableScores(person,period){
 const values=[];const byBu=state.headOfficeHistory?.[period]||{};
 for(const h of (state.headOfficeTemplate||[]).filter(x=>x.active!==false&&hoPrepOwner(x)===person)){
  for(const scores of Object.values(byBu)){const v=numericScore(scores?.[h.activity]);if(v!==null)values.push(v)}
 }
 return values
}
function managerMetrics(person,period){
 const task=managerTaskMetrics(person,period),deliverableScores=managerDeliverableScores(person,period);const combined=[...task.scores,...deliverableScores];
 return {person,task,deliverableScores,deliverableAvg:deliverableScores.length?deliverableScores.reduce((a,b)=>a+b,0)/deliverableScores.length:null,avg:combined.length?combined.reduce((a,b)=>a+b,0)/combined.length:null,n:combined.length}
}
function managerTrendPeriods(period){const [y,m]=period.split('-').map(Number);return Array.from({length:m},(_,i)=>`${y}-${String(i+1).padStart(2,'0')}`)}
function managerLegendHTML(managers){const colors=['#68a8ff','#45cf9a','#f4c75c'];return managers.map((m,i)=>`<span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${colors[i%colors.length]};margin-right:5px"></span>${esc(m)}</span>`).join('')}
function renderManagerKPI(){
 const managers=managerKpiUsers(),metrics=managers.map(m=>managerMetrics(m,selectedPeriod));
 $("managerKpiCards").innerHTML=metrics.map(x=>`<div class="card"><div class="kpi-label">${esc(x.person)}</div><div class="kpi-value">${x.task.done} / ${x.task.assigned}</div><div class="kpi-meta">Tasks done · ${x.task.completion===null?'—':Math.round(x.task.completion*100)+'%'} complete</div><div style="margin-top:12px"><span class="pill ${x.avg===null?'neutral':x.avg>=2.5?'good':x.avg>=1.5?'warn':'bad'}">Avg score ${x.avg===null?'—':x.avg.toFixed(2)}</span></div></div>`).join('')||'<div class="card"><div class="empty">Manager names were not found in Team Management.</div></div>';
 $("managerKpiBody").innerHTML=metrics.map(x=>`<tr><td><b>${esc(x.person)}</b></td><td>${x.task.assigned}</td><td>${x.task.done}</td><td>${x.task.completion===null?'—':Math.round(x.task.completion*100)+'%'}</td><td>${x.task.avg===null?'—':x.task.avg.toFixed(2)}</td><td>${x.deliverableAvg===null?'—':x.deliverableAvg.toFixed(2)}${x.deliverableScores.length?` <span class="small">(${x.deliverableScores.length})</span>`:''}</td><td><b>${x.avg===null?'—':x.avg.toFixed(2)}</b></td></tr>`).join('')||'<tr><td colspan="7" class="empty">No manager KPI data.</td></tr>';
 const periods=managerTrendPeriods(selectedPeriod),labels=periods.map(p=>new Date(Number(p.slice(0,4)),Number(p.slice(5))-1,1).toLocaleDateString('en-CA',{month:'short'}));
 const taskSeries=managers.map(m=>({values:periods.map(p=>managerTaskMetrics(m,p).done)}));const maxTasks=Math.max(1,...taskSeries.flatMap(s=>s.values));drawLine('managerTaskTrendCanvas',labels,taskSeries,0,Math.ceil(maxTasks));
 const scoreSeries=managers.map(m=>({values:periods.map(p=>managerMetrics(m,p).avg)}));drawLine('managerScoreTrendCanvas',labels,scoreSeries,0,3);
 const legend=managerLegendHTML(managers);$("managerTaskLegend").innerHTML=legend;$("managerScoreLegend").innerHTML=legend
}
function renderAll(){initUsers();renderCockpit();renderWorkflow();renderHeadOffice();renderTeam();renderQuality();renderAutomation();renderImprovements();renderManagerKPI();renderSettings();renderTeamManagement();refreshIntegrationStatus();updateAlertBanner()}'''
replace_once(old_render_all, manager_js, 'renderAll manager KPI')

replace_once(
'window.addEventListener("resize",()=>{drawHOTrend("hoTrendCanvas","Ifast");drawHOTrend("hoBUCanvas",$("buSelect").value);drawStageChart()})',
'window.addEventListener("resize",()=>{drawHOTrend("hoTrendCanvas","Ifast");drawHOTrend("hoBUCanvas",$("buSelect").value);drawStageChart();renderManagerKPI()})',
'resize manager KPI'
)

if 'managerTaskTrendCanvas' not in html or 'function renderManagerKPI()' not in html or '08 · Manager KPI' not in html:
    raise SystemExit('Manager KPI verification failed')

p.write_text(html)
print('Manager KPI view patched successfully')
