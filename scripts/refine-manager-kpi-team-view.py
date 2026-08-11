from pathlib import Path

p=Path('index.html')
html=p.read_text()

def rep(old,new,label):
    global html
    if old not in html: raise SystemExit(f'Missing expected snippet: {label}')
    html=html.replace(old,new,1)

rep('<div class="section"><h2>Manager KPI · Akram, Dumitru & Alex</h2></div>','<div class="section"><h2>Manager KPI · Team performance</h2></div>','manager heading')
rep('Task accountability follows the recurring <b>Person / task list</b> owner. A task is Done only when every enabled workflow stage is signed off. Average performance score combines completed task timing with deliverables where the manager is <b>Prepared by</b>: 3 = on time, 2 = up to 1h late, 1 = more than 1h late; deliverable manual overrides and 0 / Not sent are preserved.','This management view is intended for <b>Akram, Dumitru and Alex</b> and compares every active finance team member. Task accountability follows the recurring <b>Person / task list</b> owner. A task is Done only when every enabled workflow stage is signed off. Average performance score combines completed task timing with deliverables where the person is <b>Prepared by</b>: 3 = on time, 2 = up to 1h late, 1 = more than 1h late; deliverable manual overrides and 0 / Not sent are preserved.','manager help')

old_cards='<div id="managerKpiCards" class="grid three" style="margin-top:13px"></div>'
new_cards='''<div class="grid three" style="margin-top:13px">
      <div class="card"><div class="kpi-label">Team tasks done</div><div class="kpi-value" id="managerTeamDone">0</div><div class="kpi-meta" id="managerTeamDoneMeta">—</div></div>
      <div class="card"><div class="kpi-label">Team completion rate</div><div class="kpi-value" id="managerTeamCompletion">—</div><div class="kpi-meta">Fully signed-off recurring tasks</div></div>
      <div class="card"><div class="kpi-label">Team average score</div><div class="kpi-value" id="managerTeamAvg">—</div><div class="kpi-meta">Weighted by completed task/deliverable observations</div></div>
    </div>'''
rep(old_cards,new_cards,'manager summary cards')

rep('const MANAGER_KPI_FIRST_NAMES=["Akram","Dumitru","Alex"];\nfunction managerKpiUsers(){\n const users=state.users||[];\n return MANAGER_KPI_FIRST_NAMES.map(first=>users.find(u=>String(u).toLowerCase().startsWith(first.toLowerCase()))).filter(Boolean)\n}','function managerKpiUsers(){return (state.users||[]).slice()}','manager people source')

old_legend="function managerLegendHTML(managers){const colors=['#68a8ff','#45cf9a','#f4c75c'];return managers.map((m,i)=>`<span><span style=\"display:inline-block;width:9px;height:9px;border-radius:50%;background:${colors[i%colors.length]};margin-right:5px\"></span>${esc(m)}</span>`).join('')}"
new_legend="function managerLegendHTML(managers){const colors=['#68a8ff','#45cf9a','#f4c75c','#b89cff','#f28bb3','#7dd3fc','#a3e635','#fb923c'];return managers.map((m,i)=>`<span><span style=\"display:inline-block;width:9px;height:9px;border-radius:50%;background:${colors[i%colors.length]};margin-right:5px\"></span>${esc(m)}</span>`).join('')}"
rep(old_legend,new_legend,'manager legend palette')

start=html.find('function renderManagerKPI(){')
end=html.find('\nfunction renderAll(){',start)
if start<0 or end<0: raise SystemExit('Missing renderManagerKPI block')
new_render=r'''function renderManagerKPI(){
 const managers=managerKpiUsers(),metrics=managers.map(m=>managerMetrics(m,selectedPeriod));
 const assigned=metrics.reduce((a,x)=>a+x.task.assigned,0),done=metrics.reduce((a,x)=>a+x.task.done,0),scoreN=metrics.reduce((a,x)=>a+x.n,0),scoreSum=metrics.reduce((a,x)=>a+(x.avg===null?0:x.avg*x.n),0),teamAvg=scoreN?scoreSum/scoreN:null;
 $("managerTeamDone").textContent=`${done} / ${assigned}`;$("managerTeamDoneMeta").textContent=`${managers.length} active team members`;$("managerTeamCompletion").textContent=assigned?Math.round(done/assigned*100)+'%':'—';$("managerTeamAvg").textContent=teamAvg===null?'—':teamAvg.toFixed(2);
 $("managerKpiBody").innerHTML=metrics.map(x=>`<tr><td><b>${esc(x.person)}</b></td><td>${x.task.assigned}</td><td>${x.task.done}</td><td>${x.task.completion===null?'—':Math.round(x.task.completion*100)+'%'}</td><td>${x.task.avg===null?'—':x.task.avg.toFixed(2)}</td><td>${x.deliverableAvg===null?'—':x.deliverableAvg.toFixed(2)}${x.deliverableScores.length?` <span class="small">(${x.deliverableScores.length})</span>`:''}</td><td><b>${x.avg===null?'—':x.avg.toFixed(2)}</b></td></tr>`).join('')||'<tr><td colspan="7" class="empty">No team KPI data.</td></tr>';
 const periods=managerTrendPeriods(selectedPeriod),labels=periods.map(p=>new Date(Number(p.slice(0,4)),Number(p.slice(5))-1,1).toLocaleDateString('en-CA',{month:'short'}));
 const taskSeries=managers.map(m=>({values:periods.map(p=>managerTaskMetrics(m,p).done)}));const maxTasks=Math.max(1,...taskSeries.flatMap(s=>s.values));drawLine('managerTaskTrendCanvas',labels,taskSeries,0,Math.ceil(maxTasks));
 const scoreSeries=managers.map(m=>({values:periods.map(p=>managerMetrics(m,p).avg)}));drawLine('managerScoreTrendCanvas',labels,scoreSeries,0,3);
 const legend=managerLegendHTML(managers);$("managerTaskLegend").innerHTML=legend;$("managerScoreLegend").innerHTML=legend
}'''
html=html[:start]+new_render+html[end:]

rep('x.strokeStyle=["#68a8ff","#45cf9a","#f4c75c","#b89cff"][si%4];','x.strokeStyle=["#68a8ff","#45cf9a","#f4c75c","#b89cff","#f28bb3","#7dd3fc","#a3e635","#fb923c"][si%8];','chart palette')

if 'managerTeamAvg' not in html or 'every active finance team member' not in html: raise SystemExit('Team KPI refinement verification failed')
p.write_text(html)
print('Manager KPI refined to full team view')
