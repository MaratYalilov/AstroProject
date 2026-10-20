import datetime,hashlib,json,re,os,uuid
from pathlib import Path
root=Path(r'D:\Yandex.Disk\AstroProject');out=root/'output/json/quran-index-review-401-410'
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,text):
 temp=p.with_name('.'+p.name+'.'+uuid.uuid4().hex+'.tmp');temp.write_text(text,encoding='utf-8');os.replace(temp,p)
manifest=read(out/'delivery-manifest.json');counts=manifest['counts']
assert manifest['validated'] and counts['cumulative_topics']==410 and counts['original_links_reviewed']==178
for entry in manifest['files']:
 assert sha(Path(entry['source']))==entry['sha256']
 assert sha(Path(manifest['destination'])/entry['name'])==entry['sha256']
pth=root/'output/json/quran-index-review-progress.json';p=read(pth)
assert p['last_completed_topic']==400 and p['batch_confirmation']['approved_batch']=='401-410'
assert p['automation']['status']=='PAUSED'
previous=read(root/p['cumulative_file']);assert sha(root/p['cumulative_file'])==p['cumulative_sha256']
entry=next(e for e in manifest['files'] if e['name']=='Указатель аятов - проверенные темы 1-410.json')
cumulative=Path(entry['source']);data=read(cumulative)
assert len(data['topics'])==410 and data['topics'][:400]==previous['topics']
original=read(root/'output/json/quran-ayat-index-clean.json')
assert sha(root/'output/json/quran-ayat-index-clean.json')=='fc5294401fc542f00fba3a2dbb47f3dce0669f46b0b58761729dbeb59ac9a45b'
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
p.update(updated_at=now,status='awaiting_confirmation',last_completed_topic=410,next_topic=411,next_topic_id=original['topics'][410]['id'],last_completed_batch='401-410',cumulative_file=cumulative.relative_to(root).as_posix(),cumulative_sha256=sha(cumulative),cumulative_links=counts['cumulative_links'])
p['current_batch'].update(status='complete',completed_at=now,reviewed_original_links=counts['original_links_reviewed'],remaining_original_links=0,validation='passed',counts=counts,delivery='verified',files=[{'path':Path(e['source']).relative_to(root).as_posix(),'sha256':e['sha256']} for e in manifest['files']])
for k in ['next_item_id','next_verse_key','last_usage_check']:p['current_batch'].pop(k,None)
p['batch_confirmation'].update(waiting_for_confirmation=True,requested_next_batch='411-420');p['pending_delivery']=[]
save(pth,json.dumps(p,ensure_ascii=False,indent=2)+'\n')
doc=root/'docs/QURAN-index-review-run.md';text=doc.read_text(encoding='utf-8-sig')
text,count=re.subn(r'(?m)^Завершены темы 1-\d+,.*?(?= Если фактический прогресс)',f"Завершены темы 1-410, {counts['cumulative_links']} связей. Партия 401-410 проверена и доставлена. Следующая партия 411-420 ожидает явного подтверждения владельца.",text)
assert count==1;save(doc,text)
result=f"20 октября 2026 завершены темы 401-410: проверены {counts['original_links_reviewed']} исходных связей, сохранены {counts['retained_original_links']}, исключены {counts['removed_original_links']}, добавлены {counts['added_links']}. Итог партии - {counts['result_links']} связей, {counts['result_unique_verses']} разных аятов. В теме ребёнка посторонний 18:45 исключён, прямой 18:46 добавлен; различены общий срок беременности и кормления и срок одного кормления. Каусар подтверждён достоверным хадисом, в Роге отмечены прямые выражения и толкования. Уточнены заявленный мотив изгнанных в 2:246, наставление сына отцу, доброта и пределы послушания родителям. Молитвы Ибрахима об отце отмечены с 9:113-114. В родственниках удалены посторонние 2:1, 2:23, 2:36, 2:45, 2:47 и 50:23-26, добавлены прямые 4:1, 4:36 и 47:22 без реконструкции опечаток. 30:39 не выдан за однозначное осуждение процентной ссуды вопреки локальному переводу и толкованию о дарах. Отсылочная статья рузи к благам сохранена без новых связей. В руководителе справедливость суда отделена от подчинения ветра и обязанности подданных; добавлены 38:26, 5:42 и 4:59 в подходящие подпункты. Проверены аяты о румах без добавления непроверенных дат. Сводный JSON 1-410 содержит {counts['cumulative_links']} связей. Независимый валидатор пройден, четыре файла доставлены с проверкой хешей. Первые 400 тем и полный чистый исходник не менялись. Канонические файлы Корана, код сайта и библиотека не менялись. Сборка и PDF не запускались. Темы 411-420 ожидают подтверждения, автоматизация PAUSED."
plan=root/'docs/QURAN-search-plan.md';text=plan.read_text(encoding='utf-8-sig')
if result not in text:save(plan,text.rstrip()+'\n\n'+result+'\n')
save(out/'work/resume-notes.md','# Партия 401-410 завершена\n\n'+result+'\n\nСледующую партию не начинать до явного подтверждения владельца.\n')
print('Completed 401-410; 4 files delivered; waiting for confirmation 411-420.')
