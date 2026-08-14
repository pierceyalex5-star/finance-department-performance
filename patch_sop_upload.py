from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('${sopButton(h.sopUrl)}','${sopButton(h.sopUrl,\'deliverable\',h.id)}')
s=s.replace('${sopButton(t.sopUrl)}','${sopButton(t.sopUrl,\'task\',t.id)}')
marker='<script src="./auto-sync.js"></script>'
tag='<script src="./sop-upload.js"></script>\n'
if tag.strip() not in s:
    if marker not in s:
        raise SystemExit('auto-sync marker not found')
    s=s.replace(marker,tag+marker,1)
p.write_text(s,encoding='utf-8')
# trigger: SOP import/open UX
