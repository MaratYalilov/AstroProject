import copy
import hashlib
import json
import re
import sqlite3
import sys
import os
import time
import uuid
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
W = Path(__file__).parent

def persist_text(path, text):
    # Replace generated files atomically so disk synchronisation cannot interrupt truncation.
    for attempt in range(5):
        temporary = path.with_name('.' + path.name + '.' + uuid.uuid4().hex + '.tmp')
        try:
            temporary.write_text(text, encoding='utf-8')
            os.replace(temporary, path)
            return
        except OSError:
            temporary.unlink(missing_ok=True)
            if attempt == 4:
                raise
            time.sleep(0.2)
ROOT = Path(r'D:\Yandex.Disk\AstroProject')
SOURCE = Path(r'D:\Собираем файлы Hutba\Курсы\Коран\Индекс\Указатель аятов\Указатель аятов - чистый.json')
PREVIOUS = ROOT / 'output/json/quran-index-review-391-400/Указатель аятов - проверенные темы 1-400.json'
OUT = ROOT / 'output/json/quran-index-review-401-410'
original_bytes = SOURCE.read_bytes()
original = json.loads(original_bytes.decode('utf-8-sig'))
previous = json.loads(PREVIOUS.read_text(encoding='utf-8-sig'))
assert original_bytes == (ROOT / 'output/json/quran-ayat-index-clean.json').read_bytes()
topics = copy.deepcopy(original['topics'][400:410])
old = {i['id']: i for t in original['topics'][400:410] for i in t['items']}
items = {i['id']: i for t in topics for i in t['items']}
ru_raw = json.loads((ROOT / 'src/data/quran-kuliev-ru.json').read_text(encoding='utf-8-sig'))['quran']['ru.kuliev']
ar_raw = json.loads((ROOT / 'src/data/quran-uthmani-hafs.json').read_text(encoding='utf-8-sig'))['quran']['quran-uthmani-hafs']
ru = {f"{v['surah']}:{v['ayah']}": v['verse'] for v in ru_raw.values()}
ar = {f"{v['surah']}:{v['ayah']}": v['verse'] for v in ar_raw.values()}
sources = copy.deepcopy(previous['sources'])
assert previous['text_source_id'] == 'site-quran'
for value in sources['site-quran']['files'].values():
    actual = hashlib.sha256((ROOT / value['path']).read_bytes()).hexdigest()
    if actual != value['sha256']:
        assert value['path'] == 'src/data/quran-kuliev-ru.json'
        current_text = (ROOT / value['path']).read_text(encoding='utf-8-sig')
        correction = json.loads(current_text)['_corrections'][0]
        assert correction['verse_key'] == '35:25'
        assert correction['previous_file_sha256'] == value['sha256']
        reconstructed = (current_text.split(',"_corrections":', 1)[0] + '}').replace(correction['corrected_start'], correction['original_start'], 1)
        assert hashlib.sha256(reconstructed.encode('utf-8')).hexdigest() == value['sha256']
        value['previous_sha256'] = value['sha256']
        value['sha256'] = actual
        sources['site-quran']['approved_local_corrections'] = [correction]

notes = {identity: {} for identity in items}
decisions = {}
changes = []
topic_changes = []
facts = {}


def ident(topic, item):
    return f"{original['topics'][topic - 1]['id']}-item-{item:03d}"


def src(identity, title, url, kind='tafsir', **extra):
    if identity not in sources:
        sources[identity] = {'title': title, 'url': url, 'type': kind, 'role': 'interpretation_evidence', **extra}
    else:
        assert sources[identity]['url'] == url
    return identity


def taf(key, book='katheer'):
    labels = {'katheer': 'Ибн Касир', 'saadi': 'Ас-Саади', 'qortobi': 'Аль-Куртуби', 'tabary': 'Ат-Табари', 'baghawi': 'Аль-Багави'}
    sura, aya = key.split(':')
    return src(f'ksu-{book}-{sura}-{aya}', f'{labels[book]}, толкование {key}',
               f'https://quran.ksu.edu.sa/tafseer/{book}/sura{sura}-aya{aya}.html')


def hd(number, collection='bukhari'):
    title = {'bukhari': 'Сахих аль-Бухари', 'muslim': 'Сахих Муслим'}[collection]
    return src(f'{collection}-{number}', f'{title}, {number}', f'https://sunnah.com/{collection}:{number}',
               'hadith', locator=str(number), hadith_grade='сахих; сборник «Сахих»')


