import datetime,hashlib,json,re,os,uuid
from pathlib import Path

root=Path(r'D:\Yandex.Disk\AstroProject')
out=root/'output/json/quran-index-review-301-310'
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,text):
    temp=p.with_name('.'+p.name+'.'+uuid.uuid4().hex+'.tmp')
    temp.write_text(text,encoding='utf-8')
    os.replace(temp,p)
manifest=read(out/'delivery-manifest.json')
assert manifest['validated'] and manifest['counts']['cumulative_topics']==310
for entry in manifest['files']:
    assert sha(Path(entry['source']))==entry['sha256']
    assert sha(Path(manifest['destination'])/entry['name'])==entry['sha256']
progress_path=root/'output/json/quran-index-review-progress.json'
p=read(progress_path)
assert p['last_completed_topic']==300
assert p['batch_confirmation']['approved_batch']=='301-310'
assert p['automation']['status']=='PAUSED'
previous=read(root/p['cumulative_file'])
assert sha(root/p['cumulative_file'])==p['cumulative_sha256']
entry=next(e for e in manifest['files'] if e['name']=='Указатель аятов - проверенные темы 1-310.json')
cumulative=Path(entry['source'])
data=read(cumulative)
assert len(data['topics'])==310 and data['topics'][:300]==previous['topics']
original=read(root/'output/json/quran-ayat-index-clean.json')
assert sha(root/'output/json/quran-ayat-index-clean.json')=='fc5294401fc542f00fba3a2dbb47f3dce0669f46b0b58761729dbeb59ac9a45b'
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
p.update(updated_at=now,status='awaiting_confirmation',last_completed_topic=310,next_topic=311,
    next_topic_id=original['topics'][310]['id'],last_completed_batch='301-310',
    cumulative_file=cumulative.relative_to(root).as_posix(),cumulative_sha256=sha(cumulative),
    cumulative_links=manifest['counts']['cumulative_links'])
p['current_batch'].update(status='complete',completed_at=now,reviewed_original_links=163,
    remaining_original_links=0,validation='passed',counts=manifest['counts'],delivery='verified',
    files=[{'path':Path(e['source']).relative_to(root).as_posix(),'sha256':e['sha256']} for e in manifest['files']])
for stale in ('next_item_id','next_verse_key','last_usage_check'):p['current_batch'].pop(stale,None)
p['batch_confirmation'].update(waiting_for_confirmation=True,requested_next_batch='311-320')
p['pending_delivery']=[]
save(progress_path,json.dumps(p,ensure_ascii=False,indent=2)+'\n')
doc=root/'docs/QURAN-index-review-run.md'
text=doc.read_text(encoding='utf-8-sig')
text,count=re.subn(r'(?m)^Завершены темы 1-\d+,.*?(?= Если фактический прогресс)',
    'Завершены темы 1-310, 15036 связей. Партия 301-310 проверена и доставлена. Следующая партия 311-320 ожидает явного подтверждения владельца.',text)
assert count==1
save(doc,text)
plan=root/'docs/QURAN-search-plan.md'
text=plan.read_text(encoding='utf-8-sig')
entry='17 октября 2026 завершены темы 301-310: проверены 163 исходные связи, сохранены 124, исключены 39, добавлены 4. Итог партии - 128 связей. Уточнены темы несравнимости Аллаха и заступничества; отделены облака от иных клятв, блага самудян от истории других народов, водное омовение от таяммума. Связь30:41 с окружающей средой не сведена к техническому загрязнению. Сводный JSON 1-310 содержит 15036 связей. Независимая проверка пройдена, четыре файла доставлены с проверкой хешей. Темы 311-320 ожидают подтверждения; автоматизация PAUSED.'
if entry not in text:save(plan,text.rstrip()+'\n\n'+entry+'\n')
save(out/'work/resume-notes.md','# Партия 301-310 завершена\n\nПроверены 163 исходные связи: сохранены 124, исключены 39, добавлены 4; итог128. Сводный JSON 1-310 содержит 15036 связей. Цитаты и источники проверены, независимый валидатор пройден, четыре файла доставлены во внешнюю папку с проверкой хешей. Предыдущие300 тем и чистый исходник не изменены. Сборка и PDF не запускались.\n\nЖдать явного подтверждения владельца перед311-320. Автоматизация PAUSED.\n')
print('Completed 301-310; delivered 4 files; awaiting confirmation for 311-320.')
