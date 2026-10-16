import datetime, hashlib, json, re, sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
root=Path(r'D:\Yandex.Disk\AstroProject')
first=int(sys.argv[1]);last=min(first+9,537);prior=first-1
assert first>100 and (first-1)%10==0
original=json.loads((root/'output/json/quran-ayat-index-clean.json').read_text(encoding='utf-8-sig'))
prev=root/f'output/json/quran-index-review-{first-10}-{prior}'
c=prev/f'Указатель аятов - проверенные темы 1-{prior}.json'
before=json.loads(c.read_text(encoding='utf-8'));assert len(before['topics'])==prior
w=root/f'output/json/quran-index-review-{first}-{last}/work';assert not (w/'review.py').exists()
w.mkdir(parents=True,exist_ok=True)
template=(root/'output/json/quran-index-review-91-100/work/review.py').read_text(encoding='utf-8')
source=template.replace('[90:100]',f'[{prior}:{last}]').replace('[:90]',f'[:{prior}]').replace('91-100',f'{first}-{last}').replace('1-100.json',f'1-{last}.json')
source=re.sub(r'^PREVIOUS = .*',lambda m:f"PREVIOUS = ROOT / '{c.relative_to(root).as_posix()}'",source,flags=re.M)
source=re.sub(r'^parts = .*',lambda m:'parts = '+repr([f'topic_{n}.py' for n in range(first,last+1)]),source,flags=re.M)
count=sum(len(i['verse_keys']) for t in original['topics'][prior:last] for i in t['items'])
source=source.replace("'cumulative_topics': 100",f"'cumulative_topics': {last}").replace('== 867',f'== {count}').replace('positions-0091-0100',f'positions-{first:04d}-{last:04d}').replace("'first_topic_ordinal': 91, 'last_topic_ordinal': 100",f"'first_topic_ordinal': {first}, 'last_topic_ordinal': {last}").replace('first_90_topics_unchanged',f'first_{prior}_topics_unchanged').replace('первые 100 тем',f'первые {last} тем').replace('enumerate(topics, 91)',f'enumerate(topics, {first})').replace('первые 90 проверенных',f'первые {prior} проверенных').replace('после 100-й',f'после {last}-й')
source=source.replace("'topics_reviewed': 10",f"'topics_reviewed': {last-first+1}")
source=source.replace("progress['current_batch']['last_saved_module'] = part","progress['current_batch']['last_saved_module'] = part\n    progress['updated_at'] = __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()")
(w/'review.py').write_text(source,encoding='utf-8')
for name in ('read_keys.py','read_batch.py','lint_quotes.py'):(w/name).write_bytes((root/'output/json/quran-index-review-91-100/work'/name).read_bytes())
(w/'helpers.py').write_text((root/'output/json/quran-index-review-91-100/work/helpers.py').read_text(encoding='utf-8').replace('position-91',f'position-{first}'),encoding='utf-8')
p=root/'output/json/quran-index-review-progress.json';d=json.loads(p.read_text(encoding='utf-8'))
d.update(updated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),last_completed_topic=prior,next_topic=first,next_topic_id=original['topics'][prior]['id'],last_completed_batch=f'{first-10}-{prior}',cumulative_file=c.relative_to(root).as_posix(),cumulative_sha256=hashlib.sha256(c.read_bytes()).hexdigest(),cumulative_links=sum(len(i['verse_keys']) for t in before['topics'] for i in t['items']),current_batch={'first_topic':first,'last_topic':last,'status':'research_in_progress','working_directory':w.relative_to(root).as_posix(),'completed_item_ids':[],'reviewed_original_links':0})
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=root/'docs/QURAN-index-review-run.md';text=p.read_text(encoding='utf-8');text=re.sub(r'Завершены темы 1-\d+, .*?Продолжать с \d+-й темы\.',f"Завершены темы 1-{prior}, {d['cumulative_links']} связей. Продолжать с {first}-й темы.",text);p.write_text(text,encoding='utf-8')
print('Started',first,last,'original links',count)
for n,t in enumerate(original['topics'][prior:last],first):print(n,t['id'],t['title'],sum(len(i['verse_keys']) for i in t['items']))
