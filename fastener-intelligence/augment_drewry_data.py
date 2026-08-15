#!/usr/bin/env python3
import csv, io, json, re, sys, urllib.request, urllib.error
from datetime import datetime

PATH = sys.argv[1] if len(sys.argv) > 1 else 'trend-data.js'
DREWRY_URL = 'https://www.drewry.co.uk/maritime-research-opinion-browser/world-container-index-assessed-by-drewry'
MTS_URL = 'https://www.mtsinsights.com/events/3967/'
CHART_ID='8j9Yk'

SEED = [
    ['2026-06-11', 3549.0], ['2026-06-18', 3969.0], ['2026-06-25', 4166.0],
    ['2026-07-02', 4530.0], ['2026-07-09', 4639.0], ['2026-07-16', 4547.0],
    ['2026-07-23', 4374.0], ['2026-07-30', 4255.0], ['2026-08-06', 4297.0],
    ['2026-08-13', 4339.0],
]
HEADERS={'User-Agent':'fastener-intelligence-github-pages/10.2','Accept':'text/csv,text/tab-separated-values,text/plain,application/octet-stream,text/html,*/*'}

def load_existing(path):
    text=open(path,encoding='utf-8').read().strip(); prefix='window.FI_TREND_DATA='
    if not text.startswith(prefix): raise ValueError('Unexpected trend-data.js format')
    body=text[len(prefix):]
    if body.endswith(';'): body=body[:-1]
    return json.loads(body)

def request(url,method='GET',timeout=20):
    req=urllib.request.Request(url,headers=HEADERS,method=method)
    with urllib.request.urlopen(req,timeout=timeout) as r:
        return r.geturl(),r.headers,r.read()

def parse_date(raw):
    s=str(raw or '').strip()
    if not s: return None
    for f in ('%Y-%m-%d','%m/%d/%Y','%d/%m/%Y','%b %d, %Y','%B %d, %Y','%d %b %Y','%d %B %Y','%m/%d/%y','%d.%m.%Y'):
        try:return datetime.strptime(s,f).strftime('%Y-%m-%d')
        except ValueError:pass
    m=re.match(r'(20\d{2}-\d{2}-\d{2})',s)
    return m.group(1) if m else None

def parse_num(raw):
    s=str(raw or '').replace('$','').replace(',','').strip(); m=re.search(r'-?\d+(?:\.\d+)?',s)
    if not m:return None
    try:return float(m.group(0))
    except ValueError:return None

def parse_dataset(raw):
    text=raw.decode('utf-8-sig',errors='replace')
    try:dialect=csv.Sniffer().sniff(text[:8192],delimiters=',\t;')
    except Exception:dialect=csv.excel
    reader=csv.DictReader(io.StringIO(text),dialect=dialect); fields=reader.fieldnames or []
    if not fields:return []
    date_fields=[f for f in fields if any(k in f.lower() for k in ('date','week','time'))] or fields[:1]
    value_fields=[f for f in fields if any(k in f.lower() for k in ('drewry','wci','index','value','price','rate')) and f not in date_fields]
    if not value_fields:value_fields=[f for f in fields if f not in date_fields]
    rows=[]
    for r in reader:
        d=None
        for f in date_fields:
            d=parse_date(r.get(f))
            if d:break
        if not d:
            for v0 in r.values():
                d=parse_date(v0)
                if d:break
        if not d:continue
        v=None
        for f in value_fields:
            n=parse_num(r.get(f))
            if n is not None and n>500:v=n;break
        if v is None:
            for f,v0 in r.items():
                if f in date_fields:continue
                n=parse_num(v0)
                if n is not None and n>500:v=n;break
        if v is not None:rows.append([d,v])
    out={d:v for d,v in rows}
    return [[d,out[d]] for d in sorted(out)]

