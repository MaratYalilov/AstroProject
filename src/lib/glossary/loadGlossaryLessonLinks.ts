import { getCollection } from 'astro:content'
import { loadAllInteractiveLessons } from '../interactive/loadInteractiveLesson'

export type GlossaryLessonLink = {
  title: string
  courseTitle: string
  coursePath: string
}

export type GlossaryLessonLinks = Record<string, GlossaryLessonLink>

/** Resolve only real lesson URLs, never arbitrary links from frontmatter. */
export async function loadGlossaryLessonLinks(references: unknown[]): Promise<GlossaryLessonLinks> {
  const requested = new Set(references.filter((value): value is string => typeof value === 'string'))
  const links: GlossaryLessonLinks = {}
  const [courses, lessons] = await Promise.all([
    getCollection('courses'),
    getCollection('lessons'),
  ])

  for (const course of courses) {
    const { subject, slug, title: courseTitle } = course.data
    const coursePath = `/${encodeURIComponent(subject)}/${encodeURIComponent(slug)}`
    const courseLessons = course.data.type === 'interactive'
      ? await loadAllInteractiveLessons(subject, slug)
      : lessons.filter(lesson => lesson.id.startsWith(`${subject}/${slug}/`) && !lesson.id.split('/').includes('theory'))

    for (const lesson of courseLessons) {
      const interactive = 'blocks' in lesson
      const href = interactive
        ? `${coursePath}/?lesson=${encodeURIComponent(lesson.slug)}`
        : `/lesson?subject=${encodeURIComponent(subject)}&course=${encodeURIComponent(slug)}&slug=${encodeURIComponent(lesson.id)}`
      if (!requested.has(href) || links[href]) continue
      const title = interactive ? lesson.title : lesson.data.title
      links[href] = {
        title: typeof title === 'string' ? title : title.map(segment => segment.text).join(''),
        courseTitle,
        coursePath,
      }
    }
  }

  return links
}
