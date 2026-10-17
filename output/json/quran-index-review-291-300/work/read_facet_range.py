import json,sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8');r=Path.cwd()
j=lambda p:json.loads((r/p).read_text(encoding='utf-8-sig'))
t=j('output/json/quran-ayat-index-clean.json')['topics'][int(sys.argv[1])-1]
i=next(i for i in t['items'] if i['id'].endswith('-'+sys.argv[2].zfill(3)))
ru={f"{v['surah']}:{v['ayah']}":v['verse'] for v in j('src/data/quran-kuliev-ru.json')['quran']['ru.kuliev'].values()}
print(i['id'],i['description'],len(i['verse_keys']))
for k in i['verse_keys']:
 if int(sys.argv[3])<=int(k.split(':')[0])<=int(sys.argv[4]):print(k,ru[k])
