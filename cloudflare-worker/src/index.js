import { neon } from '@neondatabase/serverless';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function sqlFor(env) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  return neon(env.DATABASE_URL);
}

async function getState(env) {
  const sql = sqlFor(env);
  const rows = await sql`SELECT state FROM dashboard_state WHERE id = 1`;
  if (!rows.length) throw new Error('Dashboard state has not been initialized');
  return rows[0].state;
}

function enabledStages(t) {
  return ['Preparation','Approval','Entry','Review'].filter(s => t.stageEnabled?.[s] !== false);
}

function applyAction(input, a) {
  let state = structuredClone(input);
  state.version = (state.version || 0) + 1;
  state.updatedAt = new Date().toISOString();

  if (a.type === 'stage_complete') {
    state.periodStates[a.period] ??= {};
    state.periodStates[a.period][a.taskId] ??= { stages: {} };
    state.periodStates[a.period][a.taskId].stages ??= {};
    state.periodStates[a.period][a.taskId].stages[a.stage] = {
      doneAt: a.at || new Date().toISOString(),
      doneBy: a.doneBy || ''
    };
  } else if (a.type === 'stage_undo') {
    const t = (state.taskTemplates || []).find(x => x.id === a.taskId);
    const list = t ? enabledStages(t) : ['Preparation','Approval','Entry','Review'];
    const idx = Math.max(list.indexOf(a.stage), 0);
    state.periodStates[a.period] ??= {};
    state.periodStates[a.period][a.taskId] ??= { stages: {} };
    state.periodStates[a.period][a.taskId].stages ??= {};
    for (let i = idx; i < list.length; i++) delete state.periodStates[a.period][a.taskId].stages[list[i]];
  } else if (a.type === 'template_add') {
    state.taskTemplates ??= [];
    state.taskTemplates.push(a.task);
  } else if (a.type === 'template_update') {
    const i = (state.taskTemplates || []).findIndex(x => x.id === a.task.id);
    if (i >= 0) state.taskTemplates[i] = { ...state.taskTemplates[i], ...a.task };
  } else if (a.type === 'template_delete') {
    const t = (state.taskTemplates || []).find(x => x.id === a.taskId);
    if (t) t.active = false;
  } else if (a.type === 'ho_score') {
    state.headOfficeHistory ??= {};
    state.headOfficeHistory[a.period] ??= {};
    state.headOfficeHistory[a.period][a.bu] ??= {};
    if (a.value === '' || a.value === null) delete state.headOfficeHistory[a.period][a.bu][a.activity];
    else state.headOfficeHistory[a.period][a.bu][a.activity] = a.value;
  } else if (a.type === 'ho_template_add') {
    state.headOfficeTemplate ??= [];
    state.headOfficeTemplate.push(a.item);
  } else if (a.type === 'ho_template_update') {
    const i = (state.headOfficeTemplate || []).findIndex(x => x.id === a.item.id);
    if (i >= 0) {
      const oldActivity = a.oldActivity || state.headOfficeTemplate[i].activity;
      state.headOfficeTemplate[i] = { ...state.headOfficeTemplate[i], ...a.item };
      const newActivity = state.headOfficeTemplate[i].activity;
      if (oldActivity && oldActivity !== newActivity) {
        for (const p of Object.keys(state.headOfficeHistory || {})) {
          for (const bu of Object.keys(state.headOfficeHistory[p] || {})) {
            const scores = state.headOfficeHistory[p][bu];
            if (Object.prototype.hasOwnProperty.call(scores, oldActivity) && !Object.prototype.hasOwnProperty.call(scores, newActivity)) {
              scores[newActivity] = scores[oldActivity];
              delete scores[oldActivity];
            }
          }
        }
      }
    }
  } else if (a.type === 'ho_template_delete') {
    const h = (state.headOfficeTemplate || []).find(x => x.id === a.id);
    if (h) h.active = false;
  } else if (a.type === 'close_set') {
    state.closeActual ??= {};
    state.closeActual[a.period] = a.at;
  } else if (a.type === 'close_clear') {
    if (state.closeActual) delete state.closeActual[a.period];
  } else if (a.type === 'correction_add') {
    state.corrections ??= [];
    state.corrections.push(a.item);
  } else if (a.type === 'correction_delete') {
    state.corrections = (state.corrections || []).filter(x => x.id !== a.id);
  } else if (a.type === 'je_add') {
    state.manualJEs ??= [];
    state.manualJEs.push(a.item);
  } else if (a.type === 'je_delete') {
    state.manualJEs = (state.manualJEs || []).filter(x => x.id !== a.id);
  } else if (a.type === 'improvement_add') {
    state.improvements ??= [];
    state.improvements.push(a.item);
  } else if (a.type === 'improvement_delete') {
    state.improvements = (state.improvements || []).filter(x => x.id !== a.id);
  } else if (a.type === 'settings_update') {
    state.settings = { ...(state.settings || {}), ...(a.settings || {}) };
  } else if (a.type === 'user_add') {
    state.users ??= [];
    if (a.name && !state.users.includes(a.name)) state.users.push(a.name);
  } else if (a.type === 'user_update') {
    const oldName = a.oldName;
    const newName = a.newName;
    if (oldName && newName && oldName !== newName) {
      state.users = (state.users || []).map(u => u === oldName ? newName : u);
      for (const t of state.taskTemplates || []) {
        if (t.person === oldName) t.person = newName;
        for (const st of Object.keys(t.stageOwners || {})) if (t.stageOwners[st] === oldName) t.stageOwners[st] = newName;
      }
      for (const x of state.corrections || []) if (x.owner === oldName) x.owner = newName;
      for (const x of state.manualJEs || []) if (x.preparer === oldName) x.preparer = newName;
      for (const x of state.improvements || []) if (x.owner === oldName) x.owner = newName;
    }
  } else if (a.type === 'user_delete') {
    state.users = (state.users || []).filter(u => u !== a.name);
  } else if (a.type === 'replace_state') {
    state = a.state;
  } else {
    throw new Error('Unknown action');
  }
  return state;
}

