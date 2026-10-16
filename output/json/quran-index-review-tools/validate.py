import argparse
import hashlib
import json
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
args = argparse.ArgumentParser()
args.add_argument('--first', type=int, required=True)
args.add_argument('--last', type=int, required=True)
args = args.parse_args()
root = Path(r'D:\Yandex.Disk\AstroProject')
out = root / f'output/json/quran-index-review-{args.first}-{args.last}'
dest = Path(r'D:\Собираем файлы Hutba\Курсы\Коран\Индекс\Указатель аятов')
read = lambda p: json.loads(p.read_text(encoding='utf-8-sig'))
cache = {}
def sha(p):
    if p not in cache: cache[p] = hashlib.sha256(p.read_bytes()).hexdigest()
    return cache[p]

base = read(root / 'output/json/quran-ayat-index-clean.json')
prev_files = list((root / 'output/json').glob(f'quran-index-review-*/Указатель аятов - проверенные темы 1-{args.first - 1}.json'))
assert len(prev_files) == 1, prev_files
prev = read(prev_files[0])
batch_name = f'Указатель аятов - темы {args.first}-{args.last}.json'
cum_name = f'Указатель аятов - проверенные темы 1-{args.last}.json'
log_name = f'Темы {args.first}-{args.last} - журнал проверки.json'
report_name = f'Темы {args.first}-{args.last} - отчёт.md'
batch, cum, log = (read(out / n) for n in (batch_name, cum_name, log_name))
assert cum['topics'][:args.first - 1] == prev['topics']
assert cum['topics'][args.first - 1:] == batch['topics']
assert [t['id'] for t in batch['topics']] == [t['id'] for t in base['topics'][args.first - 1:args.last]]
assert len(cum['topics']) == args.last
ru = {f"{v['surah']}:{v['ayah']}": v['verse'] for v in read(root / 'src/data/quran-kuliev-ru.json')['quran']['ru.kuliev'].values()}
ar = {f"{v['surah']}:{v['ayah']}" for v in read(root / 'src/data/quran-uthmani-hafs.json')['quran']['quran-uthmani-hafs'].values()}
old = {(i['id'], k) for t in base['topics'][args.first - 1:args.last] for i in t['items'] for k in i['verse_keys']}
new = {(i['id'], k) for t in batch['topics'] for i in t['items'] for k in i['verse_keys']}
dec = {(d['item_id'], d['verse_key']): d for d in log['decisions']}
assert len(dec) == len(log['decisions']) and dec.keys() == old
assert {p for p, d in dec.items() if d['decision'] == 'retain'} == old & new
assert {p for p, d in dec.items() if d['decision'] == 'remove'} == old - new
assert {(d['item_id'], d['verse_key']) for d in log['additions']} == new - old
for t in cum['topics']:
    for i in t['items']:
        assert len(i['verse_keys']) == len(set(i['verse_keys']))
        if t['id'] in {v['id'] for v in batch['topics']}:
            assert i['verse_keys'] == sorted(i['verse_keys'], key=lambda k: tuple(map(int, k.split(':'))))
        assert set(i['verse_keys']) == set(i['verse_notes'])
        for k, n in i['verse_notes'].items():
            assert k in ru and k in ar
            assert n['explanation'].strip() and n['key_phrase']['text'] in ru[k]
            assert n['key_phrase']['translation_id'] == 'ru.kuliev'
            assert n['basis'] in cum['basis_definitions']
            assert n['source_ids'][0] == 'site-quran'
            assert set(n['source_ids']) <= cum['sources'].keys()
            assert set(n.get('context_verse_keys', [])) <= ru.keys() & ar
            if n['basis'] not in ('quran_text', 'passage_context'):
                assert len(n['source_ids']) > 1
            if n['basis'] in ('context', 'passage_context'):
                assert n.get('context_verse_keys')
for t in batch['topics']:
    text = json.dumps(t, ensure_ascii=False)
    assert '\u2013' not in text and '\u2014' not in text
for d in log['decisions']:
    assert set(d['source_ids']) <= log['sources'].keys()
    if d['decision'] == 'remove': assert d['reason'].strip()
for s in log['sources'].values():
    if 'local_snapshot' in s:
        sn = s['local_snapshot']
        path = root / sn['path']
        assert sha(path) == sn['sha256']
        assert sn['table'] in ('katheer', 'sa3dy', 'qortoby', 'tabary', 'baghawy')
        with sqlite3.connect(path.resolve().as_uri() + '?mode=ro', uri=True) as con:
            v = con.execute(f'SELECT text FROM "{sn["table"]}" WHERE sura=? AND aya=?', (sn['sura'], sn['aya'])).fetchone()
            assert v and v[0].strip()
for s in cum['sources']['site-quran']['files'].values():
    assert sha(root / s['path']) == s['sha256']
assert cum['text_source_id'] == 'site-quran' and 'quran-com-corpus' not in cum['sources']
clean = dest / 'Указатель аятов - чистый.json'
assert sha(clean) == 'fc5294401fc542f00fba3a2dbb47f3dce0669f46b0b58761729dbeb59ac9a45b'
assert clean.read_bytes() == (root / 'output/json/quran-ayat-index-clean.json').read_bytes()
counts = log['counts']
assert counts['original_links_reviewed'] == len(old)
assert counts['retained_original_links'] == len(old & new)
assert counts['removed_original_links'] == len(old - new)
assert counts['added_links'] == len(new - old)
assert counts['result_links'] == len(new)
assert counts['cumulative_topics'] == len(cum['topics'])
assert counts['cumulative_links'] == sum(len(i['verse_keys']) for t in cum['topics'] for i in t['items'])
report = (out / report_name).read_text(encoding='utf-8')
assert '\u2013' not in report and '\u2014' not in report
manifest = {'validated': True, 'destination': str(dest), 'counts': counts,
            'files': [{'name': n, 'source': str(out / n), 'sha256': sha(out / n)} for n in (batch_name, cum_name, log_name, report_name)]}
(out / 'delivery-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'validation': 'passed', **counts}, ensure_ascii=False))
