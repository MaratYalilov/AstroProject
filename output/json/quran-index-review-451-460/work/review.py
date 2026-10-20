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
PREVIOUS = ROOT / 'output/json/quran-index-review-441-450/Указатель аятов - проверенные темы 1-450.json'
OUT = ROOT / 'output/json/quran-index-review-451-460'
original_bytes = SOURCE.read_bytes()
original = json.loads(original_bytes.decode('utf-8-sig'))
previous = json.loads(PREVIOUS.read_text(encoding='utf-8-sig'))
assert original_bytes == (ROOT / 'output/json/quran-ayat-index-clean.json').read_bytes()
topics = copy.deepcopy(original['topics'][450:460])
old = {i['id']: i for t in original['topics'][450:460] for i in t['items']}
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


exec((W/'helpers.py').read_text(encoding='utf-8'),globals())

parts = ['topic_451.py', 'topic_452.py', 'topic_453.py', 'topic_454.py', 'topic_455.py', 'topic_456.py', 'topic_457.py', 'topic_458.py', 'topic_459.py', 'topic_460.py']
for part in parts:
    if '--checkpoint' in sys.argv and not (W / part).exists():
        continue
    exec((W / part).read_text(encoding='utf-8'), globals())
    checkpoint = {'status': 'partial_manual_review', 'batch': '451-460', 'last_module': part, 'topics': topics, 'notes': notes, 'decisions': list(decisions.values()), 'sources': sources, 'description_changes': changes, 'topic_changes': topic_changes}
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
rows = [decisions[(i['id'], k)] for t in original['topics'][450:460] for i in t['items'] for k in i['verse_keys']]
counts = {'topics_reviewed': 10, 'original_links_reviewed': len(rows), 'retained_original_links': sum(r['decision'] == 'retain' for r in rows),
          'removed_original_links': sum(r['decision'] == 'remove' for r in rows), 'added_links': len(additions),
          'result_links': sum(len(i['verse_keys']) for t in topics for i in t['items']),
          'result_unique_verses': len({k for t in topics for i in t['items'] for k in i['verse_keys']}),
          'cumulative_topics': 460, 'cumulative_links': sum(len(i['verse_keys']) for t in cumulative['topics'] for i in t['items'])}
assert counts['original_links_reviewed'] == 646
assert counts['result_links'] == counts['retained_original_links'] + counts['added_links']
assert cumulative['topics'][:450] == previous['topics']
log = {'batch_id': 'positions-0451-0460', 'reviewed_at': '2026-10-20',
       'scope': {'first_topic_ordinal': 451, 'last_topic_ordinal': 460, 'topic_ids': [t['id'] for t in topics], 'entire_index_reviewed': False},
       'input_sha256': hashlib.sha256(original_bytes).hexdigest(), 'text_source_id': 'site-quran',
       'counts': counts, 'decisions': rows, 'additions': additions, 'description_changes': changes, 'topic_changes': topic_changes,
       'sources': {k: v for k, v in sources.items() if k in used or any(k in r['source_ids'] for r in rows)},
       'validation': {'all_retained_verses_have_explanation_and_exact_local_quote': True,
                      'all_original_links_have_explicit_decision': True, 'first_450_topics_unchanged': True,
                      'original_full_clean_index_unchanged': True, 'new_external_quran_corpus_used': False,
                      'tafsir_source_records_exist_in_local_official_snapshots': True}}
