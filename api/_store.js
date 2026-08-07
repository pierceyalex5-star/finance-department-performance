const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  return neon(process.env.DATABASE_URL);
}

function initialState() {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'state.json'), 'utf8'));
}

async function getState() {
  const sql = db();
  const rows = await sql`SELECT state, updated_at FROM dashboard_state WHERE id = 1`;
  if (rows.length) return rows[0].state;
  const initial = initialState();
  await sql`INSERT INTO dashboard_state (id, state, updated_at)
            VALUES (1, ${JSON.stringify(initial)}::jsonb, now())
            ON CONFLICT (id) DO NOTHING`;
  const seeded = await sql`SELECT state FROM dashboard_state WHERE id = 1`;
  return seeded[0].state;
}

function enabledStages(t) {
  return ['Preparation','Approval','Entry','Review'].filter(s => t.stageEnabled?.[s] !== false);
}

function applyAction(state, a) {
  state = structuredClone(state);
  state.version = (state.version || 0) + 1;
  state.updatedAt = new Date().toISOString();
  if (a.type === 'stage_complete') {
    state.periodStates[a.period] ??= {};
    state.periodStates[a.period][a.taskId] ??= { stages: {} };
    state.periodStates[a.period][a.taskId].stages ??= {};
    state.periodStates[a.period][a.taskId].stages[a.stage] = { doneAt: a.at || new Date().toISOString(), doneBy: a.doneBy || '' };
  } else if (a.type === 'stage_undo') {
    const t = state.taskTemplates.find(x => x.id === a.taskId);
    const list = t ? enabledStages(t) : ['Preparation','Approval','Entry','Review'];
    const idx = Math.max(list.indexOf(a.stage), 0);
    state.periodStates[a.period] ??= {};
    state.periodStates[a.period][a.taskId] ??= { stages: {} };
    state.periodStates[a.period][a.taskId].stages ??= {};
    for (let i = idx; i < list.length; i++) delete state.periodStates[a.period][a.taskId].stages[list[i]];
  } else if (a.type === 'template_add') state.taskTemplates.push(a.task);
  else if (a.type === 'template_update') {
    const i = state.taskTemplates.findIndex(x => x.id === a.task.id);
    if (i >= 0) state.taskTemplates[i] = { ...state.taskTemplates[i], ...a.task };
  } else if (a.type === 'template_delete') {
    const t = state.taskTemplates.find(x => x.id === a.taskId); if (t) t.active = false;
  } else if (a.type === 'ho_score') {
    state.headOfficeHistory[a.period] ??= {};
    state.headOfficeHistory[a.period][a.bu] ??= {};
    if (a.value === '' || a.value === null) delete state.headOfficeHistory[a.period][a.bu][a.activity];
    else state.headOfficeHistory[a.period][a.bu][a.activity] = a.value;
  } else if (a.type === 'ho_template_add') state.headOfficeTemplate.push(a.item);
  else if (a.type === 'ho_template_update') {
    const i = state.headOfficeTemplate.findIndex(x => x.id === a.item.id);
    if (i >= 0) {
      const oldActivity = a.oldActivity || state.headOfficeTemplate[i].activity;
      state.headOfficeTemplate[i] = { ...state.headOfficeTemplate[i], ...a.item };
      const newActivity = state.headOfficeTemplate[i].activity;
      if (oldActivity && oldActivity !== newActivity) {
        for (const p of Object.keys(state.headOfficeHistory || {})) for (const bu of Object.keys(state.headOfficeHistory[p] || {})) {
          const scores = state.headOfficeHistory[p][bu];
          if (Object.prototype.hasOwnProperty.call(scores, oldActivity) && !Object.prototype.hasOwnProperty.call(scores, newActivity)) {
            scores[newActivity] = scores[oldActivity]; delete scores[oldActivity];
          }
        }
      }
    }
  } else if (a.type === 'ho_template_delete') {
    const h = state.headOfficeTemplate.find(x => x.id === a.id); if (h) h.active = false;
  } else if (a.type === 'close_set') state.closeActual[a.period] = a.at;
  else if (a.type === 'close_clear') delete state.closeActual[a.period];
  else if (a.type === 'correction_add') state.corrections.push(a.item);
  else if (a.type === 'correction_delete') state.corrections = state.corrections.filter(x => x.id !== a.id);
  else if (a.type === 'je_add') state.manualJEs.push(a.item);
  else if (a.type === 'je_delete') state.manualJEs = state.manualJEs.filter(x => x.id !== a.id);
  else if (a.type === 'improvement_add') state.improvements.push(a.item);
  else if (a.type === 'improvement_delete') state.improvements = state.improvements.filter(x => x.id !== a.id);
  else if (a.type === 'settings_update') state.settings = { ...state.settings, ...a.settings };
  else if (a.type === 'replace_state') state = a.state;
  else throw new Error('Unknown action');
  return state;
}

async function mutateState(action) {
  const sql = db();
  for (let attempt = 0; attempt < 4; attempt++) {
    const rows = await sql`SELECT state, updated_at FROM dashboard_state WHERE id = 1`;
    let current;
    let stamp;
    if (!rows.length) {
      current = initialState();
      await sql`INSERT INTO dashboard_state (id, state, updated_at) VALUES (1, ${JSON.stringify(current)}::jsonb, now()) ON CONFLICT (id) DO NOTHING`;
      continue;
    } else {
      current = rows[0].state;
      stamp = rows[0].updated_at;
    }
    const next = applyAction(current, action);
    const updated = await sql`UPDATE dashboard_state
      SET state = ${JSON.stringify(next)}::jsonb, updated_at = now()
      WHERE id = 1 AND updated_at = ${stamp}
      RETURNING state`;
    if (updated.length) return updated[0].state;
  }
  throw new Error('Concurrent update conflict; please retry');
}

module.exports = { getState, mutateState };
