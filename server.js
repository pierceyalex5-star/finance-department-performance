const http=require("http"),fs=require("fs"),path=require("path"),url=require("url");
const ROOT=__dirname, DATA=path.join(ROOT,"data","state.json"), PORT=Number(process.env.PORT||8080);
let state=JSON.parse(fs.readFileSync(DATA,"utf8")), clients=new Set();
function persist(){state.version=(state.version||0)+1;state.updatedAt=new Date().toISOString();const tmp=DATA+".tmp";fs.writeFileSync(tmp,JSON.stringify(state,null,2));fs.renameSync(tmp,DATA)}
function broadcast(){const msg=`data: ${JSON.stringify({version:state.version,updatedAt:state.updatedAt})}\n\n`;for(const r of clients){try{r.write(msg)}catch(e){clients.delete(r)}}}
function enabled(t){return ["Preparation","Approval","Entry","Review"].filter(s=>t.stageEnabled?.[s]!==false)}
function apply(a){
 if(a.type==="stage_complete"){state.periodStates[a.period]??={};state.periodStates[a.period][a.taskId]??={stages:{}};state.periodStates[a.period][a.taskId].stages??={};state.periodStates[a.period][a.taskId].stages[a.stage]={doneAt:a.at||new Date().toISOString(),doneBy:a.doneBy||""}}
 else if(a.type==="stage_undo"){const t=state.taskTemplates.find(x=>x.id===a.taskId), list=t?enabled(t):["Preparation","Approval","Entry","Review"],idx=list.indexOf(a.stage);state.periodStates[a.period]??={};state.periodStates[a.period][a.taskId]??={stages:{}};for(let i=Math.max(idx,0);i<list.length;i++)delete state.periodStates[a.period][a.taskId].stages[list[i]]}
 else if(a.type==="template_add")state.taskTemplates.push(a.task)
 else if(a.type==="template_update"){const i=state.taskTemplates.findIndex(x=>x.id===a.task.id);if(i>=0)state.taskTemplates[i]={...state.taskTemplates[i],...a.task}}
 else if(a.type==="template_delete"){const t=state.taskTemplates.find(x=>x.id===a.taskId);if(t)t.active=false}
 else if(a.type==="ho_score"){state.headOfficeHistory[a.period]??={};state.headOfficeHistory[a.period][a.bu]??={};if(a.value===""||a.value===null)delete state.headOfficeHistory[a.period][a.bu][a.activity];else state.headOfficeHistory[a.period][a.bu][a.activity]=a.value}
 else if(a.type==="ho_template_add")state.headOfficeTemplate.push(a.item)
 else if(a.type==="ho_template_update"){const i=state.headOfficeTemplate.findIndex(x=>x.id===a.item.id);if(i>=0){const old=state.headOfficeTemplate[i].activity;state.headOfficeTemplate[i]={...state.headOfficeTemplate[i],...a.item};const neu=state.headOfficeTemplate[i].activity;if(a.oldActivity&&a.oldActivity!==neu){for(const p of Object.keys(state.headOfficeHistory||{}))for(const bu of Object.keys(state.headOfficeHistory[p]||{})){const scores=state.headOfficeHistory[p][bu];if(Object.prototype.hasOwnProperty.call(scores,a.oldActivity)&&!Object.prototype.hasOwnProperty.call(scores,neu)){scores[neu]=scores[a.oldActivity];delete scores[a.oldActivity]}}}}}
 else if(a.type==="ho_template_delete"){const h=state.headOfficeTemplate.find(x=>x.id===a.id);if(h)h.active=false}
 else if(a.type==="close_set")state.closeActual[a.period]=a.at
 else if(a.type==="close_clear")delete state.closeActual[a.period]
 else if(a.type==="correction_add")state.corrections.push(a.item)
 else if(a.type==="correction_delete")state.corrections=state.corrections.filter(x=>x.id!==a.id)
 else if(a.type==="je_add")state.manualJEs.push(a.item)
 else if(a.type==="je_delete")state.manualJEs=state.manualJEs.filter(x=>x.id!==a.id)
 else if(a.type==="improvement_add")state.improvements.push(a.item)
 else if(a.type==="improvement_delete")state.improvements=state.improvements.filter(x=>x.id!==a.id)
 else if(a.type==="settings_update")state.settings={...state.settings,...a.settings}
 else if(a.type==="replace_state"){state=a.state}
 else throw new Error("Unknown action");
 persist();broadcast()
}
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".css":"text/css; charset=utf-8",".webmanifest":"application/manifest+json"};
function body(req){return new Promise((resolve,reject)=>{let b="";req.on("data",c=>{b+=c;if(b.length>2e6){reject(new Error("Body too large"));req.destroy()}});req.on("end",()=>resolve(b));req.on("error",reject)})}
const server=http.createServer(async(req,res)=>{
 const u=url.parse(req.url).pathname;
 if(u==="/api/state"&&req.method==="GET"){res.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store"});return res.end(JSON.stringify(state))}
 if(u==="/api/action"&&req.method==="POST"){try{const a=JSON.parse(await body(req));apply(a);res.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store"});return res.end(JSON.stringify(state))}catch(e){res.writeHead(400,{"Content-Type":"application/json"});return res.end(JSON.stringify({error:e.message}))}}
 if(u==="/api/events"&&req.method==="GET"){res.writeHead(200,{"Content-Type":"text/event-stream","Cache-Control":"no-cache","Connection":"keep-alive"});res.write("\n");clients.add(res);req.on("close",()=>clients.delete(res));return}
 let rel=u==="/"?"index.html":decodeURIComponent(u).replace(/^\/+/,"");let file=path.normalize(path.join(ROOT,rel));if(!file.startsWith(ROOT))return res.writeHead(403).end("Forbidden");
 fs.stat(file,(err,st)=>{if(err||!st.isFile()){res.writeHead(404);return res.end("Not found")}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res)})
});
server.listen(PORT,"0.0.0.0",()=>console.log(`Finance dashboard running at http://localhost:${PORT}`));
