import datetime,hashlib,json,re,os,uuid
from pathlib import Path
root=Path(r'D:\Yandex.Disk\AstroProject');out=root/'output/json/quran-index-review-421-430'
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,text):
 temp=p.with_name('.'+p.name+'.'+uuid.uuid4().hex+'.tmp');temp.write_text(text,encoding='utf-8');os.replace(temp,p)
manifest=read(out/'delivery-manifest.json');counts=manifest['counts']
assert manifest['validated'] and counts['cumulative_topics']==430 and counts['original_links_reviewed']==274
for entry in manifest['files']:
 assert sha(Path(entry['source']))==entry['sha256']
 assert sha(Path(manifest['destination'])/entry['name'])==entry['sha256']
pth=root/'output/json/quran-index-review-progress.json';p=read(pth)
assert p['last_completed_topic']==420 and p['batch_confirmation']['approved_batch']=='421-430'
assert p['automation']['status']=='PAUSED'
previous=read(root/p['cumulative_file']);assert sha(root/p['cumulative_file'])==p['cumulative_sha256']
entry=next(e for e in manifest['files'] if e['name']=='Указатель аятов - проверенные темы 1-430.json')
cumulative=Path(entry['source']);data=read(cumulative)
assert len(data['topics'])==430 and data['topics'][:420]==previous['topics']
original=read(root/'output/json/quran-ayat-index-clean.json')
assert sha(root/'output/json/quran-ayat-index-clean.json')=='fc5294401fc542f00fba3a2dbb47f3dce0669f46b0b58761729dbeb59ac9a45b'
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
p.update(updated_at=now,status='awaiting_confirmation',last_completed_topic=430,next_topic=431,next_topic_id=original['topics'][430]['id'],last_completed_batch='421-430',cumulative_file=cumulative.relative_to(root).as_posix(),cumulative_sha256=sha(cumulative),cumulative_links=counts['cumulative_links'])
p['current_batch'].update(status='complete',completed_at=now,reviewed_original_links=counts['original_links_reviewed'],remaining_original_links=0,validation='passed',counts=counts,delivery='verified',files=[{'path':Path(e['source']).relative_to(root).as_posix(),'sha256':e['sha256']} for e in manifest['files']])
for k in ['next_item_id','next_verse_key','last_usage_check']:p['current_batch'].pop(k,None)
p['batch_confirmation'].update(waiting_for_confirmation=True,requested_next_batch='431-440');p['pending_delivery']=[]
save(pth,json.dumps(p,ensure_ascii=False,indent=2)+'\n')
doc=root/'docs/QURAN-index-review-run.md';text=doc.read_text(encoding='utf-8-sig')
text,count=re.subn(r'(?m)^Завершены темы 1-\d+,.*?(?= Если фактический прогресс)',f"Завершены темы 1-430, {counts['cumulative_links']} связей. Партия 421-430 проверена и доставлена. Следующая партия 431-440 ожидает явного подтверждения владельца.",text)
assert count==1;save(doc,text)
result=f"20 октября 2026 завершены темы 421-430: проверены {counts['original_links_reviewed']} исходных связей, сохранены {counts['retained_original_links']}, исключены {counts['removed_original_links']}, добавлены {counts['added_links']}. Итог партии - {counts['result_links']} связей, {counts['result_unique_verses']} разных аятов. Именная связь Самуры с 4:100 исключена как неподтверждённая; похожие имена не отождествлены. Связь Сафвана с 8:36 обозначена как сообщение сиры в тафсире без оценки иснада сахих. В Сатане различены гордыня, изгнание и отсрочка, Иблис и джинны вообще, прямые фразы и контекст; добавлена молитва 114:1-6. В свете удалены посторонние ссылки и уточнён 24:1. В свидетелях разграничены конкретные правовые ситуации, завещание и удостоверение смерти, правдивое свидетельство против себя и ложный самооговор. Запрет свинины сохранён вместе с исключениями при вынужденности. Сводный JSON 1-430 содержит {counts['cumulative_links']} связей. Независимый валидатор пройден, четыре файла доставлены с проверкой хешей. Первые 420 тем и полный чистый исходник не менялись. Канонические файлы Корана, код сайта и библиотека не менялись. Сборка и PDF не запускались. Темы 431-440 ожидают подтверждения, автоматизация PAUSED."
plan=root/'docs/QURAN-search-plan.md';text=plan.read_text(encoding='utf-8-sig')
if result not in text:save(plan,text.rstrip()+'\n\n'+result+'\n')
save(out/'work/resume-notes.md','# Партия 421-430 завершена\n\n'+result+'\n\nСледующую партию не начинать до явного подтверждения владельца.\n')
print('Completed 421-430; 4 files delivered; waiting for confirmation 431-440.')
