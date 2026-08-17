import { neon } from '@neondatabase/serverless';

const enc = new TextEncoder();
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...headers }
});
const workspace = env => env.WORKSPACE_ID || 'alex';
const db = env => neon(env.DATABASE_URL);
const QUADRANTS = new Set(['do', 'schedule', 'delegate', 'later']);

function cookieValue(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return '';
}
function b64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function sign(secret, value) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(value)));
}
async function isAuthed(request, env) {
  if (!env.SESSION_SECRET) return false;
  const got = cookieValue(request, 'mywork_session');
  if (!got) return false;
  const expected = await sign(env.SESSION_SECRET, `my-work:${workspace(env)}`);
  return got === expected;
}
function sessionCookie(value) {
  return `mywork_session=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`;
}
function clearCookie() {
  return 'mywork_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
}
function arrayLiteral(values) {
  const vals = Array.isArray(values) ? values.filter(Boolean).map(v => String(v).trim()).filter(Boolean) : [];
  return `{${vals.map(v => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')}}`;
}
function normalizePeople(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(v => String(v || '').trim()).filter(Boolean))];
}
function normalizeQuadrant(value) {
  return QUADRANTS.has(value) ? value : null;
}
function localDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montreal', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = type => parts.find(x => x.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
async function activity(sql, env, entityType, entityId, action, summary, metadata = {}) {
  await sql`INSERT INTO activity_log (workspace_id,entity_type,entity_id,action,summary,metadata)
            VALUES (${workspace(env)},${entityType},${String(entityId || '')},${action},${summary},${JSON.stringify(metadata)}::jsonb)`;
}
async function findProject(sql, env, name) {
  if (!name) return null;
  const rows = await sql`SELECT * FROM projects WHERE workspace_id=${workspace(env)} AND lower(name)=lower(${name.trim()}) LIMIT 1`;
  return rows[0] || null;
}
async function getOrCreateProject(sql, env, name, description = null, withPeople = null) {
  if (!name) return null;
  const people = withPeople === null ? [] : normalizePeople(withPeople);
  const preservePeople = withPeople === null;
  const rows = await sql`INSERT INTO projects (workspace_id,name,description,with_people)
                         VALUES (${workspace(env)},${name.trim()},${description},${arrayLiteral(people)}::text[])
                         ON CONFLICT (workspace_id,name) DO UPDATE SET
                           description=COALESCE(EXCLUDED.description,projects.description),
                           with_people=CASE WHEN ${preservePeople} THEN projects.with_people ELSE EXCLUDED.with_people END,
                           updated_at=now()
                         RETURNING *`;
  return rows[0];
}
async function taskById(sql, env, id) {
  const rows = await sql`SELECT t.*,p.name AS project_name FROM tasks t LEFT JOIN projects p ON p.id=t.project_id
                         WHERE t.workspace_id=${workspace(env)} AND t.id=${id}::uuid LIMIT 1`;
  return rows[0] || null;
}