def fact_rows(text):
    for line in text.strip().splitlines():
        if not line.strip():
            continue
        key, explanation, *rest = line.split('|')
        assert key not in facts, key
        facts[key] = {'explanation': explanation, 'anchor': rest[0] if rest else None}


def phrase(key, anchor=None):
    text = ru[key]
    if anchor:
        # Return the exact selected phrase whenever it is already a sufficiently clear quotation.
        at = text.casefold().find(anchor.casefold())
        assert at >= 0, (key, anchor, text)
        return text[at:at + len(anchor)]
    # Short verses remain whole; longer verses use the first complete sentence, with a readable length cap.
    first = re.split(r'(?<=[.!?])\s+(?=[А-ЯЁ])', text, maxsplit=1)[0]
    if len(first.split()) <= 24:
        return first
    words = list(re.finditer(r'\S+', first))
    return first[:words[23].end()]


def keep(topic, item, key, explanation=None, anchor=None, basis='quran_text', refs=(), context=(), qualification=None, usage=None):
    identity = ident(topic, item)
    assert key in ru and key in ar
    assert key not in notes[identity], (identity, key)
    f = facts.get(key, {})
    explanation = explanation or f.get('explanation')
    assert explanation, ('NO_EXPLANATION', identity, key)
    selected = anchor if anchor is not None else f.get('anchor')
    refs = list(dict.fromkeys(['site-quran', *refs]))
    assert set(refs) <= set(sources), refs
    row = {'explanation': explanation,
           'key_phrase': {'text': phrase(key, selected), 'language': 'ru', 'translation_id': 'ru.kuliev'},
           'basis': basis, 'source_ids': refs}
    if context:
        row['context_verse_keys'] = list(dict.fromkeys(k for k in context if k != key))
    if qualification:
        row['qualification'] = qualification
    if usage:
        row['usage_note'] = usage
    notes[identity][key] = row
    if key in old.get(identity, {'verse_keys': []})['verse_keys']:
        assert (identity, key) not in decisions
        decisions[(identity, key)] = {'item_id': identity, 'verse_key': key, 'decision': 'retain', 'source_ids': refs}


def drop(topic, item, key, reason, refs=()):
    identity = ident(topic, item)
    assert key in old.get(identity, {'verse_keys': []})['verse_keys']
    assert (identity, key) not in decisions, (identity, key)
    decisions[(identity, key)] = {'item_id': identity, 'verse_key': key, 'decision': 'remove',
                                'reason': reason, 'source_ids': list(dict.fromkeys(['site-quran', *refs]))}


def rename(topic, item, description, reason, relation=None):
    identity = ident(topic, item)
    change = {'item_id': identity, 'before': items[identity]['description'], 'after': description, 'reason': reason}
    items[identity]['description'] = description
    if relation:
        change.update(relation_type_before=items[identity]['relation_type'], relation_type_after=relation)
        items[identity]['relation_type'] = relation
    changes.append(change)


def select(topic, item, drops=None, refs=(), basis='quran_text', contexts=None, qualification=None):
    drops = drops or {}
    for key in old[ident(topic, item)]['verse_keys']:
        if key in drops:
            drop(topic, item, key, drops[key])
        else:
            keep(topic, item, key, refs=refs, basis=basis, context=(contexts or {}).get(key, ()), qualification=qualification)
    assert set(drops) <= set(old[ident(topic, item)]['verse_keys'])


parts = ['topic_401.py', 'topic_402.py', 'topic_403.py', 'topic_404.py', 'topic_405.py', 'topic_406.py', 'topic_407.py', 'topic_408.py', 'topic_409.py', 'topic_410.py']
for part in parts:
    if '--checkpoint' in sys.argv and not (W / part).exists():
        continue
    exec((W / part).read_text(encoding='utf-8'), globals())
    checkpoint = {'status': 'partial_manual_review', 'batch': '401-410', 'last_module': part, 'topics': topics, 'notes': notes, 'decisions': list(decisions.values()), 'sources': sources, 'description_changes': changes, 'topic_changes': topic_changes}
    persist_text(W / 'checkpoint.json', json.dumps(checkpoint, ensure_ascii=False, indent=2) + '\n')
    progress_path = ROOT / 'output/json/quran-index-review-progress.json'
    progress = json.loads(progress_path.read_text(encoding='utf-8'))
    progress['current_batch']['completed_item_ids'] = [identity for identity, item in old.items() if all((identity, key) in decisions for key in item['verse_keys'])]
    progress['current_batch']['reviewed_original_links'] = len(decisions)
    progress['current_batch']['remaining_original_links'] = sum(len(item['verse_keys']) for item in old.values()) - len(decisions)
    next_unreviewed = next(((identity, key) for identity, item in old.items() for key in item['verse_keys'] if (identity, key) not in decisions), None)
    if next_unreviewed:
        progress['current_batch']['next_item_id'], progress['current_batch']['next_verse_key'] = next_unreviewed
    progress['current_batch']['last_saved_module'] = part
    progress['updated_at'] = __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
    persist_text(progress_path, json.dumps(progress, ensure_ascii=False, indent=2) + '\n')
