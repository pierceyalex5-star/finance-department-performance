#!/usr/bin/env python3
import csv, io, json, sys, urllib.request
from datetime import datetime, timezone

OUT = sys.argv[1] if len(sys.argv) > 1 else "trend-data.js"
START = "2021-01-01"

SERIES = {
  "IPMAN": {"name":"U.S. Manufacturing Production","group":"Demand & activity","units":"Index 2017=100","frequency":"Monthly","source":"Federal Reserve G.17","relevance":"Broad manufacturing output"},
  "CUMFNS": {"name":"Manufacturing Capacity Utilization","group":"Demand & activity","units":"Percent","frequency":"Monthly","source":"Federal Reserve G.17","relevance":"Factory utilization / absorption environment"},
  "AMTMNO": {"name":"Total Manufacturing New Orders","group":"Demand & activity","units":"USD millions","frequency":"Monthly","source":"U.S. Census M3","relevance":"Leading industrial demand"},
  "AMXTNO": {"name":"Manufacturing New Orders ex Transportation","group":"Demand & activity","units":"USD millions","frequency":"Monthly","source":"U.S. Census M3","relevance":"Underlying industrial order momentum"},
  "DGORDER": {"name":"Durable Goods New Orders","group":"Demand & activity","units":"USD millions","frequency":"Monthly","source":"U.S. Census M3","relevance":"Capital / durable demand"},
  "AMTMIS": {"name":"Manufacturing Inventory / Shipments Ratio","group":"Inventory cycle","units":"Ratio","frequency":"Monthly","source":"U.S. Census M3","relevance":"Destocking / restocking cycle"},
  "ALTSALES": {"name":"Light Vehicle Sales SAAR","group":"End markets","units":"Million units SAAR","frequency":"Monthly","source":"U.S. BEA","relevance":"Automotive demand"},
  "HTRUCKSSAAR": {"name":"Heavy Truck Sales SAAR","group":"End markets","units":"Million units SAAR","frequency":"Monthly","source":"U.S. BEA","relevance":"Heavy truck demand"},
  "TTLCONS": {"name":"Total Construction Spending","group":"End markets","units":"USD millions SAAR","frequency":"Monthly","source":"U.S. Census","relevance":"Construction demand"},
  "TLNRESCONS": {"name":"Nonresidential Construction Spending","group":"End markets","units":"USD millions SAAR","frequency":"Monthly","source":"U.S. Census","relevance":"Industrial / infrastructure / commercial construction"},
  "IPG3344S": {"name":"Semiconductor & Electronic Component Production","group":"Technology / AI","units":"Index 2017=100","frequency":"Monthly","source":"Federal Reserve G.17","relevance":"AI / electronics infrastructure proxy"},
  "WPU101": {"name":"Iron & Steel Producer Price Index","group":"Materials & cost","units":"Index 1982=100","frequency":"Monthly","source":"U.S. BLS PPI","relevance":"Steel input-cost regime"},
  "DCOILWTICO": {"name":"WTI Crude Oil","group":"Materials & cost","units":"USD/bbl","frequency":"Daily","source":"U.S. EIA via FRED","relevance":"Energy / freight / industrial demand"},
  "DHHNGSP": {"name":"Henry Hub Natural Gas","group":"Materials & cost","units":"USD/MMBtu","frequency":"Daily","source":"U.S. EIA via FRED","relevance":"Energy-intensive manufacturing cost"},
  "DEXCAUS": {"name":"USD/CAD","group":"FX & rates","units":"CAD per USD","frequency":"Daily","source":"Federal Reserve H.10","relevance":"Canadian / U.S. transaction economics"},
  "DEXTAUS": {"name":"USD/TWD","group":"FX & rates","units":"TWD per USD","frequency":"Daily","source":"Federal Reserve H.10","relevance":"Taiwan sourcing economics"},
  "DTWEXBGS": {"name":"Broad U.S. Dollar Index","group":"FX & rates","units":"Index Jan 2006=100","frequency":"Daily","source":"Federal Reserve H.10","relevance":"Global USD regime"},
  "DGS2": {"name":"U.S. Treasury 2Y","group":"FX & rates","units":"Percent","frequency":"Daily","source":"U.S. Treasury / Federal Reserve","relevance":"Policy expectations / financing"},
  "DGS10": {"name":"U.S. Treasury 10Y","group":"FX & rates","units":"Percent","frequency":"Daily","source":"U.S. Treasury / Federal Reserve","relevance":"Long-term financing / macro"},
  "FEDFUNDS": {"name":"Effective Federal Funds Rate","group":"FX & rates","units":"Percent","frequency":"Monthly","source":"Federal Reserve","relevance":"Cost of capital / demand"}
}

def fetch_series(sid, meta):
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}&cosd={START}"
    req = urllib.request.Request(url, headers={"User-Agent":"fastener-intelligence-github-pages/1.0"})
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

result = {"fetchedAt":datetime.now(timezone.utc).isoformat(), "start":START, "provider":"FRED / underlying public agencies", "series":{}}
for sid, meta in SERIES.items():
    try:
        result["series"][sid] = fetch_series(sid, meta)
        print(f"Fetched {sid}: {len(result['series'][sid]['data'])} observations")
    except Exception as e:
        result["series"][sid] = {**meta, "id":sid, "url":f"https://fred.stlouisfed.org/series/{sid}", "data":[], "error":str(e)}
        print(f"WARN {sid}: {e}", file=sys.stderr)

with open(OUT, "w", encoding="utf-8") as f:
    f.write("window.FI_TREND_DATA=")
    json.dump(result, f, separators=(",", ":"))
    f.write(";\n")
print(f"Wrote {OUT}")
