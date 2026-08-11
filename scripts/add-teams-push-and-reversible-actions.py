from pathlib import Path
import re

INDEX = Path('index.html')
WORKER = Path('cloudflare-worker/src/index.js')
WF = Path('.github/workflows/cloudflare-worker.yml')

html = INDEX.read_text(encoding='utf-8')
worker = WORKER.read_text(encoding='utf-8')
wf = WF.read_text(encoding='utf-8')

# --- UI: task workflow actions are reversible at every stage ---
pattern = re.compile(r'function renderWorkflow\(\)\{.*?\n\}\nasync function completeStage', re.S)
replacement = r'''function renderWorkflow(){
 const person=$("workflowPersonFilter").value||"Manager View",filter=$("workflowStatusFilter").value;let rows=[];
 for(const t of periodTasks()){if(person!=="Manager View"&&t.person!==person&&!personMatches(stageOwner(t,currentStage(t,selectedPeriod)),person))continue;const st=currentStage(t,selectedPeriod),status=taskStatus(t,selectedPeriod);if(filter==="risk"&&!["late","risk"].includes(status.code))continue;if(filter==="done"&&status.code!=="done")continue;if(filter==="ready"&&status.code!=="ready")continue;rows.push({t,st,status})}
 $("wfDone").textContent=rows.filter(x=>x.status.code==="done").length;$("wfReady").textContent=rows.filter(x=>x.status.code==="ready").length;$("wfBad").textContent=rows.filter(x=>["late","risk"].includes(x.status.code)).length;
 $("workflowBody").innerHTML=rows.map(x=>{const d=finalDue(x.t,selectedPeriod),sd=x.st?stageDue(x.t,x.st,selectedPeriod):null,owner=x.st?stageOwner(x.t,x.st):"—",hasDone=completedCount(x.t,selectedPeriod)>0;const actions=[x.st?`<button class="btn secondary" onclick="completeStage('${x.t.id}')">Done</button>`:'',hasDone?`<button class="btn ghost" onclick="undoLast('${x.t.id}')">Undo previous</button>`:'',`<button class="btn ghost" onclick="editTask('${x.t.id}')">Edit</button>`].filter(Boolean).join(' ');return `<tr><td><b>${esc(x.t.name)}</b><div class="small">${esc(x.t.source||"")}${safeSOPUrl(x.t.sopUrl)?` · <a href="${esc(safeSOPUrl(x.t.sopUrl))}" target="_blank" rel="noopener">SOP</a>`:""}</div></td><td>${esc(x.t.person)}</td><td>${fmtDate(d)}</td><td>${workflowMarkup(x.t)}</td><td>${esc(owner)}</td><td>${fmtDate(sd)}</td><td><span class="pill ${x.status.cls}">${esc(x.status.label)}</span></td><td>${actions}</td></tr>`}).join("")||`<tr><td colspan="8" class="empty">No tasks match this filter.</td></tr>`
}
async function completeStage'''
html, n = pattern.subn(replacement, html, count=1)
if n != 1:
    raise SystemExit('Could not replace renderWorkflow')

# --- UI: explicit deliverable undo controls ---
pattern = re.compile(r'function hoWorkflowMarkup\(h\)\{.*?\nasync function undoHOLast\(id\)\{.*?\n\}', re.S)
replacement = r'''function hoWorkflowMarkup(h){
 const ds=hoPState(selectedPeriod,h.id),st=hoCurrentStage(h,selectedPeriod);let controls='';
 if(st==='Preparation') controls=`<button class="btn secondary" onclick="completeHOStage('${h.id}')">Mark prepared</button>`;
 else if(st==='Review') controls=`<button class="btn secondary" onclick="completeHOStage('${h.id}')">Mark reviewed</button> <button class="btn ghost" onclick="undoHOStage('${h.id}','Preparation')">Undo Prepared</button>`;
 else controls=`<button class="btn ghost" onclick="undoHOStage('${h.id}','Review')">Undo Reviewed</button> <button class="btn ghost" onclick="undoHOStage('${h.id}','Preparation')">Undo Prepared</button>`;
 return `<div class="workflow"><span class="step ${ds.preparedAt?'done':st==='Preparation'?'ready':'locked'}">Prepared${ds.preparedAt?' ✓':''}</span><span class="arrow">→</span><span class="step ${ds.reviewedAt?'done':st==='Review'?'ready':'locked'}">Reviewed${ds.reviewedAt?' ✓':''}</span></div><div style="margin-top:6px">${controls}</div>`
}
async function completeHOStage(id){const h=state.headOfficeTemplate.find(x=>x.id===id);if(!h)return;const st=hoCurrentStage(h,selectedPeriod);if(!st)return;await action({type:"ho_stage_complete",period:selectedPeriod,id,stage:st,doneBy:currentUser,at:new Date().toISOString()});toast(`${h.activity}: ${st==='Preparation'?'prepared':'reviewed'}`)}
async function undoHOStage(id,stage){const h=state.headOfficeTemplate.find(x=>x.id===id);if(!h)return;await action({type:"ho_stage_undo",period:selectedPeriod,id,stage});toast(`${h.activity}: ${stage==='Preparation'?'prepared status removed':'reviewed status removed'}`)}'''
html, n = pattern.subn(replacement, html, count=1)
if n != 1:
    raise SystemExit('Could not replace deliverable undo functions')

