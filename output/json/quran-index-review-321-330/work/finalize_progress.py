import datetime,hashlib,json,re,os,uuid
from pathlib import Path

root=Path(r'D:\Yandex.Disk\AstroProject')
out=root/'output/json/quran-index-review-321-330'
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,text):
    temp=p.with_name('.'+p.name+'.'+uuid.uuid4().hex+'.tmp')
    temp.write_text(text,encoding='utf-8')
    os.replace(temp,p)
manifest=read(out/'delivery-manifest.json')
assert manifest['validated'] and manifest['counts']['cumulative_topics']==330
for entry in manifest['files']:
    assert sha(Path(entry['source']))==entry['sha256']
    assert sha(Path(manifest['destination'])/entry['name'])==entry['sha256']
progress_path=root/'output/json/quran-index-review-progress.json'
p=read(progress_path)
assert p['last_completed_topic']==320
assert p['batch_confirmation']['approved_batch']=='321-330'
assert p['automation']['status']=='PAUSED'
previous=read(root/p['cumulative_file'])
assert sha(root/p['cumulative_file'])==p['cumulative_sha256']
entry=next(e for e in manifest['files'] if e['name']=='Указатель аятов - проверенные темы 1-330.json')
cumulative=Path(entry['source'])
data=read(cumulative)
assert len(data['topics'])==330 and data['topics'][:320]==previous['topics']
original=read(root/'output/json/quran-ayat-index-clean.json')
assert sha(root/'output/json/quran-ayat-index-clean.json')=='fc5294401fc542f00fba3a2dbb47f3dce0669f46b0b58761729dbeb59ac9a45b'
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
p.update(updated_at=now,status='awaiting_confirmation',last_completed_topic=330,next_topic=331,
    next_topic_id=original['topics'][330]['id'],last_completed_batch='321-330',
    cumulative_file=cumulative.relative_to(root).as_posix(),cumulative_sha256=sha(cumulative),
    cumulative_links=manifest['counts']['cumulative_links'])
p['current_batch'].update(status='complete',completed_at=now,reviewed_original_links=663,
    remaining_original_links=0,validation='passed',counts=manifest['counts'],delivery='verified',
    files=[{'path':Path(e['source']).relative_to(root).as_posix(),'sha256':e['sha256']} for e in manifest['files']])
for stale in ('next_item_id','next_verse_key','last_usage_check'):p['current_batch'].pop(stale,None)
p['batch_confirmation'].update(waiting_for_confirmation=True,requested_next_batch='331-340')
p['pending_delivery']=[]
save(progress_path,json.dumps(p,ensure_ascii=False,indent=2)+'\n')
doc=root/'docs/QURAN-index-review-run.md'
text=doc.read_text(encoding='utf-8-sig')
text,count=re.subn(r'(?m)^Завершены темы 1-\d+,.*?(?= Если фактический прогресс)',
    'Завершены темы 1-330, 15759 связей. Партия 321-330 проверена и доставлена. Следующая партия 331-340 ожидает явного подтверждения владельца.',text)
assert count==1
save(doc,text)
plan=root/'docs/QURAN-search-plan.md'
text=plan.read_text(encoding='utf-8-sig')
entry='18 октября 2026 завершены темы 321-330: проверены 663 исходные связи, сохранены 593, исключены 70, добавлены 2. Итог партии - 595 связей. Исправлены перевёрнутый смысл заголовка о предположениях и ссылка на запрет плодов, удалён несуществующий49:19. Уточнены различия Писаний, отнесения племён, условия обращения с пленными и различие Божьей воли с нравственным одобрением. Сводный JSON 1-330 содержит 15759 связей. Независимый валидатор пройден, четыре файла доставлены с проверкой хешей. Темы 331-340 ожидают подтверждения; автоматизация PAUSED.'
if entry not in text:save(plan,text.rstrip()+'\n\n'+entry+'\n')
save(out/'work/resume-notes.md','# Партия 321-330 завершена\n\nПроверены 663 исходные связи: сохранены 593, исключены 70, добавлены 2; итог595. Сводный JSON 1-330 содержит 15759 связей. Точные цитаты и структура проверены, независимый валидатор пройден. Четыре файла доставлены во внешнюю папку с проверкой хешей. Предыдущие320 тем и чистый исходник не изменены. Сборка сайта и PDF не запускались.\n\nСледующую партию 331-340 не начинать до явного подтверждения владельца. Автоматизация PAUSED.\n')
print('Completed 321-330; delivered 4 files; awaiting confirmation for 331-340.')
