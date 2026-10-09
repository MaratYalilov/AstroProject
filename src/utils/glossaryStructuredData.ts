import { glossaryIndexMetadata } from './glossaryMetadata'

export const GLOSSARY_SCHEMA_ID = 'glossary-structured-data'

type GlossarySchemaEntry = {
  body: string
  data: {
    term: string
    url_slug: string
    aliases?: string[]
    description?: string
  }
}

const htmlEntities: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '-', mdash: '-', laquo: '«', raquo: '»', hellip: '…',
}

function plainText(html: string): string {
  return html
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/<(script|style)\b[^>]*>[^]*?<\/\1\s*>/gi, ' ')
    .replace(/\{Quran\}[^]*?\{\/Quran\}/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      if (!code.startsWith('#')) return htmlEntities[code.toLowerCase()] ?? entity
      const value = code[1].toLowerCase() === 'x'
        ? parseInt(code.slice(2), 16)
        : parseInt(code.slice(1), 10)
      return value > 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff)
        ? String.fromCodePoint(value)
        : entity
    })
    .replace(/[\u2013\u2014]/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim()
}

function definitionText(entry: GlossarySchemaEntry): string {
  // Начальные абзацы содержат значение слова и его терминологическое определение.
  const paragraphs = [...entry.body.matchAll(/<p\b[^>]*>([^]*?)<\/p\s*>/gi)]
    .map(match => plainText(match[1]))
    .filter(Boolean)
  return paragraphs.slice(0, 2).join(' ')
    || plainText(entry.body)
    || plainText(entry.data.description ?? '')
}

export function buildGlossaryStructuredData(
  entries: Pick<GlossarySchemaEntry, 'data'>[],
  site: URL | string,
  active: GlossarySchemaEntry | null = null,
) {
  const glossaryUrl = new URL('/glossary', site).href
  const termSet = {
    '@type': 'DefinedTermSet',
    '@id': `${glossaryUrl}#defined-term-set`,
    name: 'Словарь исламских терминов HUTBA.org',
    url: glossaryUrl,
    inLanguage: 'ru',
  }
  const termIdentity = (entry: Pick<GlossarySchemaEntry, 'data'>) => {
    const url = new URL(`/glossary/${encodeURIComponent(entry.data.url_slug)}`, site).href
    return {
      '@type': 'DefinedTerm',
      '@id': `${url}#defined-term`,
      name: entry.data.term,
      url,
    }
  }

  if (!active) {
    return {
      '@context': 'https://schema.org',
      ...termSet,
      description: glossaryIndexMetadata.description,
      hasDefinedTerm: entries.map(termIdentity),
    }
  }

  const alternateNames = [...new Set([
    ...active.data.term.split(','),
    ...(active.data.aliases ?? []),
  ].map(name => name.trim()).filter(name => name && name !== active.data.term))]

  return {
    '@context': 'https://schema.org',
    ...termIdentity(active),
    ...(alternateNames.length ? { alternateName: alternateNames } : {}),
    description: definitionText(active),
    inDefinedTermSet: termSet,
  }
}

export function serializeGlossaryStructuredData(
  schema: ReturnType<typeof buildGlossaryStructuredData>,
): string {
  // Защита встроенного JSON-LD от закрывающего тега script в тексте статьи.
  return JSON.stringify(schema).replace(/</g, '\\u003c')
}

export function updateGlossaryStructuredData(
  entries: Pick<GlossarySchemaEntry, 'data'>[],
  site: URL | string,
  active: GlossarySchemaEntry | null,
): void {
  let script = document.getElementById(GLOSSARY_SCHEMA_ID)
  if (!script) {
    script = document.createElement('script')
    script.id = GLOSSARY_SCHEMA_ID
    document.head.appendChild(script)
  }
  script.setAttribute('type', 'application/ld+json')
  script.textContent = serializeGlossaryStructuredData(
    buildGlossaryStructuredData(entries, site, active),
  )
}
