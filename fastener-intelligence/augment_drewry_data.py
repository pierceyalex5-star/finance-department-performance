#!/usr/bin/env python3
import csv, io, json, re, sys, urllib.request
from datetime import datetime

PATH = sys.argv[1] if len(sys.argv) > 1 else 'trend-data.js'
DREWRY_URL = 'https://www.drewry.co.uk/maritime-research-opinion-browser/world-container-index-assessed-by-drewry'
MTS_URL = 'https://www.mtsinsights.com/events/3967/'
DW_DATA_URL = 'https://datawrapper.dwcdn.net/8j9Yk/data'

SEED = [
    ['2026-06-11', 3549.0], ['2026-06-18', 3969.0], ['2026-06-25', 4166.0],
    ['2026-07-02', 4530.0], ['2026-07-09', 4639.0], ['2026-07-16', 4547.0],
    ['2026-07-23', 4374.0], ['2026-07-30', 4255.0], ['2026-08-06', 4297.0],
    ['2026-08-13', 4339.0],
]

def load_existing(path):
    text = open(path, encoding='utf-8').read().strip(); prefix='window.FI_TREND_DATA='
    if not text.startswith(prefix): raise ValueError('Unexpected trend-data.js format')
    body=text[len(prefix):]
    if body.endswith(';'): body=body[:-1]
    return json.loads(body)

def get(url):
    req=urllib.request.Request(url,headers={'User-Agent':'fastener-intelligence-github-pages/10.1','Accept':'text/csv,text/tab-separated-values,text/plain,application/octet-stream,*/*'})
    with urllib.request.urlopen(req,timeout=40) as r: return r.read().decode('utf-8-sig',errors='replace')

def parse_date(raw):
    s=str(raw or '').strip()
    if not s: return None
    for f in ('%Y-%m-%d','%m/%d/%Y','%d/%m/%Y','%b %d, %Y','%B %d, %Y','%d %b %Y','%d %B %Y','%m/%d/%y','%d.%m.%Y'):
        try: return datetime.strptime(s,f).strftime('%Y-%m-%d')
        except ValueError: pass
    m=re.match(r'(20\d{2}-\d{2}-\d{2})',s)
    return m.group(1) if m else None

def parse_num(raw):
    s=str(raw or '').replace('$','').replace(',','').strip()
    m=re.search(r'-?\d+(?:\.\d+)?',s)
    if not m: return None
    try: return float(m.group(0))
    except ValueError: return None

def fetch_datawrapper():
    text=get(DW_DATA_URL)
    # Datawrapper /data may be comma-, tab-, or semicolon-delimited depending on the chart upload.
    try: dialect=csv.Sniffer().sniff(text[:4096],delimiters=',\t;')
    except Exception: dialect=csv.excel
    reader=csv.DictReader(io.StringIO(text),dialect=dialect); fields=reader.fieldnames or []
    if not fields: return []
    rows=[]
    date_fields=[f for f in fields if any(k in f.lower() for k in ('date','week','time'))] or fields[:1]
    value_fields=[f for f in fields if any(k in f.lower() for k in ('drewry','wci','index','value','price','rate')) and f not in date_fields]
    if not value_fields: value_fields=[f for f in fields if f not in date_fields]
    for r in reader:
        d=None
        for f in date_fields:
            d=parse_date(r.get(f))
            if d: break
        if not d:
            # Last-resort: scan the row for a parseable date.
            for v0 in r.values():
                d=parse_date(v0)
                if d: break
        if not d: continue
        v=None
        for f in value_fields:
            n=parse_num(r.get(f))
            if n is not None and n>500: v=n; break
        if v is None:
            for f,v0 in r.items():
                if f in date_fields: continue
                n=parse_num(v0)
                if n is not None and n>500: v=n; break
        if v is not None: rows.append([d,v])
    out={d:v for d,v in rows}
    return [[d,out[d]] for d in sorted(out)]

def fetch_latest_drewry():
    req=urllib.request.Request(DREWRY_URL,headers={'User-Agent':'fastener-intelligence-github-pages/10.1'})
    with urllib.request.urlopen(req,timeout=35) as r: html=r.read().decode('utf-8',errors='replace')
    text=re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',html))
    dm=re.search(r'(?:Thursday,\s*)?(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+20\d{2})',text,re.I)
    vm=re.search(r'World Container Index.*?(?:increased|decreased|rose|fell).*?to\s*\$([0-9,]+)\s*per\s*40ft',text,re.I)
    if not(dm and vm): return None
    raw=dm.group(1); d=None
    for f in ('%d %b %Y','%d %B %Y'):
        try: d=datetime.strptime(raw,f).strftime('%Y-%m-%d'); break
        except ValueError: pass
    return [d,float(vm.group(1).replace(',',''))] if d else None

obj=load_existing(PATH); data={d:v for d,v in SEED}; method='seed fallback'
try:
    full=fetch_datawrapper()
    if len(full)>=50 and full[0][0]<'2025-01-01':
        data={d:v for d,v in full}; method='MTS Insights Datawrapper / Drewry'
    else:
        print(f'WARN Drewry Datawrapper returned {len(full)} usable rows; earliest={full[0][0] if full else None}',file=sys.stderr)
except Exception as e:
    print(f'WARN Drewry Datawrapper history: {e}',file=sys.stderr)
try:
    latest=fetch_latest_drewry()
    if latest: data[latest[0]]=latest[1]
except Exception as e:
    print(f'WARN Drewry live refresh: {e}',file=sys.stderr)
rows=[[d,data[d]] for d in sorted(data)]
obj.setdefault('series',{})['DREWRY_WCI']={
    'id':'DREWRY_WCI','name':'Drewry World Container Index','group':'Freight & logistics',
    'units':'USD per 40ft container','frequency':'Weekly','source':'Drewry WCI via MTS Insights historical chart + Drewry public updates',
    'relevance':'Ocean freight benchmark for imported finished goods','url':MTS_URL,'data':rows,'error':None,
    'coverageNote':f'Historical method: {method}. Earliest loaded observation: {rows[0][0] if rows else "unavailable"}. MTS Insights identifies Drewry as the source.'
}
obj['provider']=str(obj.get('provider',''))+' + Drewry WCI via MTS Insights'
with open(PATH,'w',encoding='utf-8') as f:
    f.write('window.FI_TREND_DATA='); json.dump(obj,f,separators=(',',':')); f.write(';\n')
print(f'Drewry WCI observations: {len(rows)}; earliest={rows[0] if rows else None}; latest={rows[-1] if rows else None}; method={method}')