const tools = [
  { type: 'function', name: 'list_projects', description: 'List tracked projects. Use this to resolve a project name before writing when needed.', strict: true, parameters: { type: 'object', properties: { search: { type: ['string', 'null'] }, with_person: { type: ['string', 'null'] } }, required: ['search', 'with_person'], additionalProperties: false } },
  { type: 'function', name: 'create_project', description: 'Create or update a project when the user clearly wants that work tracked as a project. with_people are employees, bosses or other stakeholders the user works with on the project.', strict: true, parameters: { type: 'object', properties: { name: { type: 'string' }, description: { type: ['string', 'null'] }, with_people: { type: ['array', 'null'], items: { type: 'string' } } }, required: ['name', 'description', 'with_people'], additionalProperties: false } },
  { type: 'function', name: 'list_tasks', description: 'Find tasks, including by words, project, status or person. Use before changing or completing a task when a conversational reference could match more than one item.', strict: true, parameters: { type: 'object', properties: { search: { type: ['string', 'null'] }, project_name: { type: ['string', 'null'] }, status: { type: 'string', enum: ['open', 'waiting', 'done', 'cancelled', 'all'] }, with_person: { type: ['string', 'null'] } }, required: ['search', 'project_name', 'status', 'with_person'], additionalProperties: false } },
  { type: 'function', name: 'create_task', description: 'Create a concrete action the user intends to do, delegate, send, review, prepare, remember or follow up on. Do not create tasks from mere brainstorming. Capture with_people when the task is with, for, to discuss with, or dependent on named people. If waiting on someone, include that person in with_people too.', strict: true, parameters: { type: 'object', properties: { title: { type: 'string' }, details: { type: ['string', 'null'] }, project_name: { type: ['string', 'null'] }, due_at: { type: ['string', 'null'], description: 'ISO 8601 datetime with America/Montreal offset when a due date/time is known.' }, priority: { type: 'string', enum: ['low', 'normal', 'high'] }, status: { type: 'string', enum: ['open', 'waiting'] }, waiting_on: { type: ['string', 'null'] }, eisenhower_quadrant: { type: ['string', 'null'], enum: ['do', 'schedule', 'delegate', 'later', null] }, with_people: { type: 'array', items: { type: 'string' } } }, required: ['title', 'details', 'project_name', 'due_at', 'priority', 'status', 'waiting_on', 'eisenhower_quadrant', 'with_people'], additionalProperties: false } },
  { type: 'function', name: 'update_task', description: 'Update one exact existing task after its ID has been resolved. Use with_people for employees, bosses or stakeholders connected to the task. Eisenhower: do=urgent+important, schedule=important not urgent, delegate=urgent less important, later=neither.', strict: true, parameters: { type: 'object', properties: { id: { type: 'string' }, title: { type: ['string', 'null'] }, details: { type: ['string', 'null'] }, project_name: { type: ['string', 'null'] }, due_at: { type: ['string', 'null'] }, priority: { type: ['string', 'null'], enum: ['low', 'normal', 'high', null] }, status: { type: ['string', 'null'], enum: ['open', 'waiting', 'done', 'cancelled', null] }, waiting_on: { type: ['string', 'null'] }, eisenhower_quadrant: { type: ['string', 'null'], enum: ['do', 'schedule', 'delegate', 'later', null] }, with_people: { type: ['array', 'null'], items: { type: 'string' } } }, required: ['id', 'title', 'details', 'project_name', 'due_at', 'priority', 'status', 'waiting_on', 'eisenhower_quadrant', 'with_people'], additionalProperties: false } },
  { type: 'function', name: 'complete_task', description: 'Mark one exact task complete after resolving its ID.', strict: true, parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false } },
  { type: 'function', name: 'add_note', description: 'Save a durable note, decision, meeting note or assumption that is useful context but is not itself a to-do.', strict: true, parameters: { type: 'object', properties: { body: { type: 'string' }, kind: { type: 'string', enum: ['note', 'decision', 'meeting_note', 'assumption'] }, title: { type: ['string', 'null'] }, project_name: { type: ['string', 'null'] } }, required: ['body', 'kind', 'title', 'project_name'], additionalProperties: false } },
  { type: 'function', name: 'remember_context', description: 'Save stable work context from the discussion for future retrieval. Use selectively for important background, conclusions or history, not every message.', strict: true, parameters: { type: 'object', properties: { body: { type: 'string' }, memory_type: { type: 'string', enum: ['context', 'decision', 'history', 'reference'] }, title: { type: ['string', 'null'] }, project_name: { type: ['string', 'null'] }, tags: { type: 'array', items: { type: 'string' } } }, required: ['body', 'memory_type', 'title', 'project_name', 'tags'], additionalProperties: false } },
  { type: 'function', name: 'search_memory', description: 'Search prior work memory, notes, decisions and chat history when the user refers to earlier discussions, prior decisions, rationale or historical context.', strict: true, parameters: { type: 'object', properties: { query: { type: 'string' }, project_name: { type: ['string', 'null'] } }, required: ['query', 'project_name'], additionalProperties: false } },
  { type: 'function', name: 'get_workspace_summary', description: 'Get current counts and the most important open work for questions about what is due, overdue, waiting or what to focus on.', strict: true, parameters: { type: 'object', properties: { scope: { type: 'string', enum: ['all', 'today', 'upcoming', 'overdue', 'waiting'] } }, required: ['scope'], additionalProperties: false } }
];

