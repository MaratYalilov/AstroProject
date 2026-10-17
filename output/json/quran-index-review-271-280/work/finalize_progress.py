import datetime,hashlib,json,re
from pathlib import Path

root=Path(r'D:\Yandex.Disk\AstroProject')
out=root/'output/json/quran-index-review-271-280'
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
manifest=read(out/'delivery-manifest.json')
assert manifest['validated'] and manifest['counts']['cumulative_topics']==280
for entry in manifest['files']:
    source=Path(entry['source'])
    target=Path(manifest['destination'])/entry['name']
    assert hashlib.sha256(source.read_bytes()).hexdigest()==entry['sha256']
    assert hashlib.sha256(target.read_bytes()).hexdigest()==entry['sha256']
cumulative=out/'Указатель аятов - проверенные темы 1-280.json'
data=read(cumulative)
assert len(data['topics'])==280
assert data['topics'][:270]==read(root/'output/json/quran-index-review-261-270/Указатель аятов - проверенные темы 1-270.json')['topics']
original=read(root/'output/json/quran-ayat-index-clean.json')
progress_path=root/'output/json/quran-index-review-progress.json'
progress=read(progress_path)
assert progress['batch_confirmation']['approved_batch']=='271-280'
assert progress['last_completed_topic']==270
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
progress.update(updated_at=now,status='awaiting_confirmation',last_completed_topic=280,next_topic=281,
    next_topic_id=original['topics'][280]['id'],last_completed_batch='271-280',
    cumulative_file=cumulative.relative_to(root).as_posix(),
    cumulative_sha256=hashlib.sha256(cumulative.read_bytes()).hexdigest(),cumulative_links=12387)
progress['current_batch'].update(status='complete',completed_at=now,reviewed_original_links=587,
    validation='passed',counts=manifest['counts'],delivery='verified',
    files=[{'path':Path(e['source']).relative_to(root).as_posix(),'sha256':e['sha256']} for e in manifest['files']])
progress['batch_confirmation'].update(waiting_for_confirmation=True,requested_next_batch='281-290')
progress['pending_delivery']=[]
assert progress['automation']['status']=='PAUSED'
progress_path.write_text(json.dumps(progress,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
doc=root/'docs/QURAN-index-review-run.md'
text=doc.read_text(encoding='utf-8-sig')
text,count=re.subn(r'(?m)^Завершены темы 1-\d+,.*?(?= Если фактический прогресс)',
    'Завершены темы 1-280, 12387 связей. Партия 271-280 проверена и доставлена. Следующая партия 281-290 ожидает явного подтверждения владельца.',text)
assert count==1
doc.write_text(text,encoding='utf-8')
plan=root/'docs/QURAN-search-plan.md'
text=plan.read_text(encoding='utf-8-sig')
entry='17 октября 2026 завершены темы 271-280: 587 исходных связей проверены, 535 сохранены, 52 исключены, 16 добавлены с учётом переносов. Различены конфликт верующих и наказание за отрицание откровения; исправлены смешение ангельского заступничества с помощью пророкам, случайные ссылки о надежде, повреждённый заголовок о молитве, включение тахаджжуда в пять обязательных молитв и ошибочная группа летучих насекомых. Молитвенные толкования и условия Сунны отмечены отдельно. Сводный JSON 1-280 содержит 12387 связей. Независимый валидатор пройден, четыре файла доставлены в папку указателя с проверкой хешей. Темы 281-290 не начаты, ожидается явное подтверждение владельца; автоматизация остаётся PAUSED.'
if entry not in text:plan.write_text(text.rstrip()+'\n\n'+entry+'\n',encoding='utf-8')
(out/'work/resume-notes.md').write_text('# Состояние партии 271-280\n\nПартия завершена 17 октября 2026 года. Проверены все 587 исходных связей: сохранены 535, исключены 52, добавлены 16; итог партии 551 связь. Сводный JSON 1-280 содержит 12387 связей. Независимая проверка пройдена, четыре файла доставлены во внешнюю папку с проверкой хешей. Первые 270 тем и полный чистый исходник сохранены. PDF и сборка не запускались.\n\nСледующую партию 281-290 не начинать до явного подтверждения владельца. Автоматизация остаётся PAUSED. Прогресс и ожидание подтверждения записаны в output/json/quran-index-review-progress.json и docs/QURAN-index-review-run.md.\n',encoding='utf-8')
print('Completed 271-280; delivered 4 files; awaiting confirmation for 281-290.')
