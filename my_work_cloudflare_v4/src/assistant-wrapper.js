import base from './index.js';
import { neon } from '@neondatabase/serverless';

const enc = new TextEncoder();
const json = (data,status=200,headers={}) => new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8',...headers}});
const workspace = env => env.WORKSPACE_ID || 'alex';
const db = env => neon(env.DATABASE_URL);
const ctxOf = value => String(value || '').toLowerCase() === 'personal' ? 'personal' : 'work';

function cookieValue(request,name){
  const raw=request.headers.get('cookie')||'';
  for(const part of raw.split(';')){
    const [k,...v]=part.trim().split('=');
    if(k===name)return decodeURIComponent(v.join('='));
  }
  return '';
}
function b64url(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function sign(secret,value){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64url(await crypto.subtle.sign('HMAC',key,enc.encode(value)));}
async function isAuthed(request,env){if(!env.SESSION_SECRET)return false;const got=cookieValue(request,'mywork_session');if(!got)return false;return got===await sign(env.SESSION_SECRET,`my-work:${workspace(env)}`);}
function cleanMeetingText(value){return String(value||'').replace(/https?:\/\/\S+/g,'').replace(/(Meeting ID|Numéro de réunion|Passcode|Code secret|Phone conference ID|Numéro de conférence téléphonique)\s*:\s*[^\n]+/gi,'').replace(/_{5,}/g,' ').replace(/\s+/g,' ').trim().slice(0,5000);}
function responseText(data){const out=[];for(const item of data?.output||[])if(item.type==='message')for(const c of item.content||[])if(c.type==='output_text'&&c.text)out.push(c.text);return out.join('\n').trim();}

async function executiveState(env,ctx){
  const sql=db(env),ws=workspace(env);
  const [assistant,commitments,meetings]=await Promise.all([
    sql`SELECT a.*,p.name AS suggested_project_name FROM assistant_inbox a LEFT JOIN projects p ON p.id=a.suggested_project_id WHERE a.workspace_id=${ws} AND a.context=${ctx} AND a.source_type<>'calendar' AND a.status NOT IN ('dismissed','done') ORDER BY CASE WHEN a.status='new' THEN 0 WHEN a.status='review' THEN 1 ELSE 2 END,a.created_at DESC LIMIT 100`,
    sql`SELECT c.*,p.name AS project_name FROM commitments c LEFT JOIN projects p ON p.id=c.project_id WHERE c.workspace_id=${ws} AND c.context=${ctx} AND c.status NOT IN ('done','cancelled') ORDER BY c.due_at NULLS LAST,c.updated_at DESC LIMIT 100`,
    sql`SELECT a.id,a.title,a.summary,a.suggested_due_at,a.status,a.metadata,a.created_at FROM assistant_inbox a WHERE a.workspace_id=${ws} AND a.context=${ctx} AND a.source_type='calendar' AND a.status='scheduled' AND (a.suggested_due_at IS NULL OR a.suggested_due_at >= now()-interval '1 day') ORDER BY a.suggested_due_at NULLS LAST LIMIT 100`
  ]);
  const now=Date.now(),seven=now+7*86400000;
  const commitmentsDue=commitments.filter(c=>c.due_at&&new Date(c.due_at).getTime()<=seven).length;
  return {context:ctx,assistant,commitments,meetings,metrics:{assistant:assistant.filter(x=>['new','review'].includes(x.status)).length,commitments:commitments.length,commitments_due:commitmentsDue,meetings:meetings.length}};
}

async function patchAssistant(request,env,ctx,id){
  const sql=db(env),ws=workspace(env),body=await request.json();
  const allowed=['new','review','accepted','dismissed','done'];
  const status=allowed.includes(body.status)?body.status:null;
  if(!status)return json({error:'Invalid assistant status.'},400);
  const rows=await sql`UPDATE assistant_inbox SET status=${status},updated_at=now() WHERE workspace_id=${ws} AND context=${ctx} AND id=${id}::uuid RETURNING *`;
  if(!rows[0])return json({error:'Assistant item not found.'},404);
  return json({ok:true,item:rows[0]});
}

async function acceptAssistantTask(env,ctx,id){
  const sql=db(env),ws=workspace(env);
  const rows=await sql`SELECT * FROM assistant_inbox WHERE workspace_id=${ws} AND context=${ctx} AND id=${id}::uuid LIMIT 1`;
  const a=rows[0];if(!a)return json({error:'Assistant item not found.'},404);
  const sourceKey=`assistant:${a.source_ref||a.id}`;
  const existing=await sql`SELECT * FROM tasks WHERE workspace_id=${ws} AND context=${ctx} AND source=${sourceKey} LIMIT 1`;
  if(existing[0])return json({ok:true,task:existing[0],duplicate:true});
  const title=String(a.suggested_action||a.title||'Assistant action').trim().slice(0,500);
  const people=a.suggested_person?[a.suggested_person]:[];
  const task=await sql`INSERT INTO tasks (workspace_id,context,project_id,title,details,status,priority,due_at,with_people,source) VALUES (${ws},${ctx},${a.suggested_project_id},${title},${a.summary},'open','normal',${a.suggested_due_at},${people},${sourceKey}) RETURNING *`;
  await sql`UPDATE assistant_inbox SET status='accepted',metadata=metadata||${JSON.stringify({task_id:task[0].id})}::jsonb,updated_at=now() WHERE id=${a.id}`;
  await sql`INSERT INTO activity_log (workspace_id,context,entity_type,entity_id,action,summary,metadata) VALUES (${ws},${ctx},'task',${String(task[0].id)},'assistant_accept',${`Created task from Assistant Inbox: ${title}`},${JSON.stringify({reversible:true,operation:'task_create',entity_id:task[0].id,assistant_id:a.id})}::jsonb)`;
  return json({ok:true,task:task[0]});
}

async function patchCommitment(request,env,ctx,id){
  const sql=db(env),ws=workspace(env),body=await request.json();
  const allowed=['open','done','cancelled'];
  const status=allowed.includes(body.status)?body.status:null;if(!status)return json({error:'Invalid commitment status.'},400);
  const rows=await sql`UPDATE commitments SET status=${status},completed_at=CASE WHEN ${status}='done' THEN COALESCE(completed_at,now()) ELSE NULL END,updated_at=now() WHERE workspace_id=${ws} AND context=${ctx} AND id=${id}::uuid RETURNING *`;
  if(!rows[0])return json({error:'Commitment not found.'},404);
  return json({ok:true,commitment:rows[0]});
}

async function meetingPrep(env,ctx,id){
  const sql=db(env),ws=workspace(env);
  const mrows=await sql`SELECT * FROM assistant_inbox WHERE workspace_id=${ws} AND context=${ctx} AND id=${id}::uuid AND source_type='calendar' LIMIT 1`;
  const meeting=mrows[0];if(!meeting)return json({error:'Meeting not found.'},404);
  const [tasks,commitments,emails,notes,projects]=await Promise.all([
    sql`SELECT t.title,t.details,t.status,t.priority,t.due_at,t.waiting_on,t.owner_name,t.follow_up_at,t.with_people,t.eisenhower_quadrant,p.name AS project_name FROM tasks t LEFT JOIN projects p ON p.id=t.project_id WHERE t.workspace_id=${ws} AND t.context=${ctx} AND t.status NOT IN ('done','cancelled') ORDER BY t.due_at NULLS LAST,t.updated_at DESC LIMIT 120`,
    sql`SELECT c.title,c.details,c.direction,c.person_name,c.due_at,c.status,p.name AS project_name FROM commitments c LEFT JOIN projects p ON p.id=c.project_id WHERE c.workspace_id=${ws} AND c.context=${ctx} AND c.status='open' ORDER BY c.due_at NULLS LAST LIMIT 80`,
    sql`SELECT title,summary,suggested_action,suggested_person,status,created_at FROM assistant_inbox WHERE workspace_id=${ws} AND context=${ctx} AND source_type='email' AND status NOT IN ('dismissed','done') ORDER BY created_at DESC LIMIT 50`,
    sql`SELECT n.kind,n.title,n.body,n.created_at,p.name AS project_name FROM notes n LEFT JOIN projects p ON p.id=n.project_id WHERE n.workspace_id=${ws} AND n.context=${ctx} ORDER BY n.created_at DESC LIMIT 40`,
    sql`SELECT name,description,status,with_people FROM projects WHERE workspace_id=${ws} AND context=${ctx} AND status='active' ORDER BY updated_at DESC LIMIT 40`
  ]);
  const md=meeting.metadata||{};
  const prompt=`Prepare a concise executive meeting brief for Alex. Use only the supplied workspace facts. Do not invent people, decisions, commitments, dates or status. Identify relevant open work by matching the meeting purpose, agenda and people to the workspace.\n\nMEETING\nTitle: ${meeting.title}\nStart: ${md.start||meeting.suggested_due_at||''}\nEnd: ${md.end||''}\nLocation: ${md.location||''}\nAgenda/description: ${cleanMeetingText(md.description||meeting.summary)}\n\nOPEN TASKS\n${JSON.stringify(tasks)}\n\nCOMMITMENTS\n${JSON.stringify(commitments)}\n\nASSISTANT EMAIL ITEMS\n${JSON.stringify(emails)}\n\nRECENT NOTES/DECISIONS\n${JSON.stringify(notes)}\n\nACTIVE PROJECTS\n${JSON.stringify(projects)}\n\nReturn: (1) objective and desired outcome, (2) 3-7 agenda points, (3) what Alex owes / is waiting on, (4) relevant decisions or facts, (5) recommended questions, (6) explicit actions to capture after the meeting. Keep it practical and under 600 words.`;
  const res=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${env.OPENAI_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model:env.OPENAI_MODEL||'gpt-5.6',input:prompt,store:false,safety_identifier:`my-work-meeting-${workspace(env)}-${ctx}`})});
  const raw=await res.text();let data={};try{data=raw?JSON.parse(raw):{}}catch{}
  if(!res.ok)return json({error:data?.error?.message||`Meeting prep failed (${res.status}).`},500);
  return json({ok:true,prep:responseText(data)||'No meeting brief generated.',meeting:{id:meeting.id,title:meeting.title,start:md.start||meeting.suggested_due_at}});
}

