import indexRaw from '../../data/quran-index/index.json?raw';
import type { ReviewTopic, ReviewItem, VerseNote } from '../../utils/quranIndexReview';
import { normalizeSearch } from '../hadith/searchText';
import { nameVariants, descriptionAliases } from './synonyms';

export const thematicData = JSON.parse(indexRaw) as {
  topics: ReviewTopic[];
  basis_definitions: Record<string, string>;
  sources: Record<string, { title: string; url?: string }>;
  audit: { crossreference_resolution: { from_topic_id: string; target_topic_id: string }[] };
};
const data = thematicData;
const clean = (value: string) => value.replace(/[\u2013\u2014]/g, '-');
const fold = (value: string) => normalizeSearch(value).replace(/[’‘']/g, '').replace(/[^\p{L}\p{N}:]+/gu, ' ').trim().replace(/\s+/g, ' ');
const variants = new Map<string, string>(nameVariants.flatMap(group => group.map(name => [fold(name), fold(group[0])])));
const canonical = (value: string) => fold(value).split(' ').map(word => variants.get(word) ?? word).join(' ');
const topicHref = (id: string, itemId: string) => `/quran/index?topic=${encodeURIComponent(id)}&item=${encodeURIComponent(itemId)}`;
export interface TopicReason extends VerseNote {
  topic_id: string; item_id: string; title: string; description: string; href: string;
  basis_label: string; sources: { id: string; title: string }[];
}
export interface TopicHit {
  id: string; topic_id: string; item_id: string; title: string; description: string;
  href: string; verseCount: number; matched_field: 'title' | 'description' | 'explanation' | 'alias';
  via_topic_ids: string[];
}
type Entry = { topic: ReviewTopic; item: ReviewItem; title: string; description: string; notes: Map<string, string> };
const entries: Entry[] = data.topics.flatMap(topic => topic.items.map(item => ({
  topic, item, title: canonical([topic.title, ...(topic.aliases ?? [])].join(' ')),
  description: canonical(item.description),
  // Qualifications and usage notes are displayed, never positive search signals.
  notes: new Map(item.verse_keys.map(key => [key, canonical(`${item.verse_notes[key]?.explanation ?? ''} ${item.verse_notes[key]?.key_phrase.text ?? ''}`)])),
})));
const byTopic = new Map(data.topics.map(topic => [topic.id, topic]));
const outgoing = new Map<string, string[]>();
for (const ref of data.audit.crossreference_resolution) {
  if (!byTopic.has(ref.target_topic_id)) continue;
  outgoing.set(ref.from_topic_id, [...(outgoing.get(ref.from_topic_id) ?? []), ref.target_topic_id]);
}
export function resolveTopicIds(id: string, maxDepth = 4): string[] {
  const visited = new Set<string>();
  function visit(current: string, depth: number) {
    if (depth > maxDepth || visited.has(current) || !byTopic.has(current)) return;
    visited.add(current);
    // Cross references are followed only for topics without their own verses.
    if (!byTopic.get(current)!.items.some(item => item.verse_keys.length))
      for (const target of outgoing.get(current) ?? []) visit(target, depth + 1);
  }
  visit(id, 0);
  return [...visited].filter(key => byTopic.get(key)!.items.some(item => item.verse_keys.length));
}
function reason(entry: Entry, key: string): TopicReason {
  const note = entry.item.verse_notes[key];
  return { ...note, explanation: clean(note.explanation),
    qualification: note.qualification && clean(note.qualification), usage_note: note.usage_note && clean(note.usage_note),
    topic_id: entry.topic.id, item_id: entry.item.id, title: clean(entry.topic.title), description: clean(entry.item.description),
    href: topicHref(entry.topic.id, entry.item.id), basis_label: clean(data.basis_definitions[note.basis] ?? note.basis),
    sources: note.source_ids.map(id => ({ id, title: clean(data.sources[id]?.title ?? id) })),
  };
}
const reverse = new Map<string, Entry[]>();
for (const entry of entries) for (const key of entry.item.verse_keys) {
  if (!entry.item.verse_notes[key]) continue;
  reverse.set(key, [...(reverse.get(key) ?? []), entry]);
}
// A bounded preview for reading; full associations remain accessible in the index.
export function relatedTopics(key: string) {
  const rows = reverse.get(key) ?? [];
  return { total: rows.length, items: rows.slice(0, 3).map(entry => ({
    topic_id: entry.topic.id, item_id: entry.item.id, title: clean(entry.topic.title),
    description: clean(entry.item.description), href: topicHref(entry.topic.id, entry.item.id),
  })) };
}
export function searchTopics(query: string) {
  const q = canonical(query);
  const topics: TopicHit[] = [];
  const verses = new Map<string, TopicReason[]>();
  if (!q || /^\d+\s*:\s*\d+$/.test(q)) return { topics, verses };
  const terms = q.split(' ');
  const matches = (value: string) => terms.every(term => value.includes(term));
  const routed = new Set<string>(descriptionAliases.filter(alias => alias.queries.some(value => canonical(value) === q)).map(alias => alias.itemId));
  const redirects = new Map<string, string[]>();
  for (const topic of data.topics.filter(topic => !topic.items.some(item => item.verse_keys.length))) {
    if (!matches(canonical([topic.title, ...(topic.aliases ?? [])].join(' ')))) continue;
    for (const target of resolveTopicIds(topic.id)) redirects.set(target, [...(redirects.get(target) ?? []), topic.id]);
  }
  const scored: { entry: Entry; field: TopicHit['matched_field']; keys: string[]; score: number }[] = [];
  for (const entry of entries) {
    let field: TopicHit['matched_field'] = 'explanation', score = 0;
    let keys: string[] = [];
    if (routed.has(entry.item.id)) { field = 'alias'; score = 100; keys = entry.item.verse_keys; }
    else if (matches(entry.title) || redirects.has(entry.topic.id)) { field = 'title'; score = entry.title === q || redirects.has(entry.topic.id) ? 110 : 80; keys = entry.item.verse_keys; }
    else if (matches(`${entry.title} ${entry.description}`)) { field = 'description'; score = 90; keys = entry.item.verse_keys; }
    else { keys = entry.item.verse_keys.filter(key => matches(entry.notes.get(key) ?? '')); score = 40; }
    if (keys.length) scored.push({ entry, field, keys, score });
  }
  scored.sort((a, b) => b.score - a.score || a.entry.item.id.localeCompare(b.entry.item.id));
  for (const { entry, field, keys } of scored) {
    topics.push({ id: entry.item.id, topic_id: entry.topic.id, item_id: entry.item.id,
      title: clean(entry.topic.title), description: clean(entry.item.description), href: topicHref(entry.topic.id, entry.item.id),
      verseCount: keys.length, matched_field: field, via_topic_ids: redirects.get(entry.topic.id) ?? [] });
    for (const key of keys) {
      if (!entry.item.verse_notes[key]) continue;
      verses.set(key, [...(verses.get(key) ?? []), reason(entry, key)]);
    }
  }
  return { topics, verses };
}
