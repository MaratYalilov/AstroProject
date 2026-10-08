import { buildPageTitle, normalizeMetadataText } from './pageMetadata'

export const glossaryIndexMetadata = {
  title: 'Словарь исламских терминов | HUTBA.org',
  description: 'Словарь исламских терминов HUTBA.org: определения и пояснения для самостоятельного изучения ислама, арабского языка и чтения Корана.',
  ogTitle: 'Словарь исламских терминов',
  ogType: 'website',
}

export function buildGlossaryEntryMetadata(entry: {
  term: string
  description?: string
}) {
  return {
    title: buildPageTitle(entry.term, 'Словарь'),
    description: normalizeMetadataText(
      entry.description?.trim() ||
      `${entry.term}: определение и пояснение в словаре HUTBA.org.`
    ),
    ogTitle: `${entry.term} - Глоссарий`,
    ogType: 'article',
  }
}
