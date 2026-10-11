import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
async function bundle(file) {
  const result = await build({ configFile: false, root, logLevel: 'error', build: { ssr: `${root}${file}`, write: false } });
  const chunk = result.output.find((item) => item.type === 'chunk' && item.isEntry);
  return import(`data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`);
}
const renderer = await bundle('src/utils/quranRenderer.ts');
const data = JSON.parse(await readFile(new URL('../src/data/quran-qcf-v2.json', import.meta.url), 'utf8'));
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Every ayah must retain its original glyph codes, correct page and real Unicode fallback.
for (const [reference, entry] of Object.entries(data)) {
  const [surah, ayah] = reference.split(':').map(Number);
  const html = renderer.renderAyahBlock(surah, ayah);
  const { arabic, translation } = renderer.getAyahText(surah, ayah);
  assert.ok(arabic, reference);
  assert.ok(html.includes(`data-qcf-page="${entry.page}"`), reference);
  assert.ok(html.includes(`class="qcf-glyphs qcf-page-${entry.page}" aria-hidden="true">${escape(entry.code_v2)}</span>`), reference);
  assert.ok(html.includes(`class="qcf-fallback" aria-hidden="true">${escape(arabic)}</span>`), reference);
  assert.ok(html.includes(`class="sr-only">${escape(arabic)}</span>`), reference);
  assert.ok(html.includes(escape(translation)), reference);
  const tajweed = renderer.renderAyahBlock(surah, ayah, { tajweed: true });
  assert.ok(tajweed.includes(`data-qcf-page="${entry.page}" data-qcf-variant="tajweed"`), reference);
  assert.ok(tajweed.includes(`class="qcf-glyphs qcf-tajweed-page-${entry.page}" aria-hidden="true">${escape(entry.code_v2)}</span>`), reference);
  assert.ok(tajweed.includes(`class="qcf-fallback" aria-hidden="true">${escape(arabic)}</span>`), reference);
  assert.ok(tajweed.includes(escape(translation)), reference);
  assert.ok(!tajweed.includes(`class="qcf-glyphs qcf-page-`), reference);
}
// A range crossing a Mushaf page boundary must load both page fonts.
const range = renderer.renderAyahRangeBlock(2, 1, 7);
assert.deepEqual([...range.matchAll(/data-qcf-page="(\d+)"/g)].map((match) => Number(match[1])), [2, 3]);
for (let ayah = 1; ayah <= 7; ayah++) {
  assert.ok(range.includes(escape(renderer.getAyahText(2, ayah).arabic)));
  assert.ok(range.includes(`/mp3/002/00200${ayah}.mp3`));
}
assert.equal(renderer.renderAyahRangeBlock(2, 7, 1), range);
const tajweedRange = renderer.renderAyahRangeBlock(2, 1, 7, { tajweed: true });
assert.deepEqual([...tajweedRange.matchAll(/data-qcf-page="(\d+)" data-qcf-variant="tajweed"/g)].map((match) => Number(match[1])), [2, 3]);
assert.equal(renderer.renderAyahRangeBlock(2, 7, 1, { tajweed: true }), tajweedRange);
for (let ayah = 1; ayah <= 7; ayah++) assert.ok(tajweedRange.includes(`/mp3/002/00200${ayah}.mp3`));