async function injectAssistant(response){
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html')||!response.ok)return response;
  let text=await response.text();
  if(text.includes('/assistant.js'))return new Response(text,{status:response.status,headers:response.headers});
  text=text.replace('</head>','<link rel="stylesheet" href="/assistant.css"></head>').replace('</body>','<script src="/assistant.js"></script></body>');
  const headers=new Headers(response.headers);headers.delete('content-length');
  return new Response(text,{status:response.status,statusText:response.statusText,headers});
}

export default {async fetch(request,env,executionCtx){
  const url=new URL(request.url),ctx=ctxOf(url.searchParams.get('context'));
  try{
    if(url.pathname.startsWith('/api/executive/')){
      if(!await isAuthed(request,env))return json({error:'Unauthorized'},401);
      if(url.pathname==='/api/executive/state'&&request.method==='GET')return json(await executiveState(env,ctx));
      const ai=url.pathname.match(/^\/api\/executive\/assistant\/([0-9a-f-]+)$/i);if(ai&&request.method==='PATCH')return patchAssistant(request,env,ctx,ai[1]);
      const accept=url.pathname.match(/^\/api\/executive\/assistant\/([0-9a-f-]+)\/accept-task$/i);if(accept&&request.method==='POST')return acceptAssistantTask(env,ctx,accept[1]);
      const cm=url.pathname.match(/^\/api\/executive\/commitments\/([0-9a-f-]+)$/i);if(cm&&request.method==='PATCH')return patchCommitment(request,env,ctx,cm[1]);
      const prep=url.pathname.match(/^\/api\/executive\/meeting\/([0-9a-f-]+)\/prep$/i);if(prep&&request.method==='POST')return meetingPrep(env,ctx,prep[1]);
      return json({error:'Executive assistant route not found.'},404);
    }
    const response=await base.fetch(request,env,executionCtx);
    if(request.method==='GET'&&await isAuthed(request,env))return injectAssistant(response);
    return response;
  }catch(e){console.error(e);return json({error:e?.message||String(e)},500);}
}};