async function runTool(name, args, sql, env) {
  const ws = workspace(env);
  if (name === 'list_projects') {
    let rows = await sql`SELECT id,name,description,status,with_people,updated_at FROM projects WHERE workspace_id=${ws} ORDER BY updated_at DESC`;
    if (args.search) {
      const q = args.search.toLowerCase();
      rows = rows.filter(x => x.name.toLowerCase().includes(q) || (x.description || '').toLowerCase().includes(q));
    }
    if (args.with_person) {
      const q = args.with_person.toLowerCase();
      rows = rows.filter(x => (x.with_people || []).some(p => String(p).toLowerCase().includes(q)));
    }
    return { projects: rows };
  }
  if (name === 'create_project') {
    const p = await getOrCreateProject(sql, env, args.name, args.description, args.with_people);
    await activity(sql, env, 'project', p.id, 'create_or_update', `Project: ${p.name}`, { with_people: p.with_people || [] });
    return { project: p };
  }
  if (name === 'list_tasks') {
    let rows = await sql`SELECT t.*,p.name AS project_name FROM tasks t LEFT JOIN projects p ON p.id=t.project_id WHERE t.workspace_id=${ws} ORDER BY t.due_at NULLS LAST,t.updated_at DESC LIMIT 150`;
    if (args.status !== 'all') rows = rows.filter(x => x.status === args.status);
    if (args.project_name) rows = rows.filter(x => (x.project_name || '').toLowerCase().includes(args.project_name.toLowerCase()));
    if (args.with_person) {
      const q = args.with_person.toLowerCase();
      rows = rows.filter(x => (x.with_people || []).some(p => String(p).toLowerCase().includes(q)) || (x.waiting_on || '').toLowerCase().includes(q));
    }
    if (args.search) {
      const q = args.search.toLowerCase();
      rows = rows.filter(x => x.title.toLowerCase().includes(q) || (x.details || '').toLowerCase().includes(q) || (x.waiting_on || '').toLowerCase().includes(q) || (x.project_name || '').toLowerCase().includes(q) || (x.with_people || []).some(p => String(p).toLowerCase().includes(q)));
    }
    return { tasks: rows.slice(0, 60) };
  }
  if (name === 'create_task') {
    const people = normalizePeople([...(args.with_people || []), ...(args.waiting_on ? [args.waiting_on] : [])]);
    const p = args.project_name ? await getOrCreateProject(sql, env, args.project_name) : null;
    const quadrant = normalizeQuadrant(args.eisenhower_quadrant);
    const rows = await sql`INSERT INTO tasks (workspace_id,project_id,title,details,status,priority,due_at,waiting_on,eisenhower_quadrant,with_people,source)
                           VALUES (${ws},${p?.id || null},${args.title.trim()},${args.details},${args.status},${args.priority},${args.due_at},${args.waiting_on},${quadrant},${arrayLiteral(people)}::text[],'ai_chat') RETURNING *`;
    const t = rows[0];
    await activity(sql, env, 'task', t.id, 'create', `Created task: ${t.title}`, { quadrant, with_people: people });
    return { task: await taskById(sql, env, t.id) };
  }
  if (name === 'update_task') {
    const old = await taskById(sql, env, args.id);
    if (!old) return { error: 'Task not found' };
    let projectId = old.project_id;
    if (args.project_name !== null) projectId = args.project_name ? (await getOrCreateProject(sql, env, args.project_name)).id : null;
    const title = args.title ?? old.title;
    const details = args.details ?? old.details;
    const due = args.due_at ?? old.due_at;
    const priority = args.priority ?? old.priority;
    const status = args.status ?? old.status;
    const waiting = args.waiting_on ?? old.waiting_on;
    const quadrant = args.eisenhower_quadrant === null ? old.eisenhower_quadrant : normalizeQuadrant(args.eisenhower_quadrant);
    const people = args.with_people === null ? (old.with_people || []) : normalizePeople([...(args.with_people || []), ...(waiting ? [waiting] : [])]);
    await sql`UPDATE tasks SET project_id=${projectId},title=${title},details=${details},due_at=${due},priority=${priority},status=${status},waiting_on=${waiting},eisenhower_quadrant=${quadrant},with_people=${arrayLiteral(people)}::text[],updated_at=now(),completed_at=CASE WHEN ${status}='done' THEN COALESCE(completed_at,now()) ELSE NULL END WHERE workspace_id=${ws} AND id=${args.id}::uuid`;
    await activity(sql, env, 'task', args.id, 'update', `Updated task: ${title}`, { quadrant, with_people: people });
    return { task: await taskById(sql, env, args.id) };
  }
  if (name === 'complete_task') {
    const old = await taskById(sql, env, args.id);
    if (!old) return { error: 'Task not found' };
    await sql`UPDATE tasks SET status='done',completed_at=COALESCE(completed_at,now()),waiting_on=NULL,updated_at=now() WHERE workspace_id=${ws} AND id=${args.id}::uuid`;
    await activity(sql, env, 'task', args.id, 'complete', `Completed task: ${old.title}`);
    return { task: await taskById(sql, env, args.id) };
  }
  if (name === 'add_note') {
    const p = args.project_name ? await getOrCreateProject(sql, env, args.project_name) : null;
    const rows = await sql`INSERT INTO notes (workspace_id,project_id,kind,title,body,source) VALUES (${ws},${p?.id || null},${args.kind},${args.title},${args.body},'ai_chat') RETURNING *`;
    await activity(sql, env, 'note', rows[0].id, 'create', `${args.kind}: ${args.title || args.body.slice(0, 80)}`);
    return { note: rows[0] };
  }
  if (name === 'remember_context') {
    const p = args.project_name ? await getOrCreateProject(sql, env, args.project_name) : null;
    const rows = await sql`INSERT INTO memory_entries (workspace_id,project_id,memory_type,title,body,tags,source_type,source_ref,occurred_at) VALUES (${ws},${p?.id || null},${args.memory_type},${args.title},${args.body},${JSON.stringify(args.tags)}::jsonb,'ai_chat','my-work',now()) RETURNING *`;
    await activity(sql, env, 'memory', rows[0].id, 'remember', `Remembered: ${args.title || args.body.slice(0, 80)}`);
    return { memory: rows[0] };
  }
  if (name === 'search_memory') {
    const project = args.project_name ? await findProject(sql, env, args.project_name) : null;
    let mem = [];
    try {
      mem = await sql`SELECT m.*,p.name AS project_name FROM memory_entries m LEFT JOIN projects p ON p.id=m.project_id WHERE m.workspace_id=${ws} AND (${project?.id || null}::uuid IS NULL OR m.project_id=${project?.id || null}::uuid) AND to_tsvector('simple',coalesce(m.title,'')||' '||m.body) @@ plainto_tsquery('simple',${args.query}) ORDER BY COALESCE(m.occurred_at,m.created_at) DESC LIMIT 12`;
    } catch {
      mem = await sql`SELECT m.*,p.name AS project_name FROM memory_entries m LEFT JOIN projects p ON p.id=m.project_id WHERE m.workspace_id=${ws} ORDER BY COALESCE(m.occurred_at,m.created_at) DESC LIMIT 12`;
    }
    const notes = await sql`SELECT n.*,p.name AS project_name FROM notes n LEFT JOIN projects p ON p.id=n.project_id WHERE n.workspace_id=${ws} ORDER BY n.created_at DESC LIMIT 12`;
    const chats = await sql`SELECT role,content,created_at FROM chat_messages WHERE workspace_id=${ws} AND content ILIKE ${'%' + args.query.slice(0, 120) + '%'} ORDER BY created_at DESC LIMIT 8`;
    return { memory: mem, notes, chats };
  }
  if (name === 'get_workspace_summary') {
    const rows = await sql`SELECT t.*,p.name AS project_name FROM tasks t LEFT JOIN projects p ON p.id=t.project_id WHERE t.workspace_id=${ws} AND t.status NOT IN ('done','cancelled') ORDER BY t.due_at NULLS LAST,t.updated_at DESC LIMIT 120`;
    const today = localDateKey();
    const isToday = x => x.due_at && localDateKey(new Date(x.due_at)) === today;
    const overdue = x => x.due_at && localDateKey(new Date(x.due_at)) < today;
    let selected = rows;
    if (args.scope === 'today') selected = rows.filter(isToday);
    if (args.scope === 'overdue') selected = rows.filter(overdue);
    if (args.scope === 'waiting') selected = rows.filter(x => x.status === 'waiting');
    if (args.scope === 'upcoming') selected = rows.filter(x => x.due_at && localDateKey(new Date(x.due_at)) > today);
    const projectCount = (await sql`SELECT count(*)::int AS n FROM projects WHERE workspace_id=${ws} AND status='active'`)[0].n;
    return { open: rows.length, today: rows.filter(isToday).length, overdue: rows.filter(overdue).length, waiting: rows.filter(x => x.status === 'waiting').length, projects: projectCount, tasks: selected.slice(0, 30) };
  }
  return { error: `Unknown tool ${name}` };
}

