import json,sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
r=Path(r'D:\Yandex.Disk\AstroProject')
o=json.loads((r/'output/json/quran-ayat-index-clean.json').read_text(encoding='utf-8-sig'))
ru={f"{v['surah']}:{v['ayah']}":v['verse'] for v in json.loads((r/'src/data/quran-kuliev-ru.json').read_text(encoding='utf-8-sig'))['quran']['ru.kuliev'].values()}
t=o['topics'][int(sys.argv[1])-1]
i=next(i for i in t['items'] if int(i['id'].split('-')[-1])==int(sys.argv[2]))
lo=int(sys.argv[3]) if len(sys.argv)>3 else 0;hi=int(sys.argv[4]) if len(sys.argv)>4 else len(i['verse_keys'])
print(t['title'],i['description'],f'{lo}:{hi}',len(i['verse_keys']))
for n,k in enumerate(i['verse_keys'][lo:hi],lo):print(n,k,ru.get(k,'INVALID KEY'))
