#!/usr/bin/env python3
import io, json, re, sys, urllib.request
from datetime import datetime
from openpyxl import load_workbook

PATH = sys.argv[1] if len(sys.argv) > 1 else 'trend-data.js'
XLSX_URL = 'https://energir.com/files/energir_common/Evolution_prix_en.xlsx'
SOURCE_URL = 'https://energir.com/en/business/customer-centre/billing-and-pricing/pricing'


def parse_period(value, year_hint):
    if isinstance(value, datetime):
        return value.strftime('%Y-%m-01')
    s = str(value or '').strip()
    if not s:
        return None
    for fmt in ('%B %Y', '%m-%Y', '%m/%Y', '%Y-%m'):
        try:
            return datetime.strptime(s, fmt).strftime('%Y-%m-01')
        except ValueError:
            pass
    m = re.search(r'(\d{1,2})[-/]?(\d{4})', s)
    if m:
        return f'{int(m.group(2)):04d}-{int(m.group(1)):02d}-01'
    return None


def num(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().replace('*', '').replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return None


def load_existing(path):
    text = open(path, encoding='utf-8').read().strip()
    prefix = 'window.FI_TREND_DATA='
    if not text.startswith(prefix):
        raise ValueError('Unexpected trend-data.js format')
    body = text[len(prefix):]
    if body.endswith(';'):
        body = body[:-1]
    return json.loads(body)


def fetch_energir():
    req = urllib.request.Request(XLSX_URL, headers={'User-Agent': 'fastener-intelligence-github-pages/3.0'})
    with urllib.request.urlopen(req, timeout=45) as r:
        blob = r.read()
    wb = load_workbook(io.BytesIO(blob), data_only=True, read_only=True)
    regulated, market_1y, market_monthly = [], [], []
    for ws in wb.worksheets:
        try:
            year_hint = int(ws.title)
        except Exception:
            continue
        if year_hint < 2021:
            continue
        for row in ws.iter_rows(min_row=4, values_only=True):
            date = parse_period(row[0] if len(row) > 0 else None, year_hint)
            if not date:
                continue
            reg_cents = num(row[2] if len(row) > 2 else None)
            one_year = num(row[3] if len(row) > 3 else None)
            monthly = num(row[4] if len(row) > 4 else None)
            if reg_cents is not None:
                regulated.append([date, reg_cents])
            if one_year is not None:
                market_1y.append([date, one_year])
            if monthly is not None:
                market_monthly.append([date, monthly])
    return regulated, market_1y, market_monthly


def meta(name, units, relevance, data):
    return {
        'name': name,
        'group': 'Energy',
        'units': units,
        'frequency': 'Monthly',
        'source': 'Énergir natural gas price history',
        'relevance': relevance,
        'url': SOURCE_URL,
        'data': sorted(data),
        'error': None if data else 'Énergir workbook returned no numeric observations.'
    }

obj = load_existing(PATH)
regulated, one_year, monthly = fetch_energir()
obj.setdefault('series', {})['QC_NATGAS'] = {
    **meta('Québec Natural Gas Supply Price – Énergir', 'cents per cubic metre', 'Québec plant energy / heat-treatment supply cost', regulated),
    'id': 'QC_NATGAS'
}
obj['series']['QC_NATGAS_1Y'] = {
    **meta('Québec Natural Gas Market – 1 Year Contract', 'CAD per GJ', 'Forward natural-gas cost signal for Québec industrial users', one_year),
    'id': 'QC_NATGAS_1Y'
}
obj['series']['QC_NATGAS_MONTHLY'] = {
    **meta('Québec Natural Gas Market – Monthly Price', 'CAD per GJ', 'Spot/monthly natural-gas cost signal for Québec industrial users', monthly),
    'id': 'QC_NATGAS_MONTHLY'
}
obj['provider'] = 'FRED / underlying public agencies + Énergir'

with open(PATH, 'w', encoding='utf-8') as f:
    f.write('window.FI_TREND_DATA=')
    json.dump(obj, f, separators=(',', ':'))
    f.write(';\n')

print(f'Energir regulated observations: {len(regulated)}')
print(f'Energir 1Y observations: {len(one_year)}')
print(f'Energir monthly observations: {len(monthly)}')
if regulated:
    print(f'Latest Energir regulated: {regulated[-1][0]} = {regulated[-1][1]} c/m3')
