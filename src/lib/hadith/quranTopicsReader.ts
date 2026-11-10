import { thematicData, resolveTopicIds } from '../library-search/topics';
import { basisLabels, sourceUrl } from '../../utils/quranIndexBasis';
import { localizeHadithSource } from '../../utils/quranIndexHadith';
import { localizeTafsirSource, originalLocalTafsir } from '../../utils/quranIndexTafsirs';
import { readerAyah, type ReaderAyah } from './quranReader';
import { chapterSlug } from './paths';
import type { ReviewTopic, ReviewItem } from '../../utils/quranIndexReview';

export const topicsRoot = '/quran/topics';
const clean = (value: string) => value.replace(/[\u2013\u2014]/g, '-');
export const topicBookPath = (topic: ReviewTopic) => `${topicsRoot}/topic/${chapterSlug({ id: topic.id, title_ru: topic.title })}`;
export const topicChapterPath = (item: ReviewItem) => `${topicsRoot}/chapter/${chapterSlug({ id: item.id, title_ru: item.description })}`;
const books = thematicData.topics.map((topic, index) => ({ topic, id: index + 1 }));
const bookRoutes = new Map(books.map(book => [topicBookPath(book.topic), book]));
const chapterRoutes = new Map(books.flatMap(book => book.topic.items.map(item => [topicChapterPath(item), { ...book, item }] as const)));
export const quranTopicsCatalog = {
  id: 'quran-topics', title: 'Тематический указатель Корана', arabic: '', href: topicsRoot,
  books: books.map(({ topic, id }) => ({ id, title_ru: clean(topic.title), title_ar: '', count: topic.items.length, href: topicBookPath(topic) })),
};
export function topicChapters(bookId: number) {
  const book = books.find(book => book.id === bookId);
  return book ? book.topic.items.map(item => ({ id: item.id, book_id: book.id, title_ru: clean(item.description), title_ar: '', count: item.verse_keys.length, href: topicChapterPath(item) })) : null;
}
export interface ThematicAyah extends ReaderAyah {
  thematic: {
    keyPhrase: string; explanation: string; qualification?: string; usageNote?: string; basis: string;
    context: { key: string; translation: string; href: string }[];
    sources: { id: string; title: string; href?: string; inlineTafsir?: boolean }[];
  };
}
export function readQuranTopicsView(pathname: string) {
  const path = pathname.replace(/\/$/, '');
  const base = { collection: 'quran-topics', title: quranTopicsCatalog.title, records: [] };
  if (path === topicsRoot) return base;
  const book = bookRoutes.get(path);
  if (book) return { ...base, book: book.id, title: clean(book.topic.title), topicNote: book.topic.scope_note,
    topicLinks: resolveTopicIds(book.topic.id).filter(id => id !== book.topic.id).map(id => {
      const target = books.find(book => book.topic.id === id)!;
      return { title: clean(target.topic.title), href: topicBookPath(target.topic) };
    }) };
  const chapter = chapterRoutes.get(path);
  if (!chapter) return null;
  const ayahs: ThematicAyah[] = chapter.item.verse_keys.map(key => {
    const [surah, ayah] = key.split(':').map(Number);
    const note = chapter.item.verse_notes[key];
    return { ...readerAyah(surah, ayah), thematic: {
      keyPhrase: clean(note.key_phrase.text), explanation: clean(note.explanation),
      qualification: note.qualification && clean(note.qualification), usageNote: note.usage_note && clean(note.usage_note),
      basis: basisLabels[note.basis] ?? clean(note.basis),
      context: (note.context_verse_keys ?? []).map(key => {
        const [s, a] = key.split(':').map(Number), verse = readerAyah(s, a);
        return { key, translation: clean(verse.translation), href: verse.href };
      }),
      sources: note.source_ids.filter(id => id !== 'site-quran').map(id => {
        const source = localizeHadithSource(id, localizeTafsirSource(id, thematicData.sources[id] ?? { title: id }));
        return { id, title: clean(source?.title ?? id), href: sourceUrl(source?.url), inlineTafsir: originalLocalTafsir(id)?.book === 'katheer' };
      }),
    } };
  });
  return { ...base, book: chapter.id, chapter: chapter.item.id, title: clean(chapter.item.description), topicTitle: clean(chapter.topic.title),
    canonicalPath: path, ayahs };
}
