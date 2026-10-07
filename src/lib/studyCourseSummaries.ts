import type { CollectionEntry } from "astro:content";
import { loadAllInteractiveLessons } from "./interactive/loadInteractiveLesson";
import type { StudyCourse } from "./studyProgress";

export async function studyCourseSummaries(
  courses: CollectionEntry<"courses">[],
  lessons: CollectionEntry<"lessons">[],
): Promise<(StudyCourse & { subject: string })[]> {
  return Promise.all(courses.map(async ({ data }) => ({
    subject: data.subject,
    slug: data.slug,
    title: data.title,
    interactive: data.type === "interactive",
    lessonIds: data.type === "interactive"
      ? (await loadAllInteractiveLessons(data.subject, data.slug)).map(lesson => lesson.id)
      : lessons.filter(lesson => lesson.id.startsWith(`${data.subject}/${data.slug}/`)).map(lesson => lesson.id),
  })));
}