OUT.mkdir(parents=True, exist_ok=True)
for name, value in [('Указатель аятов - темы 451-460.json', batch), ('Указатель аятов - проверенные темы 1-460.json', cumulative), ('Темы 451-460 - журнал проверки.json', log)]:
    persist_text(OUT / name, json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def source_links(refs):
    return '; '.join(f"[{sources[s]['title']}]({sources[s]['url']})" for s in refs if s != 'site-quran')


md = ['# Проверка тем 451-460', '', 'Дата: 20 октября 2026 года.', '',
      f"Проверено {counts['original_links_reviewed']} исходных связей: сохранено {counts['retained_original_links']}, исключено {counts['removed_original_links']}; добавлено {counts['added_links']}. Итоговое количество связей: {counts['result_links']}; различных аятов: {counts['result_unique_verses']}. Сводный JSON содержит первые 460 тем.", '',
      'Источник арабского текста и цитат - локальный site-quran. Все ключевые фразы дословно взяты из перевода Кулиева сайта. Тафсиры и хадисы служат отдельными основаниями именных связей и толкований. Новый внешний корпус текста Корана не получался.', '',
      'Для каждого сохранённого аята записаны объяснение, ключевая фраза и основание. Для каждого исключённого - конкретная причина в журнале. Связи по контексту отмечены отдельно. Отнесение к человеку в тафсире не обозначает самостоятельной проверки иснада рассказа. Частота цитирования без подтверждения не заявлялась.', '',
      'Ранее, по отдельному поручению владельца, в локальном переводе 35:25 удалена лишняя частица «не», а в самом JSON сохранена история исправления. Новая контрольная сумма перевода и прежняя версия отражены в источнике site-quran; арабский текст, QCF-коды и прежние проверенные темы не менялись.', '', '## Сводка', '', '| № | Тема | Было | Сохранено | Удалено | Добавлено | Стало |', '| --- | --- | ---: | ---: | ---: | ---: | ---: |']
summary = ['## Основные исправления', '', '- В сотворении различены повеление «Будь!» и мгновенное исполнение в 54:50, шесть дней и более широкое устройство мира. Слово «необходимый» заменено точным смыслом «ради истины» без внешнего принуждения Господа.', '- Из возникновения живого мира исключены упоминания животных в снах, бытовых подробностях, военных приготовлениях, пищевых запретах и притчах, которые не описывают создание или обеспечение жизни. Сохранены конкретные создание, оживление, разнообразие, питание, пастбища и польза творений с точным контекстом.', '- Различены парность, разнообразие и простое соседство клятв в тексте. Клятвы о душе не выданы за описание Солнца и Луны. В общую рубрику о сотворении человека добавлен прямой 55:3.', '- Исправлена инверсия исходного заголовка: 40:57 называет создание небес и земли более великим, чем создание людей. Разные земные материалы не сведены к одной формуле о глине. В 22:6 указан предшествующий довод, а прямой 22:5 добавлен в подпункт об этапах.', '- В человеческой слабости различены природная слабость и бессилие перед Господом. Отдельные клятвы, прекраснейший облик, убийство брата и похвальба расходами не объявлены доказательствами слабости во всех отношениях. Условное предупреждение 69:44-47 не названо свершившимся событием.', '- В спасении названы очищение души, поминание и молитва без добавленного термина ереси. В сплетнях отделено прямое злословие от иных пороков из соседних строк; хуление отмечено как более широкое понятие.', '- В справедливости различены земные решения, Последний суд, награда и историческое наказание за поступки. Индивидуальная ответственность не отрицает дозволенного Господом заступничества. Добавлен прямой 49:9 о справедливом примирении. В 29:31-34 учтено оговорённое спасение Лута.', '- В сроках 28:27 обозначен как наём на работу, а не аренда имущества. В субботе общий завет не отождествлён с конкретной сценой нарушившего селения; участь групп не домысливалась.', '- В страхе разделены богобоязненность, естественный испуг и обещание безопасности. 13:12 и 27:10 перенесены в подпункт о человеческом страхе. Аяты о слезах не выданы за универсальный запрет громкой речи. Для боя добавлены исключения 8:16, а для просьбы Мусы - продолжение 28:34.', '- В стяжании 9:34 пояснён ас-Саади как удержание обязательных расходов, а не запрет любых сбережений. Из запаса пищи, чудесно известного Исе, не выведено осуждение стяжательства. Притча двух садов не устанавливает числовой предел богатства; названы её высокомерие, неверие и утрата.', '- В суде окончательное решение Господа различено с прямо предписанным людям разбирательством по откровению. 11:10 о ликовании после беды исключён. При оценке действий Харуна указан смысл объяснения обстоятельств в тафсире, а не общий приговор о неправоте Мусы.', '']
md[md.index('## Сводка'):md.index('## Сводка')] = summary
for index, topic in enumerate(topics, 451):
    identities = {i['id'] for i in original['topics'][index-1]['items']} | {i['id'] for i in topic['items']}
    d = [r for r in rows if r['item_id'] in identities]
    a = [r for r in additions if r['item_id'] in identities]
    md.append(f"| {index} | {topic['title']} | {len(d)} | {sum(r['decision'] == 'retain' for r in d)} | {sum(r['decision'] == 'remove' for r in d)} | {len(a)} | {sum(len(i['verse_keys']) for i in topic['items'])} |")
for index, topic in enumerate(topics, 451):
    md += ['', f"## {index}. {topic['title']}", '']
    if topic.get('scope_note'):
        md += [topic['scope_note'], '']
    if not topic['items'] and topic['see_also']:
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
md += ['', 'Исходный полный индекс и первые 450 проверенных тем не менялись. PDF и сборка сайта не запускались. Темы после 460-й не входят в сводный проверенный файл.', '']
md += ['', '## Изменения на уровне тем', ''] + [f"- **{c['topic_id']}**: {c['reason']}" for c in topic_changes]
persist_text(OUT / 'Темы 451-460 - отчёт.md', '\n'.join(md))
print(json.dumps(counts, ensure_ascii=False, indent=2))