def candidate_urls():
    base=f'https://datawrapper.dwcdn.net/{CHART_ID}'
    # Current/unversioned patterns first.
    for suffix in ('dataset.csv','data','data.csv','dataset.tsv','0/dataset.csv','0/data','0/data.csv'):
        yield f'{base}/{suffix}'
    # Datawrapper published versions are usually small integers. Try likely versions without failing the build.
    for v in range(1,181):
        yield f'{base}/{v}/dataset.csv'

def fetch_datawrapper():
    # Log what the image endpoint resolves to; useful if Datawrapper changes publication conventions.
    try:
        final,_,_=request(f'https://datawrapper.dwcdn.net/{CHART_ID}/full.png',timeout=15)
        print(f'Drewry Datawrapper image resolves to: {final}')
    except Exception as e:print(f'WARN Drewry image resolution: {e}',file=sys.stderr)
    best=[];best_url=None
    for url in candidate_urls():
        try:
            _,_,raw=request(url,timeout=5)
            rows=parse_dataset(raw)
            if len(rows)>len(best):
                best,best_url=rows,url
                print(f'Drewry dataset candidate: {url}; rows={len(rows)}; earliest={rows[0][0] if rows else None}')
            if len(rows)>=80 and rows[0][0]<'2025-01-01':break
        except (urllib.error.HTTPError,urllib.error.URLError,TimeoutError):continue
        except Exception as e:
            print(f'WARN Drewry candidate {url}: {e}',file=sys.stderr)
    return best,best_url

def fetch_latest_drewry():
    _,_,raw=request(DREWRY_URL,timeout=35); html=raw.decode('utf-8',errors='replace');text=re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',html))
    dm=re.search(r'(?:Thursday,\s*)?(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+20\d{2})',text,re.I)
    vm=re.search(r'World Container Index.*?(?:increased|decreased|rose|fell).*?to\s*\$([0-9,]+)\s*per\s*40ft',text,re.I)
    if not(dm and vm):return None
    rawd=dm.group(1);d=None
    for f in ('%d %b %Y','%d %B %Y'):
        try:d=datetime.strptime(rawd,f).strftime('%Y-%m-%d');break
        except ValueError:pass
    return [d,float(vm.group(1).replace(',',''))] if d else None

obj=load_existing(PATH);data={d:v for d,v in SEED};method='seed fallback';dataset_url=None
try:
    full,dataset_url=fetch_datawrapper()
    if len(full)>=50 and full[0][0]<'2025-01-01':
        data={d:v for d,v in full};method='MTS Insights Datawrapper / Drewry'
    else:print(f'WARN Drewry Datawrapper usable history insufficient: rows={len(full)}, earliest={full[0][0] if full else None}',file=sys.stderr)
except Exception as e:print(f'WARN Drewry Datawrapper history: {e}',file=sys.stderr)
try:
    latest=fetch_latest_drewry()
    if latest:data[latest[0]]=latest[1]
except Exception as e:print(f'WARN Drewry live refresh: {e}',file=sys.stderr)
rows=[[d,data[d]] for d in sorted(data)]
obj.setdefault('series',{})['DREWRY_WCI']={
    'id':'DREWRY_WCI','name':'Drewry World Container Index','group':'Freight & logistics','units':'USD per 40ft container','frequency':'Weekly',
    'source':'Drewry WCI via MTS Insights historical chart + Drewry public updates','relevance':'Ocean freight benchmark for imported finished goods','url':MTS_URL,
    'data':rows,'error':None,'coverageNote':f'Historical method: {method}. Earliest loaded observation: {rows[0][0] if rows else "unavailable"}. MTS Insights identifies Drewry as source. Dataset endpoint: {dataset_url or "not resolved"}.'
}
obj['provider']=str(obj.get('provider',''))+' + Drewry WCI via MTS Insights'
with open(PATH,'w',encoding='utf-8') as f:f.write('window.FI_TREND_DATA=');json.dump(obj,f,separators=(',',':'));f.write(';\n')
print(f'Drewry WCI observations: {len(rows)}; earliest={rows[0] if rows else None}; latest={rows[-1] if rows else None}; method={method}; dataset={dataset_url}')
