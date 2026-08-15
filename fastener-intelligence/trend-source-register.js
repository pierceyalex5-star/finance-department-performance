(()=>{
const D=window.FI_DATA||{};
const TD=window.FI_TREND_DATA||{};
D.sources=D.sources||{};
Object.entries(TD.series||{}).forEach(([id,s])=>{
  if(D.sources[id])return;
  D.sources[id]={
    title:s.name||id,
    publisher:s.source||'Public source',
    date:s.data?.length?s.data[s.data.length-1][0]:'Source reference',
    period:s.frequency||'Historical series',
    class:'fact',
    kind:'Public time series',
    url:s.url||'',
    usedFor:s.relevance||'Trend Lab / indexed landed-cost analysis',
    notes:[s.units?`Units: ${s.units}`:'',s.coverageNote||'',s.error||''].filter(Boolean).join(' · ')
  };
});
if(!D.sources.DREWRY_WCI&&TD.series?.DREWRY_WCI){
  const s=TD.series.DREWRY_WCI;
  D.sources.DREWRY_WCI={title:s.name,publisher:s.source,date:s.data?.at(-1)?.[0]||'Weekly',period:'Weekly',class:'fact',kind:'Freight benchmark',url:s.url,usedFor:'Ocean-freight component of indexed landed cost',notes:s.coverageNote||''};
}
})();
