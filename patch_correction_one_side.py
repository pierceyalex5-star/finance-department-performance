from pathlib import Path

FILES=[Path('index.html'),Path('journal-analytics.js')]
repls=[
('j.ga=j.gross;', 'j.ga=j.m;'),
('function netCorrectionAmount(rows,includeDivision){const m={};rows.forEach(j=>Object.entries(j.acct||{}).forEach(([acct,v])=>{const k=(includeDivision?j.d+"¦":"")+acct;m[k]=(m[k]||0)+Number(v||0)}));return Object.values(m).reduce((a,v)=>a+Math.abs(v),0)}', 'function netCorrectionAmount(rows,includeDivision){const m={};rows.forEach(j=>Object.entries(j.acct||{}).forEach(([acct,v])=>{const k=(includeDivision?j.d+"¦":"")+acct;m[k]=(m[k]||0)+Number(v||0)}));const vals=Object.values(m);const pos=vals.filter(v=>v>0).reduce((a,v)=>a+v,0),neg=-vals.filter(v=>v<0).reduce((a,v)=>a+v,0);return Math.max(pos,neg)}'),
('const mm=gm.reduce((a,j)=>a+j.m,0),manualGross=gm.reduce((a,j)=>a+j.ga,0),grossErr=gc.reduce((a,j)=>a+j.ga,0),netErr=netCorrectionAmount(gc,true);', 'const mm=gm.reduce((a,j)=>a+j.m,0),grossErr=gc.reduce((a,j)=>a+j.m,0),netErr=netCorrectionAmount(gc,true);'),
('correctionMagnitudeRate:manualGross?grossErr/manualGross:null', 'correctionMagnitudeRate:mm?grossErr/mm:null'),
('const gd=gp.filter(j=>j.d===div),gdm=gm.filter(j=>j.d===div),gdc=gdm.filter(j=>j.q),dmm=gdm.reduce((a,j)=>a+j.m,0),dManualGross=gdm.reduce((a,j)=>a+j.ga,0),dGrossErr=gdc.reduce((a,j)=>a+j.ga,0),dNetErr=netCorrectionAmount(gdc,false);', 'const gd=gp.filter(j=>j.d===div),gdm=gm.filter(j=>j.d===div),gdc=gdm.filter(j=>j.q),dmm=gdm.reduce((a,j)=>a+j.m,0),dGrossErr=gdc.reduce((a,j)=>a+j.m,0),dNetErr=netCorrectionAmount(gdc,false);'),
('correctionMagnitudeRate:dManualGross?dGrossErr/dManualGross:null', 'correctionMagnitudeRate:dmm?dGrossErr/dmm:null'),
('Gross / pure error $</div><div class="kpi-value" id="qGrossValue">—</div><div class="kpi-meta">Σ absolute Balance lines</div>', 'Gross / pure error $</div><div class="kpi-value" id="qGrossValue">—</div><div class="kpi-meta">One debit/credit side per correction JE</div>'),
('Absolute correction lines ÷ absolute manual lines', 'One-side correction $ ÷ one-side manual $'),
('Calculated automatically from the journal CSV. <b>Net correction $</b> nets correction movements by GL account within each division, so errors that offset each other are reflected. <b>Gross / pure error $</b> sums the absolute value of every Balance line in correction journals, so offsets never hide the total error activity.', 'Calculated automatically from the journal CSV. <b>Gross / pure error $</b> counts each correction journal once using the greater of total debits or absolute total credits, preventing debit/credit double-counting. <b>Net correction $</b> first nets correction movements by GL account within each division and then uses only one side of the remaining net movements, so offsetting corrections reduce the net amount without double-counting.'),
('methodologyVersion:2', 'methodologyVersion:3')
]
for p in FILES:
    s=p.read_text(encoding='utf-8')
    changed=0
    for old,new in repls:
        if old in s:
            s=s.replace(old,new)
            changed+=1
    print(p, 'replacements', changed)
    p.write_text(s,encoding='utf-8')
