// src/lib/search/buildSearchIndex.ts
//
// Сборка поискового индекса по урокам сайта. Выполняется один раз на билде
// (см. src/pages/api/search-index.json.ts) — клиент потом просто скачивает JSON.
//
// В индекс попадают:
//   * обычные уроки (Markdown → «lessons») — по ссылке /lesson?subject=…&course=…&slug=…
//   * интерактивные курсы (JSON-уроки) — по ссылке /<subject>/<course>/?lesson=<slug>
//     вместе с текстом теории (../theory/*.md), на который ссылаются блоки.
//
// ВАЖНО: для интерактивных курсов Markdown-файлы теории отдельными уроками
// не индексируются — они части интерактивного урока (иначе ссылка ведёт в никуда).

import fs from "node:fs";
import path from "node:path";
import { getCollection } from "astro:content";
import {
  loadAllInteractiveLessons,
  type InteractiveLesson,
} from "../interactive/loadInteractiveLesson";
import type {
  LessonSearchEntry,
  LessonSearchIndex,
} from "./lessonSearch";

/** Версия формата индекса: менять при изменении структуры записей. */
const INDEX_VERSION = 1;

/** Сколько символов текста урока хранить в индексе (заголовки + начало текста). */
const LESSON_TEXT_LIMIT = 500;
/** Сколько символов теории интерактивного урока хранить. */
const THEORY_TEXT_LIMIT = 700;
/** Ограничение на текст, собранный из блоков интерактивного урока. */
const BLOCK_TEXT_LIMIT = 500;

/** Ключи блоков интерактивных уроков, в которых лежит полезный для поиска текст. */
const BLOCK_TEXT_KEYS = new Set([
  "text",
  "title",
  "description",
  "caption",
  "label",
  "name",
  "arabname",
  "transcription",
  "items",
  "points",
  "howTo",
  "notes",
  "note",
  "term",
  "question",
  "answer",
  "explanation",
]);

// Тексты теории всех курсов (ленивая загрузка сырого Markdown).
const theoryModules = import.meta.glob<string>("/src/content/lessons/**/theory/*.md", {
  query: "?raw",
  import: "default",
});

const theoryTextCache = new Map<string, string>();
const theoryKeys = Object.keys(theoryModules);

