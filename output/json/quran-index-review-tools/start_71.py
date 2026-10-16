import datetime,hashlib,json,re
from pathlib import Path
root=Path(r'D:\Yandex.Disk\AstroProject');prev=root/'output/json/quran-index-review-61-70'
p=root/'output/json/quran-index-review-progress.json';d=json.loads(p.read_text(encoding='utf-8'))
c=prev/'Указатель аятов - проверенные темы 1-70.json'
assert len(json.loads(c.read_text(encoding='utf-8'))['topics'])==70
w=root/'output/json/quran-index-review-71-80/work';w.mkdir(parents=True,exist_ok=True)
source=(prev/'work/review.py').read_text(encoding='utf-8')
source=source.replace("ROOT / 'output/json/quran-index-review-51-60/Указатель аятов - проверенные темы 1-60.json'", "ROOT / 'output/json/quran-index-review-61-70/Указатель аятов - проверенные темы 1-70.json'")
source=source.replace('quran-index-review-61-70\'','quran-index-review-71-80\'').replace('[60:70]','[70:80]').replace('[:60]','[:70]')
source=source.replace("parts = ['topics_61_62.py', 'topic_63.py', 'topics_64_69.py', 'topic_70_a.py', 'topic_70_b.py']", "parts = ['topics_71_73.py', 'topic_74.py', 'topics_75_80.py']")
source=source.replace('61-70','71-80').replace('1-70.json','1-80.json')
# Repair the previous input, which must remain 1-70, after the output-name replacement.
source=source.replace("quran-index-review-61-70/Указатель аятов - проверенные темы 1-80.json'", "quran-index-review-61-70/Указатель аятов - проверенные темы 1-70.json'")
source=source.replace("'cumulative_topics': 70", "'cumulative_topics': 80").replace('== 618','== 261').replace('positions-0061-0070','positions-0071-0080')
source=source.replace("'first_topic_ordinal': 61, 'last_topic_ordinal': 70", "'first_topic_ordinal': 71, 'last_topic_ordinal': 80").replace('first_60_topics_unchanged','first_70_topics_unchanged')
source=source.replace('первые 70 тем','первые 80 тем').replace('enumerate(topics, 61)','enumerate(topics, 71)').replace('первые 60 проверенных','первые 70 проверенных').replace('после 70-й','после 80-й')
(w/'review.py').write_text(source,encoding='utf-8')
for name in ('read_keys.py',): (w/name).write_bytes((prev/'work'/name).read_bytes())
d.update(updated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),last_completed_topic=70,next_topic=71,next_topic_id='topic-0067',last_completed_batch='61-70',cumulative_file=c.relative_to(root).as_posix(),cumulative_sha256=hashlib.sha256(c.read_bytes()).hexdigest(),cumulative_links=2629,current_batch={'first_topic':71,'last_topic':80,'status':'research_in_progress','working_directory':w.relative_to(root).as_posix(),'completed_item_ids':[],'reviewed_original_links':0})
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
run=root/'docs/QURAN-index-review-run.md';text=run.read_text(encoding='utf-8').replace('Завершены темы 1-60, 2 016 связей. Продолжать с 61-й темы.','Завершены темы 1-70, 2 629 связей. Продолжать с 71-й темы.')
run.write_text(text,encoding='utf-8')
plan=root/'docs/QURAN-search-plan.md';text=plan.read_text(encoding='utf-8');text+='\n\nПроверка индекса: завершены темы 61-70. Сводный файл 1-70 содержит 2 629 связей; исходные 618 связей партии рассмотрены, 72 исключены из прежних подпунктов, 67 добавлены, в том числе переносы. Файлы проверены и скопированы в папку указателя. Следующая партия 71-80; актуальный прогресс - `output/json/quran-index-review-progress.json`.\n'
plan.write_text(text,encoding='utf-8')
print('Batch 71-80 initialized; completed 70 topics.')