if '--checkpoint' in sys.argv:
    print('Partial decisions saved; batch not marked complete.')
    sys.exit(0)

missing = [(identity, key) for identity, item in old.items() for key in item['verse_keys'] if (identity, key) not in decisions]
assert not missing, ('UNREVIEWED', missing)
for identity, item in items.items():
    assert notes[identity], ('EMPTY_ITEM', identity)
    ordered = sorted(notes[identity], key=lambda key: tuple(map(int, key.split(':'))))
    item['verse_keys'] = ordered
    item['verse_notes'] = {key: notes[identity][key] for key in ordered}
    for key, note in item['verse_notes'].items():
        assert note['key_phrase']['text'] in ru[key]
        assert set(note.get('context_verse_keys', [])) <= ru.keys() & ar.keys()
        assert note['source_ids'][0] == 'site-quran'
        if note['basis'] not in ('quran_text', 'passage_context'):
            assert len(note['source_ids']) > 1, (identity, key)
        if note['basis'] == 'passage_context':
            assert note.get('context_verse_keys'), (identity, key)
        if note['basis'] == 'context':
            assert note.get('context_verse_keys'), (identity, key)
assert SOURCE.read_bytes() == original_bytes
assert previous['topics'] == json.loads(PREVIOUS.read_text(encoding='utf-8'))['topics']
used = {s for group in notes.values() for row in group.values() for s in row['source_ids']}
snapshot_cache = {}
for identity in used | {s for row in decisions.values() for s in row['source_ids']}:
    if not identity.startswith('ksu-'):
        continue
    _, book, sura, aya = identity.split('-')
    table = {'katheer': 'katheer', 'saadi': 'sa3dy', 'qortobi': 'qortoby', 'tabary': 'tabary', 'baghawi': 'baghawy'}[book]
    path = ROOT / 'output/research/islamic-sources-2026-10-15/ksu-databases' / (table + '.sqlite')
    if table not in snapshot_cache:
        snapshot_cache[table] = hashlib.sha256(path.read_bytes()).hexdigest()
    with sqlite3.connect(path.resolve().as_uri() + '?mode=ro', uri=True) as con:
        record = con.execute(f'SELECT text FROM "{table}" WHERE sura=? AND aya=?', (int(sura), int(aya))).fetchone()
        assert record and record[0].strip(), identity
    sources[identity]['local_snapshot'] = {'path': path.relative_to(ROOT).as_posix(), 'sha256': snapshot_cache[table],
        'table': table, 'sura': int(sura), 'aya': int(aya), 'edition_note': 'Официальный пакет проекта «Аят»; конкретное печатное издание электронной базы не установлено.'}
definitions = {**previous['basis_definitions'], 'context': 'Связь установлена по конкретному указанному контексту; соседство само по себе не подтверждает связь.',
               'tafsir_interpretation': 'Толкование выражения по указанному тафсиру; альтернативные толкования отмечены.',
               'sahih_hadith_thematic': 'Тематическая связь подтверждена конкретным достоверным хадисом; отличается от прямого содержания аята.', 'tafsir_person_association': 'Именная связь приведена в указанном тафсире; сама запись не является самостоятельным подтверждением достоверности иснада.'}
batch = {'schema_version': 2, 'source_id': original['source_id'], 'language': 'ru', 'text_source_id': 'site-quran',
         'text_editions': previous['text_editions'], 'basis_definitions': definitions,
         'sources': {k: v for k, v in sources.items() if k in used}, 'topics': topics}
