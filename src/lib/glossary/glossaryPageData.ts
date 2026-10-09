import type { GlossaryLessonLinks } from './loadGlossaryLessonLinks'

export type GlossarySummary = {
  id: string
  data: { term: string; url_slug: string; letter: string; aliases: string[] }
}

export type GlossaryEntry = GlossarySummary & {
  body: string
  data: GlossarySummary['data'] & { used_in: unknown[]; description?: string }
}

export type GlossaryEntryPayload = { entry: GlossaryEntry; lessonLinks: GlossaryLessonLinks }

type SourceEntry = GlossarySummary & {
  body?: string
  data: GlossarySummary['data'] & { used_in: unknown[]; description?: string }
}

/** Only fields used to display and search the list, without article bodies or backlinks. */
export function buildGlossarySummaries(entries: GlossarySummary[]): GlossarySummary[] {
  return entries.map(({ id, data }) => ({
    id,
    data: { term: data.term, url_slug: data.url_slug, letter: data.letter, aliases: data.aliases },
  }))
}

export function buildGlossaryEntry(entry: SourceEntry): GlossaryEntry {
  const summary = buildGlossarySummaries([entry])[0]
  return {
    ...summary,
    body: entry.body ?? '',
    data: { ...summary.data, used_in: entry.data.used_in, description: entry.data.description },
  }
}
