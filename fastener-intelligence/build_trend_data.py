#!/usr/bin/env python3
import csv, io, json, sys, urllib.request, zipfile
from datetime import datetime, timezone

OUT = sys.argv[1] if len(sys.argv) > 1 else "trend-data.js"
START = "2021-01-01"

SERIES = {
  # Demand / activity
  "IPMAN": {"name":"U.S. Manufacturing Production","group":"Demand & activity","units":"Index 2017=100","frequency":"Monthly","source":"Federal Reserve G.17","relevance":"Broad manufacturing output"},
  "CUMFNS": {"name":"Manufacturing Capacity Utilization","group":"Demand & activity","units":"Percent","frequency":"Monthly","source":"Federal Reserve G.17","relevance":"Factory utilization / absorption environment"},
  "AMTMNO": {"name":"Total Manufacturing New Orders","group":"Demand & activity","units":"USD millions","frequency":"Monthly","source":"U.S. Census M3","relevance":"Leading industrial demand"},
  "AMXTNO": {"name":"Manufacturing New Orders ex Transportation","group":"Demand & activity","units":"USD millions","frequency":"Monthly","source":"U.S. Census M3","relevance":"Underlying industrial order momentum"},
  "DGORDER": {"name":"Durable Goods New Orders","group":"Demand & activity","units":"USD millions","frequency":"Monthly","source":"U.S. Census M3","relevance":"Capital / durable demand"},
  "AMTMIS": {"name":"Manufacturing Inventory / Shipments Ratio","group":"Inventory cycle","units":"Ratio","frequency":"Monthly","source":"U.S. Census M3","relevance":"Destocking / restocking cycle"},
  "UNRATE": {"name":"U.S. Unemployment Rate","group":"Macro & inflation","units":"Percent","frequency":"Monthly","source":"U.S. Bureau of Labor Statistics","relevance":"Macro demand / labour-cycle context"},

  # End markets
  "ALTSALES": {"name":"Light Vehicle Sales SAAR","group":"End markets","units":"Million units SAAR","frequency":"Monthly","source":"U.S. BEA","relevance":"Automotive demand"},
  "HTRUCKSSAAR": {"name":"Heavy Truck Sales SAAR","group":"End markets","units":"Million units SAAR","frequency":"Monthly","source":"U.S. BEA","relevance":"Heavy truck demand"},
  "TTLCONS": {"name":"Total Construction Spending","group":"End markets","units":"USD millions SAAR","frequency":"Monthly","source":"U.S. Census","relevance":"Construction demand"},
  "TLNRESCONS": {"name":"Nonresidential Construction Spending","group":"End markets","units":"USD millions SAAR","frequency":"Monthly","source":"U.S. Census","relevance":"Industrial / infrastructure / commercial construction"},
  "IPG3344S": {"name":"Semiconductor & Electronic Component Production","group":"Technology / AI","units":"Index 2017=100","frequency":"Monthly","source":"Federal Reserve G.17","relevance":"AI / electronics infrastructure proxy"},

  # Inflation / producer pricing
  "CPIAUCSL": {"name":"U.S. CPI – All Urban Consumers","group":"Macro & inflation","units":"Index 1982-84=100","frequency":"Monthly","source":"U.S. Bureau of Labor Statistics","relevance":"Broad inflation / wage and pricing environment"},
  "PPIACO": {"name":"U.S. PPI – All Commodities","group":"Macro & inflation","units":"Index 1982=100","frequency":"Monthly","source":"U.S. Bureau of Labor Statistics","relevance":"Broad producer-cost inflation"},
  "WPU10": {"name":"PPI – Metals & Metal Products","group":"Materials & cost","units":"Index 1982=100","frequency":"Monthly","source":"U.S. Bureau of Labor Statistics","relevance":"Broad metal input inflation"},
  "WPU101": {"name":"PPI – Iron & Steel","group":"Materials & cost","units":"Index 1982=100","frequency":"Monthly","source":"U.S. Bureau of Labor Statistics","relevance":"Steel / wire-rod cost regime"},
  "WPU102": {"name":"PPI – Nonferrous Metals","group":"Materials & cost","units":"Index 1982=100","frequency":"Monthly","source":"U.S. Bureau of Labor Statistics","relevance":"Plating / alloy input-cost regime"},
  "WPU1022": {"name":"PPI – Primary Nonferrous Metals","group":"Materials & cost","units":"Index 1982=100","frequency":"Monthly","source":"U.S. Bureau of Labor Statistics","relevance":"Primary nonferrous material inflation"},

  # Commodity benchmarks
  "PZINCUSDM": {"name":"Global Zinc Price","group":"Commodities","units":"USD per metric ton","frequency":"Monthly","source":"IMF Primary Commodity Prices via FRED","relevance":"Plating / galvanizing input"},
  "PCOPPUSDM": {"name":"Global Copper Price","group":"Commodities","units":"USD per metric ton","frequency":"Monthly","source":"IMF Primary Commodity Prices via FRED","relevance":"Electrical / industrial activity and alloy input"},
  "PALUMUSDM": {"name":"Global Aluminum Price","group":"Commodities","units":"USD per metric ton","frequency":"Monthly","source":"IMF Primary Commodity Prices via FRED","relevance":"Lightweighting / industrial metal signal"},
  "PNICKUSDM": {"name":"Global Nickel Price","group":"Commodities","units":"USD per metric ton","frequency":"Monthly","source":"IMF Primary Commodity Prices via FRED","relevance":"Alloy / stainless steel input"},
  "PLEADUSDM": {"name":"Global Lead Price","group":"Commodities","units":"USD per metric ton","frequency":"Monthly","source":"IMF Primary Commodity Prices via FRED","relevance":"Industrial metals / battery ecosystem"},
  "DCOILWTICO": {"name":"WTI Crude Oil","group":"Energy","units":"USD/bbl","frequency":"Daily","source":"U.S. EIA via FRED","relevance":"Energy / freight / industrial demand"},
  "DHHNGSP": {"name":"Henry Hub Natural Gas","group":"Energy","units":"USD/MMBtu","frequency":"Daily","source":"U.S. EIA via FRED","relevance":"Energy-intensive manufacturing cost"},

  # Freight / logistics
  "TSIFRGHT": {"name":"Freight Transportation Services Index","group":"Freight & logistics","units":"Index 2000=100","frequency":"Monthly","source":"U.S. Bureau of Transportation Statistics","relevance":"Aggregate U.S. freight activity"},
  "TRUCKD11": {"name":"Truck Tonnage Index","group":"Freight & logistics","units":"Index 2015=100","frequency":"Monthly","source":"U.S. Bureau of Transportation Statistics","relevance":"Truck-freight volume / industrial shipment cycle"},
  "WPU3012": {"name":"PPI – Truck Transportation of Freight","group":"Freight & logistics","units":"Index Jun 2009=100","frequency":"Monthly","source":"U.S. Bureau of Labor Statistics","relevance":"Truck freight price pressure"},
  "PCU4831114831115": {"name":"PPI – Deep Sea Freight Services","group":"Freight & logistics","units":"Index Jun 1988=100","frequency":"Monthly","source":"U.S. Bureau of Labor Statistics","relevance":"Ocean freight price pressure"},
  "GASDESW": {"name":"U.S. On-Highway Diesel Price","group":"Freight & logistics","units":"USD/gallon","frequency":"Weekly","source":"U.S. EIA via FRED","relevance":"North American truck freight fuel cost"},

  # FX / rates
  "DEXCAUS": {"name":"USD/CAD","group":"FX & rates","units":"CAD per USD","frequency":"Daily","source":"Federal Reserve H.10","relevance":"Canadian / U.S. transaction economics"},
  "DEXTAUS": {"name":"USD/TWD","group":"FX & rates","units":"TWD per USD","frequency":"Daily","source":"Federal Reserve H.10","relevance":"Taiwan sourcing economics"},
  "DTWEXBGS": {"name":"Broad U.S. Dollar Index","group":"FX & rates","units":"Index Jan 2006=100","frequency":"Daily","source":"Federal Reserve H.10","relevance":"Global USD regime"},
  "DGS2": {"name":"U.S. Treasury 2Y","group":"FX & rates","units":"Percent","frequency":"Daily","source":"U.S. Treasury / Federal Reserve","relevance":"Policy expectations / financing"},
  "DGS10": {"name":"U.S. Treasury 10Y","group":"FX & rates","units":"Percent","frequency":"Daily","source":"U.S. Treasury / Federal Reserve","relevance":"Long-term financing / macro"},
  "FEDFUNDS": {"name":"Effective Federal Funds Rate","group":"FX & rates","units":"Percent","frequency":"Monthly","source":"Federal Reserve","relevance":"Cost of capital / demand"}
}

