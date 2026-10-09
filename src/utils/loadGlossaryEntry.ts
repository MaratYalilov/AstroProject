import type { GlossaryEntryPayload } from '../lib/glossary/glossaryPageData'

/** Cache selected articles, including requests already in flight. Failed requests can be retried. */
export function createGlossaryEntryLoader(
  initial?: GlossaryEntryPayload,
  request: typeof fetch = (...args) => fetch(...args),
) {
  const cache = new Map<string, Promise<GlossaryEntryPayload>>()
  if (initial) cache.set(initial.entry.data.url_slug, Promise.resolve(initial))

  return (slug: string): Promise<GlossaryEntryPayload> => {
    const existing = cache.get(slug)
    if (existing) return existing
    const pending = request(`/api/glossary/${encodeURIComponent(slug)}.json`)
      .then(async response => {
        if (!response.ok) throw new Error(`Glossary request failed: ${response.status}`)
        const payload: GlossaryEntryPayload = await response.json()
        if (payload.entry?.data.url_slug !== slug || typeof payload.entry.body !== 'string' || !payload.lessonLinks) {
          throw new Error('Invalid glossary article response')
        }
        return payload
      })
      .catch(error => {
        cache.delete(slug)
        throw error
      })
    cache.set(slug, pending)
    return pending
  }
}
