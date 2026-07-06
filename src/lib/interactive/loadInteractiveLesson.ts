import type { LessonBlock } from "./types";

export type InteractiveLesson = {
  id: number;
  slug: string;
  subject: string;
  course: string;
  title: string | { text: string; arab?: boolean }[];
  /** Название модуля курса — для группировки уроков в сайдбаре (курсы с большим числом уроков) */
  module?: string;
  blocks: LessonBlock[];
};

/**
 * Загружает все JSON-уроки для указанного курса.
 * Возвращает массив InteractiveLesson.
 */
export async function loadAllInteractiveLessons(
  subject: string,
  course: string
): Promise<InteractiveLesson[]> {
  // Используем Vite's import.meta.glob для загрузки всех JSON файлов курса
  const modules = import.meta.glob<InteractiveLesson>(
    `/src/content/lessons/**/*.json`,
    { import: "default", eager: false }
  );

  const lessons: InteractiveLesson[] = [];

  for (const [path, loader] of Object.entries(modules)) {
    // Проверяем, что путь соответствует subject/course
    if (!path.includes(`/lessons/${subject}/${course}/`)) continue;

    try {
      const lesson = await loader();
      if (lesson && lesson.blocks) {
        lessons.push(lesson);
      }
    } catch (err) {
      console.warn(`Failed to load interactive lesson: ${path}`, err);
    }
  }

  // Сортируем по id
  lessons.sort((a, b) => a.id - b.id);

  return lessons;
}

/**
 * Загружает конкретный interactive lesson по slug.
 * Сначала загружает все уроки курса, затем находит нужный по полю slug.
 *
 * @param subject - предмет (например "quran")
 * @param course  - курс (например "muallim-sani")
 * @param slug    - slug урока (например "alif" или "quran/muallim-sani/alif")
 * @returns InteractiveLesson или null, если не найден
 */
export async function loadInteractiveLesson(
  subject: string,
  course: string,
  slug: string
): Promise<InteractiveLesson | null> {
  // Извлекаем короткий slug (последний сегмент)
  const lessonSlug = slug.split("/").pop() || slug;

  const allLessons = await loadAllInteractiveLessons(subject, course);

  // Ищем по полю slug внутри JSON
  return allLessons.find((l) => l.slug === lessonSlug) ?? null;
}
