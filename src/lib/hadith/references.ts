export type HadithReference = string | { collection?: string; number?: number; title?: string; url?: string };

export function referenceUrl(reference: HadithReference): string {
  const url = typeof reference === 'string' ? reference : reference.url;
  if (url && /^https?:\/\//.test(url)) return url;
  if (typeof reference !== 'string' && ['bukhari', 'muslim', 'abudawud'].includes(reference.collection ?? '') && reference.number !== undefined) {
    return `/hadith-sbornik/${reference.collection}/${encodeURIComponent(String(reference.number))}`;
  }
  return '';
}
