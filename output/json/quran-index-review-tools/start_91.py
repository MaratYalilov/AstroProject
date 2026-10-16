import datetime,hashlib,json,re
from pathlib import Path
root=Path(r'D:\Yandex.Disk\AstroProject');prev=root/'output/json/quran-index-review-81-90';w=root/'output/json/quran-index-review-91-100/work';w.mkdir(parents=True,exist_ok=True)
source=(prev/'work/review.py').read_text(encoding='utf-8').replace('[80:90]','[90:100]').replace('[:80]','[:90]').replace('81-90','91-100').replace('1-90.json','1-100.json')
source=re.sub(r"PREVIOUS = .*", "PREVIOUS = ROOT / 'output/json/quran-index-review-81-90/Указатель аятов - проверенные темы 1-90.json'",source)
source=re.sub(r'^parts = .+$',"parts = ['topic_91.py', 'topics_92_93.py', 'topic_94.py', 'topics_95_96.py', 'topic_97.py', 'topics_98_99.py', 'topic_100.py']",source,flags=re.M)
source=source.replace("'cumulative_topics': 90", "'cumulative_topics': 100").replace('== 593','== 867').replace('positions-0081-0090','positions-0091-0100')
source=source.replace("'first_topic_ordinal': 81, 'last_topic_ordinal': 90", "'first_topic_ordinal': 91, 'last_topic_ordinal': 100").replace('first_80_topics_unchanged','first_90_topics_unchanged').replace('первые 90 тем','первые 100 тем').replace('enumerate(topics, 81)','enumerate(topics, 91)').replace('первые 80 проверенных','первые 90 проверенных').replace('после 90-й','после 100-й')
(w/'review.py').write_text(source,encoding='utf-8')
for name in ('read_keys.py','read_batch.py','lint_quotes.py'):(w/name).write_bytes((prev/'work'/name).read_bytes())
(w/'helpers.py').write_text((prev/'work/helpers.py').read_text(encoding='utf-8').replace('position-81','position-91'),encoding='utf-8')
p=root/'output/json/quran-index-review-progress.json';d=json.loads(p.read_text(encoding='utf-8'));c=prev/'Указатель аятов - проверенные темы 1-90.json';assert len(json.loads(c.read_text(encoding='utf-8'))['topics'])==90
d.update(updated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),last_completed_topic=90,next_topic=91,next_topic_id='topic-0087',last_completed_batch='81-90',cumulative_file=c.relative_to(root).as_posix(),cumulative_sha256=hashlib.sha256(c.read_bytes()).hexdigest(),cumulative_links=3473,current_batch={'first_topic':91,'last_topic':100,'status':'research_in_progress','working_directory':w.relative_to(root).as_posix(),'completed_item_ids':[],'reviewed_original_links':0})
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=root/'docs/QURAN-index-review-run.md';text=p.read_text(encoding='utf-8').replace('Завершены темы 1-80, 2 886 связей. Продолжать с 81-й темы.','Завершены темы 1-90, 3 473 связи. Продолжать с 91-й темы.');p.write_text(text,encoding='utf-8')
p=root/'docs/QURAN-search-plan.md';text=p.read_text(encoding='utf-8');text+='\n\nЗавершены темы 81-90: 593 исходные связи проверены, 45 исключены из прежних подпунктов, 39 добавлены с учётом переносов. Сводный JSON 1-90 содержит 3 473 связи. Проверка структуры, сохранности прежних тем и точности цитат пройдена, четыре файла доставлены в папку указателя. Начата партия 91-100, 867 исходных связей; актуальная очередь в progress JSON.\n';p.write_text(text,encoding='utf-8')
print('Completed 90 topics; initialized 91-100.')
