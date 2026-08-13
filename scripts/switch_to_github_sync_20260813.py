from pathlib import Path
import re

# Disconnect the live API. GitHub state.json + auto-sync.js become the shared state layer.
Path('config.js').write_text('// Finance Control Tower - GitHub shared-state mode\nwindow.FINANCE_API_BASE = "";\n', encoding='utf-8')

# Allow edits made under any selected team-member view to queue the existing shared GitHub save.
p = Path('auto-sync.js')
s = p.read_text(encoding='utf-8')
old = '''  function isEditor() {
    // If the app uses currentUser === "Manager View" as the editing context,
    // that's who should be able to save. Adjust here if your rule differs.
    try { return typeof currentUser !== "undefined" && currentUser === "Manager View"; }
    catch (e) { return true; }
  }'''
new = '''  function isEditor() {
    // Any selected team member may edit. GitHub authorization is still required by commitNow().
    return true;
  }'''
if old not in s:
    raise SystemExit('auto-sync isEditor anchor not found')
s = s.replace(old, new, 1)
s = s.replace('var PULL_MS   = 60000;', 'var PULL_MS   = 10000;', 1)
p.write_text(s, encoding='utf-8')

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# Remove browser notification button.
s = s.replace('      <button class="btn secondary" id="notifyBtn">Enable notifications</button>\n', '', 1)

# Replace Settings live/notification card with GitHub sync information only.
old_settings = '''      <div class="card">
        <div class="section"><h2>Live mode</h2></div>
        <p id="liveModeText"></p>
        <div class="help">Open-access shared mode: anyone with the dashboard link can update the shared data. No sign-in is required.</div>
        <div class="section"><h2>Notifications</h2></div>
        <p class="small">Browser notifications can fire while the dashboard is open or running in the background.</p>
        <div class="section"><h2>Teams push</h2></div>
        <p id="teamsPushStatus" class="small">Checking Teams push configuration…</p>
        <div class="help">For direct Teams handoff messages, enter each person's Teams email / UPN below. The Teams Workflow endpoint itself is stored privately in Cloudflare, not in dashboard data.</div>
      </div>'''
new_settings = '''      <div class="card">
        <div class="section"><h2>Shared sync</h2></div>
        <p id="liveModeText"><span class="pill good">GitHub shared-state mode</span></p>
        <div class="help">No Neon database and no push notifications. Shared dashboard state is synchronized through <b>state.json</b> in GitHub. Viewers pull updates automatically; editors require repository write authorization in their browser.</div>
      </div>'''
if old_settings not in s:
    raise SystemExit('settings live card anchor not found')
s = s.replace(old_settings, new_settings, 1)

# Remove Teams UPN column from team management UI.
s = s.replace('<div class="table-wrap"><table><thead><tr><th>Team member</th><th>Assigned tasks</th><th>Workflow stages owned</th><th>Teams email / UPN</th><th></th></tr></thead><tbody id="userBody"></tbody></table></div>',
              '<div class="table-wrap"><table><thead><tr><th>Team member</th><th>Assigned tasks</th><th>Workflow stages owned</th><th></th></tr></thead><tbody id="userBody"></tbody></table></div>', 1)

# Make Settings explicitly report GitHub shared-state mode regardless of API server mode.
s = re.sub(r'''function renderSettings\(\)\{\n (.*?)\n \$\("liveModeText"\)\.innerHTML=.*?\n\}''',
'''function renderSettings(){
 \\1
 $("liveModeText").innerHTML='<span class="pill good">GitHub shared-state mode</span> Changes are saved to state.json and pulled automatically by connected browsers.'
}''', s, count=1, flags=re.S)

# Render team members without Teams email fields.
pattern = r'''function renderTeamManagement\(\)\{const body=\$\("userBody"\);if\(!body\)return;.*?\nasync function updateTeamsEmail\(name,email\)\{.*?\}\n'''
replacement = '''function renderTeamManagement(){const body=$("userBody");if(!body)return;body.innerHTML=(state.users||[]).map(u=>{const tasks=(state.taskTemplates||[]).filter(t=>t.active!==false&&t.person===u).length;const stages=(state.taskTemplates||[]).reduce((n,t)=>n+Object.values(t.stageOwners||{}).filter(x=>x===u).length,0);return `<tr><td><b>${esc(u)}</b></td><td>${tasks}</td><td>${stages}</td><td class="right"><button class="btn ghost" onclick="editUser('${u.replace(/'/g,"\\\\'")}')">Rename</button> <button class="btn ghost" onclick="deactivateUser('${u.replace(/'/g,"\\\\'")}')">Deactivate</button></td></tr>`}).join("")||`<tr><td colspan="4" class="empty">No active team members.</td></tr>`}
'''
s, n = re.subn(pattern, replacement, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit('team management anchor not found')

# Disable browser push notifications completely while keeping visual late/at-risk banners.
pattern = r'''function notify\(title,body,key\)\{.*?\n\}\nfunction checkAlerts\(fromLive=false\)\{.*?\n\}\nfunction downloadState\(\)'''
replacement = '''function notify(){ return; }
function checkAlerts(){ return; }
function downloadState()'''
s, n = re.subn(pattern, replacement, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit('notification functions anchor not found')

# Remove notification click handler if present.
s = re.sub(r'''\$\("notifyBtn"\)\.onclick=.*?;\n''', '', s, count=1)

# Do not check Teams integration during render.
s = s.replace('renderSettings();renderTeamManagement();refreshIntegrationStatus();updateAlertBanner()',
              'renderSettings();renderTeamManagement();updateAlertBanner()', 1)

# Startup should explicitly describe GitHub mode after API detection falls back to local state.
s = s.replace("$(\"connectionState\").innerHTML=serverMode?'<span class=\"dot\"></span>Shared live server':'Standalone browser mode';$(\"liveModeText\").textContent=serverMode?\"Shared server active\":\"Standalone browser storage\";connectEvents();",
              "$(\"connectionState\").innerHTML='<span class=\"dot\"></span>GitHub shared sync';$(\"liveModeText\").innerHTML='<span class=\"pill good\">GitHub shared-state mode</span>';", 1)

p.write_text(s, encoding='utf-8')
print('Switched Finance Control Tower to GitHub shared-state mode and disabled notifications.')
