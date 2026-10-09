import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection } from 'astro:content'
import { buildGlossaryEntry, type GlossaryEntry } from '@/lib/glossary/glossaryPageData'
import { loadGlossaryLessonLinks, type GlossaryLessonLinks } from '@/lib/glossary/loadGlossaryLessonLinks'

export const prerender = true

export const getStaticPaths: GetStaticPaths = async () => {
  const entries = await getCollection('glossary')
  const lessonLinks = await loadGlossaryLessonLinks(entries.flatMap(entry => entry.data.used_in))
  return entries.map(entry => ({
    params: { slug: entry.data.url_slug },
    props: { entry: buildGlossaryEntry(entry), lessonLinks },
  }))
}

export const GET: APIRoute = ({ props }) => {
  const { entry, lessonLinks } = props as { entry: GlossaryEntry; lessonLinks: GlossaryLessonLinks }
  const links = Object.fromEntries(entry.data.used_in
    .filter((href): href is string => typeof href === 'string' && Object.hasOwn(lessonLinks, href))
    .map(href => [href, lessonLinks[href]]))
  return new Response(JSON.stringify({ entry, lessonLinks: links }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
