import { collections, indexes, normalize, collectionPath, recordPath, text, type HadithRecord } from './collections';
import { gradingInfo, isFromTwoSahihs, collectionMembership, type GradeId, type GradeFilterId } from './grading';
import { matchesHadithNumber, searchSnippet } from './searchText';
import { chapterPath, chapterSlug, unassignedChapter } from './paths';
import { isBookNoindex } from './indexing';
import { quranCatalog, readQuranView, searchQuran, type ReaderAyah } from './quranReader';
import { searchTopics, type TopicHit, type TopicReason } from '../library-search/topics';
import { quranTopicsCatalog, topicChapters, readQuranTopicsView, type ThematicAyah } from './quranTopicsReader';

const chapterRoutes = new Map(collections.map(c => [c.collection, new Map(c.chapters.map(ch => [chapterSlug(ch), ch]))]));

export const readerCatalog = [quranCatalog, quranTopicsCatalog, ...collections.map(c => ({
  id: c.collection, title: c.title_ru, arabic: c.title_ar, href: collectionPath(c),
  books: c.books.map(b => ({ ...b, count: c.records.filter(r => r.book_id === b.id).length, href: `/hadith-sbornik/${c.collection}/book/${b.id}` })),
}))];
export type ReaderCatalog = typeof readerCatalog;
export type ReaderRecord = HadithRecord & { href: string; sourceTitle: string };
export interface ReaderView {
  collection?: string;
  book?: number;
  chapter?: string;
  title: string;
  arabic?: string;
  records: ReaderRecord[];
  target?: string;
  canonicalPath?: string;
  noindex?: boolean;
  ayahs?: (ReaderAyah | ThematicAyah)[];
  basmalaHtml?: string;
  topicTitle?: string;
  topicNote?: string;
  topicLinks?: { title: string; href: string }[];
}
export function chaptersFor(collection: string, book: number) {
  if (collection === 'quran-topics') return topicChapters(book);
  const c = collections.find(c => c.collection === collection);
  if (!c || !c.books.some(b => b.id === book)) return null;
  const chapters = c.chapters.filter(ch => ch.book_id === book).map(ch => ({ ...ch, href: chapterPath(collection, ch),
    count: c.records.filter(r => r.chapter_id === ch.id && r.book_id === book).length,
  }));
  const unassigned = c.records.filter(r => r.book_id === book && !r.chapter_id);
  if (unassigned.length) chapters.push({ ...unassignedChapter(book), href: chapterPath(collection, unassignedChapter(book)), book_id: book, title_ar: '', count: unassigned.length });
  return chapters;
}
export function readView(pathname: string): ReaderView | null {
  if (/^\/quran\/topics(?:\/|$)/.test(pathname)) return readQuranTopicsView(pathname);
  if (/^\/quran\/read(?:\/|$)/.test(pathname)) return readQuranView(pathname);
  let parts: string[];
  try { parts = pathname.replace(/^\/hadith-sbornik\/?/, '').split('/').filter(Boolean).map(decodeURIComponent); }
  catch { return null; }
  if (!parts.length) return { title: 'Библиотека', records: [] };
  const c = collections.find(c => c.collection === parts[0]);
  if (!c) return null;
  const view: ReaderView = { collection: c.collection, title: c.title_ru, arabic: c.title_ar, records: [] };
  if (parts.length === 1) return view;
  if (parts.length === 3 && parts[1] === 'book') {
    const book = c.books.find(b => String(b.id) === parts[2]);
    return book ? { ...view, book: book.id, title: text(book.title_ru), arabic: book.title_ar, noindex: isBookNoindex(c.collection, book.id) } : null;
  }
  if (parts.length === 3 && parts[1] === 'chapter') {
    const chapter = chapterRoutes.get(c.collection)?.get(parts[2]);
    const unassigned = /^unassigned-(\d+)-/.exec(parts[2]);
    if (unassigned && parts[2] !== chapterSlug(unassignedChapter(Number(unassigned[1])))) return null;
    const book = chapter?.book_id ?? (unassigned ? Number(unassigned[1]) : undefined);
    if (book === undefined || !c.books.some(b => b.id === book)) return null;
    view.book = book; view.chapter = chapter?.id ?? unassignedChapter(book).id;
    view.noindex = isBookNoindex(c.collection, book);
    view.canonicalPath = chapterPath(c.collection, chapter ?? unassignedChapter(book));
    view.title = chapter ? text(chapter.title_ru) : 'Хадисы без указанной главы';
    view.arabic = chapter?.title_ar;
    view.records = c.records.filter(r => r.book_id === book && (chapter ? r.chapter_id === chapter.id : !r.chapter_id))
      .map(r => ({ ...r, href: recordPath(c, r), sourceTitle: c.translation_sources[r.russian.source_id]?.title ?? r.russian.source_id }));
    return view;
  }
  if (parts.length === 2) {
    const match = /^(.+?)(?:-([2-9]\d*|1\d+))?$/.exec(parts[1]);
    const record = match && c.records.filter(r => r.hadith_numbers.some(n => String(n) === match[1]))[Number(match[2] ?? 1) - 1];
    if (!record) return null;
    const chapter = record.chapter_id ? c.chapters.find(ch => ch.id === record.chapter_id) : unassignedChapter(record.book_id);
    const chapterView = chapter && readView(chapterPath(c.collection, chapter));
    return chapterView ? { ...chapterView, target: record.id, canonicalPath: recordPath(c, record) } : null;
  }
  return null;
}
export type SearchGroup = 'all' | 'topic' | 'ayah' | 'hadith';
export interface SearchHit { id: string; collection: string; collectionTitle: string; numbers: string; snippet: string; language: 'ar' | 'ru'; href: string; grade?: GradeId; membership?: string; kind?: 'ayah' | 'hadith'; matched_field?: 'address' | 'arabic' | 'translation' | 'topic'; reasons?: TopicReason[]; reasonCount?: number }
export interface SearchResults { hits: SearchHit[]; topics: TopicHit[]; counts: Record<Exclude<SearchGroup, 'all'>, number>; group: SearchGroup; total: number; page: number; query: string; unfilteredTotal: number; gradeCounts: Partial<Record<GradeFilterId, number>> }
export function searchLibrary(query: string, scope = '', page = 1, grade = '', group: SearchGroup = 'all'): SearchResults {
  const q = query.trim().slice(0, 200);
  const terms = normalize(q).split(/\s+/).filter(Boolean);
  const language = /\p{Script=Arabic}/u.test(q) ? 'ar' : 'ru';
  const hits: SearchHit[] = [];
  const thematic = !scope || scope === 'quran' || scope === 'quran-topics' ? searchTopics(q) : { topics: [], verses: new Map<string, TopicReason[]>() };
  const counts = { topic: thematic.topics.length, ayah: 0, hadith: 0 };
  let total = 0;
  let unfilteredTotal = 0;
  const gradeCounts: Partial<Record<GradeFilterId, number>> = {};
  const start = (page - 1) * 30;
  if (!terms.length) return { hits, topics: [], counts, group, total, page, query: q, unfilteredTotal, gradeCounts };
  if (!scope || scope === 'quran' || scope === 'quran-topics') {
    const ayahs = searchQuran(q, thematic);
    counts.ayah = ayahs.length;
    unfilteredTotal += ayahs.length;
    if (group === 'all' || group === 'ayah') for (const ayah of ayahs) {
      if (total >= start && hits.length < 30) hits.push(ayah);
      total++;
    }
  }
  for (const c of collections.filter(c => !scope || c.collection === scope)) {
    const numberMatch = (item: { record: HadithRecord }) =>
      item.record.hadith_numbers.some(n => matchesHadithNumber(n, q));
    const candidates = indexes.get(c.collection)!.search.filter(item => numberMatch(item) || terms.every(term => item.value.includes(term)));
    if (/^\d+[a-z]*$/i.test(q)) candidates.sort((a, b) => Number(numberMatch(b)) - Number(numberMatch(a)));
    for (const item of candidates) {
      const category = gradingInfo(item.record.grading).category;
      unfilteredTotal++;
      gradeCounts[category] = (gradeCounts[category] ?? 0) + 1;
      const fromTwoSahihs = isFromTwoSahihs(c.collection, item.record.book_id);
      if (fromTwoSahihs) gradeCounts['two-sahihs'] = (gradeCounts['two-sahihs'] ?? 0) + 1;
      if (grade === 'two-sahihs' ? !fromTwoSahihs : grade && category !== grade) continue;
      counts.hadith++;
      if (group !== 'all' && group !== 'hadith') continue;
      if (total >= start && hits.length < 30) {
        const body = text(language === 'ar' ? item.record.arabic.parts.map(part => part.text).join(' ') : item.record.russian.full_text);
        hits.push({ id: item.record.id, collection: c.collection, collectionTitle: c.title_ru,
          numbers: item.record.hadith_numbers.join(', '), href: recordPath(c, item.record), grade: category, membership: collectionMembership(c.collection, item.record.book_id),
          snippet: searchSnippet(body, q), language });
      }
      total++;
    }
  }
  if (group === 'topic') total = counts.topic;
  return { hits, topics: thematic.topics.slice(group === 'topic' ? start : 0, group === 'topic' ? start + 30 : 5), counts, group, total, page, query: q, unfilteredTotal, gradeCounts };
}