# --- Team Management: Teams email / UPN mapping ---
html = html.replace(
    '<th>Team member</th><th>Assigned tasks</th><th>Workflow stages owned</th><th></th>',
    '<th>Team member</th><th>Assigned tasks</th><th>Workflow stages owned</th><th>Teams email / UPN</th><th></th>',
    1
)
pattern = re.compile(r'function renderTeamManagement\(\)\{.*?\nfunction userForm', re.S)
replacement = r'''function renderTeamManagement(){const body=$("userBody");if(!body)return;const emails=state.settings?.teamsEmails||{};body.innerHTML=(state.users||[]).map(u=>{const tasks=(state.taskTemplates||[]).filter(t=>t.active!==false&&t.person===u).length;const stages=(state.taskTemplates||[]).reduce((n,t)=>n+Object.values(t.stageOwners||{}).filter(x=>x===u).length,0);return `<tr><td><b>${esc(u)}</b></td><td>${tasks}</td><td>${stages}</td><td><input type="email" style="min-width:220px" value="${esc(emails[u]||'')}" placeholder="name@company.com" onchange="updateTeamsEmail('${escAttr(u)}',this.value)"></td><td class="right"><button class="btn ghost" onclick="editUser('${u.replace(/'/g,"\\'")}')">Rename</button> <button class="btn ghost" onclick="deactivateUser('${u.replace(/'/g,"\\'")}')">Deactivate</button></td></tr>`}).join("")||`<tr><td colspan="5" class="empty">No active team members.</td></tr>`}
async function updateTeamsEmail(name,email){await action({type:"user_teams_email_update",name,email:String(email||'').trim()});toast(email?'Teams recipient saved':'Teams recipient cleared')}
function userForm'''
html, n = pattern.subn(replacement, html, count=1)
if n != 1:
    raise SystemExit('Could not replace team management')

# Add local action handler for Teams email mapping.
needle = ' if(a.type==="user_delete"){state.users=(state.users||[]).filter(u=>u!==a.name)}\n'
if needle not in html:
    raise SystemExit('Local user_delete handler not found')
html = html.replace(needle, needle + ' if(a.type==="user_teams_email_update"){state.settings??={};state.settings.teamsEmails??={};if(a.email)state.settings.teamsEmails[a.name]=a.email;else delete state.settings.teamsEmails[a.name]}\n', 1)

# Migrate Teams email mapping on rename in local mode.
old = 'for(const x of state.improvements||[])if(x.owner===oldName)x.owner=newName}}\n'
new = 'for(const x of state.improvements||[])if(x.owner===oldName)x.owner=newName;state.settings??={};state.settings.teamsEmails??={};if(Object.prototype.hasOwnProperty.call(state.settings.teamsEmails,oldName)){state.settings.teamsEmails[newName]=state.settings.teamsEmails[oldName];delete state.settings.teamsEmails[oldName]}}}\n'
if old not in html:
    raise SystemExit('Local rename tail not found')
html = html.replace(old, new, 1)

