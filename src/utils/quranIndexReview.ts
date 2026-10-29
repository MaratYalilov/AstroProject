import indexRaw from '../data/quran-index/index.json?raw';
import auditRaw from '../data/quran-index/audit.json?raw';
import reviewHistoryRaw from '../data/quran-index/review-history.json?raw';
import { localizeTafsirSource } from './quranIndexTafsirs';

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
interface Journal {
  decisions: { item_id: string; verse_key: string; decision: string; reason?: string; source_ids: string[] }[];
  additions: { item_id: string; verse_key: string; reason: string; source_ids: string[] }[];
  description_changes?: { item_id: string; before: string; after: string; reason: string }[];
  topic_changes?: { topic_id: string; before?: string; after?: string; reason: string }[];
  sources: Record<string, { title: string; url?: string }>;
}

// Only the retained site data is imported; research files live in the external archive.
export const reviewedIndex = JSON.parse(indexRaw) as {
  topics: ReviewTopic[];
  sources: Record<string, { title: string; url?: string; hadith_grade?: string }>;
  basis_definitions: Record<string, string>;
};
for (const [id, source] of Object.entries(reviewedIndex.sources)) {
  reviewedIndex.sources[id] = localizeTafsirSource(id, source);
}
export const finalAudit = JSON.parse(auditRaw) as {
  counts: { topics: number; result: number; unique_verses: number; original: number; removed: number; added: number;
    merge_added_associations: number; merge_added_items: number; merge_added_topics: number };
  crossreference_resolution: { from_topic_id: string; label: string; target_topic_id: string }[];
};

const reviewHistory = JSON.parse(reviewHistoryRaw) as { batches: Record<string, Journal>; merge: Journal };
const mergeJournal = reviewHistory.merge;
async function baselineJournalForTopic(position: number): Promise<Journal> {
  const first = Math.floor((position - 1) / 10) * 10 + 1;
  const key = `batch-${String(first).padStart(3, '0')}-${String(Math.min(first + 9, 537)).padStart(3, '0')}`;
  const journal = reviewHistory.batches[key];
  if (!journal) throw new Error(`Missing review history: ${key}`);
  return journal;
}

export async function journalForTopic(position: number): Promise<Journal> {
  const baseline: Journal = position <= 537 ? await baselineJournalForTopic(position)
    : { decisions: [], additions: [], sources: {} };
  return {
    ...baseline,
    // Rejected book candidates are catalogued separately; they were never saved index links.
    decisions: baseline.decisions,
    additions: [...baseline.additions, ...mergeJournal.additions],
    description_changes: baseline.description_changes ?? [],
    topic_changes: [...(baseline.topic_changes ?? []), ...(mergeJournal.topic_changes ?? [])],
    sources: { ...baseline.sources, ...mergeJournal.sources },
  };
}

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

export function sourceUrl(url?: string) {
  if (!url) return undefined;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try { const parsed = new URL(url); return ['https:', 'http:'].includes(parsed.protocol) ? url : undefined; }
  catch { return undefined; }
}

export const basisLabels: Record<string, string> = {
  language_analysis: 'Языковой разбор',
  quran_text: 'Текст аята', passage_context: 'Аят в контексте', context: 'Контекст',
  tafsir_interpretation: 'Толкование', tafsir_attribution: 'Отнесение в тафсире',
  tafsir_person_association: 'Именная связь в тафсире', tafsir_historical_context: 'Исторический контекст',
  sahih_hadith: 'Достоверный хадис', sahih_hadith_thematic: 'Тематическая связь по хадису',
  hadith_hasan_or_sahih: 'Хадис с указанной оценкой', hadith_and_tafsir: 'Хадис и тафсир',
};

// Preserve original citation URLs as provenance; the reader/download uses local tafsir links.
export const indexDownload = JSON.stringify(reviewedIndex, null, 2) + '\n';
