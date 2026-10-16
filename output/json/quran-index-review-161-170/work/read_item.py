import json,sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8');root=Path(r'D:\Yandex.Disk\AstroProject')
o=json.loads((root/'output/json/quran-ayat-index-clean.json').read_text(encoding='utf-8-sig'));d=json.loads((root/'src/data/quran-kuliev-ru.json').read_text(encoding='utf-8-sig'))['quran']['ru.kuliev'];ru={f"{v['surah']}:{v['ayah']}":v['verse'] for v in d.values()}
position,item,first,last=map(int,sys.argv[1:5]);r=next(i for i in o['topics'][position-1]['items'] if int(i['id'].split('-')[-1])==item)
for k in r['verse_keys']:
 s,a=map(int,k.split(':'));value=a if len(sys.argv)>5 and s==int(sys.argv[5]) else s if len(sys.argv)==5 else -1
 if first<=value<=last:print(k,ru[k])
