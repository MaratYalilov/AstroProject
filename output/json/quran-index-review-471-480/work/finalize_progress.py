import datetime,hashlib,json,re,os,uuid
from pathlib import Path
root=Path(r'D:\Yandex.Disk\AstroProject');out=root/'output/json/quran-index-review-471-480'
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,text):
 temp=p.with_name('.'+p.name+'.'+uuid.uuid4().hex+'.tmp');temp.write_text(text,encoding='utf-8');os.replace(temp,p)
manifest=read(out/'delivery-manifest.json');counts=manifest['counts']
assert manifest['validated'] and counts['cumulative_topics']==480 and counts['original_links_reviewed']==43
for entry in manifest['files']:
 assert sha(Path(entry['source']))==entry['sha256']
 assert sha(Path(manifest['destination'])/entry['name'])==entry['sha256']
pth=root/'output/json/quran-index-review-progress.json';p=read(pth)
assert p['last_completed_topic']==470 and p['batch_confirmation']['approved_batch']=='471-480'
assert p['automation']['status']=='PAUSED'
previous=read(root/p['cumulative_file']);assert sha(root/p['cumulative_file'])==p['cumulative_sha256']
entry=next(e for e in manifest['files'] if e['name']=='Указатель аятов - проверенные темы 1-480.json')
cumulative=Path(entry['source']);data=read(cumulative)
assert len(data['topics'])==480 and data['topics'][:470]==previous['topics']
original=read(root/'output/json/quran-ayat-index-clean.json')
assert sha(root/'output/json/quran-ayat-index-clean.json')=='fc5294401fc542f00fba3a2dbb47f3dce0669f46b0b58761729dbeb59ac9a45b'
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
p.update(updated_at=now,status='awaiting_confirmation',last_completed_topic=480,next_topic=481,next_topic_id=original['topics'][480]['id'],last_completed_batch='471-480',cumulative_file=cumulative.relative_to(root).as_posix(),cumulative_sha256=sha(cumulative),cumulative_links=counts['cumulative_links'])
p['current_batch'].update(status='complete',completed_at=now,reviewed_original_links=counts['original_links_reviewed'],remaining_original_links=0,validation='passed',counts=counts,delivery='verified',files=[{'path':Path(e['source']).relative_to(root).as_posix(),'sha256':e['sha256']} for e in manifest['files']])
for k in ['next_item_id','next_verse_key','last_usage_check']:p['current_batch'].pop(k,None)
p['batch_confirmation'].update(waiting_for_confirmation=True,requested_next_batch='481-490');p['pending_delivery']=[]
save(pth,json.dumps(p,ensure_ascii=False,indent=2)+'\n')
doc=root/'docs/QURAN-index-review-run.md';text=doc.read_text(encoding='utf-8-sig')
text,count=re.subn(r'(?m)^Завершены темы 1-\d+,.*?(?= Если фактический прогресс)',f"Завершены темы 1-480, {counts['cumulative_links']} связей. Партия 471-480 проверена и доставлена. Следующая партия 481-490 ожидает явного подтверждения владельца.",text)
assert count==1;save(doc,text)
result=f"20 октября 2026 завершены темы 471-480: проверены {counts['original_links_reviewed']} исходных связей, сохранены {counts['retained_original_links']}, исключены {counts['removed_original_links']}, добавлены {counts['added_links']}. Итог партии - {counts['result_links']} связи, {counts['result_unique_verses']} разный аят. Таваф и талак оставлены перекрёстными ссылками на существующие ранее проверенные темы Кааба и развод. В таджассусе запрет поиска скрытых недостатков не подменён общим выводом обо всех видах разведки. В тайаммуме сохранены прямые 4:43 и 5:6 без добавления неустановленных подробностей фикха. В тайных беседах различены дозволенное доброе содержание и злонамеренные переговоры; 58:10 не объявлен запретом любой конфиденциальности, а 58:7 пояснён по ас-Саади. Из хранения тайн исключены общие 7:199 и 16:90, оставлен конкретный 66:3 без приписывания содержания тайны и имени жены. В таква исключены не относящийся к награде 3:65 и самостоятельная ссылка 59:17; уточнены защита от козней и духовное одеяние. К истории Талута добавлены 2:246-248: просьба о царе после Мусы, назначение и знамение царствия. Исправлено определение таматту и выделены жертва либо пост с условием о месте проживания семьи. В одежде различены прикрытие, чистое облачение при молитве и дозволенное украшение. Сводный JSON 1-480 содержит {counts['cumulative_links']} связей. Независимый валидатор пройден, четыре файла доставлены с проверкой хешей. Первые 470 тем и полный чистый исходник не менялись. Канонические файлы Корана, код сайта и библиотека не менялись. Сборка и PDF не запускались. Темы 481-490 ожидают подтверждения, автоматизация PAUSED."
plan=root/'docs/QURAN-search-plan.md';text=plan.read_text(encoding='utf-8-sig')
if result not in text:save(plan,text.rstrip()+'\n\n'+result+'\n')
save(out/'work/resume-notes.md','# Партия 471-480 завершена\n\n'+result+'\n\nСледующую партию не начинать до явного подтверждения владельца.\n')
print('Completed 471-480; 4 files delivered; waiting for confirmation 481-490.')
