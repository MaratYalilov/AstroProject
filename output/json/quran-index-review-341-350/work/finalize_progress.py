import datetime,hashlib,json,re,os,uuid
from pathlib import Path

root=Path(r'D:\Yandex.Disk\AstroProject')
out=root/'output/json/quran-index-review-341-350'
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,text):
    temp=p.with_name('.'+p.name+'.'+uuid.uuid4().hex+'.tmp')
    temp.write_text(text,encoding='utf-8');os.replace(temp,p)

manifest=read(out/'delivery-manifest.json')
counts=manifest['counts']
assert manifest['validated'] and counts['cumulative_topics']==350
assert counts['original_links_reviewed']==360
for entry in manifest['files']:
    assert sha(Path(entry['source']))==entry['sha256']
    assert sha(Path(manifest['destination'])/entry['name'])==entry['sha256']
progress_path=root/'output/json/quran-index-review-progress.json'
p=read(progress_path)
assert p['last_completed_topic']==340
assert p['batch_confirmation']['approved_batch']=='341-350'
assert p['automation']['status']=='PAUSED'
previous=read(root/p['cumulative_file'])
assert sha(root/p['cumulative_file'])==p['cumulative_sha256']
entry=next(e for e in manifest['files'] if e['name']=='Указатель аятов - проверенные темы 1-350.json')
cumulative=Path(entry['source']);data=read(cumulative)
assert len(data['topics'])==350 and data['topics'][:340]==previous['topics']
original=read(root/'output/json/quran-ayat-index-clean.json')
assert sha(root/'output/json/quran-ayat-index-clean.json')=='fc5294401fc542f00fba3a2dbb47f3dce0669f46b0b58761729dbeb59ac9a45b'
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
p.update(updated_at=now,status='awaiting_confirmation',last_completed_topic=350,next_topic=351,
    next_topic_id=original['topics'][350]['id'],last_completed_batch='341-350',
    cumulative_file=cumulative.relative_to(root).as_posix(),cumulative_sha256=sha(cumulative),cumulative_links=counts['cumulative_links'])
p['current_batch'].update(status='complete',completed_at=now,reviewed_original_links=counts['original_links_reviewed'],
    remaining_original_links=0,validation='passed',counts=counts,delivery='verified',
    files=[{'path':Path(e['source']).relative_to(root).as_posix(),'sha256':e['sha256']} for e in manifest['files']])
for stale in ('next_item_id','next_verse_key','last_usage_check'):p['current_batch'].pop(stale,None)
p['batch_confirmation'].update(waiting_for_confirmation=True,requested_next_batch='351-360')
p['pending_delivery']=[]
save(progress_path,json.dumps(p,ensure_ascii=False,indent=2)+'\n')
doc=root/'docs/QURAN-index-review-run.md'
text=doc.read_text(encoding='utf-8-sig')
text,count=re.subn(r'(?m)^Завершены темы 1-\d+,.*?(?= Если фактический прогресс)',
    'Завершены темы 1-350, 16404 связи. Партия 341-350 проверена и доставлена. Следующая партия 351-360 ожидает явного подтверждения владельца.',text)
assert count==1;save(doc,text)
result='18 октября 2026 завершены темы 341-350: проверены 360 исходных связей, сохранены 258, исключены 102, добавлены 8. Итог партии - 266 связей, 256 разных аятов. Уточнены правдивость и религиозная истина, праведные качества и райское воздаяние, сроки жизни и народов, запись предопределения. Различены лиан, четыре свидетеля и правовой статус при наказании за прелюбодеяние. Чудо с посохом Мусы отделено от общего сотворения ползающих животных. Сводный JSON 1-350 содержит 16404 связи. Точные цитаты и структура проверены независимым валидатором, четыре файла доставлены с проверкой хешей. Темы 351-360 ожидают подтверждения; автоматизация PAUSED.'
plan=root/'docs/QURAN-search-plan.md';text=plan.read_text(encoding='utf-8-sig')
if result not in text:save(plan,text.rstrip()+'\n\n'+result+'\n')
save(out/'work/resume-notes.md','# Партия 341-350 завершена\n\n'+result+'\n\nПервые 340 тем и полный чистый исходник не изменены. Сборка и PDF не запускались. Следующую партию не начинать до явного подтверждения владельца.\n')
print('Completed 341-350; delivered 4 files; awaiting confirmation for 351-360.')
