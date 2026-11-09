import catalogRaw from '../data/quran-index/hadith-sources.json?raw';

interface HadithBinding {
  collection: string;
  cited_number: string;
  original_url: string;
  status: 'available' | 'pending_collection';
  record_id?: string;
  canonical_number?: string;
  url?: string;
}
const catalog = JSON.parse(catalogRaw) as {
  bindings: Record<string, HadithBinding>;
  collections: Record<string, { path: string; sha256: string }>;
};

export function localHadithSource(sourceId: string) {
  return Object.hasOwn(catalog.bindings, sourceId) ? catalog.bindings[sourceId] : undefined;
}

export function localizeHadithSource<T extends { title: string; url?: string }>(sourceId: string, source: T) {
  const binding = localHadithSource(sourceId);
  if (!binding) return source;
  return {
    ...source,
    // Keep the original citation as provenance, never as a fallback clickable URL.
    original_url: binding.original_url,
    url: binding.status === 'available' ? binding.url : undefined,
    availability: binding.status,
    local_hadith: {
      collection: binding.collection,
      cited_number: binding.cited_number,
      record_id: binding.record_id,
      canonical_number: binding.canonical_number,
      file: catalog.collections[binding.collection],
    },
  };
}