async function mutateState(env, action) {
  const sql = sqlFor(env);
  for (let attempt = 0; attempt < 4; attempt++) {
    const rows = await sql`SELECT state, updated_at FROM dashboard_state WHERE id = 1`;
    if (!rows.length) throw new Error('Dashboard state has not been initialized');
    const current = rows[0].state;
    const stamp = rows[0].updated_at;
    const next = applyAction(current, action);
    const updated = await sql`UPDATE dashboard_state
      SET state = ${JSON.stringify(next)}::jsonb, updated_at = now()
      WHERE id = 1 AND updated_at = ${stamp}
      RETURNING state`;
    if (updated.length) return updated[0].state;
  }
  throw new Error('Concurrent update conflict; please retry');
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    try {
      if (url.pathname === '/' || url.pathname === '/health') {
        return json({ ok: true, service: 'finance-performance-api' });
      }
      if (url.pathname === '/api/state' && request.method === 'GET') {
        return json(await getState(env));
      }
      if (url.pathname === '/api/action' && request.method === 'POST') {
        const action = await request.json();
        return json(await mutateState(env, action));
      }
      if (url.pathname === '/api/events' && request.method === 'GET') {
        const state = await getState(env);
        const body = `retry: 5000\ndata: ${JSON.stringify({ version: state.version || 0, updatedAt: state.updatedAt || null })}\n\n`;
        return new Response(body, {
          status: 200,
          headers: { ...CORS, 'Content-Type': 'text/event-stream; charset=utf-8' }
        });
      }
      return json({ error: 'Not found' }, 404);
    } catch (error) {
      return json({ error: error?.message || String(error) }, 500);
    }
  }
};