# Teams status in Settings.
html = html.replace(
    '<div class="section"><h2>Notifications</h2></div>\n        <p class="small">Browser notifications can fire while the dashboard is open or running in the background. Fully closed-app push requires an external Web Push service and user subscriptions.</p>',
    '<div class="section"><h2>Notifications</h2></div>\n        <p class="small">Browser notifications can fire while the dashboard is open or running in the background.</p>\n        <div class="section"><h2>Teams push</h2></div>\n        <p id="teamsPushStatus" class="small">Checking Teams push configuration…</p>\n        <div class="help">For direct Teams handoff messages, enter each person\'s Teams email / UPN below. The Teams Workflow endpoint itself is stored privately in Cloudflare, not in dashboard data.</div>',
    1
)

# Fetch integration status during settings render, without blocking render.
old = 'function renderSettings(){\n $("warnMinutes").value=state.settings.warnMinutes||60;'
new = 'function renderSettings(){\n $("warnMinutes").value=state.settings.warnMinutes||60;'
if old not in html:
    raise SystemExit('renderSettings start not found')
# Insert async helper before renderSettings.
insert = '''async function refreshIntegrationStatus(){const el=$("teamsPushStatus");if(!el)return;if(!serverMode){el.innerHTML='<span class="pill warn">Unavailable in standalone mode</span>';return}try{const r=await fetch(apiUrl("/api/integrations"),{cache:"no-store"}),j=await r.json();el.innerHTML=j.teamsPushConfigured?'<span class="pill good">Teams push connected</span> Direct handoff messages are enabled.':'<span class="pill warn">Teams push not connected</span> Add the Teams Workflow URL as the private TEAMS_WORKFLOW_URL deployment secret.'}catch(e){el.textContent='Unable to check Teams push status.'}}\n'''
html = html.replace(old, insert + old, 1)
html = html.replace('renderSettings();renderTeamManagement();updateAlertBanner()', 'renderSettings();renderTeamManagement();refreshIntegrationStatus();updateAlertBanner()', 1)

INDEX.write_text(html, encoding='utf-8')

# --- Worker: Teams direct handoff notification support ---
# Helpers before applyAction.
marker = 'function applyAction(input, a) {'
if marker not in worker:
    raise SystemExit('Worker applyAction marker not found')
helpers = r'''function currentTaskStage(t, state, period) {
  const stages = enabledStages(t);
  const ps = state.periodStates?.[period]?.[t.id]?.stages || {};
  return stages.find(s => !ps[s]?.doneAt) || null;
}

function deliverableCurrentStage(h, state, period) {
  const ds = state.deliverableStates?.[period]?.[h.id] || {};
  if (!ds.preparedAt) return 'Preparation';
  if (!ds.reviewedAt) return 'Review';
  return null;
}

function teamsEmail(state, owner) {
  return String(state.settings?.teamsEmails?.[owner] || '').trim();
}

function handoffPayload(state, action) {
  let owner = '', itemName = '', nextStage = '', itemType = '';
  if (action.type === 'stage_complete') {
    const t = (state.taskTemplates || []).find(x => x.id === action.taskId);
    if (!t) return null;
    nextStage = currentTaskStage(t, state, action.period) || '';
    if (!nextStage) return null;
    owner = t.stageOwners?.[nextStage] || 'Unassigned';
    itemName = t.name || 'Finance task';
    itemType = 'Task';
  } else if (action.type === 'ho_stage_complete') {
    const h = (state.headOfficeTemplate || []).find(x => x.id === action.id);
    if (!h) return null;
    nextStage = deliverableCurrentStage(h, state, action.period) || '';
    if (!nextStage) return null;
    owner = nextStage === 'Preparation' ? (h.preparedBy || h.owner || 'Unassigned') : (h.reviewedBy || h.signoffOwner || 'Unassigned');
    itemName = h.activity || 'Finance deliverable';
    itemType = 'Deliverable';
  } else return null;
  const recipientEmail = teamsEmail(state, owner);
  if (!recipientEmail || owner === 'Unassigned') return null;
  const completedBy = action.doneBy || 'Finance team';
  const message = `Finance close handoff: ${itemName}. ${action.stage} completed by ${completedBy}. Your next step is ${nextStage} for period ${action.period}. Open dashboard: https://pierceyalex5-star.github.io/finance-department-performance/`;
  return { event: 'finance_handoff', recipientEmail, recipientName: owner, itemType, itemName, completedStage: action.stage, nextStage, completedBy, period: action.period, message, dashboardUrl: 'https://pierceyalex5-star.github.io/finance-department-performance/' };
}

async function sendTeamsHandoff(env, state, action) {
  if (!env.TEAMS_WORKFLOW_URL) return;
  const payload = handoffPayload(state, action);
  if (!payload) return;
  try {
    const r = await fetch(env.TEAMS_WORKFLOW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) console.error('Teams workflow returned', r.status, await r.text());
  } catch (error) {
    console.error('Teams workflow push failed', error);
  }
}

'''
worker = worker.replace(marker, helpers + marker, 1)

