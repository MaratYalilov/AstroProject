const transliteration: Record<string, string> = {
  а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'yo', ж:'zh', з:'z', и:'i', й:'y', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f', х:'kh', ц:'ts', ч:'ch', ш:'sh', щ:'shch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya',
};
export const unassignedChapter = (book: number) => ({ id: `unassigned-${book}`, title_ru: 'Хадисы без указанной главы' });
export function chapterSlug(chapter: { id: string; title_ru: string }) {
  const title = chapter.title_ru.trim().replace(/^\d+\.\s*/, '').replace(/^Глава\s*:?\s*/i, '');
  const words = [...title.toLowerCase()].map(char => transliteration[char] ?? char).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').split('-').filter(Boolean);
  const short: string[] = [];
  for (const word of words) {
    if (short.join('-').length + word.length + (short.length ? 1 : 0) > 72) break;
    short.push(word);
    if (short.length === 8) break;
  }
  return `${chapter.id.toLowerCase()}-${short.join('-') || 'glava'}`;
}
export function chapterPath(collection: string, chapter: { id: string; title_ru: string }) {
  return `/hadith-sbornik/${collection}/chapter/${chapterSlug(chapter)}`;
}
