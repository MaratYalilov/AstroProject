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