def fetch_series(sid, meta):
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}&cosd={START}"
    req = urllib.request.Request(url, headers={"User-Agent":"fastener-intelligence-github-pages/2.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        text = r.read().decode("utf-8-sig")
    rows = []
    reader = csv.DictReader(io.StringIO(text))
    value_key = sid if sid in (reader.fieldnames or []) else (reader.fieldnames or ["DATE", sid])[-1]
    date_key = (reader.fieldnames or ["DATE"])[0]
    for row in reader:
        raw = (row.get(value_key) or "").strip()
        if not raw or raw == ".":
            continue
        try: val = float(raw)
        except ValueError: continue
        rows.append([row.get(date_key), val])
    return {**meta, "id":sid, "url":f"https://fred.stlouisfed.org/series/{sid}", "data":rows, "error":None}

def fetch_quebec_natural_gas():
    """Statistics Canada table 25-10-0033-01: Quebec industrial sales unit price."""
    url = "https://www150.statcan.gc.ca/n1/en/tbl/csv/25100033-eng.zip"
    req = urllib.request.Request(url, headers={"User-Agent":"fastener-intelligence-github-pages/2.0"})
    with urllib.request.urlopen(req, timeout=45) as r:
        blob = r.read()
    z = zipfile.ZipFile(io.BytesIO(blob))
    csv_name = next(n for n in z.namelist() if n.lower().endswith('.csv') and 'metadata' not in n.lower())
    text = z.read(csv_name).decode('utf-8-sig', errors='replace')
    reader = csv.DictReader(io.StringIO(text))
    rows=[]
    for row in reader:
        vals=[str(v or '').strip().lower() for v in row.values()]
        joined=' | '.join(vals)
        if 'quebec' not in vals and 'québec' not in vals:
            continue
        if not any('industrial' == v or v.startswith('industrial') for v in vals):
            continue
        if 'sales unit price' not in joined and 'unit price' not in joined:
            continue
        raw=(row.get('VALUE') or '').strip()
        date=(row.get('REF_DATE') or '').strip()
        if not raw or not date:
            continue
        try: value=float(raw)
        except ValueError: continue
        # Monthly REF_DATE commonly arrives as YYYY-MM. Normalize to chart date.
        if len(date)==7: date += '-01'
        elif len(date)==4: date += '-01-01'
        rows.append([date,value])
    # de-duplicate by date, retaining the last matching observation
    dedup={d:v for d,v in rows if d >= START}
    rows=sorted(dedup.items())
    return {
      "name":"Québec Industrial Natural Gas Unit Price",
      "group":"Energy","units":"cents per cubic metre","frequency":"Monthly",
      "source":"Statistics Canada table 25-10-0033-01",
      "relevance":"Plant energy cost in Québec / heat-treatment economics",
      "id":"QC_NATGAS","url":"https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=2510003301",
      "data":[[d,v] for d,v in rows],"error":None
    }

result = {"fetchedAt":datetime.now(timezone.utc).isoformat(), "start":START, "provider":"FRED / underlying public agencies + Statistics Canada", "series":{}}
for sid, meta in SERIES.items():
    try:
        result["series"][sid] = fetch_series(sid, meta)
        print(f"Fetched {sid}: {len(result['series'][sid]['data'])} observations")
    except Exception as e:
        result["series"][sid] = {**meta, "id":sid, "url":f"https://fred.stlouisfed.org/series/{sid}", "data":[], "error":str(e)}
        print(f"WARN {sid}: {e}", file=sys.stderr)

try:
    result['series']['QC_NATGAS']=fetch_quebec_natural_gas()
    print(f"Fetched QC_NATGAS: {len(result['series']['QC_NATGAS']['data'])} observations")
except Exception as e:
    result['series']['QC_NATGAS']={"name":"Québec Industrial Natural Gas Unit Price","group":"Energy","units":"cents per cubic metre","frequency":"Monthly","source":"Statistics Canada table 25-10-0033-01","relevance":"Plant energy cost in Québec / heat-treatment economics","id":"QC_NATGAS","url":"https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=2510003301","data":[],"error":str(e)}
    print(f"WARN QC_NATGAS: {e}", file=sys.stderr)

# Tungsten: retain as an explicit source record even when a machine-readable current series is unavailable.
# USGS notes that monthly Mineral Industry Survey publication is temporarily paused after Dec-2025.
result['series']['TUNGSTEN_USGS']={
  "name":"Tungsten – USGS Monthly Survey Reference","group":"Commodities","units":"Source reference","frequency":"Monthly / publication paused",
  "source":"U.S. Geological Survey – Tungsten Statistics and Information","relevance":"Tooling / specialty-material cost and supply risk",
  "id":"TUNGSTEN_USGS","url":"https://www.usgs.gov/centers/national-minerals-information-center/tungsten-statistics-and-information",
  "data":[],"error":"USGS public monthly Mineral Industry Survey posting is temporarily paused after Dec-2025; no current numeric series is fabricated."
}

with open(OUT, "w", encoding="utf-8") as f:
    f.write("window.FI_TREND_DATA=")
    json.dump(result, f, separators=(",", ":"))
    f.write(";\n")
print(f"Wrote {OUT}")