function extractText(response) {
  const parts = [];
  for (const item of response.output || []) {
    if (item.type === 'message') for (const c of item.content || []) if (c.type === 'output_text' && c.text) parts.push(c.text);
  }
  return parts.join('\n').trim();
}
function systemInstructions() {
  const now = new Date();
  return `You are My Work, a conversational task and project assistant for Alex. The user should be able to speak naturally and never organize information manually.
Today is ${now.toISOString()} and Alex's working timezone is America/Montreal.

Operating rules:
- Treat database tools as the source of truth. Never claim a task/project/note was saved or changed unless the tool succeeded.
- When the user clearly states a concrete action (I need to, send, review, follow up, prepare, remember to, call, finish), create a task unless it is clearly hypothetical.
- Brainstorming, possibilities and unresolved ideas are not tasks. Save them as a note only if clearly worth retaining.
- Record explicit agreements/conclusions as decisions. Save stable project background selectively with remember_context.
- Resolve pronouns and references from recent conversation. If a mutation might target the wrong existing task, call list_tasks first. Ask one concise clarification only when multiple plausible matches remain.
- If a project is obvious, link the task automatically. If the user names a genuinely new project, create it.
- Interpret relative dates using America/Montreal. Do not invent dates when none are implied.
- Multiple actions in one message should result in multiple tool calls.
- Track people in with_people whenever a task/project is with an employee, boss, customer or other stakeholder. Examples: "prepare the BI session with Josiane" => with_people ["Josiane"]; "ask Jason" => ["Jason"]. Waiting-on people should also be included.
- Eisenhower classification: do = urgent and important; schedule = important but not urgent; delegate = urgent but less important / best handled by someone else; later = neither urgent nor important. Only classify when the user indicates it or the classification is strongly implied; otherwise leave it unsorted.
- For focus/prioritization questions, use workspace data and prioritize overdue items, today's blockers, high priority, dependencies and Eisenhower do items.
- When the user asks about an earlier discussion, rationale or decision, search work memory before answering.
- When asked to show tasks/projects, summarize the most relevant subset in chat; the dashboard is the detailed source of truth. Do not dump the entire inventory unless explicitly requested.
- Keep replies concise and operational. Manual dashboard controls are secondary; conversation is the primary interface.`;
}
async function callOpenAI(env, input) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: env.OPENAI_MODEL || 'gpt-5.6', instructions: systemInstructions(), input, tools, tool_choice: 'auto', store: false, safety_identifier: `my-work-${workspace(env)}` })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI request failed (${res.status})`);
  return data;
}
async function chat(request, env) {
  if (!env.OPENAI_API_KEY || !env.DATABASE_URL) return json({ error: 'Server is missing OPENAI_API_KEY or DATABASE_URL.' }, 500);
  const body = await request.json();
  const message = String(body.message || '').trim();
  if (!message) return json({ error: 'Message is required.' }, 400);
  const sql = db(env), ws = workspace(env);
  const recent = await sql`SELECT role,content FROM chat_messages WHERE workspace_id=${ws} ORDER BY created_at DESC LIMIT 18`;
  await sql`INSERT INTO chat_messages (workspace_id,role,content) VALUES (${ws},'user',${message})`;
  let input = [...recent.reverse().map(m => ({ role: m.role, content: m.content })), { role: 'user', content: message }];
  let response, toolEvents = [];
  for (let round = 0; round < 8; round++) {
    response = await callOpenAI(env, input);
    const calls = (response.output || []).filter(x => x.type === 'function_call');
    if (!calls.length) break;
    input.push(...response.output);
    for (const call of calls) {
      let args = {};
      try { args = JSON.parse(call.arguments || '{}'); } catch {}
      let result;
      try { result = await runTool(call.name, args, sql, env); } catch (e) { result = { error: e.message || String(e) }; }
      toolEvents.push({ name: call.name, args, result });
      input.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(result) });
    }
  }
  const reply = extractText(response) || 'Done.';
  await sql`INSERT INTO chat_messages (workspace_id,role,content) VALUES (${ws},'assistant',${reply})`;
  return json({ reply, tool_events: toolEvents });
}
async function state(env) {
  const sql = db(env), ws = workspace(env);
  const tasks = await sql`SELECT t.*,p.name AS project_name FROM tasks t LEFT JOIN projects p ON p.id=t.project_id WHERE t.workspace_id=${ws} ORDER BY CASE WHEN t.status IN ('open','waiting') THEN 0 ELSE 1 END,t.due_at NULLS LAST,t.updated_at DESC LIMIT 200`;
  const projects = await sql`SELECT p.*,count(t.id) FILTER (WHERE t.status IN ('open','waiting'))::int AS open_tasks FROM projects p LEFT JOIN tasks t ON t.project_id=p.id WHERE p.workspace_id=${ws} GROUP BY p.id ORDER BY p.updated_at DESC`;
  const notes = await sql`SELECT n.*,p.name AS project_name FROM notes n LEFT JOIN projects p ON p.id=n.project_id WHERE n.workspace_id=${ws} ORDER BY n.created_at DESC LIMIT 30`;
  const messages = await sql`SELECT role,content,created_at FROM chat_messages WHERE workspace_id=${ws} ORDER BY created_at DESC LIMIT 40`;
  const today = localDateKey(), open = tasks.filter(x => !['done', 'cancelled'].includes(x.status));
  const peopleSet = new Set();
  for (const t of tasks) {
    for (const p of (t.with_people || [])) if (p) peopleSet.add(String(p));
    if (t.waiting_on) peopleSet.add(String(t.waiting_on));
  }
  for (const p of projects) for (const person of (p.with_people || [])) if (person) peopleSet.add(String(person));
  return {
    tasks,
    projects,
    notes,
    messages: messages.reverse(),
    people: [...peopleSet].sort((a, b) => a.localeCompare(b)),
    metrics: {
      open: open.length,
      today: open.filter(x => x.due_at && localDateKey(new Date(x.due_at)) === today).length,
      overdue: open.filter(x => x.due_at && localDateKey(new Date(x.due_at)) < today).length,
      waiting: open.filter(x => x.status === 'waiting').length,
      projects: projects.filter(x => x.status === 'active').length
    }
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/login' && request.method === 'POST') {
        const { password } = await request.json();
        if (!env.APP_PASSWORD || !env.SESSION_SECRET) return json({ error: 'Login is not configured.' }, 500);
        if (String(password) !== String(env.APP_PASSWORD)) return json({ error: 'Incorrect password.' }, 401);
        const sig = await sign(env.SESSION_SECRET, `my-work:${workspace(env)}`);
        return json({ ok: true }, 200, { 'set-cookie': sessionCookie(sig) });
      }
      if (url.pathname === '/api/logout' && request.method === 'POST') return json({ ok: true }, 200, { 'set-cookie': clearCookie() });
      if (url.pathname === '/login.html') return env.ASSETS.fetch(request);
      const authed = await isAuthed(request, env);
      if (url.pathname.startsWith('/api/') && !authed) return json({ error: 'Unauthorized' }, 401);
      if (url.pathname === '/api/chat' && request.method === 'POST') return chat(request, env);
      if (url.pathname === '/api/state' && request.method === 'GET') return json(await state(env));
      if (url.pathname.startsWith('/api/tasks/') && url.pathname.endsWith('/complete') && request.method === 'POST') {
        const id = url.pathname.split('/')[3], sql = db(env);
        const old = await taskById(sql, env, id);
        if (!old) return json({ error: 'Task not found' }, 404);
        await sql`UPDATE tasks SET status='done',completed_at=COALESCE(completed_at,now()),waiting_on=NULL,updated_at=now() WHERE workspace_id=${workspace(env)} AND id=${id}::uuid`;
        await activity(sql, env, 'task', id, 'complete_manual', `Completed task: ${old.title}`);
        return json({ ok: true, task: await taskById(sql, env, id) });
      }
      if (url.pathname.startsWith('/api/tasks/') && url.pathname.endsWith('/matrix') && request.method === 'POST') {
        const id = url.pathname.split('/')[3], sql = db(env);
        const old = await taskById(sql, env, id);
        if (!old) return json({ error: 'Task not found' }, 404);
        const body = await request.json();
        const quadrant = body.quadrant === null || body.quadrant === '' ? null : normalizeQuadrant(body.quadrant);
        if (body.quadrant && !quadrant) return json({ error: 'Invalid Eisenhower quadrant.' }, 400);
        await sql`UPDATE tasks SET eisenhower_quadrant=${quadrant},updated_at=now() WHERE workspace_id=${workspace(env)} AND id=${id}::uuid`;
        await activity(sql, env, 'task', id, 'matrix_move', `Moved task: ${old.title}`, { quadrant });
        return json({ ok: true, task: await taskById(sql, env, id) });
      }
      if (!authed) {
        const loginUrl = new URL('/login.html', url);
        return env.ASSETS.fetch(new Request(loginUrl, request));
      }
      return env.ASSETS.fetch(request);
    } catch (e) {
      console.error(e);
      return json({ error: e?.message || String(e) }, 500);
    }
  }
};
