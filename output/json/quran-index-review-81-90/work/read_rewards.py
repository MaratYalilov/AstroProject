import json,sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8');root=Path(r'D:\Yandex.Disk\AstroProject')
o=json.loads((root/'output/json/quran-ayat-index-clean.json').read_text(encoding='utf-8-sig'))
p=json.loads((root/'output/json/quran-index-review-71-80/Указатель аятов - проверенные темы 1-80.json').read_text(encoding='utf-8'))
r=json.loads((root/'src/data/quran-kuliev-ru.json').read_text(encoding='utf-8-sig'))['quran']['ru.kuliev'];ru={f"{v['surah']}:{v['ayah']}":v['verse'] for v in r.values()}
source=next(i for t in p['topics'] for i in t['items'] if i['id']=='topic-0066-item-035')['verse_notes']
for k in next(i for i in o['topics'][83]['items'] if i['id'].endswith('-004'))['verse_keys']:
 if not int(sys.argv[1])<=int(k.split(':')[0])<=int(sys.argv[2]):continue
 if k in source:print(k,'PRIOR-035:',source[k]['explanation'])
 else:print(k,'RU:',ru[k])
