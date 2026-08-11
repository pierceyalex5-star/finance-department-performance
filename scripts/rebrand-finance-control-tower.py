from pathlib import Path
import json

index = Path('index.html')
text = index.read_text(encoding='utf-8')
replacements = {
    '<title>Finance Department Performance</title>': '<title>Finance Control Tower</title>',
    '<div class="brand">Finance Performance</div>': '<div class="brand">Finance Control Tower</div>',
}
for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f'Missing expected branding text: {old}')
    text = text.replace(old, new)
index.write_text(text, encoding='utf-8')

manifest_path = Path('manifest.json')
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
manifest['name'] = 'Finance Control Tower'
manifest['short_name'] = 'Finance Tower'
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

print('Rebranded dashboard to Finance Control Tower')
