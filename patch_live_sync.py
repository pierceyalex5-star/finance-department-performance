from pathlib import Path

# Patch Worker: disable Teams notifications, support journal imports.
p=Path('cloudflare-worker/src/index.js')
s=p.read_text(encoding='utf-8')
s=s.replace("return json({ teamsPushConfigured: Boolean(env.TEAMS_WORKFLOW_URL) });","return json({ teamsPushConfigured: false });")
s=s.replace("        let teamsResult = null;\n        if (action.type === 'stage_complete' || action.type === 'ho_stage_complete') teamsResult = await sendTeamsHandoff(env, next, action);\n        const response = json(next);\n        if (teamsResult?.attempted) {\n          const headers = new Headers(response.headers);\n          headers.set('X-Teams-Push', teamsResult.ok ? 'accepted' : 'failed');\n          headers.set('X-Teams-Status', String(teamsResult.status || 0));\n          return new Response(response.body, { status: response.status, headers });\n        }\n        return response;","        return json(next);")
s=s.replace("  } else if (a.type === 'replace_state') {\n    state = a.state;","  } else if (a.type === 'journal_import') {\n    state.journalAnalytics = a.analytics;\n  } else if (a.type === 'replace_state') {\n    state = a.state;")
p.write_text(s,encoding='utf-8')

# Disable GitHub auto-sync when live API is configured.
p=Path('auto-sync.js')
s=p.read_text(encoding='utf-8')
needle='(function () {\n  "use strict";'
repl='(function () {\n  "use strict";\n  if (window.FINANCE_API_BASE) { console.log("[auto-sync] disabled: live API active"); return; }'
if needle in s: s=s.replace(needle,repl,1)
p.write_text(s,encoding='utf-8')

# Reconnect live state API.
p=Path('config.js')
p.write_text('// Finance Control Tower - live shared-state mode; notifications disabled\nwindow.FINANCE_API_BASE = "https://finance-performance-api.pierceyalex5.workers.dev";\n',encoding='utf-8')

# restoration trigger v2
