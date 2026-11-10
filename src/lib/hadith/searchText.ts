export const normalizeSearch = (value: string) => value.toLocaleLowerCase('ru').normalize('NFKD')
  .replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ё/g, 'е');

export function matchesHadithNumber(number: number | string, query: string) {
  const value = normalizeSearch(String(number));
  const q = normalizeSearch(query.trim());
  if (value === q) return true;
  // A bare number includes its lettered variants, never longer numeric prefixes.
  return /^\d+$/.test(q) && /^(\d+)[a-z]+$/.exec(value)?.[1] === q;
}

// Keep original UTF-16 positions so matching without vowel marks preserves the displayed text.
export function searchRanges(value: string, query: string): [number, number][] {
  let normalized = '';
  const starts: number[] = [], ends: number[] = [];
  let offset = 0;
  for (const character of value) {
    const folded = normalizeSearch(character);
    if (!folded && ends.length) ends[ends.length - 1] = offset + character.length;
    for (let i = 0; i < folded.length; i++) { starts.push(offset); ends.push(offset + character.length); }
    normalized += folded;
    offset += character.length;
  }
  const ranges: [number, number][] = [];
  for (const term of new Set(normalizeSearch(query).split(/\s+/).filter(Boolean))) {
    let position = normalized.indexOf(term);
    while (position >= 0) {
      ranges.push([starts[position], ends[position + term.length - 1]]);
      position = normalized.indexOf(term, position + term.length);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }
  return merged;
}
export function searchSnippet(value: string, query: string) {
  const first = searchRanges(value, query)[0];
  const start = Math.max(0, (first?.[0] ?? 0) - 70);
  let end = Math.min(value.length, Math.max(start + 260, first?.[1] ?? 0));
  while (end < value.length && /\p{M}/u.test(value[end])) end++;
  return `${start ? '…' : ''}${value.slice(start, end)}${end < value.length ? '…' : ''}`;
}
