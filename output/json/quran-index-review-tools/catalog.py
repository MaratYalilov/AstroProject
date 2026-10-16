import json,sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
r=Path(r'D:\Yandex.Disk\AstroProject');d=json.loads((r/'output/json/quran-ayat-index-clean.json').read_text(encoding='utf-8-sig'))
for n in map(int,sys.argv[1:]):
 t=d['topics'][n-1];print(n,t['id'],t['title'],'see_also',t.get('see_also'))
 for i in t['items']:print(i['id'],i['description'],len(i['verse_keys']),' '.join(i['verse_keys']))
