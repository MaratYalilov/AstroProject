import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { loadAllInteractiveLessons } from "../lib/interactive/loadInteractiveLesson";
import { teachers, teacherPath } from "../lib/teachers";

export const prerender = true;

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[character];
  });
}

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error("Sitemap requires the Astro site setting.");

  const [subjects, courses, lessons, glossary] = await Promise.all([
    getCollection("subjects"),
    getCollection("courses"),
    getCollection("lessons"),
    getCollection("glossary"),
  ]);

  const urls = new Set<string>();
  const add = (pathname: string) => urls.add(new URL(pathname, site).href);
  const subjectSlugs = new Set(subjects.map((entry) => entry.data.slug));

  add("/");
  add("/about");
  add("/glossary");
  for (const course of courses) {
    for (const download of course.data.downloads) {
      if (download.pageUrl) add(download.pageUrl);
    }
  }
  for (const teacher of teachers) add(teacherPath(teacher));

  for (const subject of subjects) {
    add(`/${encodeURIComponent(subject.data.slug)}/`);
  }

  for (const course of courses) {
    const subject = course.data.subject;
    const courseSlug = course.data.slug;
    if (!subjectSlugs.has(subject)) continue;

    const coursePath = `/${encodeURIComponent(subject)}/${encodeURIComponent(courseSlug)}`;

    if (course.data.type === "interactive") {
      const interactiveLessons = await loadAllInteractiveLessons(subject, courseSlug);
      if (interactiveLessons.length === 0) continue;

      add(coursePath);
      for (const lesson of interactiveLessons) {
        add(`${coursePath}/?lesson=${encodeURIComponent(lesson.slug)}`);
      }
      continue;
    }

    const courseLessons = lessons.filter((lesson) =>
      lesson.id.startsWith(`${subject}/${courseSlug}/`)
    );
    if (courseLessons.length === 0) continue;

    // This course URL only redirects to a lesson; list the lessons themselves.
    if (!(subject === "akida" && courseSlug === "uchebnik-6-stolpov")) {
      add(coursePath);
    }

    for (const lesson of courseLessons) {
      add(
        `/lesson?subject=${encodeURIComponent(subject)}&course=${encodeURIComponent(courseSlug)}&slug=${encodeURIComponent(lesson.id)}`
      );
    }
  }

  for (const entry of glossary) {
    add(`/glossary/${encodeURIComponent(entry.data.url_slug)}`);
  }

  const entries = [...urls]
    .sort()
    .map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
