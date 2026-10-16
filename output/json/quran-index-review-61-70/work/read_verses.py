import json,sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
root=Path(r'D:\Yandex.Disk\AstroProject')
data=json.loads((root/'src/data/quran-kuliev-ru.json').read_text(encoding='utf-8-sig'))['quran']['ru.kuliev']
ru={f"{v['surah']}:{v['ayah']}":v['verse'] for v in data.values()}
t=json.loads((root/'output/json/quran-ayat-index-clean.json').read_text(encoding='utf-8-sig'))['topics'][69]
mode=sys.argv[1]
for i in t['items']:
    if (mode=='small') == (i['id'].endswith('-035')): continue
    print('\n'+i['id']+' '+i['description'])
    for key in i['verse_keys']:
        if mode!='small' and len(sys.argv)>2 and not int(sys.argv[2])<=int(key.split(':')[0])<=int(sys.argv[3]): continue
        print(key,ru[key])
