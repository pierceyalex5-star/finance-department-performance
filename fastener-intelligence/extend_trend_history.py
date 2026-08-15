#!/usr/bin/env python3
import csv, io, json, sys, urllib.request

PATH=sys.argv[1] if len(sys.argv)>1 else 'trend-data.js'
START='2019-01-01'
PREFIX='window.FI_TREND_DATA='

def load():
    t=open(PATH,encoding='utf-8').read().strip()
    if not t.startswith(PREFIX): raise ValueError('Unexpected trend-data.js format')
    body=t[len(PREFIX):]
    if body.endswith(';'): body=body[:-1]
    return json.loads(body)

def fetch_fred(sid):
    url=f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}&cosd={START}'
    req=urllib.request.Request(url,headers={'User-Agent':'fastener-intelligence-github-pages/9.0'})
    with urllib.request.urlopen(req,timeout=35) as r:
        text=r.read().decode('utf-8-sig')
    reader=csv.DictReader(io.StringIO(text)); fields=reader.fieldnames or []
    if not fields: return []
    date_key=fields[0]; value_key=sid if sid in fields else fields[-1]
    rows=[]
    for row in reader:
        raw=(row.get(value_key) or '').strip()
        if not raw or raw=='.': continue
        try: v=float(raw)
        except ValueError: continue
        d=(row.get(date_key) or '').strip()
        if d: rows.append([d,v])
    return rows

obj=load(); changed=0
for sid,s in obj.get('series',{}).items():
    url=str(s.get('url') or '')
    if 'fred.stlouisfed.org/series/' not in url: continue
    try:
        rows=fetch_fred(sid)
        if rows:
            s['data']=rows; changed+=1
            print(f'Extended {sid}: {len(rows)} observations from {rows[0][0]}')
    except Exception as e:
        print(f'WARN history extension {sid}: {e}',file=sys.stderr)
obj['start']=START
with open(PATH,'w',encoding='utf-8') as f:
    f.write(PREFIX); json.dump(obj,f,separators=(',',':')); f.write(';\n')
print(f'Extended {changed} FRED-backed series to {START}')
