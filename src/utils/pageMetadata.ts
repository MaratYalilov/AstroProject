export function normalizeMetadataText(value: string): string {
  return value.replace(/[\u2013\u2014]/g, " - ").replace(/\s+/g, " ").trim();
}

export function buildPageTitle(...parts: Array<string | undefined>): string {
  const labels = parts
    .filter((part): part is string => Boolean(part))
    .map((part) => normalizeMetadataText(part).replace(/\.+$/, ""))
    .filter(Boolean);

  return [...new Set([...labels, "HUTBA.org"])].join(" | ");
}

export function buildCourseDescription(
  courseTitle: string,
  description?: string
): string {
  return normalizeMetadataText(
    description?.trim() ||
      `Учебные материалы курса «${courseTitle}» на HUTBA.org для самостоятельного изучения.`
  );
}

export function buildLessonDescription(
  lessonTitle: string,
  courseTitle: string,
  lessonDescription?: string
): string {
  if (lessonDescription?.trim()) {
    return normalizeMetadataText(lessonDescription);
  }
  const topic = normalizeMetadataText(lessonTitle).replace(/\.+$/, "");
  const sentence = /[!?]$/.test(topic) ? topic : `${topic}.`;
  return normalizeMetadataText(
    `${sentence} Урок курса «${courseTitle}» на HUTBA.org.`
  );
}
