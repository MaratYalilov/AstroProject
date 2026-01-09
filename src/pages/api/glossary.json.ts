import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'

export const GET: APIRoute = async () => {
  const entries = await getCollection('glossary')

  const data = Object.fromEntries(
    entries
      .filter(e => e.data.url_slug && e.data.description)
      .map(e => [
        e.data.url_slug,
        {
          term: e.data.term,
          description: e.data.description,
        }
      ])
  )

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
