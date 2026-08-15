#!/usr/bin/env python3
import json, re, sys, urllib.request
from datetime import datetime

PATH = sys.argv[1] if len(sys.argv) > 1 else 'trend-data.js'
SOURCE_URL = 'https://www.drewry.co.uk/maritime-research-opinion-browser/world-container-index-assessed-by-drewry'

# Public Drewry WCI observations captured from dated weekly public updates.
# The daily Pages build appends the newest public observation when Drewry's page is reachable.
SEED = [
    ['2026-06-11', 3549.0],
    ['2026-06-18', 3969.0],
    ['2026-06-25', 4166.0],
    ['2026-07-16', 4547.0],
    ['2026-07-23', 4374.0],
    ['2026-07-30', 4255.0],
    ['2026-08-13', 4339.0],
]

def load_existing(path):
    text = open(path, encoding='utf-8').read().strip()
    prefix = 'window.FI_TREND_DATA='
    if not text.startswith(prefix):
        raise ValueError('Unexpected trend-data.js format')
    body = text[len(prefix):]
    if body.endswith(';'):
        body = body[:-1]
    return json.loads(body)

def fetch_latest():
    req = urllib.request.Request(SOURCE_URL, headers={'User-Agent': 'fastener-intelligence-github-pages/5.0'})
    with urllib.request.urlopen(req, timeout=35) as r:
        html = r.read().decode('utf-8', errors='replace')
    text = re.sub(r'<[^>]+>', ' ', html)
    text = re.sub(r'\s+', ' ', text)
    dm = re.search(r'(?:Thursday,\s*)?(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+20\d{2})', text, re.I)
    vm = re.search(r'World Container Index.*?(?:increased|decreased|rose|fell).*?to\s*\$([0-9,]+)\s*per\s*40ft', text, re.I)
    if not (dm and vm):
        return None
    d = datetime.strptime(dm.group(1), '%d %b %Y').strftime('%Y-%m-%d') if len(dm.group(1).split()[1]) == 3 else datetime.strptime(dm.group(1), '%d %B %Y').strftime('%Y-%m-%d')
    return [d, float(vm.group(1).replace(',', ''))]

obj = load_existing(PATH)
data = {d:v for d,v in SEED}
try:
    latest = fetch_latest()
    if latest:
        data[latest[0]] = latest[1]
except Exception as e:
    print(f'WARN Drewry live refresh: {e}', file=sys.stderr)

rows = [[d, data[d]] for d in sorted(data)]
obj.setdefault('series', {})['DREWRY_WCI'] = {
    'id':'DREWRY_WCI',
    'name':'Drewry World Container Index',
    'group':'Freight & logistics',
    'units':'USD per 40ft container',
    'frequency':'Weekly',
    'source':'Drewry World Container Index public weekly updates',
    'relevance':'Ocean freight benchmark for imported finished goods',
    'url':SOURCE_URL,
    'data':rows,
    'error':None,
    'coverageNote':'Public seeded observations currently begin June 2026. The landed-cost model chain-links earlier months to the BLS deep-sea freight PPI and clearly identifies that fallback.'
}
obj['provider'] = str(obj.get('provider','')) + ' + Drewry WCI'
with open(PATH, 'w', encoding='utf-8') as f:
    f.write('window.FI_TREND_DATA=')
    json.dump(obj, f, separators=(',', ':'))
    f.write(';\n')
print(f'Drewry WCI observations: {len(rows)}; latest={rows[-1] if rows else None}')
