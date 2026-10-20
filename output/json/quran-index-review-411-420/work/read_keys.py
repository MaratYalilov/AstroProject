import json,re,sqlite3,sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
root=Path(r'D:\Yandex.Disk\AstroProject')
if sys.argv[1]=='ru':
 d=json.loads((root/'src/data/quran-kuliev-ru.json').read_text(encoding='utf-8-sig'))['quran']['ru.kuliev'];ru={f"{v['surah']}:{v['ayah']}":v['verse'] for v in d.values()}
 for k in sys.argv[2:]: print(k,ru[k])
else:
 table=sys.argv[1];p=root/'output/research/islamic-sources-2026-10-15/ksu-databases'/f'{table}.sqlite'
 with sqlite3.connect(p.resolve().as_uri()+'?mode=ro',uri=True) as con:
  for k in sys.argv[2:]:
   s,a=map(int,k.split(':'));text=con.execute(f'SELECT text FROM {table} WHERE sura=? AND aya=?',(s,a)).fetchone()[0]
   print('\n'+k,re.sub('<[^>]+>',' ',text))
