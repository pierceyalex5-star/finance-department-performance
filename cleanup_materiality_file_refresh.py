from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')

cock='''    <div class="card" style="margin-bottom:14px"><div class="section" style="margin-top:0"><h2>Materiality</h2></div><div class="form-grid"><div class="field"><label>General materiality ($)</label><input id="cockpitMateriality" type="number" min="0" step="1000"></div><div class="field"><label>Intercompany</label><select id="cockpitIntercompany"><option value="true">Always material</option><option value="false">Use general threshold</option></select></div><div class="field full"><button class="btn" type="button" id="saveMaterialityBtn">Save materiality</button><div class="small" style="margin-top:6px">Used as the default management threshold. Intercompany items can be treated as material regardless of amount.</div></div></div></div>\n'''
if s.count(cock)>1:
    first=s.find(cock)
    second=s.find(cock,first+len(cock))
    s=s[:second]+s[second+len(cock):]

settings='''<div class="field"><label>Materiality threshold ($)</label><input id="materialityAmount" type="number" min="0" step="1000"></div><div class="field"><label>Intercompany exception</label><select id="intercompanyAlwaysMaterial"><option value="true">Always material</option><option value="false">Use threshold</option></select></div>'''
if s.count(settings)>1:
    first=s.find(settings)
    second=s.find(settings,first+len(settings))
    s=s[:second]+s[second+len(settings):]

old="setInterval(()=>{const p=activePageId();if(p==='cockpit'||p==='workflow'||p==='headOffice')renderPage(p);updateAlertBanner();checkAlerts(false)},60000);"
new="setInterval(()=>{const p=activePageId();if(p==='cockpit'||p==='workflow'||p==='headOffice'||p==='riskOpp')renderPage(p);void refreshFileStatus(false);updateAlertBanner();checkAlerts(false)},60000);"
if old in s:s=s.replace(old,new,1)
else:print('Interval anchor already changed or missing')

p.write_text(s,encoding='utf-8')
print('cockpit materiality cards',s.count(cock),'settings materiality pairs',s.count(settings))
