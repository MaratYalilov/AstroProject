import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

// Preparation only. See the renderer README, section 2.9, for the rule sources.
const source = JSON.parse(await readFile(new URL('../src/data/quran-uthmani-hafs.json', import.meta.url), 'utf8'));
const basic = JSON.parse(await readFile(new URL('../src/data/quran-hamza-wasl-starts.json', import.meta.url), 'utf8'));
const positions = JSON.parse(await readFile(new URL('../src/data/quran-hamza-wasl-qcf.json', import.meta.url), 'utf8'));
const unicode = new Map(Object.values(source.quran['quran-uthmani-hafs']).map(verse => [`${verse.surah}:${verse.ayah}`, verse.verse]));
const known = new Map(basic.map(entry => [entry.word, entry.reading]));
const lamVerbs = new Set(['ٱلۡتَقَتَا', 'ٱلۡتَقَى', 'ٱلۡتَقَيۡتُمۡ']);
const baseLetter = /[\u0621-\u063a\u0641-\u064a\u0671]/gu;

function readingFor(word) {
  if (known.has(word)) return known.get(word);
  // 49:11: the second, internal hamzat al-wasl is not pronounced either.
  if (word === 'ٱلِٱسۡمُ') return 'اَلِسۡمُ';
  let vowel;
  if (word.startsWith('ٱل') && !lamVerbs.has(word)) vowel = 'َ';
  else {
    const skeleton = (word.match(baseLetter) ?? []).join('');
    const letters = [...word.matchAll(/[\u0621-\u063a\u0641-\u064a\u0671][^\u0621-\u063a\u0641-\u064a\u0671]*/gu)].map(match => match[0]);
    // Shaddah represents two letters; its first copy is the second letter.
    const third = letters[1]?.includes('ّ') ? letters[1] : letters[2];
    const thirdVowel = third?.match(/[َُِ]/u)?.[0];
    assert.ok(thirdVowel, `Review the third-letter vowel of ${word}`);
    const irregularNoun = /^ٱ(?:سم|بن|مر|ثن)/u.test(skeleton);
    const temporaryDamma = /^ٱ(?:قضو|بنو|مضو|مشو|ئتو)/u.test(skeleton);
    vowel = thirdVowel === 'ُ' && !irregularNoun && !temporaryDamma ? 'ُ' : 'ِ';
  }
  let rest = word.slice(1);
  // At a new beginning the second, sakin hamza becomes a matching madd letter.
  if (/^[ئؤء][ْۡ]/u.test(rest)) rest = (vowel === 'ُ' ? 'و' : 'ي') + rest.slice(2);
  return `ا${vowel}${rest}`;
}

const output = [];
for (const [key, position] of Object.entries(positions)) {
  const [surah, ayah, word_number] = key.split(':').map(Number);
  assert.ok(Number.isInteger(position.unicodeStart) && Number.isInteger(position.unicodeEnd), 'Run update-hamza-wasl-qcf.mjs first');
  const word = unicode.get(`${surah}:${ayah}`).slice(position.unicodeStart, position.unicodeEnd).replace(/[\sۖۗۘۙۚۛۜ۞۩]/gu, '');
  assert.ok(word.startsWith('ٱ'), key);
  output.push({ surah, ayah, word_number, word, reading: readingFor(word) });
}
const byPosition = new Map(output.map(entry => [`${entry.surah}:${entry.ayah}:${entry.word_number}`, entry]));
for (const entry of basic) assert.deepEqual(byPosition.get(`${entry.surah}:${entry.ayah}:${entry.word_number}`), entry, 'The original basic list must be retained unchanged');
assert.ok(output.length > 10000);
assert.equal(byPosition.size, output.length);
await writeFile(new URL('../src/data/quran-hamza-wasl-all.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');
console.log(`Saved ${output.length} words in ${new Set(output.map(entry => `${entry.surah}:${entry.ayah}`)).size} ayahs; ${new Set(output.map(entry => entry.word)).size} spellings. The basic list and Quran text are unchanged.`);
