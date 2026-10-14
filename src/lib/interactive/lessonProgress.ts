// Единый ключ localStorage для отметки «урок завершён».
// ВАЖНО: ключ ДОЛЖЕН включать subject+course, иначе прогресс разных курсов
// смешивается (числовые id уроков не уникальны между курсами — напр.
// dzhazariyya 1–17 пересекается с muallim-sani 1–17).
export function lessonCompleteKey(
  subject: string | undefined,
  course: string | undefined,
  lessonId: string | number
): string {
  if (subject && course) {
    return `lesson-complete-${subject}__${course}__${lessonId}`;
  }
  // Фолбэк для старого формата (на случай отсутствия контекста курса)
  return `lesson-complete-${lessonId}`;
}

// Событие, по которому сайдбар/прочие слушатели пере-считывают завершённость.
export const LESSON_COMPLETE_EVENT = "lesson-complete-changed";

/** Восстанавливает занятие по slug, включая старый прогресс до вставки новых уроков. */
export function resolveCourseProgress(
  lessons: readonly { id: number; slug: string }[],
  savedIndex: string | null,
  savedSlug: string | null,
  subject: string,
  course: string,
): number {
  if (savedSlug) {
    const index = lessons.findIndex(lesson => lesson.slug === savedSlug);
    if (index >= 0) return index;
  }
  const index = Number.parseInt(savedIndex ?? "", 10);
  if (!Number.isInteger(index) || index < 0) return 0;
  // В исходном «Муаллим сани» индексы 0–43 совпадали с постоянными id.
  if (!savedSlug && subject === "quran" && course === "muallim-sani") {
    const legacyIndex = lessons.findIndex(lesson => lesson.id === index);
    return legacyIndex >= 0 ? legacyIndex : 0;
  }
  return index < lessons.length ? index : 0;
}