cumulative = {**batch, 'sources': {**previous['sources'], **batch['sources']}, 'topics': previous['topics'] + topics}
additions = [{'topic_id': t['id'], 'item_id': i['id'], 'verse_key': k, 'reason': i['verse_notes'][k]['explanation'],
              'source_ids': i['verse_notes'][k]['source_ids']} for t in topics for i in t['items'] for k in i['verse_keys'] if k not in old.get(i['id'], {'verse_keys': []})['verse_keys']]
rows = [decisions[(i['id'], k)] for t in original['topics'][400:410] for i in t['items'] for k in i['verse_keys']]
counts = {'topics_reviewed': 10, 'original_links_reviewed': len(rows), 'retained_original_links': sum(r['decision'] == 'retain' for r in rows),
          'removed_original_links': sum(r['decision'] == 'remove' for r in rows), 'added_links': len(additions),
          'result_links': sum(len(i['verse_keys']) for t in topics for i in t['items']),
          'result_unique_verses': len({k for t in topics for i in t['items'] for k in i['verse_keys']}),
          'cumulative_topics': 410, 'cumulative_links': sum(len(i['verse_keys']) for t in cumulative['topics'] for i in t['items'])}
assert counts['original_links_reviewed'] == 178
assert counts['result_links'] == counts['retained_original_links'] + counts['added_links']
assert cumulative['topics'][:400] == previous['topics']
log = {'batch_id': 'positions-0401-0410', 'reviewed_at': '2026-10-20',
       'scope': {'first_topic_ordinal': 401, 'last_topic_ordinal': 410, 'topic_ids': [t['id'] for t in topics], 'entire_index_reviewed': False},
       'input_sha256': hashlib.sha256(original_bytes).hexdigest(), 'text_source_id': 'site-quran',
       'counts': counts, 'decisions': rows, 'additions': additions, 'description_changes': changes, 'topic_changes': topic_changes,
       'sources': {k: v for k, v in sources.items() if k in used or any(k in r['source_ids'] for r in rows)},
       'validation': {'all_retained_verses_have_explanation_and_exact_local_quote': True,
                      'all_original_links_have_explicit_decision': True, 'first_400_topics_unchanged': True,
                      'original_full_clean_index_unchanged': True, 'new_external_quran_corpus_used': False,
                      'tafsir_source_records_exist_in_local_official_snapshots': True}}
