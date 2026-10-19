import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';

// Node loads TypeScript directly: no Vite/Astro build, files or server needed.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !extname(specifier)) specifier += '.ts';
    return nextResolve(specifier, context);
  },
});
async function loadSource(file) {
  return import(new URL(`../${file}`, import.meta.url).href);
}
const renderer = await loadSource('src/utils/quranRenderer.ts');
const data = JSON.parse(await readFile(new URL('../src/data/quran-qcf-v2.json', import.meta.url), 'utf8'));
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const waslAll = JSON.parse(await readFile(new URL('../src/data/quran-hamza-wasl-all.json', import.meta.url), 'utf8'));
const waslEntries = waslAll.filter(entry => entry.is_start);
const waslQcf = JSON.parse(await readFile(new URL('../src/data/quran-hamza-wasl-qcf.json', import.meta.url), 'utf8'));
const uthmani = JSON.parse(await readFile(new URL('../src/data/quran-uthmani-hafs.json', import.meta.url), 'utf8'));
const waslByPosition = new Map(waslEntries.map((entry) => [`${entry.surah}:${entry.ayah}:${entry.word_number}`, entry]));
const waslByRef = new Map();
for (const entry of waslEntries) {
  const reference = `${entry.surah}:${entry.ayah}`;
  const hints = waslByRef.get(reference) ?? [];
  hints.push(entry);
  waslByRef.set(reference, hints);
}
const expectedPositions = new Map();
const stopCounts = { 'ۘ': 0, 'ۚ': 0, 'ۖ': 0, 'ۗ': 0, 'ۛ': 0 };
// Match lexical words: rub'/sajdah signs never increment the word number.
for (const verse of Object.values(uthmani.quran['quran-uthmani-hafs'])) {
  const words = verse.verse.match(/[\u0621-\u063a\u0641-\u064a\u0671][^\s]*/gu) ?? [];
  for (let index = 0; index < words.length; index++) {
    const word = words[index].replace(/[ۖۗۘۙۚۛۜ۞۩]/gu, '');
    const stop = index > 0 ? words[index - 1].match(/[ۘۚۖۗۛ]/u)?.[0] : null;
    if (!word.startsWith('ٱ') || (index > 0 && !stop)) continue;
    const reference = `${verse.surah}:${verse.ayah}:${index + 1}`;
    expectedPositions.set(reference, word);
    if (stop) stopCounts[stop]++;
  }
}
assert.equal(waslEntries.length, 265);
assert.equal(waslEntries.filter((entry) => entry.word_number === 1).length, 231, 'original beginnings are retained');
assert.equal(waslEntries.filter((entry) => entry.word_number > 1).length, 34);
assert.equal(waslByRef.size, 258);
assert.equal(waslByPosition.size, waslEntries.length, 'no duplicate surah:ayah:word positions');
const allByPosition = new Map(waslAll.map(entry => [`${entry.surah}:${entry.ayah}:${entry.word_number}`, entry]));
const allByRef = new Map();
for (const entry of waslAll) {
  const key = `${entry.surah}:${entry.ayah}`;
  const entries = allByRef.get(key) ?? [];
  entries.push(entry);
  allByRef.set(key, entries);
}
assert.equal(waslAll.length, 10772);
assert.equal(allByRef.size, 4458);
assert.deepEqual(Object.keys(waslQcf).sort(), [...allByPosition.keys()].sort(), 'every full-mode hint has verified QCF/Unicode word boundaries');
for (const [key, entry] of allByPosition) {
  assert.equal(typeof entry.is_start, 'boolean', `${key}: explicit boolean scope`);
  assert.equal(entry.is_start, expectedPositions.has(key), `${key}: independently checked beginning or stop`);
  const boundary = waslQcf[key];
  const text = renderer.getAyahText(entry.surah, entry.ayah).arabic;
  assert.equal(text.slice(boundary.unicodeStart, boundary.unicodeEnd).replace(/[\sۖۗۘۙۚۛۜ۞۩]/gu, ''), entry.word, key);
  assert.ok(entry.word.startsWith('ٱ'), key);
  assert.equal(data[`${entry.surah}:${entry.ayah}`].code_v2.slice(boundary.start, boundary.end).replace(/\s/gu, ''), boundary.code, key);
  assert.match(entry.reading, /^ا[َُِ]/u, key);
}
for (const [key, entry] of waslByPosition) assert.deepEqual(allByPosition.get(key), entry, `${key}: the basic list is unchanged`);
for (const [key, reading] of Object.entries({
  '2:21:3': 'اُعۡبُدُواْ', '2:283:16': 'اُوتُمِنَ', '18:21:19': 'اِبۡنُواْ',
  '38:6:5': 'اِمۡشُواْ', '20:64:4': 'اِيتُواْ', '49:11:30': 'اَلِسۡمُ',
  '5:107:11': 'اَلَّذِينَ', '5:107:12': 'اِسۡتَحَقَّ',
})) assert.equal(allByPosition.get(key)?.reading, reading, key);
assert.deepEqual([...waslByPosition.keys()].sort(), [...expectedPositions.keys()].sort(), 'complete selection from all five stop signs and ayah beginnings');
assert.deepEqual(stopCounts, { 'ۘ': 3, 'ۚ': 15, 'ۖ': 10, 'ۗ': 6, 'ۛ': 0 });
for (const [reference, entry] of waslByPosition) {
  assert.deepEqual(Object.keys(entry).sort(), ['ayah', 'is_start', 'reading', 'surah', 'word', 'word_number']);
  assert.ok(Number.isInteger(entry.word_number) && entry.word_number > 0, reference);
  assert.equal(entry.word, expectedPositions.get(reference), reference);
  const boundary = waslQcf[reference];
  const codes = data[`${entry.surah}:${entry.ayah}`].code_v2;
  assert.ok(Number.isInteger(boundary.start) && Number.isInteger(boundary.end));
  assert.ok(boundary.start >= 0 && boundary.end > boundary.start && boundary.end <= codes.length);
  assert.equal(codes.slice(boundary.start, boundary.end).replace(/\s/gu, ''), boundary.code, `${reference}: QCF data must still match the verified word`);
  assert.match(entry.reading, /^ا[َُِ]/u);
  if (reference === '46:4:18') {
    assert.equal(entry.word, 'ٱئۡتُونِي');
    assert.equal(entry.reading, 'اِيتُونِي', 'the second hamza becomes a madd ya when starting this word');
  } else {
    assert.equal(entry.reading.slice(2), entry.word.slice(1), 'other words retain all remaining letters and diacritics');
  }
}
// Article, assimilated letters, imperative forms and a verbal noun.
for (const [reference, reading] of Object.entries({
  '1:2': 'اَلۡحَمۡدُ', '1:3': 'اَلرَّحۡمَٰنِ', '1:6': 'اِهۡدِنَا',
  '2:3': 'اَلَّذِينَ', '2:255': 'اَللَّهُ', '4:50': 'اُنظُرۡ',
  '5:98': 'اِعۡلَمُوٓاْ', '7:3': 'اِتَّبِعُواْ', '7:55': 'اُدۡعُواْ',
  '9:9': 'اِشۡتَرَوۡاْ', '9:31': 'اِتَّخَذُوٓاْ', '12:9': 'اُقۡتُلُواْ',
  '15:46': 'اُدۡخُلُوهَا', '20:31': 'اُشۡدُدۡ', '28:32': 'اُسۡلُكۡ',
  '29:45': 'اُتۡلُ', '35:43': 'اِسۡتِكۡبَارٗا', '36:64': 'اِصۡلَوۡهَا',
  '38:42': 'اُرۡكُضۡ', '77:29': 'اِنطَلِقُوٓاْ', '89:28': 'اِرۡجِعِيٓ',
})) assert.equal(waslByPosition.get(`${reference}:1`)?.reading, reading, reference);
for (const [reference, reading] of Object.entries({
  '2:61:31': 'اِهۡبِطُواْ', '2:178:9': 'اَلۡحُرُّ', '4:171:32': 'اِنتَهُواْ',
  '5:3:31': 'اَلۡيَوۡمَ', '5:3:40': 'اَلۡيَوۡمَ', '5:8:16': 'اِعۡدِلُواْ',
  '5:75:17': 'اُنظُرۡ', '6:20:8': 'اَلَّذِينَ', '6:99:33': 'اُنظُرُوٓاْ',
  '7:148:20': 'اِتَّخَذُوهُ', '16:121:3': 'اِجۡتَبَىٰهُ',
  '24:35:10': 'اَلۡمِصۡبَاحُ', '24:35:13': 'اَلزُّجَاجَةُ',
  '34:13:12': 'اِعۡمَلُوٓاْ', '41:40:20': 'اِعۡمَلُواْ', '46:4:18': 'اِيتُونِي',
})) assert.equal(waslByPosition.get(reference)?.reading, reading, reference);
for (const reference of ['1:1', '2:1', '2:2', '2:4', '12:50', '12:99', '18:96']) {
  assert.ok(!waslByRef.has(reference), `${reference}: prefixed/internal hamza and muqatta'at are excluded`);
}
const hintReferences = (html, scope) => [...html.matchAll(/data-hamza-wasl="([^"]+)" data-word-number="(\d+)" data-wasl-scope="([^"]+)"/g)].filter(match => !scope || match[3] === scope).map(match => `${match[1]}:${match[2]}`);
const basicAyahReferences = html => hintReferences(html, 'basic').map(key => key.split(':').slice(0, 2).join(':'));
const waslToggleCount = (html) => [...html.matchAll(/\bdata-quran-wasl-toggle\b/g)].length;
const glyphParts = (html) => [...html.matchAll(/<span class="qcf-glyphs [^"]+" aria-hidden="true">([^<]*)<\/span>/g)].map((match) => match[1]);
const fallbackParts = (html) => [...html.matchAll(/<span class="qcf-fallback" aria-hidden="true">([^<]*)<\/span>/g)].map((match) => match[1]);
const accessibleParts = (html) => [...html.matchAll(/<span class="sr-only">([^<]*)<\/span>/g)].map((match) => match[1]);

// Every ayah must retain its original glyph codes, correct page and real Unicode fallback.
for (const [reference, entry] of Object.entries(data)) {
  const [surah, ayah] = reference.split(':').map(Number);
  const html = renderer.renderAyahBlock(surah, ayah);
  const { arabic, translation } = renderer.getAyahText(surah, ayah);
  assert.ok(arabic, reference);
  assert.ok(html.includes(`data-qcf-page="${entry.page}" data-qcf-ayah="${surah}-${ayah}"`), reference);
  assert.ok(html.includes(`class="qcf-glyphs qcf-page-${entry.page}" aria-hidden="true">${escape(entry.code_v2)}</span>`), reference);
  assert.ok(html.includes(`class="qcf-fallback" aria-hidden="true">${escape(arabic)}</span>`), reference);
  assert.ok(html.includes(`class="sr-only">${escape(arabic)}</span>`), reference);
  assert.ok(html.includes(escape(translation)), reference);
  assert.ok(!html.includes('data-hamza-wasl'), `${reference}: ordinary V2 has no hint`);
  assert.equal(waslToggleCount(html), 0, `${reference}: ordinary V2 has no hint toggle`);
  const tajweed = renderer.renderAyahBlock(surah, ayah, { tajweed: true });
  assert.ok(tajweed.includes(`data-qcf-page="${entry.page}" data-qcf-variant="tajweed"`), reference);
  assert.ok(tajweed.includes(`class="qcf-glyphs qcf-tajweed-page-${entry.page}"`), reference);
  assert.equal(glyphParts(tajweed).join(''), escape(entry.code_v2), `${reference}: all original QCF codes retain their order and spaces`);
  assert.equal(fallbackParts(tajweed).join(''), escape(arabic), `${reference}: all original Unicode is retained`);
  assert.equal(accessibleParts(tajweed).join(''), escape(arabic), `${reference}: screen readers retain the original verse`);
  assert.ok(tajweed.includes(escape(translation)), reference);
  assert.ok(!tajweed.includes(`class="qcf-glyphs qcf-page-`), reference);
  const hints = allByRef.get(reference) ?? [];
  assert.deepEqual(hintReferences(tajweed), hints.map((hint) => `${reference}:${hint.word_number}`), reference);
  assert.deepEqual(hintReferences(tajweed, 'basic'), (waslByRef.get(reference) ?? []).map(hint => `${reference}:${hint.word_number}`), `${reference}: basic/full scope is correct`);
  assert.equal(waslToggleCount(tajweed), hints.length ? 1 : 0, `${reference}: one toggle only when the ayah has hints`);
  assert.ok(!tajweed.includes('При начале'), 'inline hints have no explanatory label');
  for (const hint of hints) {
    const position = `${reference}:${hint.word_number}`;
    const hintIndex = tajweed.indexOf(`data-hamza-wasl="${reference}" data-word-number="${hint.word_number}"`);
    const hintEnd = tajweed.indexOf('</span>', hintIndex) + '</span>'.length;
    assert.ok(tajweed.slice(hintIndex, hintEnd).endsWith(`aria-hidden="true">${escape(hint.reading)}</span>`), position);
    assert.ok(tajweed.slice(hintEnd).startsWith('<span class="qcf-text"'), `${position}: hint is immediately before the original word`);
    const boundary = waslQcf[position];
    const originalWord = arabic.slice(boundary.unicodeStart, boundary.unicodeEnd);
    assert.equal(fallbackParts(tajweed.slice(hintEnd))[0], escape(originalWord), position);
    assert.equal(glyphParts(tajweed.slice(hintEnd))[0].replace(/\s/gu, ''), waslQcf[position].code, position);
  }
}
// Every V2 ayah has its own identity, including ranges crossing page boundaries.
const range = renderer.renderAyahRangeBlock(2, 1, 7);
assert.deepEqual([...range.matchAll(/data-qcf-page="(\d+)"/g)].map((match) => Number(match[1])), [2, 2, 2, 2, 2, 3, 3]);
for (let ayah = 1; ayah <= 7; ayah++) {
  assert.ok(range.includes(`data-qcf-ayah="2-${ayah}"`));
  assert.ok(range.includes(escape(renderer.getAyahText(2, ayah).arabic)));
  assert.ok(range.includes(`/mp3/002/00200${ayah}.mp3`));
}
assert.equal(renderer.renderAyahRangeBlock(2, 7, 1), range);
const tajweedRange = renderer.renderAyahRangeBlock(2, 1, 7, { tajweed: true });
assert.deepEqual([...new Set([...tajweedRange.matchAll(/data-qcf-page="(\d+)" data-qcf-variant="tajweed"/g)].map((match) => Number(match[1])))], [2, 3]);
assert.equal(renderer.renderAyahRangeBlock(2, 7, 1, { tajweed: true }), tajweedRange);
for (let ayah = 1; ayah <= 7; ayah++) assert.ok(tajweedRange.includes(`/mp3/002/00200${ayah}.mp3`));
assert.ok(!range.includes('data-hamza-wasl'), 'ordinary ranges have no hints');
assert.equal(waslToggleCount(range), 0);
assert.equal(waslToggleCount(tajweedRange), 1, 'a range has one toggle for the whole block');
assert.deepEqual(basicAyahReferences(tajweedRange), ['2:3']);
assert.ok(!tajweedRange.includes('При начале'));
const fatihaRange = renderer.renderAyahRangeBlock(1, 1, 7, { tajweed: true });
assert.deepEqual(basicAyahReferences(fatihaRange), ['1:2', '1:3', '1:6']);
assert.equal(waslToggleCount(fatihaRange), 1, 'multiple ayahs with hints share one block toggle');
assert.deepEqual(hintReferences(renderer.renderAyahRangeBlock(12, 50, 54, { tajweed: true }), 'basic'), [], 'internal hamza wasl belongs only to full mode');
assert.equal(waslToggleCount(renderer.renderAyahRangeBlock(111, 1, 2, { tajweed: true })), 0, 'a range without any wasl words has no menu button');
const multipleHints = renderer.renderAyahBlock(24, 35, { tajweed: true });
assert.deepEqual(hintReferences(multipleHints, 'basic'), ['24:35:1', '24:35:10', '24:35:13'], 'one ayah retains its beginning and both post-stop hints');
assert.deepEqual(hintReferences(renderer.renderAyahBlock(5, 3, { tajweed: true }), 'basic'), ['5:3:31', '5:3:40'], 'repeated words at different positions are retained');
assert.deepEqual(hintReferences(renderer.renderAyahRangeBlock(24, 34, 36, { tajweed: true }), 'basic'), ['24:35:1', '24:35:10', '24:35:13']);
const postStopRange = renderer.renderAyahRangeBlock(46, 3, 4, { tajweed: true });
assert.deepEqual(hintReferences(postStopRange, 'basic'), ['46:4:18']);
assert.ok(!postStopRange.includes('При начале'));
assert.equal(glyphParts(postStopRange).join('').replace(/\s/gu, ''), [data['46:3'].code_v2, data['46:4'].code_v2].join('').replace(/\s/gu, ''), 'range retains every original glyph across inline hints');

const { replaceQuranTags } = await loadSource('src/utils/replaceQuranTags.ts');
assert.equal(replaceQuranTags('{Quran}2:255{/Quran}'), renderer.renderAyahBlock(2, 255));
assert.equal(replaceQuranTags('{Quran}2:255-T{/Quran}'), renderer.renderAyahBlock(2, 255, { tajweed: true }));
assert.equal(replaceQuranTags('{quran}2:255-t{/quran}'), renderer.renderAyahBlock(2, 255, { tajweed: true }));
assert.equal(replaceQuranTags('{Quran}2:1-7-T{/Quran}'), tajweedRange);
assert.equal(replaceQuranTags('{Quran}2:7-1-T{/Quran}'), tajweedRange);
assert.equal(replaceQuranTags('{Quran}2:255-255-T{/Quran}'), renderer.renderAyahBlock(2, 255, { tajweed: true }));
assert.equal(replaceQuranTags('{Quran}2:1-7{/Quran}'), range);
assert.equal(replaceQuranTags('{Quran}2:255-X{/Quran}'), '{Quran}2:255-X{/Quran}');
assert.ok(replaceQuranTags('{Quran}1:6-T{/Quran}').includes('اِهۡدِنَا'));
assert.ok(!replaceQuranTags('{Quran}1:6{/Quran}').includes('data-hamza-wasl'));
assert.deepEqual(hintReferences(replaceQuranTags('{Quran}1:1-T{/Quran}'), 'basic'), []);
assert.equal(hintReferences(replaceQuranTags('{Quran}1:1-T{/Quran}')).length, 3);
const mixed = '{Quran}2:255{/Quran}\n{Quran}2:255-T{/Quran}';
const mixedHtml = replaceQuranTags(mixed);
assert.equal([...mixedHtml.matchAll(/data-quran-ayah="one_verse"/g)].length, 2);
assert.deepEqual([...new Set([...mixedHtml.matchAll(/data-qcf-page="(\d+)"/g)].map((match) => match[1]))], ['42']);
const audioIds = [...mixedHtml.matchAll(/<audio\s+id="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(audioIds).size, 2, 'ordinary and Tajweed audio controls must target different elements');
for (const tags of [
  '{Quran}1:6-T{/Quran}\n{Quran}1:6-T{/Quran}\n{Quran}1:6-6-T{/Quran}',
  '{Quran}1:6-7-T{/Quran}\n{Quran}1:7-6-T{/Quran}',
]) {
  const repeatedHtml = replaceQuranTags(tags);
  const repeatedAudioIds = [...repeatedHtml.matchAll(/<audio\s+id="([^"]+)"/g)].map((match) => match[1]);
  const buttonTargets = [...repeatedHtml.matchAll(/data-audio-id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(repeatedAudioIds).size, repeatedAudioIds.length, 'repeated examples need unique audio elements');
  assert.deepEqual(buttonTargets, repeatedAudioIds, 'each repeated example controls its own audio');
}

// Controlled FontFace promises exercise pending, failure, retry and dynamically inserted verses.
const qcfCss = await readFile(new URL('../src/styles/qcf-v2.css', import.meta.url), 'utf8');
assert.ok(!/@font-face\s*\{/u.test(qcfCss), 'static QCF CSS must not start a second font load');
assert.match(qcfCss, /\.qcf-glyphs\s*\{\s*display:\s*none/u, 'unready QCF codes stay hidden');
const { initQcfFonts } = await loadSource('src/utils/qcfFonts.ts');
class Element {
  constructor(page, text = 'glyph codes', variant, ayah = ({1: '1-1', 35: '2-222', 42: '2-255', 604: '114-1'})[page]) { this.dataset = { qcfPage: String(page), qcfVariant: variant, qcfAyah: ayah }; this.text = text; }
  matches() { return true; }
  querySelectorAll() { return []; }
  querySelector() { return { textContent: this.text }; }
}
const elements = [new Element(1), new Element(1), new Element(35)];
const css = [];
const requests = [];
const registeredFaces = new Set();
// CSS-connected faces can disappear when Vite replaces the initial stylesheet.
// Their abandoned load promises must not control the QCF reveal.
const abandonedCssFaces = [{ family: 'QCFA1-1', status: 'loading' }];
let cssFaces = abandonedCssFaces;
let observe;
let online;
let dark = false;
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'Chrome/140' }, configurable: true });
globalThis.HTMLElement = Element;
globalThis.MutationObserver = class {
  constructor(callback) { this.callback = callback; }
  observe(target) {
    assert.equal(target, document.documentElement, 'head startup observes parser-added body and later content');
    observe = this.callback;
  }
};
globalThis.FontFace = class {
  constructor(family, source, descriptors) {
    this.family = family;
    this.source = source;
    this.descriptors = descriptors;
    this.status = 'unloaded';
  }
  load() {
    this.status = 'loading';
    return new Promise((resolve, reject) => requests.push({
      face: this,
      resolve: (status = 'loaded') => { this.status = status; resolve(this); },
      reject: (error) => { this.status = 'error'; reject(error); },
    }));
  }
};
globalThis.document = {
  documentElement: { classList: { contains: () => dark } },
  querySelectorAll: () => elements,
  body: { querySelectorAll: () => elements },
  head: { append() {} },
  createElement: () => ({ dataset: {}, append: (text) => css.push(text) }),
  createTextNode: (text) => text,
  fonts: {
    load: () => { throw new Error('Do not depend on replaceable CSS font faces'); },
    add: (face) => { assert.equal(face.status, 'loaded'); registeredFaces.add(face); },
    [Symbol.iterator]: function* () { yield* cssFaces; yield* registeredFaces; },
  },
};
globalThis.window = { addEventListener: (name, callback) => { if (name === 'online') online = callback; } };
const flush = () => new Promise((resolve) => setImmediate(resolve));
initQcfFonts();
assert.equal(requests.length, 2, 'repeated instances of one ayah share one font request');
initQcfFonts();
assert.equal(requests.length, 2, 'later module initialization reuses the inline owner');
assert.equal(css.length, 0, 'glyphs must not be revealed while fonts are pending');
assert.equal(registeredFaces.size, 0, 'pending fonts must not be registered for rendering');
assert.equal(requests[0].face.family, 'QCFA1-1');
assert.equal(requests[0].face.source, 'url("/fonts/qcf-ayah-v2/1-1.woff2") format("woff2")');
assert.equal(requests[1].face.family, 'QCFA2-222');
assert.equal(requests[1].face.source, 'url("/fonts/qcf-ayah-v2/2-222.woff2") format("woff2")');
// Reproduce the relevant ordering: fonts start, then the CSS faces are replaced
// before downloads finish. The independent faces must still complete and reveal.
cssFaces = [];
assert.equal([...document.fonts].length, 0);
requests[0].resolve();
requests[1].reject(new Error('simulated network failure'));
const warn = console.warn;
console.warn = () => {};
await flush();
assert.equal(css.length, 1);
assert.equal(registeredFaces.size, 1);
assert.equal(abandonedCssFaces[0].status, 'loading', 'an abandoned CSS face does not block QCF');
assert.ok(css[0].includes('data-qcf-ayah="1-1"'));
assert.ok(!css.join('').includes('data-qcf-ayah="2-222"'), 'a failed page keeps Unicode visible');
online();
assert.equal(requests.length, 3, 'reconnect retries failures without reloading ready fonts');
requests[2].resolve('unloaded');
await flush();
assert.equal(css.length, 1, 'an unready FontFace must not reveal codes');
assert.equal(registeredFaces.size, 1, 'an unready FontFace must not be registered');
const dynamic = new Element(604);
elements.push(dynamic);
observe([{ addedNodes: [dynamic] }]);
assert.equal(requests.length, 4, 'client-rendered verses trigger their own font load');
requests[3].resolve();
await flush();
assert.ok(css[1].includes('data-qcf-ayah="114-1"'));
online();
requests[4].resolve();
await flush();
assert.ok(css[2].includes('data-qcf-ayah="2-222"'));
assert.equal(registeredFaces.size, 3);
// Another stylesheet update must not remove already loaded, script-owned faces
// or cause duplicate downloads for new copies of a ready ayah.
cssFaces = [{ family: 'QCFA1-1', status: 'unloaded' }];
const samePage = new Element(1);
elements.push(samePage);
observe([{ addedNodes: [samePage] }]);
assert.equal(requests.length, 5);
assert.ok([...document.fonts].some((face) => face.family === 'QCFA1-1' && face.status === 'loaded'));

// Another ayah on the SAME Mushaf page must not inherit the ready subset.
const neighbor = new Element(1, 'other codes', undefined, '1-2');
elements.push(neighbor);
observe([{ addedNodes: [neighbor] }]);
assert.equal(requests.length, 6);
assert.equal(requests[5].face.family, 'QCFA1-2');
assert.equal(requests[5].face.source, 'url("/fonts/qcf-ayah-v2/1-2.woff2") format("woff2")');
assert.ok(!css.join('').includes('data-qcf-ayah="1-2"'));
requests[5].resolve();
await flush();
assert.ok(css[3].includes('data-qcf-ayah="1-2"'));
assert.ok(!css[3].includes('data-qcf-ayah="1-1"'));
for (const reference of [undefined, '', '../p1', '1-1"]', '115-1', '1-287']) {
  const invalid = new Element(1);
  invalid.dataset.qcfAyah = reference;
  observe([{ addedNodes: [invalid] }]);
}
assert.equal(requests.length, 6, 'missing or unsafe ayah identities cannot request/reveal a font');
const sajdah = renderer.renderSajdahSymbol();
assert.ok(sajdah.includes('data-qcf-ayah="84-21"'));
assert.ok(sajdah.includes(escape(Array.from(data['84:21'].code_v2.replace(/\s/gu, '')).at(-2))));

// V2 and V4 on the same page must have independent readiness and retry state.
elements.splice(0, elements.length, new Element(42), new Element(42, 'codes', 'tajweed'), new Element(42, 'codes', 'tajweed'));
requests.length = 0;
css.length = 0;
registeredFaces.clear();
delete window.__hutbaQcfFontsInitialized;
initQcfFonts();
assert.equal(requests.length, 2);
assert.equal(requests[0].face.family, 'QCFA2-255');
assert.equal(requests[1].face.family, 'QCFT42');
assert.equal(requests[1].face.source, 'url("/fonts/mushaf-v4-woff2/colrv1/p42.woff2") format("woff2")');
requests[0].resolve();
requests[1].reject(new Error('Local Tajweed font unavailable'));
await flush();
assert.equal(css.length, 1);
assert.ok(css[0].includes(':not([data-qcf-variant="tajweed"])'), 'V2 readiness must exclude Tajweed glyphs');
online();
assert.equal(requests.length, 3);
requests[2].resolve();
await flush();
assert.ok(css[1].includes('[data-qcf-variant="tajweed"]'));
assert.ok(css[1].includes('font-family:"QCFT42"'));
assert.ok(css[1].includes('@font-palette-values --qcf-light-42'));
assert.ok(css[1].includes('base-palette:0'));
assert.ok(css[1].includes('base-palette:1'));
assert.ok(css[1].includes(':root.dark .qcf-text'));
dark = true;
online();
assert.equal(requests.length, 3, 'COLRv1 themes reuse one font file');
const newTajweed = new Element(2, 'codes', 'tajweed');
elements.push(newTajweed);
observe([{ addedNodes: [newTajweed] }]);
assert.equal(requests.length, 4, 'dynamic Tajweed verses load their own page');
requests[3].resolve();
await flush();

// Firefox must use the same local COLRv1 file and both CSS palettes. Changing
// theme during or after loading must not start another request or select OT-SVG.
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'Firefox/144' }, configurable: true });
dark = false;
elements.splice(0, elements.length, new Element(42, 'codes', 'tajweed'), new Element(42, 'codes', 'tajweed'));
requests.length = 0;
css.length = 0;
registeredFaces.clear();
delete window.__hutbaQcfFontsInitialized;
initQcfFonts();
assert.equal(requests.length, 1);
assert.equal(requests[0].face.family, 'QCFT42');
assert.equal(requests[0].face.source, 'url("/fonts/mushaf-v4-woff2/colrv1/p42.woff2") format("woff2")');
dark = true;
online();
assert.equal(requests.length, 1, 'changing theme while loading reuses the pending COLRv1 request');
requests[0].reject(new Error('COLRv1 font failed'));
await flush();
assert.equal(css.length, 0, 'a failed Firefox font retains Unicode');
online();
assert.equal(requests.length, 2);
assert.equal(requests[1].face.source, requests[0].face.source, 'retry still requests the shared COLRv1 file');
requests[1].resolve();
await flush();
assert.equal(registeredFaces.size, 1);
assert.equal(css.length, 1);
assert.ok(css[0].includes('font-family:"QCFT42"'));
assert.ok(css[0].includes('@font-palette-values --qcf-light-42'));
assert.ok(css[0].includes('base-palette:0'));
assert.ok(css[0].includes('base-palette:1'));
assert.ok(css[0].includes(':root.dark .qcf-text'));
dark = false;
online();
dark = true;
online();
assert.equal(requests.length, 2, 'ready COLRv1 face is reused in both Firefox themes');
assert.ok(requests.every(({face})=>!face.source.includes('ot-svg')));

