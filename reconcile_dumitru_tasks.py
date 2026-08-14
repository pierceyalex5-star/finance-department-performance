import json,re,unicodedata,uuid
from difflib import SequenceMatcher
from pathlib import Path

p=Path('state.json'); s=json.loads(p.read_text(encoding='utf-8'))

rows=[
('Receiving Info INUT','WD -1','12:00',['Preparation','Approval','Entry','Review']),
('JE HRACIN (couru labor Usine)','WD -2','17:00',['Preparation','Approval','Entry','Review']),
('Fixed Assets INUT','WD -1','17:00',['Preparation','Approval','Entry','Review']),
('Prepaid INUT','WD -1','17:00',['Preparation','Approval','Entry','Review']),
('Purchases file INUT','WD -1','17:00',['Preparation']),
('ROD file INUT','WD2','12:00',['Preparation']),
('Rolling Transit Inventory INUT','WD2','12:00',['Preparation']),
('Rolling FG + WIP Inventory INUT','WD2','17:00',['Preparation']),
('Sales analysis INUT','WD2','15:00',['Preparation']),
('Snapshot INUT','WD2','17:00',['Preparation','Approval','Entry']),
('Preliminary analysis INUT / ADJ','WD3','12:00',['Preparation','Approval','Entry']),
('OS day 1 load','WD3','17:00',['Preparation','Approval']),
('OS day 2 load','WD4','12:00',['Preparation','Approval']),
('Inventory variance analysis INUT','WD4','17:00',['Preparation','Approval']),
('EBIT variance analysis INUT','WD4','17:00',['Preparation','Approval']),
('Bridge Infasco format','WD4','17:00',['Preparation','Approval']),
('Bridge Heico format','WD5','17:00',['Preparation','Approval']),
('Monthly results Presentation','WD5','12:00',['Preparation','Approval']),
('JE SLACIN (couru Labor Bureau)','WD -2','17:00',['Preparation','Approval','Entry','Review']),
('JE PENALIN (ALLOCATIONS FRINGE BENEFITS)','WD -2','17:00',['Preparation','Approval','Entry','Review']),
('JE ALLEN (ALLOCATION ELECTRICITY)','WD1','17:00',['Preparation','Approval','Entry','Review']),
('JE MANIN (ACCRUAL ELECTRICITY)','WD1','17:00',['Preparation','Approval','Entry','Review']),
('JE MONIN (PREPAID and Fixed Assets AMORTISATION, CAD)','WD -1','17:00',['Preparation','Approval','Entry','Review']),
('JE MONINU (PREPAID AMORTISATION, USD)','WD -1','17:00',['Preparation','Approval','Entry','Review']),
('JE PREPIN (PREPAID AMORTISATION, CAD)','WD -1','17:00',['Preparation','Approval','Entry','Review']),
('JE LEASE INUT','WD -1','17:00',['Preparation','Approval','Entry','Review']),
('JE TOOLIN (TOOLING ALLOCATIONS/AMORTISATION)','WD -1','17:00',['Preparation','Approval','Entry','Review']),
('JE DAYSIN (STAT LABOR DAYS)','WD -2','17:00',['Preparation','Approval','Entry','Review']),
('JE STATIN (STAT TONS sales/purchases/production/ending inv.)','WD2','17:00',['Preparation','Approval','Entry','Review']),
('JE INVENTORY RECONCILIATION INUT','WD2','17:00',['Preparation','Approval','Entry','Review']),
('JE GSTIN (TAXES INUT)','WD -15','17:00',['Preparation','Approval','Entry','Review']),
('JE FORX (FOREIGN EXCHANGE INUT)','WD1','17:00',['Preparation','Approval','Entry','Review']),
('JE SALARY BONUS INUT','WD -2','17:00',['Preparation','Approval','Entry','Review']),
('JE OTHER ACCRUALS INUT','WD2','17:00',['Preparation','Approval','Entry','Review']),
('JE OTHER ADJUSTMENTS INUT','WD2','17:00',['Preparation','Approval','Entry','Review']),
('JE TRANSIT INVENTORY INUT (ACCRUAL)','WD2','17:00',['Preparation','Approval','Entry','Review'])]

def norm(x):
 x=unicodedata.normalize('NFKD',x or '').encode('ascii','ignore').decode().upper()
 x=x.replace('ANALISYS','ANALYSIS').replace('AMORTISATION','AMORTIZATION')
 x=re.sub(r'[^A-Z0-9]+',' ',x).strip()
 return x

def canon(x):
 t=norm(x).split(); t=[z for z in t if z not in {'JE','INUT'}]; return ' '.join(t)

def similar(a,b):
 na,nb=canon(a),canon(b)
 if na==nb:return True
 return SequenceMatcher(None,na,nb).ratio()>=0.94

tasks=s.get('taskTemplates',[]); dels=s.get('deliverableTemplates',[])
report={'added':[],'skipped_existing_task':[],'skipped_deliverable':[]}
for name,day,time,stages in rows:
 if any(similar(name,x.get('name','')) for x in tasks): report['skipped_existing_task'].append(name); continue
 hit=next((x.get('name','') for x in dels if similar(name,x.get('name',''))),None)
 if hit: report['skipped_deliverable'].append({'screenshot':name,'deliverable':hit}); continue
 prep='Dumitru R.'
 if name=='JE LEASE INUT': prep='Feida F.'
 if name=='JE GSTIN (TAXES INUT)': prep='Line R.'
 enabled={k:(k in stages) for k in ['Preparation','Approval','Entry','Review']}
 owners={'Preparation':prep,'Approval':'Unassigned','Entry':'Dumitru R.' if 'Entry' in stages else 'Unassigned','Review':'Unassigned'}
 item={'id':'dr_'+uuid.uuid4().hex[:10],'day':day,'name':name,'time':time,'active':True,'person':'Dumitru R.','sopUrl':'','source':'Internal Close','stageOwners':owners,'stageEnabled':enabled,'stageOffsets':{'Preparation':180,'Approval':120,'Entry':60,'Review':0},'closeCritical':day in {'WD -2','WD -1','WD1','WD2'},'workbookOwner':'DR'}
 tasks.append(item); report['added'].append(name)
s['taskTemplates']=tasks; s['version']=int(s.get('version',0))+1
from datetime import datetime,timezone
s['updatedAt']=datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
p.write_text(json.dumps(s,ensure_ascii=False,indent=2),encoding='utf-8')
Path('dumitru_reconcile_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
