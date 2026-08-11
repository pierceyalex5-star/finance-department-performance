from pathlib import Path
p=Path('cloudflare-worker/src/index.js')
s=p.read_text()
old_func="""async function sendTeamsHandoff(env, state, action) {
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
"""
new_func="""async function sendTeamsHandoff(env, state, action) {
  if (!env.TEAMS_WORKFLOW_URL) return { attempted: false, ok: false, reason: 'not_configured' };
  const payload = handoffPayload(state, action);
  if (!payload) return { attempted: false, ok: false, reason: 'no_recipient' };
  try {
    const r = await fetch(env.TEAMS_WORKFLOW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      console.error('Teams workflow returned', r.status, await r.text());
      return { attempted: true, ok: false, status: r.status };
    }
    return { attempted: true, ok: true, status: r.status };
  } catch (error) {
    console.error('Teams workflow push failed', error);
    return { attempted: true, ok: false, status: 0 };
  }
}
"""
if old_func not in s:
    raise SystemExit('sendTeamsHandoff block not found')
s=s.replace(old_func,new_func,1)
old_route="""        const action = await request.json();
        const next = await mutateState(env, action);
        if (action.type === 'stage_complete' || action.type === 'ho_stage_complete') sendTeamsHandoff(env, next, action);
        return json(next);
"""
new_route="""        const action = await request.json();
        const next = await mutateState(env, action);
        let teamsResult = null;
        if (action.type === 'stage_complete' || action.type === 'ho_stage_complete') teamsResult = await sendTeamsHandoff(env, next, action);
        const response = json(next);
        if (teamsResult?.attempted) {
          const headers = new Headers(response.headers);
          headers.set('X-Teams-Push', teamsResult.ok ? 'accepted' : 'failed');
          headers.set('X-Teams-Status', String(teamsResult.status || 0));
          return new Response(response.body, { status: response.status, headers });
        }
        return response;
"""
if old_route not in s:
    raise SystemExit('action route block not found')
s=s.replace(old_route,new_route,1)
p.write_text(s)
print('patched Teams push to await webhook acceptance and expose safe status headers')
