import bukhari from '../../data/hadis/bukhari_hutba.json';
import muslim from '../../data/hadis/muslim_hutba.json';
import abudawud from '../../data/hadis/abudawud_hutba.json';

export interface HadithRecord {
  id: string;
  book_id: number;
  chapter_id: string | null;
  hadith_numbers: (number | string)[];
  arabic: { parts: { kind: string; text: string }[] };
  grading?: { ar?: string[]; ru?: string[] };
  russian: {
    full_text: string;
    source_id: string;
    explanations?: { kind: string; title?: string; text: string; references?: (string | { collection?: string; number?: number; title?: string; url: string })[] }[];
  };
}
export interface Collection {
  collection: string;
  title_ru: string;
  title_ar: string;
  translation_sources: Record<string, { title: string }>;
  books: { id: number; title_ru: string; title_ar: string }[];
  chapters: { id: string; book_id: number; title_ru: string; title_ar: string }[];
  records: HadithRecord[];
}
// Register future corpora here using the same normalized schema.
export const collections: Collection[] = [bukhari, muslim, abudawud];
export const plannedCollections: { id: string; title: string; arabic: string }[] = [];
export const text = (value: string) => value.replace(/[\u2013\u2014]/g, '-');
export const normalize = (value: string) => value.toLocaleLowerCase('ru').normalize('NFKD')
  .replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ё/g, 'е');
export const collectionPath = (collection: Collection) => `/hadith-sbornik/${collection.collection}`;
export const recordPath = (collection: Collection, record: HadithRecord) => {
  const number = record.hadith_numbers[0];
  const variants = collection.records.filter(r => r.hadith_numbers.some(n => String(n) === String(number)));
  const variant = variants.indexOf(record) + 1;
  return `${collectionPath(collection)}/${encodeURIComponent(String(number))}${variant > 1 ? `-${variant}` : ''}`;
};
export const indexes = new Map(collections.map(collection => [collection.collection, {
  numbers: new Map(collection.records.slice().reverse().flatMap(record => record.hadith_numbers.map(number => [String(number), record] as const))),
  search: collection.records.map(record => ({ record, value: normalize(`${record.russian.full_text} ${record.arabic.parts.map(p => p.text).join(' ')} ${(record.russian.explanations ?? []).map(e => e.text).join(' ')}`) })),
}]));
