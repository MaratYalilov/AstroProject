import json,sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8');root=Path(r'D:\Yandex.Disk\AstroProject')
original=json.loads((root/'output/json/quran-ayat-index-clean.json').read_text(encoding='utf-8-sig'))
d=json.loads((root/'src/data/quran-kuliev-ru.json').read_text(encoding='utf-8-sig'))['quran']['ru.kuliev'];ru={f"{v['surah']}:{v['ayah']}":v['verse'] for v in d.values()}
for n in range(int(sys.argv[1]),int(sys.argv[2])+1):
 t=original['topics'][n-1];print('\n',n,t['title'])
 for i in t['items']:
  if len(sys.argv)>3 and i['id'].split('-')[-1] not in sys.argv[3:]:continue
  print(i['id'],i['description'])
  for k in i['verse_keys']:print(k,ru[k])
