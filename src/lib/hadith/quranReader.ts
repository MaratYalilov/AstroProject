import surahs from '../../data/surahs.json';
import { getAyahText, renderAyahArabic } from '../../utils/quranRenderer';
import saadiRaw from '../../data/tafsir/saadi-reader-ru.json?raw';
import { chapterSlug } from './paths';
import { normalizeSearch, searchSnippet } from './searchText';

const saadi = (JSON.parse(saadiRaw) as { verses: Record<string, string> }).verses;
export const surahPath = (surah: typeof surahs[number]) => `/hadith-sbornik/quran/surah/${chapterSlug({ id: String(surah.num), title_ru: surah.name_ru })}`;
const routes = new Map(surahs.map(surah => [surahPath(surah), surah]));
export const quranCatalog = {
  id: 'quran', title: 'Коран', arabic: 'القرآن الكريم',
  books: surahs.map(surah => ({ id: surah.num, title_ru: `${surah.num}. ${surah.name_ru} - ${surah.meaning_ru}`, title_ar: surah.arabic_name, count: surah.ayahs, href: surahPath(surah) })),
};
export interface ReaderAyah {
  id: string; surah: number; ayah: number; arabic: string; arabicHtml: string; translation: string; audioSrc: string; tafsir: string; href: string;
}
export function readQuranView(pathname: string) {
  if (pathname.replace(/\/$/, '') === '/hadith-sbornik/quran') return { collection: 'quran', title: 'Коран', records: [] };
  const match = /^\/hadith-sbornik\/quran\/ayah\/(\d+)-(\d+)\/?$/.exec(pathname);
  const surah = match ? surahs.find(surah => surah.num === Number(match[1])) : routes.get(pathname.replace(/\/$/, ''));
  if (!surah || match && (Number(match[2]) < 1 || Number(match[2]) > surah.ayahs)) return null;
  const ayahs: ReaderAyah[] = Array.from({ length: surah.ayahs }, (_, index) => {
    const ayah = index + 1;
    const { arabic, translation } = getAyahText(surah.num, ayah);
    const s = String(surah.num).padStart(3, '0'), a = String(ayah).padStart(3, '0');
    return { id: `${surah.num}-${ayah}`, surah: surah.num, ayah, arabic: arabic ?? '', arabicHtml: renderAyahArabic(surah.num, ayah), translation,
      audioSrc: `/mp3/${s}/${s}${a}.mp3`, tafsir: saadi[`${surah.num}:${ayah}`] ?? '', href: `/hadith-sbornik/quran/ayah/${surah.num}-${ayah}` };
  });
  return { collection: 'quran', book: surah.num, chapter: `surah-${surah.num}`, title: `${surah.num}. ${surah.name_ru} - ${surah.meaning_ru}`,
    arabic: surah.arabic_name, ayahs, records: [], target: match ? `${surah.num}-${Number(match[2])}` : undefined,
    canonicalPath: surahPath(surah),
    basmalaHtml: surah.num !== 1 && surah.num !== 9 ? renderAyahArabic(1, 1) : undefined };
}
const searchRows = surahs.flatMap(surah => Array.from({ length: surah.ayahs }, (_, index) => {
  const ayah = index + 1;
  const { arabic = '', translation } = getAyahText(surah.num, ayah);
  return { surah: surah.num, ayah, arabic, translation, normalized: normalizeSearch(`${arabic} ${translation}`) };
}));
export function searchQuran(query: string) {
  const normalized = normalizeSearch(query.trim());
  const terms = normalized.split(/\s+/).filter(Boolean);
  const language: 'ar' | 'ru' = /\p{Script=Arabic}/u.test(query) ? 'ar' : 'ru';
  if (!terms.length) return [];
  return searchRows.filter(row => terms.every(term => row.normalized.includes(term)) || normalized === `${row.surah}:${row.ayah}`).map(row => ({
    id: `quran-${row.surah}-${row.ayah}`, kind: 'ayah' as const, collection: 'quran', collectionTitle: 'Коран', numbers: `${row.surah}:${row.ayah}`,
    href: `/hadith-sbornik/quran/ayah/${row.surah}-${row.ayah}`, language, snippet: searchSnippet(language === 'ar' ? row.arabic : row.translation, query),
  }));
}