/** Убирает разметку (Markdown, HTML, служебные теги) — оставляет читаемый текст. */
function stripMarkup(input: string): string {
  if (!input) return "";

  return input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/\{\/?[A-Za-zА-Яа-яЁё]+\}/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[*_>#|~^]+/g, " ")
    .replace(/[ \t\r\n]+/g, " ")
    .trim();
}

/** Текст урока для индекса: все подзаголовки + начало текста. */
function collectSearchText(markdown: string, limit: number): string {
  if (!markdown) return "";

  const withoutFrontmatter = markdown.replace(/^---[\s\S]*?\n---\s*/, " ");
  const headings = (withoutFrontmatter.match(/^#{1,6}[^\n]*$/gm) ?? []).join(" . ");
  const body = stripMarkup(withoutFrontmatter.replace(/^#{1,6}[^\n]*$/gm, " "));

  const text = [stripMarkup(headings), body.slice(0, limit)].filter(Boolean).join(" . ");

  return text.length > limit * 2 ? text.slice(0, limit * 2) : text;
}

/** Тело Markdown-урока: из коллекции, а если его нет — читаем файл с диска. */
function readLessonBody(body: string | undefined, filePath: string | undefined): string {
  if (body) return body;
  if (!filePath) return "";

  try {
    const absolute = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    return fs.readFileSync(absolute, "utf8");
  } catch {
    return "";
  }
}

/** Заголовок интерактивного урока может быть строкой или массивом сегментов. */
function flattenTitle(title: InteractiveLesson["title"]): string {
  if (Array.isArray(title)) {
    return title.map((segment) => segment?.text ?? "").join("").trim();
  }

  return typeof title === "string" ? title : "";
}

/** Достаёт текст теории интерактивного урока по ссылке из блока (block.source). */
async function loadTheoryText(
  subject: string,
  course: string,
  source: string
): Promise<string> {
  const clean = source.replace(/^\/+/, "");
  const base = clean.split("/").pop() ?? clean;

  const keys = theoryKeys;
  const key =
    keys.find((item) => item.endsWith(`/${subject}/${course}/theory/${clean}`)) ??
    keys.find((item) => item.endsWith(`/${subject}/${course}/theory/${base}`));

  if (!key) return "";

  const cached = theoryTextCache.get(key);
  if (cached != null) return cached;

  try {
    const raw = await theoryModules[key]();
    const text = collectSearchText(raw, THEORY_TEXT_LIMIT);
    theoryTextCache.set(key, text);
    return text;
  } catch {
    theoryTextCache.set(key, "");
    return "";
  }
}

/** Похоже ли значение на осмысленный текст (а не на путь к картинке/аудио). */
function isMeaningfulText(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  // Одиночная арабская буква (напр. «ت») — осмысленный запрос
  if (trimmed.length < 4) return /[\u0600-\u06FF]/.test(trimmed);

  if (/^(https?:|\/)/.test(trimmed)) return false;
  if (/\.(png|jpe?g|svg|gif|webp|mp3|mp4|webm|vtt|json|md|pdf)$/i.test(trimmed)) return false;

  return /[\p{L}]/u.test(trimmed);
}

/** Рекурсивно собирает текст из блоков интерактивного урока (по белым списком ключей). */
function pushBlockStrings(value: unknown, out: string[], depth = 0): void {
  if (value == null || depth > 4) return;

  if (typeof value === "string") {
    if (isMeaningfulText(value)) out.push(stripMarkup(value));
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) pushBlockStrings(item, out, depth + 1);
    return;
  }

  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (!BLOCK_TEXT_KEYS.has(key)) continue;
      pushBlockStrings(nested, out, depth + 1);
    }
  }
}

/** Текст интерактивного урока: теория (block.source) + текстовые поля блоков. */
async function buildInteractiveText(
  subject: string,
  course: string,
  lesson: InteractiveLesson
): Promise<string> {
  const theory: string[] = [];
  const blocks: string[] = [];

  for (const block of lesson.blocks ?? []) {
    const source = (block as { source?: unknown }).source;
    if (typeof source === "string" && source.toLowerCase().endsWith(".md")) {
      theory.push(await loadTheoryText(subject, course, source));
    }
  }

  if (lesson.module) blocks.push(lesson.module);
  pushBlockStrings(lesson.blocks, blocks);

  const blockText = blocks.join(" . ").slice(0, BLOCK_TEXT_LIMIT);

  return [theory.join(" . "), blockText].filter(Boolean).join(" . ").trim();
}

// ---------------------------------------------------------------------------
// Сборка индекса
// ---------------------------------------------------------------------------

/**
 * Собирает поисковый индекс по всем урокам сайта:
 * обычные Markdown-уроки + JSON-уроки интерактивных курсов.
 */
export async function buildSearchIndex(): Promise<LessonSearchIndex> {
  const [subjects, courses, lessons] = await Promise.all([
    getCollection("subjects"),
    getCollection("courses"),
    getCollection("lessons"),
  ]);

  const subjectTitles = new Map(subjects.map((item) => [item.data.slug, item.data.title]));
  const courseTitles = new Map(
    courses.map((item) => [`${item.data.subject}/${item.data.slug}`, item.data.title])
  );

  const entries: LessonSearchEntry[] = [];

  const interactiveCourses = courses.filter((item) => item.data.type === "interactive");
  const interactiveKeys = new Set(
    interactiveCourses.map((item) => `${item.data.subject}/${item.data.slug}`)
  );

  // 1) Интерактивные курсы: уроки лежат в JSON, теория — в ../theory/*.md
  for (const course of interactiveCourses) {
    const subject = course.data.subject;
    const courseSlug = course.data.slug;
    const subjectTitle = subjectTitles.get(subject) ?? subject;
    const interactiveLessons = await loadAllInteractiveLessons(subject, courseSlug);

    for (const lesson of interactiveLessons) {
      const title = flattenTitle(lesson.title);
      if (!title) continue;

      entries.push({
        s: subject,
        st: subjectTitle,
        c: courseSlug,
        ct: course.data.title,
        t: title,
        o: typeof lesson.id === "number" ? lesson.id : undefined,
        u: `/${subject}/${courseSlug}/?lesson=${encodeURIComponent(lesson.slug)}`,
        x: await buildInteractiveText(subject, courseSlug, lesson),
      });
    }
  }

  // 2) Обычные Markdown-уроки (теорию интерактивных курсов пропускаем —
  //    она уже попала в индекс вместе со своими интерактивными уроками).
  for (const lesson of lessons) {
    const segments = lesson.id.split("/");
    if (segments.length < 3) continue;

    const subject = segments[0];
    const course = segments[1];
    if (interactiveKeys.has(`${subject}/${course}`)) continue;

    const body = readLessonBody(lesson.body, lesson.filePath);

    entries.push({
      s: subject,
      st: subjectTitles.get(subject) ?? subject,
      c: course,
      ct: courseTitles.get(`${subject}/${course}`) ?? course,
      t: lesson.data.title,
      o: lesson.data.order,
      u: `/lesson?subject=${encodeURIComponent(subject)}&course=${encodeURIComponent(course)}&slug=${encodeURIComponent(lesson.id)}`,
      x: collectSearchText(body, LESSON_TEXT_LIMIT),
    });
  }

  return {
    version: INDEX_VERSION,
    generated: new Date().toISOString(),
    entries,
  };
}

let cachedIndex: Promise<LessonSearchIndex> | null = null;

/** Индекс кэшируется на время работы процесса (билда) — собирается один раз. */
export function getSearchIndex(): Promise<LessonSearchIndex> {
  if (!cachedIndex) cachedIndex = buildSearchIndex();
  return cachedIndex;
}
