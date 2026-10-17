import re,sqlite3,sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
book,key,needle=sys.argv[1:4]
p=Path(r'D:\Yandex.Disk\AstroProject\output/research/islamic-sources-2026-10-15/ksu-databases')/(book+'.sqlite')
with sqlite3.connect(p.resolve().as_uri()+'?mode=ro',uri=True) as con:
    raw=con.execute(f'SELECT text FROM {book} WHERE sura=? AND aya=?',tuple(map(int,key.split(':')))).fetchone()[0]
t=re.sub('<[^>]+>',' ',raw)
hits=list(re.finditer(re.escape(needle),t))
print(book,key,'matches',len(hits))
for hit in hits[:3]:print(t[max(0,hit.start()-650):hit.end()+1500])
