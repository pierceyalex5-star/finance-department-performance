from pathlib import Path
p=Path('index.html')
s=p.read_text()
old='<th>Manager</th><th>Assigned tasks</th>'
new='<th>Team member</th><th>Assigned tasks</th>'
if old not in s: raise SystemExit('Manager KPI label not found')
p.write_text(s.replace(old,new,1))
print('Manager KPI label fixed')
