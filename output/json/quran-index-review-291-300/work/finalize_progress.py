import datetime,hashlib,json,re
from pathlib import Path

root=Path(r'D:\Yandex.Disk\AstroProject')
out=root/'output/json/quran-index-review-291-300'
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
manifest=read(out/'delivery-manifest.json')
assert manifest['validated'] and manifest['counts']['cumulative_topics']==300
for entry in manifest['files']:
    source=Path(entry['source'])
    target=Path(manifest['destination'])/entry['name']
    assert hashlib.sha256(source.read_bytes()).hexdigest()==entry['sha256']
    assert hashlib.sha256(target.read_bytes()).hexdigest()==entry['sha256']
cumulative=out/'Указатель аятов - проверенные темы 1-300.json'
data=read(cumulative)
assert len(data['topics'])==300
assert data['topics'][:290]==read(root/'output/json/quran-index-review-281-290/Указатель аятов - проверенные темы 1-290.json')['topics']
original=read(root/'output/json/quran-ayat-index-clean.json')
progress_path=root/'output/json/quran-index-review-progress.json'
progress=read(progress_path)
assert progress['batch_confirmation']['approved_batch']=='291-300'
assert progress['last_completed_topic']==290
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
progress.update(updated_at=now,status='awaiting_confirmation',last_completed_topic=300,next_topic=301,
    next_topic_id=original['topics'][300]['id'],last_completed_batch='291-300',
    cumulative_file=cumulative.relative_to(root).as_posix(),
    cumulative_sha256=hashlib.sha256(cumulative.read_bytes()).hexdigest(),cumulative_links=14908)
progress['current_batch'].update(status='complete',completed_at=now,reviewed_original_links=2394,
    validation='passed',counts=manifest['counts'],delivery='verified',
    files=[{'path':Path(e['source']).relative_to(root).as_posix(),'sha256':e['sha256']} for e in manifest['files']])
progress['batch_confirmation'].update(waiting_for_confirmation=True,requested_next_batch='301-310')
progress['pending_delivery']=[]
for stale in ('next_item_id','next_verse_key','last_usage_check'):
    progress['current_batch'].pop(stale,None)
assert progress['automation']['status']=='PAUSED'
progress_path.write_text(json.dumps(progress,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
doc=root/'docs/QURAN-index-review-run.md'
text=doc.read_text(encoding='utf-8-sig')
text,count=re.subn(r'(?m)^Завершены темы 1-\d+,.*?(?= Если фактический прогресс)',
    'Завершены темы 1-300, 14908 связей. Партия 291-300 проверена и доставлена. Следующая партия 301-310 ожидает явного подтверждения владельца.',text)
assert count==1
doc.write_text(text,encoding='utf-8')
plan=root/'docs/QURAN-search-plan.md'
text=plan.read_text(encoding='utf-8-sig')
entry='17 октября 2026 завершены темы 291-300: проверены 2394 исходные связи, сохранены 2176, исключены 218, добавлены 6. Итог партии - 2182 связи. Уточнены границы тем о неверии, невежестве, целомудрии, ночном чтении и обетах; общие предостережения не приравнены к объявлению человека неверующим. Сводный JSON 1-300 содержит 14908 связей. Независимый валидатор пройден, четыре файла доставлены в папку указателя с проверкой хешей. Темы 301-310 ожидают явного подтверждения владельца; автоматизация остаётся PAUSED.'
if entry not in text:plan.write_text(text.rstrip()+'\n\n'+entry+'\n',encoding='utf-8')
(out/'work/resume-notes.md').write_text('# Состояние партии 291-300\n\nПартия завершена 17 октября 2026 года. Проверены все 2394 исходные связи: сохранены 2176, исключены 218, добавлены 6; итог партии 2182 связи. Сводный JSON 1-300 содержит 14908 связей. Независимая проверка пройдена, четыре файла доставлены во внешнюю папку с проверкой хешей. Первые 290 тем и полный чистый исходник сохранены. PDF и сборка не запускались.\n\nПо отдельному поручению владельца исправлена опечатка в локальном Кулиеве 35:25: удалено лишнее «не». В исходном JSON сохранена заметка _corrections; версия источника и предыдущая контрольная сумма отражены в материалах проверки.\n\nСледующую партию 301-310 не начинать до явного подтверждения владельца. Автоматизация остаётся PAUSED. Прогресс и ожидание подтверждения записаны в output/json/quran-index-review-progress.json и docs/QURAN-index-review-run.md.\n',encoding='utf-8')
print('Completed 291-300; delivered 4 files; awaiting confirmation for 301-310.')