OUT.mkdir(parents=True, exist_ok=True)
for name, value in [('Указатель аятов - темы 401-410.json', batch), ('Указатель аятов - проверенные темы 1-410.json', cumulative), ('Темы 401-410 - журнал проверки.json', log)]:
    persist_text(OUT / name, json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def source_links(refs):
    return '; '.join(f"[{sources[s]['title']}]({sources[s]['url']})" for s in refs if s != 'site-quran')


md = ['# Проверка тем 401-410', '', 'Дата: 20 октября 2026 года.', '',
      f"Проверено {counts['original_links_reviewed']} исходных связей: сохранено {counts['retained_original_links']}, исключено {counts['removed_original_links']}; добавлено {counts['added_links']}. Итоговое количество связей: {counts['result_links']}; различных аятов: {counts['result_unique_verses']}. Сводный JSON содержит первые 410 тем.", '',
      'Источник арабского текста и цитат - локальный site-quran. Все ключевые фразы дословно взяты из перевода Кулиева сайта. Тафсиры и хадисы служат отдельными основаниями именных связей и толкований. Новый внешний корпус текста Корана не получался.', '',
      'Для каждого сохранённого аята записаны объяснение, ключевая фраза и основание. Для каждого исключённого - конкретная причина в журнале. Связи по контексту отмечены отдельно. Отнесение к человеку в тафсире не обозначает самостоятельной проверки иснада рассказа. Частота цитирования без подтверждения не заявлялась.', '',
      'Ранее, по отдельному поручению владельца, в локальном переводе 35:25 удалена лишняя частица «не», а в самом JSON сохранена история исправления. Новая контрольная сумма перевода и прежняя версия отражены в источнике site-quran; арабский текст, QCF-коды и прежние проверенные темы не менялись.', '', '## Сводка', '', '| № | Тема | Было | Сохранено | Удалено | Добавлено | Стало |', '| --- | --- | ---: | ---: | ---: | ---: | ---: |']
summary = ['## Основные исправления', '',
'- В теме ребёнка из подпункта привязанности исключён посторонний 18:45; отдельно добавлен прямой 18:46. Тридцать месяцев в 46:15 не названы отдельным сроком кормления: это беременность вместе с кормлением.',
'- Связь Каусара с рекой подтверждена достоверным хадисом Анаса; 108:2-3 не выданы за описание реки. В теме Рога различены прямые упоминания, последствия и толкования единственного гласа и двух сотрясений.',
'- В теме родины 2:246 описан как заявленный мотив борьбы изгнанных, без приписывания всем просителям исполненной верности. В теме родителей уточнено направление наставления сына к отцу, предел послушания и контекст молитв Ибрахима об отце по 9:113-114.',
'- Из родственных связей исключены посторонние 2:1, 2:23, 2:36, 2:45, 2:47 и 50:23-26; 4:1, 4:36 и 47:22 добавлены как самостоятельные подтверждённые связи, без догадки о восстановлении испорченных номеров.',
'- 30:39 не использован как однозначное доказательство наказания за процентную ссуду: локальный перевод и ас-Саади объясняют дары ради большего ответного дара. Прямые запреты лихвы сохранены.',
'- «Рузи» сохранена как отсылочная статья к «благам», не имеющая собственных аятов. В руководителе справедливый суд отделён от подчинения ветра; 38:26 и 5:42 добавлены в подпункт суда, а 4:59 - в подпункт повиновения. Особое положение Посланника не перенесено на любого правителя.',
'- В теме румов сохранены прямые аяты о поражении, последующей победе и радости верующих; непроверенные точные календарные даты не добавлялись.', '']
md[md.index('## Сводка'):md.index('## Сводка')] = summary
for index, topic in enumerate(topics, 401):
    identities = {i['id'] for i in original['topics'][index-1]['items']} | {i['id'] for i in topic['items']}
    d = [r for r in rows if r['item_id'] in identities]
    a = [r for r in additions if r['item_id'] in identities]
    md.append(f"| {index} | {topic['title']} | {len(d)} | {sum(r['decision'] == 'retain' for r in d)} | {sum(r['decision'] == 'remove' for r in d)} | {len(a)} | {sum(len(i['verse_keys']) for i in topic['items'])} |")
for index, topic in enumerate(topics, 401):
    md += ['', f"## {index}. {topic['title']}", '']
    if topic.get('scope_note'):
        md += [topic['scope_note'], '']
    if not topic['items']:
        md += ['Перекрёстная ссылка: ' + ', '.join(topic['see_also']) + '. Целевая тема существует в исходном указателе; её содержимое сейчас не перепроверялось.', '']
    for item in topic['items']:
        md += [f"### {item['description']}", '']
        for key, row in item['verse_notes'].items():
            md += [f"**{key}** - «{row['key_phrase']['text']}». {row['explanation']}", '']
            if row['basis'] != 'quran_text':
                md += ['Основание: ' + definitions.get(row['basis'], row['basis']), '']
            if row.get('context_verse_keys'):
                md += ['Контекст: ' + ', '.join(row['context_verse_keys']) + '.', '']
            if row.get('qualification'):
                md += ['Уточнение: ' + row['qualification'], '']
            if row.get('usage_note'):
                md += [row['usage_note'], '']
            links = source_links(row['source_ids'])
            if links:
                md += ['Источники: ' + links + '.', '']
        removed = [r for r in rows if r['item_id'] == item['id'] and r['decision'] == 'remove']
        if removed:
            md += ['Исключено:', ''] + [f"- **{r['verse_key']}**: {r['reason']}" for r in removed] + ['']
removed_items = {c['item_id'] for c in changes if c['after'] == 'Подпункт исключён'}
if removed_items:
    md += ['## Исключённые подпункты', '']
    for identity in sorted(removed_items):
        md += [f"### {identity}", '']
        md += [f"- **{r['verse_key']}**: {r['reason']}" for r in rows if r['item_id']==identity and r['decision']=='remove']
        md += ['']
md += ['## Изменения формулировок', '']
md += [f"- **{c['item_id']}**: «{c['before']}» → «{c['after']}». {c['reason']}" for c in changes]
md += ['', 'Исходный полный индекс и первые 400 проверенных тем не менялись. PDF и сборка сайта не запускались. Темы после 410-й не входят в сводный проверенный файл.', '']
md += ['', '## Изменения на уровне тем', ''] + [f"- **{c['topic_id']}**: {c['reason']}" for c in topic_changes]
persist_text(OUT / 'Темы 401-410 - отчёт.md', '\n'.join(md))
print(json.dumps(counts, ensure_ascii=False, indent=2))
