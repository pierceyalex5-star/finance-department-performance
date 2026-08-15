#!/usr/bin/env python3
import html as htmlmod, json, re, sys, urllib.request
from datetime import datetime
from urllib.parse import urljoin

PATH=sys.argv[1] if len(sys.argv)>1 else 'trend-data.js'
MTS_EVENT='https://www.mtsinsights.com/events/3967/'
DREWRY_URL='https://www.drewry.co.uk/maritime-research-opinion-browser/world-container-index-assessed-by-drewry'
CUTOFF='2024-01-01'
MAX_PAGES=180
HEADERS={'User-Agent':'fastener-intelligence-github-pages/11.1','Accept':'text/html,*/*'}
SEED=[['2026-05-28',2800.0],['2026-06-04',3433.0],['2026-06-11',3549.0],['2026-06-18',3969.0],['2026-06-25',4166.0],['2026-07-02',4530.0],['2026-07-09',4639.0],['2026-07-16',4547.0],['2026-07-23',4374.0],['2026-07-30',4255.0],['2026-08-06',4297.0],['2026-08-13',4339.0]]

def load(path):
    t=open(path,encoding='utf-8').read().strip();p='window.FI_TREND_DATA='
    if not t.startswith(p):raise ValueError('Unexpected trend-data.js format')
    b=t[len(p):]
    if b.endswith(';'):b=b[:-1]
    return json.loads(b)

def get(url,timeout=25):
    req=urllib.request.Request(url,headers=HEADERS)
    with urllib.request.urlopen(req,timeout=timeout) as r:return r.geturl(),r.read().decode('utf-8',errors='replace')

def textify(h):
    h=re.sub(r'<script\b[^>]*>.*?</script>',' ',h,flags=re.I|re.S);h=re.sub(r'<style\b[^>]*>.*?</style>',' ',h,flags=re.I|re.S)
    return re.sub(r'\s+',' ',htmlmod.unescape(re.sub(r'<[^>]+>',' ',h))).strip()

def parse_date(t):
    m=re.search(r'\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+([A-Z][a-z]+\s+\d{1,2},\s+20\d{2})',t)
    if not m:m=re.search(r'\b([A-Z][a-z]+\s+\d{1,2},\s+20\d{2})\b',t)
    if not m:return None
    try:return datetime.strptime(m.group(1),'%B %d, %Y').strftime('%Y-%m-%d')
    except ValueError:return None

def parse_wci(t):
    # Dispatch wording changes over time. Use the first monetary value after the WCI heading,
    # which is the composite WCI before route-level values are discussed.
    anchors=[]
    for pat in (r'Drewry World Container Index',r'World Container Index',r'\bWCI\b'):
        m=re.search(pat,t,re.I)
        if m:anchors.append(m.end())
    start=min(anchors) if anchors else 0
    segment=t[start:start+1600]
    patterns=[
      r'(?:US\s*)?\$\s*([0-9,]+(?:\.\d+)?)\s*(?:per|/)\s*(?:40ft|40-ft|40-foot|forty-foot)\s*(?:container)?',
      r'(?:US\s*)?\$\s*([0-9,]+(?:\.\d+)?)'
    ]
    for p in patterns:
        m=re.search(p,segment,re.I)
        if m:
            try:
                v=float(m.group(1).replace(',',''))
                if 500<=v<=20000:return v
            except ValueError:pass
    return None

def anchors(h):
    out=[]
    for m in re.finditer(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>',h,re.I|re.S):
        txt=re.sub(r'\s+',' ',htmlmod.unescape(re.sub(r'<[^>]+>',' ',m.group(2)))).strip()
        out.append((urljoin(MTS_EVENT,m.group(1)),txt))
    return out

def latest_summary():
    _,h=get(MTS_EVENT);aa=anchors(h)
    for u,txt in aa:
        if '/summaries/' in u and ('permalink' in txt.lower() or 'week of' in txt.lower()):return u
    for u,txt in aa:
        if '/summaries/' in u:return u
    return None

def crawl():
    url=latest_summary()
    if not url:raise RuntimeError('Could not resolve latest MTS Drewry summary')
    data={};urls={};seen=set();pages=0
    while url and url not in seen and pages<MAX_PAGES:
        seen.add(url);pages+=1
        final,h=get(url);t=textify(h);d=parse_date(t);v=parse_wci(t)
        if pages<=5:print(f'MTS parse check page {pages}: date={d} value={v} url={final}')
        if d and v:
            data[d]=v;urls[d]=final
            if pages%20==0:print(f'MTS Drewry crawl page {pages}: {d} = {v:.0f}')
        if d and d<CUTOFF:break
        prev=None
        for u,txt in anchors(h):
            if '/summaries/' in u and 'previous' in txt.lower():prev=u;break
        url=prev
    rows=[[d,data[d]] for d in sorted(data) if d>=CUTOFF]
    return rows,urls,pages

def latest_drewry():
    try:
        _,h=get(DREWRY_URL,35);t=textify(h)
        dm=re.search(r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+20\d{2})',t,re.I)
        vm=re.search(r'World Container Index.*?(?:increased|decreased|rose|fell).*?to\s*\$([0-9,]+)\s*per\s*40ft',t,re.I)
        if not(dm and vm):return None
        for f in ('%d %b %Y','%d %B %Y'):
            try:return [datetime.strptime(dm.group(1),f).strftime('%Y-%m-%d'),float(vm.group(1).replace(',',''))]
            except ValueError:pass
    except Exception as e:print(f'WARN Drewry direct latest: {e}',file=sys.stderr)
    return None

obj=load(PATH);data={d:v for d,v in SEED};obs_urls={};method='seed fallback';pages=0
try:
    rows,obs_urls,pages=crawl()
    if len(rows)>=50 and rows[0][0]<'2025-01-01':data={d:v for d,v in rows};method='MTS weekly dispatches (Source: Drewry)'
    else:print(f'WARN MTS Drewry crawl insufficient: rows={len(rows)}, earliest={rows[0][0] if rows else None}',file=sys.stderr)
except Exception as e:print(f'WARN MTS Drewry crawl: {e}',file=sys.stderr)
latest=latest_drewry()
if latest:data[latest[0]]=latest[1]
rows=[[d,data[d]] for d in sorted(data)]
obj.setdefault('series',{})['DREWRY_WCI']={'id':'DREWRY_WCI','name':'Drewry World Container Index','group':'Freight & logistics','units':'USD per 40ft container','frequency':'Weekly','source':'MTS Insights weekly dispatches; underlying source Drewry','relevance':'Ocean freight benchmark for imported finished goods','url':MTS_EVENT,'data':rows,'observationUrls':obs_urls,'error':None,'coverageNote':f'Historical method: {method}. Earliest loaded observation: {rows[0][0] if rows else "unavailable"}. Each crawled observation retains its dated MTS dispatch URL. Pages crawled: {pages}.'}
obj['provider']=str(obj.get('provider',''))+' + Drewry WCI via MTS Insights dispatches'
with open(PATH,'w',encoding='utf-8') as f:f.write('window.FI_TREND_DATA=');json.dump(obj,f,separators=(',',':'));f.write(';\n')
print(f'Drewry WCI observations: {len(rows)}; earliest={rows[0] if rows else None}; latest={rows[-1] if rows else None}; method={method}; pages={pages}')
