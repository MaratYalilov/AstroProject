import json,sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8');root=Path(r'D:\Yandex.Disk\AstroProject');w=Path(__file__).parent
o=json.loads((root/'output/json/quran-ayat-index-clean.json').read_text(encoding='utf-8-sig'));c=json.loads((w/'checkpoint.json').read_text(encoding='utf-8'));d=json.loads((root/'src/data/quran-kuliev-ru.json').read_text(encoding='utf-8-sig'))['quran']['ru.kuliev'];ru={f"{v['surah']}:{v['ayah']}":v['verse'] for v in d.values()}
for k in next(i for i in o['topics'][90]['items'] if i['id'].endswith('-009'))['verse_keys']:
 s,a=map(int,k.split(':'))
 if not int(sys.argv[1])<=s<=int(sys.argv[2]):continue
 note=c['notes']['topic-0087-item-003'].get(k)
 print(k, 'CURRENT-003: '+note['explanation'] if note else 'RU: '+ru[k])