// The inline head script runs before <body> exists and before all HTML arrives.
elements.length = 0;
requests.length = 0;
css.length = 0;
registeredFaces.clear();
delete window.__hutbaQcfFontsInitialized;
const previousBody = document.body;
document.body = null;
const nearViewport = new Set();
let intersect;
let intersectionOwner;
globalThis.IntersectionObserver = class {
  constructor(callback, options) {
    assert.equal(options.rootMargin, '100% 0px');
    intersect = callback;
    intersectionOwner = this;
  }
  observe(element) { nearViewport.add(element); }
  unobserve(element) { nearViewport.delete(element); }
};
initQcfFonts();
assert.equal(requests.length, 0);
const partial = new Element(1, '', undefined, '1-3');
elements.push(partial);
observe([{ addedNodes: [partial] }]);
assert.equal(nearViewport.size, 0, 'an empty streamed wrapper is not marked complete');
partial.text = data['1:3'].code_v2;
observe([{ addedNodes: [{ parentElement: { closest: () => partial } }] }]);
assert.ok(nearViewport.has(partial), 'late glyph text completes the streamed wrapper');
assert.equal(requests.length, 0, 'offscreen fonts wait for intersection');
intersect([{ target: partial, isIntersecting: false }], intersectionOwner);
assert.equal(requests.length, 0);
intersect([{ target: partial, isIntersecting: true }], intersectionOwner);
assert.equal(requests.length, 1);
assert.equal(requests[0].face.family, 'QCFA1-3');
requests[0].resolve();
await flush();
assert.ok(css[0].includes('data-qcf-ayah="1-3"'));
initQcfFonts();
assert.equal(requests.length, 1, 'a module call after head initialization adds no second owner');
document.body = previousBody;
delete globalThis.IntersectionObserver;
console.warn = warn;
console.log(`Passed: ${Object.keys(data).length} ayahs in V2/V4, ${waslEntries.length} basic / ${waslAll.length} full-mode wasl hints only in -T tags/ranges, verified Unicode/QCF boundaries, preserved source text, independent font readiness, retries and dynamic verses. No build.`);