# Worker action: Teams email update and rename migration.
needle = "  } else if (a.type === 'user_delete') {\n    state.users = (state.users || []).filter(u => u !== a.name);\n"
if needle not in worker:
    raise SystemExit('Worker user_delete block not found')
worker = worker.replace(needle, "  } else if (a.type === 'user_teams_email_update') {\n    state.settings ??= {};\n    state.settings.teamsEmails ??= {};\n    if (a.email) state.settings.teamsEmails[a.name] = a.email;\n    else delete state.settings.teamsEmails[a.name];\n" + needle, 1)

old = "      for (const x of state.improvements || []) if (x.owner === oldName) x.owner = newName;\n"
new = old + "      state.settings ??= {};\n      state.settings.teamsEmails ??= {};\n      if (Object.prototype.hasOwnProperty.call(state.settings.teamsEmails, oldName)) {\n        state.settings.teamsEmails[newName] = state.settings.teamsEmails[oldName];\n        delete state.settings.teamsEmails[oldName];\n      }\n"
if old not in worker:
    raise SystemExit('Worker rename tail not found')
worker = worker.replace(old, new, 1)

# Add integration status route and async handoff after successful state action.
old = "      if (url.pathname === '/api/state' && request.method === 'GET') {\n        return json(await getState(env));\n      }\n      if (url.pathname === '/api/action' && request.method === 'POST') {\n        const action = await request.json();\n        return json(await mutateState(env, action));\n      }"
new = "      if (url.pathname === '/api/state' && request.method === 'GET') {\n        return json(await getState(env));\n      }\n      if (url.pathname === '/api/integrations' && request.method === 'GET') {\n        return json({ teamsPushConfigured: Boolean(env.TEAMS_WORKFLOW_URL) });\n      }\n      if (url.pathname === '/api/action' && request.method === 'POST') {\n        const action = await request.json();\n        const next = await mutateState(env, action);\n        if (action.type === 'stage_complete' || action.type === 'ho_stage_complete') sendTeamsHandoff(env, next, action);\n        return json(next);\n      }"
if old not in worker:
    raise SystemExit('Worker routes block not found')
worker = worker.replace(old, new, 1)

WORKER.write_text(worker, encoding='utf-8')

# --- Cloudflare deployment: optional private Teams workflow URL secret ---
if 'TEAMS_WORKFLOW_URL' not in wf:
    wf = wf.replace(
        "      - name: Configure Neon database secret\n        run: printf '%s' \"$DATABASE_URL\" | npx wrangler secret put DATABASE_URL\n        env:\n          DATABASE_URL: ${{ secrets.DATABASE_URL }}\n",
        "      - name: Configure Neon database secret\n        run: printf '%s' \"$DATABASE_URL\" | npx wrangler secret put DATABASE_URL\n        env:\n          DATABASE_URL: ${{ secrets.DATABASE_URL }}\n      - name: Configure Teams workflow secret\n        shell: bash\n        env:\n          TEAMS_WORKFLOW_URL: ${{ secrets.TEAMS_WORKFLOW_URL }}\n        run: |\n          if [ -n \"$TEAMS_WORKFLOW_URL\" ]; then\n            printf '%s' \"$TEAMS_WORKFLOW_URL\" | npx wrangler secret put TEAMS_WORKFLOW_URL\n          else\n            echo 'TEAMS_WORKFLOW_URL is not configured; Teams push remains disabled.'\n          fi\n",
        1
    )
WF.write_text(wf, encoding='utf-8')

print('Patched index.html, Cloudflare worker, and deployment workflow.')
