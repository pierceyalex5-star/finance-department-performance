from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('Use the <b>SOP</b> button in Deliverable Performance to upload/download the controlled SOP and record its last review date.','Use the <b>SOP</b> button in the task or deliverable list to upload/download the controlled SOP and record its last review date.')
s=s.replace('Use the <b>SOP</b> button in the task table to upload/download the controlled SOP and record its last review date.','Use the <b>SOP</b> button in the task or deliverable list to upload/download the controlled SOP and record its last review date.')
s=s.replace("sopUrl:o.sopUrl.trim(),sopLastReviewed:o.sopLastReviewed||'',active:true","sopUrl:'',sopLastReviewed:'',active:true",1)
s=s.replace("sopUrl:o.sopUrl.trim(),sopLastReviewed:o.sopLastReviewed||'',active:true},oldActivity","sopUrl:h.sopUrl||'',sopLastReviewed:h.sopLastReviewed||'',active:true},oldActivity",1)
p.write_text(s,encoding='utf-8')
print('Deliverable SOP save handler and guidance fixed')
