import json,sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
root=Path(r'D:\Yandex.Disk\AstroProject')
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
topic=read(root/'output/json/quran-ayat-index-clean.json')['topics'][int(sys.argv[1])-1]
ru={f"{v['surah']}:{v['ayah']}":v['verse'] for v in read(root/'src/data/quran-kuliev-ru.json')['quran']['ru.kuliev'].values()}
keys=sorted({k for i in topic['items'] for k in i['verse_keys']},key=lambda k:tuple(map(int,k.split(':'))))
print('Unique verses:',len(keys))
for k in keys:
    if int(sys.argv[2])<=int(k.split(':')[0])<=int(sys.argv[3]):print(k,ru[k])
