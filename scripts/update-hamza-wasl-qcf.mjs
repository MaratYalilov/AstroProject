import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Preparation only. Rendering never requests the API.
const basic = JSON.parse(await readFile(new URL('../src/data/quran-hamza-wasl-starts.json', import.meta.url), 'utf8'));
const qcf = JSON.parse(await readFile(new URL('../src/data/quran-qcf-v2.json', import.meta.url), 'utf8'));
const source = JSON.parse(await readFile(new URL('../src/data/quran-uthmani-hafs.json', import.meta.url), 'utf8'));
const unicode = new Map(Object.values(source.quran['quran-uthmani-hafs']).map(verse => [`${verse.surah}:${verse.ayah}`, verse.verse]));
const normalizeCode = code => code.replace(/\s/gu, '');
// Compare equivalent hamza/ya spellings without changing the saved Quran text.
const letters = word => (word.normalize('NFD').match(/[\u0621-\u063a\u0641-\u064a\u0671]/gu) ?? []).join('').replace(/ٱ/gu, 'ا');
const sameLetters = (a, b) => a.length === b.length && [...a].every((letter, index) => letter === b[index] || (letter === 'ى' && /[اي]/u.test(b[index])) || (b[index] === 'ى' && /[اي]/u.test(letter)));
const cacheOption = process.argv.indexOf('--cache-dir');
const cacheDir = cacheOption < 0 ? null : process.argv[cacheOption + 1];
if (cacheDir) await mkdir(cacheDir, { recursive: true });
const results = new Map();
const jobs = Array.from({ length: 114 }, (_, index) => index + 1);
let next = 0;
let done = 0;
let checkedAyahs = 0;

async function fetchChapterPage(surah, page) {
  const cacheFile = cacheDir ? join(cacheDir, `${surah}-${page}.json`) : null;
  if (cacheFile) {
    try { return JSON.parse(await readFile(cacheFile, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const url = `https://api.quran.com/api/v4/verses/by_chapter/${surah}?words=true&word_fields=code_v2,text_uthmani&fields=code_v2,v2_page&per_page=50&page=${page}`;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`${surah}, page ${page}: HTTP ${response.status}`);
      const data = await response.json();
      if (cacheFile) {
        const compact = { pagination: data.pagination, verses: data.verses.map(verse => ({
          verse_key: verse.verse_key, code_v2: verse.code_v2, v2_page: verse.v2_page,
          words: verse.words.map(({ position, text_uthmani, code_v2, char_type_name }) => ({ position, text_uthmani, code_v2, char_type_name })),
        })) };
        await writeFile(cacheFile, JSON.stringify(compact));
      }
      return data;
    } catch (error) { lastError = error; }
  }
  throw lastError;
}

function checkVerse(verse) {
  const key = verse.verse_key;
  const arabic = unicode.get(key);
  const localCode = qcf[key].code_v2;
  const glyphs = [...localCode.matchAll(/\S/gu)];
  assert.equal(normalizeCode(verse.code_v2), normalizeCode(localCode), `${key}: verse codes changed`);
  assert.equal(verse.v2_page, qcf[key].page, `${key}: page changed`);
  assert.equal(verse.words.map(word => normalizeCode(word.code_v2)).join(''), normalizeCode(localCode), `${key}: word codes must cover the full verse`);
  const sourceLetters = [];
  for (let index = 0; index < arabic.length; index++) {
    for (const letter of letters(arabic[index])) sourceLetters.push({ letter, index });
  }
  const apiLetters = verse.words.filter(word => word.char_type_name === 'word').map(word => letters(word.text_uthmani)).join('');
  const localLetters = sourceLetters.map(item => item.letter).join('');
  // Some local first ayahs include a prefixed basmala absent from their QCF codes.
  // Preserve it in Unicode, but do not invent QCF positions for the preface.
  const basmala = 'بسماللهالرحمنالرحيم';
  const prefaceLength = key !== '1:1' && key.endsWith(':1') && localLetters.startsWith(basmala) && sameLetters(apiLetters, localLetters.slice(basmala.length)) ? basmala.length : 0;
  assert.ok(sameLetters(apiLetters, localLetters.slice(prefaceLength)), `${key}: the full word streams must match: ${apiLetters} / ${localLetters}`);
  let cursor = 0;
  let letterOffset = prefaceLength;
  for (const word of verse.words) {
    const code = normalizeCode(word.code_v2);
    if (word.char_type_name === 'word') {
      const wordLetters = letters(word.text_uthmani);
      const unicodeStart = sourceLetters[letterOffset].index;
      let unicodeEnd = sourceLetters[letterOffset + wordLetters.length]?.index ?? arabic.length;
      while (unicodeEnd > unicodeStart && /[\s۞۩]/u.test(arabic[unicodeEnd - 1])) unicodeEnd--;
      const originalWord = arabic.slice(unicodeStart, unicodeEnd);
      assert.ok(sameLetters(letters(originalWord), wordLetters), `${key}:${word.position}: different word`);
      if (originalWord.startsWith('ٱ')) {
        const prefix = word.text_uthmani.match(/^[\s۞۩]+/u)?.[0] ?? '';
        const prefixGlyphs = [...prefix].filter(char => char === '۞' || char === '۩').length;
        const start = glyphs[cursor + prefixGlyphs].index;
        const last = glyphs[cursor + code.length - 1];
        const end = last.index + last[0].length;
        const wordCode = code.slice(prefixGlyphs);
        assert.equal(normalizeCode(localCode.slice(start, end)), wordCode);
        results.set(`${key}:${word.position}`, { start, end, code: wordCode, unicodeStart, unicodeEnd });
      }
      letterOffset += wordLetters.length;
    }
    cursor += code.length;
  }
  checkedAyahs++;
}

async function worker() {
  while (next < jobs.length) {
    const surah = jobs[next++];
    let page = 1;
    do {
      const response = await fetchChapterPage(surah, page);
      for (const verse of response.verses) checkVerse(verse);
      page = response.pagination.next_page;
    } while (page);
    done++;
    if (done % 10 === 0 || done === jobs.length) console.log(`QCF word positions: ${done}/${jobs.length} surahs, ${results.size} words`);
  }
}

await Promise.all(Array.from({ length: 4 }, worker));
assert.equal(checkedAyahs, 6236);
for (const entry of basic) {
  const key = `${entry.surah}:${entry.ayah}:${entry.word_number}`;
  const position = results.get(key);
  assert.ok(position, `${key}: the original basic hint is retained`);
  const word = unicode.get(`${entry.surah}:${entry.ayah}`).slice(position.unicodeStart, position.unicodeEnd).replace(/[\sۖۗۘۙۚۛۜ۞۩]/gu, '');
  assert.equal(word, entry.word, `${key}: the basic word number is unchanged`);
}
const output = Object.fromEntries([...results].sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true })));
await writeFile(new URL('../src/data/quran-hamza-wasl-qcf.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');
console.log(`Saved ${results.size} verified word positions after checking all ${checkedAyahs} ayahs. Original Quran/QCF data unchanged.`);
