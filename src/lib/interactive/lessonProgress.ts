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
