import datetime,json,hashlib
from pathlib import Path
root=Path(r'D:\Yandex.Disk\AstroProject')
p=root/'output/json/quran-index-review-progress.json'
d=json.loads(p.read_text(encoding='utf-8-sig'))
assert d['last_completed_topic']==270 and d['current_batch']['first_topic']==271
assert hashlib.sha256((root/d['cumulative_file']).read_bytes()).hexdigest()==d['cumulative_sha256']
d['status']='in_progress'
d['batch_confirmation'].update(approved_batch='271-280',waiting_for_confirmation=False,confirmed_on='2026-10-17')
d['batch_confirmation'].pop('requested_next_batch',None)
d['updated_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
doc=root/'docs/QURAN-index-review-run.md'
t=doc.read_text(encoding='utf-8-sig').replace('Следующая партия 271-280 ожидает явного подтверждения владельца.','Владелец подтвердил партию 271-280 17 октября 2026 года. Завершить только её, затем ждать нового подтверждения.')
doc.write_text(t,encoding='utf-8')
