import indexRaw from '../data/quran-index/index.json?raw';
import { localizeTafsirSource } from './quranIndexTafsirs';
import { localizeHadithSource } from './quranIndexHadith';

export interface VerseNote {
  explanation: string;
  key_phrase: { text: string };
  basis: string;
  source_ids: string[];
  context_verse_keys?: string[];
  qualification?: string;
  usage_note?: string;
}
export interface ReviewItem {
  id: string;
  description: string;
  verse_keys: string[];
  verse_notes: Record<string, VerseNote>;
}
export interface ReviewTopic {
  id: string;
  title: string;
  aliases?: string[];
  scope_note?: string;
  see_also: string[];
  items: ReviewItem[];
}
// Only the retained site data is imported; research files live in the external archive.
const indexData = JSON.parse(indexRaw);
export const reviewedIndex = indexData as {
  topics: ReviewTopic[];
  sources: Record<string, { title: string; url?: string; hadith_grade?: string }>;
  basis_definitions: Record<string, string>;
};
for (const [id, source] of Object.entries(reviewedIndex.sources)) {
  reviewedIndex.sources[id] = localizeHadithSource(id, localizeTafsirSource(id, source));
}
export const finalAudit = indexData.audit as {
  counts: { topics: number; result: number; unique_verses: number; original: number; removed: number; added: number;
    merge_added_associations: number; merge_added_items: number; merge_added_topics: number };
  crossreference_resolution: { from_topic_id: string; label: string; target_topic_id: string }[];
};

export function normalizeSearch(text: string) {
  return text.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[’‘']/g, '').replace(/\s+/g, ' ').trim();
}
export function noteMatches(query: string, topic: ReviewTopic, item: ReviewItem, key: string, note: VerseNote) {
  if (!query) return true;
  // A verse address is exact: 2:25 must not match 2:255.
  if (/^\d+:\d+$/.test(query)) return key === query;
  const text = normalizeSearch([topic.title, ...(topic.aliases ?? []), item.description, key,
    note.explanation, note.key_phrase.text, note.qualification ?? ''].join(' '));
  return query.split(' ').every(word => text.includes(word));
}

export { sourceUrl, basisLabels } from './quranIndexBasis';

// Hadith and tafsir citations use the local source catalogs.
export const indexDownload = JSON.stringify(reviewedIndex, null, 2) + '\n';
