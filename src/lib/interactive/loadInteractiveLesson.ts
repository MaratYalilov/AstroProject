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
// Бандлы курсов: один файл со всеми уроками курса (массив InteractiveLesson).
// Если у курса есть lessons.bundle.json — грузим его; иначе — по отдельным файлам.
const bundleModules = import.meta.glob<InteractiveLesson[]>(
  `/src/content/lessons/**/lessons.bundle.json`,
  { import: "default", eager: false }
);
const singleModules = import.meta.glob<InteractiveLesson>(
  `/src/content/lessons/**/*.json`,
  { import: "default", eager: false }
);

export async function loadAllInteractiveLessons(
  subject: string,
  course: string
): Promise<InteractiveLesson[]> {
  const marker = `/lessons/${subject}/${course}/`;

  // 1) Бандл курса (все уроки в одном файле)
  const bundleKey = Object.keys(bundleModules).find((p) => p.includes(marker));
  if (bundleKey) {
    try {
      const arr = (await bundleModules[bundleKey]()) as InteractiveLesson[];
      if (Array.isArray(arr)) {
        return [...arr].sort((a, b) => a.id - b.id);
      }
    } catch (err) {
      console.warn(`Failed to load lessons bundle: ${bundleKey}`, err);
    }
  }

  // 2) Иначе — по отдельным JSON-файлам курса (как в muallim-sani)
  const lessons: InteractiveLesson[] = [];
  for (const [path, loader] of Object.entries(singleModules)) {
    if (!path.includes(marker)) continue;
    try {
      const lesson = await loader();
      if (lesson && (lesson as InteractiveLesson).blocks) {
        lessons.push(lesson as InteractiveLesson);
      }
    } catch (err) {
      console.warn(`Failed to load interactive lesson: ${path}`, err);
    }
  }
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
