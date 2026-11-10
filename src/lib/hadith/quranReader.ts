import surahs from '../../data/surahs.json';
import { getAyahText, renderAyahArabic } from '../../utils/quranRenderer';
import saadiRaw from '../../data/tafsir/saadi-reader-ru.json?raw';
import { chapterSlug, quranReaderPath, quranAyahPath } from './paths';
import { normalizeSearch, searchSnippet } from './searchText';
import { relatedTopics, searchTopics, type TopicReason } from '../library-search/topics';

const saadi = (JSON.parse(saadiRaw) as { verses: Record<string, string> }).verses;
export const surahPath = (surah: typeof surahs[number]) => `${quranReaderPath}/surah/${chapterSlug({ id: String(surah.num), title_ru: surah.name_ru })}`;
const routes = new Map(surahs.map(surah => [surahPath(surah), surah]));
export const quranCatalog = {
  id: 'quran', title: 'Коран', arabic: 'القرآن الكريم', href: quranReaderPath,
  books: surahs.map(surah => ({ id: surah.num, title_ru: `${surah.num}. ${surah.name_ru} - ${surah.meaning_ru}`, title_ar: surah.arabic_name, count: surah.ayahs, href: surahPath(surah) })),
};
export interface ReaderAyah {
  id: string; surah: number; ayah: number; arabic: string; arabicHtml: string; translation: string; audioSrc: string; tafsir: string; href: string;
  relatedTopics: ReturnType<typeof relatedTopics>;
}
export function readerAyah(surah: number, ayah: number): ReaderAyah {
  const { arabic, translation } = getAyahText(surah, ayah);
  const s = String(surah).padStart(3, '0'), a = String(ayah).padStart(3, '0');
  return { id: `${surah}-${ayah}`, surah, ayah, arabic: arabic ?? '', arabicHtml: renderAyahArabic(surah, ayah), translation,
    audioSrc: `/mp3/${s}/${s}${a}.mp3`, tafsir: saadi[`${surah}:${ayah}`] ?? '', href: quranAyahPath(surah, ayah), relatedTopics: relatedTopics(`${surah}:${ayah}`) };
}
export function readQuranView(pathname: string) {
  if (pathname.replace(/\/$/, '') === quranReaderPath) return { collection: 'quran', title: 'Коран', records: [] };
  const match = /^\/quran\/read\/ayah\/(\d+)-(\d+)\/?$/.exec(pathname);
  const surah = match ? surahs.find(surah => surah.num === Number(match[1])) : routes.get(pathname.replace(/\/$/, ''));
  if (!surah || match && (Number(match[2]) < 1 || Number(match[2]) > surah.ayahs)) return null;
  const ayahs: ReaderAyah[] = Array.from({ length: surah.ayahs }, (_, index) => {
    const ayah = index + 1;
    return readerAyah(surah.num, ayah);
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
export function searchQuran(query: string, thematic = searchTopics(query)) {
  const normalized = normalizeSearch(query.trim());
  const terms = normalized.split(/\s+/).filter(Boolean);
  const language: 'ar' | 'ru' = /\p{Script=Arabic}/u.test(query) ? 'ar' : 'ru';
  if (!terms.length) return [];
  const address = /^(\d+)\s*:\s*(\d+)$/.exec(normalized);
  const exactKey = address ? `${Number(address[1])}:${Number(address[2])}` : undefined;
  const selected = searchRows.filter(row => exactKey ? exactKey === `${row.surah}:${row.ayah}` : terms.every(term => row.normalized.includes(term)) || thematic.verses.has(`${row.surah}:${row.ayah}`));
  const thematicOrder = new Map([...thematic.verses.keys()].map((key, index) => [key, index]));
  // Exact references and literal matches keep priority; thematic ties follow description order.
  selected.sort((a, b) => Number(terms.every(term => b.normalized.includes(term))) - Number(terms.every(term => a.normalized.includes(term))) ||
    (thematicOrder.get(`${a.surah}:${a.ayah}`) ?? -1) - (thematicOrder.get(`${b.surah}:${b.ayah}`) ?? -1));
  return selected.map(row => {
    const reasons: TopicReason[] = thematic.verses.get(`${row.surah}:${row.ayah}`) ?? [];
    const literal = !!exactKey || terms.every(term => row.normalized.includes(term));
    return {
      id: `quran-${row.surah}-${row.ayah}`, kind: 'ayah' as const, collection: 'quran', collectionTitle: 'Коран', numbers: `${row.surah}:${row.ayah}`,
      href: quranAyahPath(row.surah, row.ayah), language, snippet: searchSnippet(language === 'ar' ? row.arabic : row.translation, query),
      matched_field: exactKey ? 'address' as const : literal ? (language === 'ar' ? 'arabic' as const : 'translation' as const) : 'topic' as const,
      reasons: reasons.slice(0, 3), reasonCount: reasons.length,
    };
  });
}
