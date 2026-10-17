import datetime
import hashlib
import json
from pathlib import Path

root=Path(r'D:\Yandex.Disk\AstroProject')
out=root/'output/json/quran-index-review-261-270'
read=lambda path:json.loads(path.read_text(encoding='utf-8-sig'))
manifest=read(out/'delivery-manifest.json')
assert manifest['validated'] and manifest['counts']['cumulative_topics']==270
for entry in manifest['files']:
    source=Path(entry['source'])
    target=Path(manifest['destination'])/entry['name']
    assert hashlib.sha256(source.read_bytes()).hexdigest()==entry['sha256']
    assert hashlib.sha256(target.read_bytes()).hexdigest()==entry['sha256']
cumulative=out/'Указатель аятов - проверенные темы 1-270.json'
data=read(cumulative)
assert len(data['topics'])==270
assert data['topics'][:260]==read(root/'output/json/quran-index-review-251-260/Указатель аятов - проверенные темы 1-260.json')['topics']
original=read(root/'output/json/quran-ayat-index-clean.json')
progress_path=root/'output/json/quran-index-review-progress.json'
progress=read(progress_path)
assert progress['batch_confirmation']['approved_batch']=='261-270'
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
progress.update(updated_at=now,status='awaiting_confirmation',last_completed_topic=270,next_topic=271,
    next_topic_id=original['topics'][270]['id'],last_completed_batch='261-270',
    cumulative_file=cumulative.relative_to(root).as_posix(),
    cumulative_sha256=hashlib.sha256(cumulative.read_bytes()).hexdigest(),
    cumulative_links=manifest['counts']['cumulative_links'])
progress['current_batch'].update(status='complete',completed_at=now,reviewed_original_links=871,
    validation='passed',counts=manifest['counts'],delivery='verified',
    files=[{'path':Path(e['source']).relative_to(root).as_posix(),'sha256':e['sha256']} for e in manifest['files']])
progress['batch_confirmation'].update(waiting_for_confirmation=True,requested_next_batch='271-280')
progress['pending_delivery']=[]
assert progress['automation']['status']=='PAUSED'
progress_path.write_text(json.dumps(progress,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
plan=root/'docs/QURAN-search-plan.md'
text=plan.read_text(encoding='utf-8-sig')
entry='17 октября 2026 завершены темы 261-270: 871 исходная связь проверена, 772 сохранены, 99 исключены, 19 добавлены с учётом переносов. Уточнены различия лицемерия и слабой веры, договорные обязательства, отношения с христианами и основания связи с вынесением фетв. Сводный JSON 1-270 содержит 11836 связей. Независимый валидатор пройден, четыре файла доставлены в папку указателя с проверкой хешей. По новому указанию владельца после каждой партии необходимо его явное подтверждение. Темы 271-280 не начаты, ожидается подтверждение; автоматизация остаётся PAUSED.'
if entry not in text:
    plan.write_text(text.rstrip()+'\n\n'+entry+'\n',encoding='utf-8')
(out/'work/resume-notes.md').write_text('# Состояние партии 261-270\n\nПартия завершена 17 октября 2026 года. Проверены все 871 исходная связь: сохранены 772, исключены 99, добавлены 19; итог партии 791 связь. Сводный JSON 1-270 содержит 11836 связей. Независимая проверка пройдена, все четыре файла доставлены во внешнюю папку с проверкой хешей.\n\nСледующую партию 271-280 не начинать до явного подтверждения владельца. Автоматизация остаётся PAUSED. Место продолжения и ожидание подтверждения сохранены в output/json/quran-index-review-progress.json и docs/QURAN-index-review-run.md.\n',encoding='utf-8')
print('Completed 261-270; delivered 4 files; awaiting confirmation for 271-280.')
