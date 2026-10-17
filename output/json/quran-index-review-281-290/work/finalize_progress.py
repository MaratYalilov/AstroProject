import datetime,hashlib,json,re
from pathlib import Path

root=Path(r'D:\Yandex.Disk\AstroProject')
out=root/'output/json/quran-index-review-281-290'
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
manifest=read(out/'delivery-manifest.json')
assert manifest['validated'] and manifest['counts']['cumulative_topics']==290
for entry in manifest['files']:
    source=Path(entry['source'])
    target=Path(manifest['destination'])/entry['name']
    assert hashlib.sha256(source.read_bytes()).hexdigest()==entry['sha256']
    assert hashlib.sha256(target.read_bytes()).hexdigest()==entry['sha256']
cumulative=out/'Указатель аятов - проверенные темы 1-290.json'
data=read(cumulative)
assert len(data['topics'])==290
assert data['topics'][:280]==read(root/'output/json/quran-index-review-271-280/Указатель аятов - проверенные темы 1-280.json')['topics']
original=read(root/'output/json/quran-ayat-index-clean.json')
progress_path=root/'output/json/quran-index-review-progress.json'
progress=read(progress_path)
assert progress['batch_confirmation']['approved_batch']=='281-290'
assert progress['last_completed_topic']==280
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
progress.update(updated_at=now,status='awaiting_confirmation',last_completed_topic=290,next_topic=291,
    next_topic_id=original['topics'][290]['id'],last_completed_batch='281-290',
    cumulative_file=cumulative.relative_to(root).as_posix(),
    cumulative_sha256=hashlib.sha256(cumulative.read_bytes()).hexdigest(),cumulative_links=12726)
progress['current_batch'].update(status='complete',completed_at=now,reviewed_original_links=355,
    validation='passed',counts=manifest['counts'],delivery='verified',
    files=[{'path':Path(e['source']).relative_to(root).as_posix(),'sha256':e['sha256']} for e in manifest['files']])
progress['batch_confirmation'].update(waiting_for_confirmation=True,requested_next_batch='291-300')
progress['pending_delivery']=[]
assert progress['automation']['status']=='PAUSED'
progress_path.write_text(json.dumps(progress,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
doc=root/'docs/QURAN-index-review-run.md'
text=doc.read_text(encoding='utf-8-sig')
text,count=re.subn(r'(?m)^Завершены темы 1-\d+,.*?(?= Если фактический прогресс)',
    'Завершены темы 1-290, 12726 связей. Партия 281-290 проверена и доставлена. Следующая партия 291-300 ожидает явного подтверждения владельца.',text)
assert count==1
doc.write_text(text,encoding='utf-8')
plan=root/'docs/QURAN-search-plan.md'
text=plan.read_text(encoding='utf-8-sig')
entry='17 октября 2026 завершены темы 281-290: проверены 355 исходных связей, сохранены 335, исключены 20, добавлены 4. Итог партии - 339 связей. Уточнены условия наследования и различия реакции людей Писания, удалены случайные ссылки; исправлены заголовки о знании, небесах и сокровенном. Толкования и контекст отмечены отдельно. Сводный JSON 1-290 содержит 12726 связей. Независимый валидатор пройден, четыре файла доставлены в папку указателя с проверкой хешей. Темы 291-300 не начаты, ожидается явное подтверждение владельца; автоматизация остаётся PAUSED.'
if entry not in text:plan.write_text(text.rstrip()+'\n\n'+entry+'\n',encoding='utf-8')
(out/'work/resume-notes.md').write_text('# Состояние партии 281-290\n\nПартия завершена 17 октября 2026 года. Проверены все 355 исходных связей: сохранены 335, исключены 20, добавлены 4; итог партии 339 связей. Сводный JSON 1-290 содержит 12726 связей. Независимая проверка пройдена, четыре файла доставлены во внешнюю папку с проверкой хешей. Первые 280 тем и полный чистый исходник сохранены. PDF и сборка не запускались.\n\nСледующую партию 291-300 не начинать до явного подтверждения владельца. Автоматизация остаётся PAUSED. Прогресс и ожидание подтверждения записаны в output/json/quran-index-review-progress.json и docs/QURAN-index-review-run.md.\n',encoding='utf-8')
print('Completed 281-290; delivered 4 files; awaiting confirmation for 291-300.')
