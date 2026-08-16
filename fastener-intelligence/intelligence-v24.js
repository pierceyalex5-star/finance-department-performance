(()=>{
const app=document.getElementById('app'),title=document.getElementById('viewTitle');
if(!app||!title)return;
let cleaning=false;
function clean(){
  if(cleaning)return;
  cleaning=true;
  try{
    if(!title.textContent.includes('Imports & Trade'))return;
    const hosts=[...app.querySelectorAll('.v23-owned')];
    if(hosts.length){
      const keep=hosts[0];
      hosts.slice(1).forEach(x=>x.remove());
      app.querySelectorAll('.v6-trade-layer').forEach(x=>{if(x!==keep)x.remove()});
    }
  }finally{cleaning=false}
}
new MutationObserver(clean).observe(app,{childList:true,subtree:true});
new MutationObserver(clean).observe(title,{childList:true,subtree:true,characterData:true});
clean();
})();