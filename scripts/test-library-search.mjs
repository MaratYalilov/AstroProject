import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';

// Transpile individual TS modules in memory. No Astro invocation or site build.
const require = createRequire(import.meta.url), cache = new Map();
function load(relative) {
  const raw = relative.endsWith('?raw');
  let file = path.resolve(raw ? relative.slice(0, -4) : relative);
  if (!path.extname(file)) file += fs.existsSync(file + '.ts') ? '.ts' : '.tsx';
  const key = file + (raw ? '?raw' : '');
  if (cache.has(key)) return cache.get(key).exports;
  const module = { exports: {} }; cache.set(key, module);
  const source = fs.readFileSync(file, 'utf8');
  if (raw) module.exports = source;
  else if (file.endsWith('.json')) module.exports = JSON.parse(source);
  else {
    const result = ts.transpileModule(source, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } });
    new Function('module', 'exports', 'require', result.outputText)(module, module.exports,
      specifier => specifier.startsWith('.') ? load(path.resolve(path.dirname(file), specifier)) : require(specifier));
  }
  return module.exports;
}
const started = performance.now();
const { searchTopics, relatedTopics, resolveTopicIds } = load('src/lib/library-search/topics.ts');
const { searchQuran } = load('src/lib/hadith/quranReader.ts');
const { searchLibrary, readView } = load('src/lib/hadith/reader.ts');
const { normalizeSearch, searchRanges } = load('src/lib/hadith/searchText.ts');
const { GET } = load('src/pages/api/hadith-reader.json.ts');
const source = JSON.parse(fs.readFileSync('src/data/quran-index/index.json', 'utf8'));
const cases = JSON.parse(fs.readFileSync('docs/library-search-queries.json', 'utf8')).cases;
const topicIds = result => result.topics.map(topic => topic.id);
const verseIds = query => searchQuran(query).map(hit => hit.numbers);
const timings = [];
for (const test of cases) {
  const start = performance.now(), result = searchTopics(test.query);
  if (test.item) assert.ok(result.topics.some(topic => topic.item_id === test.item), `${test.query}: expected description`);
  if (test.topic) assert.ok(result.topics.some(topic => topic.topic_id === test.topic), `${test.query}: expected topic`);
  if (test.via) assert.ok(result.topics.some(topic => topic.via_topic_ids.includes(test.via)), `${test.query}: cross reference`);
  if (test.equivalent) assert.deepEqual(topicIds(result), topicIds(searchTopics(test.equivalent)), `${test.query}: equivalent names`);
  if (test.equivalentVerses) {
    assert.ok(verseIds(test.query).length, `${test.query}: nonempty Arabic result`);
    assert.deepEqual(verseIds(test.query), verseIds(test.equivalentVerses));
  }
  if (test.verse) assert.deepEqual(verseIds(test.query), [test.verse]);
  if (test.emptyVerses) assert.deepEqual(verseIds(test.query), []);
  if (test.onlyVerses) assert.deepEqual([...result.verses.keys()].sort(), [...test.onlyVerses].sort(), `${test.query}: no broad-topic flooding`);
  if (test.emptyTopics) assert.equal(result.topics.length, 0);
  if (test.noAlias) assert.ok(!result.topics.some(topic => topic.matched_field === 'alias'), 'Negation must not activate an intent alias');
  if (test.hadith) {
    const hit = searchLibrary(test.query, test.scope).hits.find(hit => hit.id === test.hadith);
    assert.equal(hit?.href, test.href, 'Letter suffix and record identity');
  }
  timings.push(performance.now() - start);
}
// Check every returned association against its authoritative note, including caveats.
let associations = 0;
for (const topic of source.topics) {
  const result = searchTopics(topic.title);
  for (const [key, reasons] of result.verses) for (const reason of reasons) {
    const originalTopic = source.topics.find(topic => topic.id === reason.topic_id);
    const original = originalTopic.items.find(item => item.id === reason.item_id).verse_notes[key];
    assert.ok(original, 'Association must exist in the reviewed index');
    for (const field of ['basis', 'source_ids', 'context_verse_keys', 'key_phrase']) assert.deepEqual(reason[field], original[field]);
    for (const field of ['qualification', 'usage_note', 'explanation']) assert.equal(reason[field], original[field]?.replace(/[\u2013\u2014]/g, '-'));
    associations++;
  }
  const resolved = resolveTopicIds(topic.id);
  assert.equal(new Set(resolved).size, resolved.length, 'Cycle-safe cross references');
}
const family = searchLibrary('сохранение семьи', 'quran');
assert.equal(family.counts.topic, 1);
assert.equal(family.total, 2);
assert.equal(new Set(family.hits.map(hit => hit.id)).size, family.hits.length);
assert.ok(family.hits.every(hit => hit.matched_field === 'topic' && hit.reasons.length));
assert.equal(searchLibrary('сохранение семьи', 'muslim').counts.topic, 0, 'Hadith scope does not acquire Quran themes');
const filtered = searchLibrary('2:255', '', 1, 'sahih');
assert.equal(filtered.hits[0]?.numbers, '2:255', 'Hadith grade preserves ayahs');
const topicsPage = searchLibrary('Муса', 'quran', 2, '', 'topic');
assert.equal(topicsPage.hits.length, 0);
assert.ok(topicsPage.topics.length > 0 && topicsPage.topics.length <= 30);
assert.ok(!topicsPage.topics.some(hit => searchLibrary('Муса', 'quran', 1, '', 'topic').topics.some(first => first.id === hit.id)));
const ayah = readView('/quran/read/ayah/4-35').ayahs.find(ayah => ayah.id === '4-35');
assert.ok(ayah.relatedTopics.total > 0 && ayah.relatedTopics.items.length <= 3);
assert.deepEqual(ayah.relatedTopics, relatedTopics('4:35'));
assert.equal(normalizeSearch('всё'), normalizeSearch('все'));
const arabic = 'بِسْمِ اللَّهِ';
assert.ok(searchRanges(arabic, 'بسم الله').length);
assert.equal(arabic, 'بِسْمِ اللَّهِ', 'Original marks retained');
const response = GET({ url: new URL('http://localhost/api/hadith-reader.json?action=search&q=2:255&group=ayah') });
assert.equal(response.status, 200);
assert.equal((await response.json()).hits[0].numbers, '2:255');
assert.equal(GET({ url: new URL('http://localhost/api/hadith-reader.json?action=search&group=wrong') }).status, 400);
assert.equal(GET({ url: new URL('http://localhost/api/hadith-reader.json?action=search&grade=wrong') }).status, 400);
assert.equal(GET({ url: new URL('http://localhost/api/hadith-reader.json?action=search&q=x&page=NaN') }).status, 200);
const { renderToStaticMarkup } = require('react-dom/server');
const { createElement } = require('react');
const QuranAyah = load('src/components/hadith/QuranAyah.tsx').default;
const markup = renderToStaticMarkup(createElement(QuranAyah, { ayah, showArabic: false, alwaysTafsir: false, audio: { active: '', playing: false, loading: false, error: '', toggle() {} } }));
assert.ok(markup.includes('Связанные темы') && markup.includes('/quran/index?topic='), 'Related topics render as local links');
const HadithReader = load('src/components/hadith/HadithReader.tsx').default;
assert.ok(renderToStaticMarkup(createElement(HadithReader, { catalog: [], initialView: { title: 'Библиотека', records: [] } })).includes('library-search'));
console.log(`PASS: ${cases.length} queries, ${associations} checked note projections, scopes, grade, pagination, reverse links, API validation. ${Math.round(performance.now() - started)} ms overall; queries max ${Math.max(...timings).toFixed(1)} ms. No site build.`);
