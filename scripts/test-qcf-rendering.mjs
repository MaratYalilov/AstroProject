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
}
// A range crossing a Mushaf page boundary must load both page fonts.
const range = renderer.renderAyahRangeBlock(2, 1, 7);
assert.deepEqual([...range.matchAll(/data-qcf-page="(\d+)"/g)].map((match) => Number(match[1])), [2, 3]);
for (let ayah = 1; ayah <= 7; ayah++) {
  assert.ok(range.includes(escape(renderer.getAyahText(2, ayah).arabic)));
  assert.ok(range.includes(`/mp3/002/00200${ayah}.mp3`));
}
assert.equal(renderer.renderAyahRangeBlock(2, 7, 1), range);

// Controlled FontFace promises exercise pending, failure, retry and dynamically inserted verses.
const { initQcfFonts } = await bundle('src/utils/qcfFonts.ts');
class Element {
  constructor(page, text = 'glyph codes') { this.dataset = { qcfPage: String(page) }; this.text = text; }
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
globalThis.HTMLElement = Element;
globalThis.MutationObserver = class { constructor(callback) { observe = callback; } observe() {} };
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
console.warn = warn;
console.log(`Passed: ${Object.keys(data).length} ayahs, page-crossing ranges, pending/error Unicode fallback, exact-page readiness, CSS replacement during loading, deduplication, dynamic verses and reconnect retry.`);