const { replaceQuranTags } = await bundle('src/utils/replaceQuranTags.ts');
assert.equal(replaceQuranTags('{Quran}2:255{/Quran}'), renderer.renderAyahBlock(2, 255));
assert.equal(replaceQuranTags('{Quran}2:255-T{/Quran}'), renderer.renderAyahBlock(2, 255, { tajweed: true }));
assert.equal(replaceQuranTags('{quran}2:255-t{/quran}'), renderer.renderAyahBlock(2, 255, { tajweed: true }));
assert.equal(replaceQuranTags('{Quran}2:1-7-T{/Quran}'), tajweedRange);
assert.equal(replaceQuranTags('{Quran}2:7-1-T{/Quran}'), tajweedRange);
assert.equal(replaceQuranTags('{Quran}2:255-255-T{/Quran}'), renderer.renderAyahBlock(2, 255, { tajweed: true }));
assert.equal(replaceQuranTags('{Quran}2:1-7{/Quran}'), range);
assert.equal(replaceQuranTags('{Quran}2:255-X{/Quran}'), '{Quran}2:255-X{/Quran}');
const mixed = '{Quran}2:255{/Quran}\n{Quran}2:255-T{/Quran}';
const mixedHtml = replaceQuranTags(mixed);
assert.equal([...mixedHtml.matchAll(/data-qcf-page="42"/g)].length, 2);
const audioIds = [...mixedHtml.matchAll(/<audio\s+id="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(audioIds).size, 2, 'ordinary and Tajweed audio controls must target different elements');

// Controlled FontFace promises exercise pending, failure, retry and dynamically inserted verses.
const { initQcfFonts } = await bundle('src/utils/qcfFonts.ts');
class Element {
  constructor(page, text = 'glyph codes', variant) { this.dataset = { qcfPage: String(page), qcfVariant: variant }; this.text = text; }
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
const abandonedCssFaces = [{ family: 'QCF2001', status: 'loading' }];
let cssFaces = abandonedCssFaces;
let observe;
let online;
let dark = false;
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'Chrome/140' }, configurable: true });
globalThis.HTMLElement = Element;
globalThis.MutationObserver = class {
  constructor(callback) { this.callback = callback; }
  observe(target) {
    assert.equal(target, document.body, 'theme changes are handled by CSS, without an extra observer');
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
assert.equal(requests.length, 2, 'same-page ayahs share one font request');
assert.equal(css.length, 0, 'glyphs must not be revealed while fonts are pending');
assert.equal(registeredFaces.size, 0, 'pending fonts must not be registered for rendering');
assert.equal(requests[0].face.family, 'QCF2001');
assert.equal(requests[0].face.source, 'url("/fonts/mushaf-v2-woff2/p1.woff2") format("woff2")');
assert.equal(requests[1].face.family, 'QCF2035');
assert.equal(requests[1].face.source, 'url("/fonts/mushaf-v2-woff2/p35.woff2") format("woff2")');
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
assert.ok(css[0].includes('data-qcf-page="1"'));
assert.ok(!css.join('').includes('data-qcf-page="35"'), 'a failed page keeps Unicode visible');
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
assert.ok(css[1].includes('data-qcf-page="604"'));
online();
requests[4].resolve();
await flush();
assert.ok(css[2].includes('data-qcf-page="35"'));
assert.equal(registeredFaces.size, 3);
// Another stylesheet update must not remove already loaded, script-owned faces
// or cause duplicate downloads for new verses on a ready page.
cssFaces = [{ family: 'QCF2001', status: 'unloaded' }];
const samePage = new Element(1);
elements.push(samePage);
observe([{ addedNodes: [samePage] }]);
assert.equal(requests.length, 5);
assert.ok([...document.fonts].some((face) => face.family === 'QCF2001' && face.status === 'loaded'));

// V2 and V4 on the same page must have independent readiness and retry state.
elements.splice(0, elements.length, new Element(42), new Element(42, 'codes', 'tajweed'), new Element(42, 'codes', 'tajweed'));
requests.length = 0;
css.length = 0;
registeredFaces.clear();
initQcfFonts();
assert.equal(requests.length, 2);
assert.equal(requests[0].face.family, 'QCF2042');
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
console.warn = warn;
console.log(`Passed: ${Object.keys(data).length} ayahs in V2/V4, -T tags and ranges, independent font readiness, Unicode fallback, CSS replacement, retries, dynamic verses, shared local COLRv1 fonts and palettes for both themes including Firefox.`);
