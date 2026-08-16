(()=>{
const app=document.getElementById('app'),title=document.getElementById('viewTitle');if(!app||!title)return;
const TD=()=>window.FI_TREND_DATA||{series:{}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const monthKey=d=>String(d).slice(0,7);
function rangeBounds(){
  const custom=document.querySelector('[data-tl-range].active')?.dataset.tlRange==='CUSTOM';
  const endVal=document.getElementById('tlEnd')?.value||'';
  const startVal=document.getElementById('tlStart')?.value||'';
  const active=document.querySelector('[data-tl-range].active')?.dataset.tlRange||'3Y';
  const end=endVal?new Date(endVal+'T23:59:59Z'):new Date();
  let start;
  if(custom&&startVal) start=new Date(startVal+'T00:00:00Z');
  else { start=new Date(end); start.setUTCFullYear(start.getUTCFullYear()-(active==='1Y'?1:active==='3Y'?3:active==='5Y'?5:10)); }
  return [start,end];
}
function monthlyLevels(id){
  const s=TD().series?.[id];if(!s?.data?.length)return [];
  const [a,b]=rangeBounds(),byMonth=new Map();
  for(const p of s.data){const d=new Date(p[0]+'T00:00:00Z');if(d<a||d>b||!Number.isFinite(+p[1]))continue;byMonth.set(monthKey(p[0]),[monthKey(p[0]),+p[1]]);}
  return [...byMonth.values()].sort((x,y)=>x[0].localeCompare(y[0]));
}
function monthlyReturns(id){
  const m=monthlyLevels(id),out=new Map();
  for(let i=1;i<m.length;i++) if(m[i-1][1]!==0) out.set(m[i][0],(m[i][1]/m[i-1][1]-1)*100);
  return out;
}
function shiftedPairs(driver,target,lag){
  const A=monthlyReturns(driver),B=monthlyReturns(target),pairs=[];
  for(const [k,v] of A){
    const [yy,mm]=k.split('-').map(Number),d=new Date(Date.UTC(yy,mm-1+lag,1));
    const kk=d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0');
    if(B.has(kk))pairs.push({driverMonth:k,targetMonth:kk,x:v,y:B.get(kk)});
  }
  return pairs;
}
function corr(pairs){
  if(!pairs||pairs.length<4)return null;
  const mx=pairs.reduce((s,p)=>s+p.x,0)/pairs.length,my=pairs.reduce((s,p)=>s+p.y,0)/pairs.length;
  let num=0,dx=0,dy=0;
  for(const p of pairs){const ax=p.x-mx,by=p.y-my;num+=ax*by;dx+=ax*ax;dy+=by*by;}
  return dx&&dy?num/Math.sqrt(dx*dy):null;
}
function stats(driver,target,lag){const pairs=shiftedPairs(driver,target,lag),r=corr(pairs);return {lag,r,n:pairs.length,pairs};}
function strength(r){const a=Math.abs(r??0);return a>=.8?'Very strong':a>=.6?'Strong':a>=.4?'Moderate':a>=.2?'Modest':'Weak';}
function direction(r){return (r??0)>=0?'positive':'inverse';}
function stability(best){
  if(!best||best.n<12)return {label:'Insufficient',detail:'Fewer than 12 overlapping monthly changes',first:null,second:null};
  const mid=Math.floor(best.pairs.length/2),a=best.pairs.slice(0,mid),b=best.pairs.slice(mid),r1=corr(a),r2=corr(b);
  if(r1==null||r2==null)return {label:'Insufficient',detail:'Not enough observations in both halves',first:r1,second:r2};
  const same=Math.sign(r1)===Math.sign(r2)||Math.abs(r1)<.05||Math.abs(r2)<.05,diff=Math.abs(r1-r2);
  let label='Low';
  if(same&&diff<=.20&&Math.min(Math.abs(r1),Math.abs(r2))>=.25)label='High';
  else if(same&&diff<=.40)label='Moderate';
  return {label,detail:`First half r=${r1.toFixed(2)} · second half r=${r2.toFixed(2)}`,first:r1,second:r2};
}
function lagText(lag,driver,target){
  const dn=TD().series?.[driver]?.name||driver,tn=TD().series?.[target]?.name||target;
  if(lag>0)return `<strong>${esc(dn)}</strong> leads <strong>${esc(tn)}</strong> by <strong>${lag} month${lag===1?'':'s'}</strong>`;
  if(lag<0)return `<strong>${esc(tn)}</strong> leads <strong>${esc(dn)}</strong> by <strong>${Math.abs(lag)} month${lag===-1?'':'s'}</strong>`;
  return `<strong>${esc(dn)}</strong> and <strong>${esc(tn)}</strong> are most closely related in the <strong>same month</strong>`;
}
function conclusion(best,driver,target){
  const dn=TD().series?.[driver]?.name||driver,tn=TD().series?.[target]?.name||target;
  if(!best||best.r==null)return 'There are not enough overlapping monthly observations to identify a reliable lead/lag relationship.';
  const rel=`${strength(best.r).toLowerCase()} ${direction(best.r)} relationship`;
  if(best.lag>0)return `Historically, monthly changes in ${dn} are most closely associated with monthly changes in ${tn} about ${best.lag} month${best.lag===1?'':'s'} later. The relationship is ${rel} (r=${best.r.toFixed(2)}). Treat this as a forecasting signal to investigate, not evidence of causation.`;
  if(best.lag<0)return `The selected driver is not the leading series in the strongest relationship. ${tn} tends to move about ${Math.abs(best.lag)} month${best.lag===-1?'':'s'} before ${dn}. The relationship is ${rel} (r=${best.r.toFixed(2)}).`;
  return `${dn} and ${tn} show their strongest relationship contemporaneously. The relationship is ${rel} (r=${best.r.toFixed(2)}), so this pairing is more useful as a coincident signal than as a forward indicator.`;
}
function render(){
  if(title.textContent.trim()!=='Trend Lab')return;
  const el=document.getElementById('tlLag'),ds=document.getElementById('tlLagDriver'),ts=document.getElementById('tlLagTarget');if(!el||!ds||!ts)return;
  const driver=ds.value,target=ts.value;if(!driver||!target||!TD().series?.[driver]||!TD().series?.[target])return;
  const vals=[];for(let lag=-6;lag<=6;lag++)vals.push(stats(driver,target,lag));
  const valid=vals.filter(v=>v.r!=null),best=valid.sort((a,b)=>Math.abs(b.r)-Math.abs(a.r))[0]||null,stab=stability(best);
  const [a,b]=rangeBounds(),sig=JSON.stringify({driver,target,a:+a,b:+b,best:best&&[best.lag,best.r,best.n],fetch:TD().fetchedAt});
  if(el.dataset.tlv4sig===sig)return;el.dataset.tlv4sig=sig;
  if(!best){el.innerHTML='<div class="tlv4-empty">Not enough overlapping monthly observations for this driver/target pair and period.</div>';return;}
  const maxH=82;
  const bars=vals.map(v=>{const r=v.r,mag=r==null?0:Math.max(2,Math.abs(r)*maxH),isBest=v.lag===best.lag,cls=r==null?'none':r>=0?'pos':'neg';return `<div class="tlv4-bar ${isBest?'best':''}" title="Lag ${v.lag}: ${r==null?'insufficient observations':'r='+r.toFixed(2)+' · n='+v.n}"><span class="tlv4-r ${r==null?'muted':''}">${r==null?'—':r.toFixed(2)}</span><div class="tlv4-barplot"><i class="${cls}" style="height:${mag}px"></i></div><b>${v.lag>0?'+'+v.lag:v.lag}</b></div>`}).join('');
  el.innerHTML=`
    <div class="tlv4-summary">
      <div class="tlv4-callout"><span>BEST LEAD / LAG SIGNAL</span><div>${lagText(best.lag,driver,target)}</div><p>${esc(conclusion(best,driver,target))}</p></div>
      <div class="tlv4-metrics">
        <div><span>Best correlation</span><strong>${best.r>=0?'+':''}${best.r.toFixed(2)}</strong><small>${strength(best.r)} ${direction(best.r)}</small></div>
        <div><span>Lead / lag</span><strong>${best.lag>0?'+'+best.lag:best.lag} mo</strong><small>${best.lag>0?'Driver leads':best.lag<0?'Target leads':'Same month'}</small></div>
        <div><span>Overlap</span><strong>${best.n}</strong><small>monthly change pairs</small></div>
        <div><span>Stability</span><strong>${stab.label}</strong><small>${esc(stab.detail)}</small></div>
      </div>
    </div>
    <div class="tlv4-chart">
      <div class="tlv4-axishead"><span>← TARGET LEADS DRIVER</span><b>SAME MONTH</b><span>DRIVER LEADS TARGET →</span></div>
      <div class="tlv4-zero"></div>
      <div class="tlv4-bars">${bars}</div>
      <div class="tlv4-scale"><span>-6 months</span><span>0</span><span>+6 months</span></div>
    </div>
    <div class="tlv4-method"><strong>How to read this:</strong> correlations use monthly percentage changes over the selected Trend Lab period. Positive lag means the selected driver is shifted forward against the target, so the driver leads. The highlighted bar is the strongest absolute correlation from -6 to +6 months. Stability compares that same lag in the first versus second half of the period. Correlation is diagnostic, not causal.</div>`;
}
function schedule(){setTimeout(render,25)}
app.addEventListener('change',e=>{if(e.target?.id==='tlLagDriver'||e.target?.id==='tlLagTarget'||e.target?.id==='tlStart'||e.target?.id==='tlEnd'||e.target?.matches?.('[data-tl-series],#tlFrequency'))schedule()},true);
app.addEventListener('click',e=>{if(e.target?.closest?.('[data-tl-range]'))setTimeout(render,80)},true);
new MutationObserver(()=>schedule()).observe(app,{childList:true,subtree:true});
new MutationObserver(()=>schedule()).observe(title,{childList:true,subtree:true,characterData:true});
schedule();
})();