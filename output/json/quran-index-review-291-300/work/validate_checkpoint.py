import json,sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
r=Path(r'D:\Yandex.Disk\AstroProject');w=r/sys.argv[1];d=json.loads((w/'checkpoint.json').read_text(encoding='utf-8'))
base=json.loads((r/'output/json/quran-ayat-index-clean.json').read_text(encoding='utf-8-sig'))
ru={f"{v['surah']}:{v['ayah']}":v['verse'] for v in json.loads((r/'src/data/quran-kuliev-ru.json').read_text(encoding='utf-8-sig'))['quran']['ru.kuliev'].values()}
defs=json.loads((r/'output/json/quran-index-review-101-110/Указатель аятов - проверенные темы 1-110.json').read_text(encoding='utf-8'))['basis_definitions']
dec={(v['item_id'],v['verse_key']):v for v in d['decisions']};assert len(dec)==len(d['decisions'])
for identity,group in d['notes'].items():
 for key,n in group.items():
  assert n['key_phrase']['text'] in ru[key]
  assert n['basis'] in defs or n['basis'] in ('context','tafsir_interpretation','tafsir_person_association','sahih_hadith_thematic'),n['basis']
  assert n['explanation'] and n['source_ids'][0]=='site-quran'
  assert set(n['source_ids'])<=d['sources'].keys()
  assert set(n.get('context_verse_keys',[]))<=ru.keys()
for (identity,key),row in dec.items():
 assert row['decision'] in ('retain','remove')
 assert (key in d['notes'].get(identity,{}))==(row['decision']=='retain')
 if row['decision']=='remove':assert row['reason']
print('Partial checkpoint verified; original decisions',len(dec))
for topic in d['topics']:
 old=next(t for t in base['topics'] if t['id']==topic['id'])
 missing=[(i['id'],k) for i in old['items'] for k in i['verse_keys'] if (i['id'],k) not in dec]
 print(topic['id'],topic['title'],'remaining',len(missing),'next',missing[:3])
