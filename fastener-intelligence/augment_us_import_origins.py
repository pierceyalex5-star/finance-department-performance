#!/usr/bin/env python3
import io, json, re, sys, urllib.request, zipfile
from collections import defaultdict
from datetime import datetime, timezone

OUT = sys.argv[1] if len(sys.argv) > 1 else 'import-origin-data.js'
PRODUCT = '7318'
COUNTRY_URL = 'https://www.census.gov/foreign-trade/schedules/c/country.txt'
BASE = 'https://www.census.gov/trade/downloads/{year}/Port/im_hs6_m/PORTHS6MM{yy}{mm:02d}.ZIP'


def fetch(url, timeout=75):
    req = urllib.request.Request(url, headers={'User-Agent':'fastener-intelligence-github-pages/4.0'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def candidate_periods():
    now = datetime.now(timezone.utc)
    y, m = now.year, now.month
    out=[]
    for _ in range(8):
        out.append((y,m))
        m -= 1
        if m == 0:
            y -= 1; m = 12
    return out


def latest_port_zip():
    errors=[]
    for year,month in candidate_periods():
        url=BASE.format(year=year,yy=str(year)[2:],mm=month)
        try:
            blob=fetch(url)
            if blob[:2] == b'PK':
                return year,month,url,blob
        except Exception as e:
            errors.append(f'{year}-{month:02d}: {e}')
    raise RuntimeError('No current Census Port HS6 import ZIP found. ' + ' | '.join(errors[:4]))


def countries():
    text=fetch(COUNTRY_URL,30).decode('latin-1','replace')
    result={}
    for line in text.splitlines():
        m=re.match(r'\s*(\d{4})\s*\|\s*(.*?)\s*\|\s*([A-Z]{2})\s*$',line)
        if m:
            result[m.group(1)]={'name':m.group(2).strip(),'iso':m.group(3)}
    return result


def number(field):
    s=field.decode('ascii','ignore').strip()
    try:return int(s or 0)
    except:return 0


def parse(year,month,blob):
    z=zipfile.ZipFile(io.BytesIO(blob))
    names=z.namelist()
    target=next((n for n in names if re.search(r'DPORTHS6I\d{4}\.TXT$',n,re.I)),None)
    if not target:
        target=next((n for n in names if n.upper().endswith('.TXT') and 'HS6' in n.upper()),None)
    if not target:
        raise RuntimeError('HS6 import detail file not found in Census ZIP: '+','.join(names[:8]))
    agg=defaultdict(int)
    with z.open(target) as f:
        for raw in f:
            if len(raw) < 140: continue
            commodity=raw[0:6].decode('ascii','ignore')
            if not commodity.startswith(PRODUCT): continue
            cty=raw[6:10].decode('ascii','ignore')
            # 1-based positions 126-140 = Python 125:140, YTD General Imports total value.
            agg[cty] += number(raw[125:140])
    return agg,target


def region_for(code):
    if code.startswith('1'): return 'North America'
    if code.startswith('2'): return 'Central America / Caribbean'
    if code.startswith('3'): return 'South America'
    if code.startswith('4'): return 'Europe'
    if code.startswith('5'): return 'Asia'
    if code.startswith('6'): return 'Oceania'
    if code.startswith('7'): return 'Africa'
    return 'Other'


year,month,url,blob=latest_port_zip()
ctys=countries()
agg,target=parse(year,month,blob)
total=sum(agg.values())
rows=[]
for code,value in sorted(agg.items(),key=lambda kv:kv[1],reverse=True):
    meta=ctys.get(code,{'name':f'Country {code}','iso':''})
    rows.append({'code':code,'name':meta['name'],'iso':meta['iso'],'region':region_for(code),'value':value,'share':(value/total*100 if total else 0)})
regions=defaultdict(int)
for r in rows: regions[r['region']] += r['value']
region_rows=[{'name':k,'value':v,'share':v/total*100 if total else 0} for k,v in sorted(regions.items(),key=lambda kv:kv[1],reverse=True)]
obj={
  'asOf':f'{year}-{month:02d}',
  'year':year,'month':month,'hs':'7318',
  'description':'Screws, bolts, nuts, coach screws, screw hooks, rivets, cotters, cotter pins, washers and similar articles, of iron or steel',
  'basis':'Year-to-date U.S. General Imports, value basis, aggregated from Census Port HS6 country-by-port records',
  'totalValue':total,
  'countries':rows,
  'regions':region_rows,
  'sourceUrl':'https://www.census.gov/foreign-trade/data/dataproducts.html',
  'sourceFile':url,
  'sourceRecord':target,
  'countrySource':COUNTRY_URL,
  'fetchedAt':datetime.now(timezone.utc).isoformat()
}
with open(OUT,'w',encoding='utf-8') as f:
    f.write('window.FI_IMPORT_ORIGINS=')
    json.dump(obj,f,separators=(',',':'))
    f.write(';\n')
print(f"US HS7318 import origins: {year}-{month:02d}; countries={len(rows)}; total=${total:,}")
print('Top origins: '+', '.join(f"{r['name']} {r['share']:.1f}%" for r in rows[:8]))
