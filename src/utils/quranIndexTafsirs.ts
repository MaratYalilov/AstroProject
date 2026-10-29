import catalogRaw from '../data/quran-index-tafsirs.json?raw';

interface TafsirEntry {
  book: string;
  sura: number;
  aya: number;
  title: string;
  paragraphs: string[];
}
interface TafsirBinding {
  entry_id: string;
  original_url: string;
  original_title: string;
  was_english_abridgement: boolean;
}
const catalog = JSON.parse(catalogRaw) as {
  sources: Record<string, TafsirBinding>;
  entries: Record<string, TafsirEntry>;
  russian_entries: Record<string, { paragraphs: string[]; raw_text_sha256: string }>;
  databases: Record<string, { title: string; path: string; sha256: string }>;
};

export function localTafsir(sourceId: string) {
  // Lookup only known identifiers; request parameters never become file paths or SQL.
  const binding = Object.hasOwn(catalog.sources, sourceId) ? catalog.sources[sourceId] : undefined;
  if (!binding) return undefined;
  const entry = catalog.entries[binding.entry_id];
  return { ...entry, binding, database: catalog.databases[entry.book], sourceId,
    russian: catalog.russian_entries[`${entry.sura}:${entry.aya}`] };
}

export function localizeTafsirSource<T extends { title: string; url?: string }>(sourceId: string, source: T) {
  const local = localTafsir(sourceId);
  if (!local) return source;
  return {
    ...source,
    title: `${local.title} (арабский текст)`,
    url: `/quran/index?tafsir=${encodeURIComponent(sourceId)}#selected-tafsir`,
    original_url: local.binding.original_url,
    original_title: local.binding.original_title,
    local_snapshot: { ...local.database, table: local.book, sura: local.sura, aya: local.aya },
  };
}
