// src/lib/search/lessonSearch.ts
//
// Ядро поиска по урокам: типы, нормализация текста, подсчёт релевантности,
// сниппеты и подсветка совпадений.
//
// Модуль не зависит от Astro и React — он используется и на клиенте
// (компоненты поиска), и при сборке индекса (src/lib/search/buildSearchIndex.ts).

/** Одна запись поискового индекса (короткие ключи — чтобы JSON весил меньше). */
export type LessonSearchEntry = {
  /** slug предмета, напр. "fiqh" */
  s: string;
  /** название предмета, напр. "Фикх" */
  st: string;
  /** slug курса, напр. "mishkat-namaz" */
  c: string;
  /** название курса, напр. "Мишкат намаза" */
  ct: string;
  /** название урока */
  t: string;
  /** порядковый номер урока в курсе (если есть) */
  o?: number;
  /** ссылка на урок */
  u: string;
  /** поисковый текст: подзаголовки + начало урока без разметки */
  x?: string;
};

/** Файл индекса, который отдаёт /api/search-index.json */
export type LessonSearchIndex = {
  /** версия формата индекса — на случай изменения структуры */
  version: number;
  /** ISO-дата сборки индекса */
  generated: string;
  entries: LessonSearchEntry[];
};

/** URL статического индекса (собирается при билде) */
export const SEARCH_INDEX_URL = "/api/search-index.json";

/** Страница со всеми результатами поиска */
export const SEARCH_PAGE_URL = "/search";

export type LessonSearchResult = {
  entry: LessonSearchEntry;
  score: number;
  /** Короткий фрагмент текста урока вокруг первого совпадения (может быть пустым) */
  snippet: string;
};

export type LessonSearchOutput = {
  /** Нормализованные токены запроса */
  tokens: string[];
  /** Всего найдено уроков */
  total: number;
  /** Лучшие результаты (не больше limit) */
  results: LessonSearchResult[];
};

export type HighlightPart = { text: string; hit: boolean };

// ---------------------------------------------------------------------------
// Нормализация
// ---------------------------------------------------------------------------

// Татарские буквы (заголовки курса «Муаллим сани» пишутся с ними) + ё:
// приводим их к «обычным», чтобы «алиф» находил «Әлиф и һәмзә».
const FOLD_MAP: Record<string, string> = {
  ё: "е",
  ә: "а",
  һ: "х",
  ү: "у",
  ө: "о",
  ң: "н",
  җ: "ж",
  қ: "к",
  ғ: "г",
  ў: "у",
};

// Арабские огласовки (харакат) и служебные знаки: от них зависит написание,
// но не смысл — «ар-рахман» и «الرَّحْمَن» должны совпадать.
const ARABIC_MARKS = /[\u0640\u064B-\u0652\u0670\u06D6-\u06ED]/g;

/**
 * Нормализует текст для поиска: нижний регистр, удаление арабских огласовок,
 * сворачивание татарских букв, схлопывание пробелов.
 */
export function normalizeSearchText(value: string): string {
  if (!value) return "";

  let folded = value.toLowerCase().replace(ARABIC_MARKS, "");

  for (const [from, to] of Object.entries(FOLD_MAP)) {
    if (folded.includes(from)) folded = folded.split(from).join(to);
  }

  return folded.replace(/\s+/g, " ").trim();
}

/** Разбивает запрос на уникальные токены (слова). */
export function tokenizeQuery(query: string): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  const tokens = normalized
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 0)
    // Одиночная кириллическая буква даёт слишком много шума,
    // а одиночная арабская — осмысленный запрос (например, буква «ت»).
    .filter((token) => token.length > 1 || /[\u0600-\u06FF]/.test(token));

  return Array.from(new Set(tokens));
}

// ---------------------------------------------------------------------------
// Подготовка индекса (один раз на загрузку страницы)
// ---------------------------------------------------------------------------

type PreparedEntry = {
  entry: LessonSearchEntry;
  /** название урока в нижнем регистре (для сравнения) */
  title: string;
  rawTitle: string;
  courseTitle: string;
  subjectTitle: string;
  /** поисковый текст в нижнем регистре */
  text: string;
  /** поисковый текст как есть (для сниппетов) */
  rawText: string;
};

export type PreparedLessonIndex = {
  entries: LessonSearchEntry[];
  prepared: PreparedEntry[];
};

/** Готовит записи индекса к быстрым сравнениям (нормализация — один раз). */
export function prepareIndex(
  input: LessonSearchEntry[] | PreparedLessonIndex
): PreparedLessonIndex {
  if (!Array.isArray(input) && Array.isArray(input.prepared)) {
    return input;
  }

  const list = Array.isArray(input) ? input : input.entries;

  const prepared: PreparedEntry[] = list.map((entry) => {
    const rawText = entry.x ?? "";

    return {
      entry,
      title: normalizeSearchText(entry.t ?? ""),
      rawTitle: entry.t ?? "",
      courseTitle: normalizeSearchText(entry.ct ?? ""),
      subjectTitle: normalizeSearchText(entry.st ?? ""),
      text: normalizeSearchText(rawText),
      rawText,
    };
  });

  return { entries: list, prepared };
}

// ---------------------------------------------------------------------------
// Поиск
// ---------------------------------------------------------------------------

const PHRASE_BONUS = 45;
const TITLE_WORD_BONUS = 26;
const TITLE_BONUS = 16;
const COURSE_BONUS = 8;
const SUBJECT_BONUS = 6;
const TEXT_BONUS = 2;
const TEXT_OCCURRENCE_LIMIT = 4;

function isWordStart(text: string, index: number): boolean {
  if (index <= 0) return true;
  return !/[\p{L}\p{N}]/u.test(text.charAt(index - 1));
}

function countOccurrences(haystack: string, needle: string, limit: number): number {
  if (!haystack || !needle) return 0;

  let count = 0;
  let from = 0;

  while (count < limit) {
    const index = haystack.indexOf(needle, from);
    if (index === -1) break;
    count += 1;
    from = index + needle.length;
  }

  return count;
}

/** Ищет уроки по запросу и возвращает лучшие совпадения. */
export function searchLessonIndex(
  index: LessonSearchEntry[] | PreparedLessonIndex,
  query: string,
  limit = 8
): LessonSearchOutput {
  const tokens = tokenizeQuery(query);

  if (!tokens.length) return { tokens, total: 0, results: [] };

  const { prepared } = prepareIndex(index);
  const phrase = normalizeSearchText(query);
  const scored: { result: LessonSearchResult; allMatched: boolean }[] = [];

  for (const item of prepared) {
    let score = 0;
    let matchedTokens = 0;

    if (phrase.length >= 4 && item.title.includes(phrase)) {
      score += PHRASE_BONUS;
    }

    for (const token of tokens) {
      let tokenScore = 0;

      const titleIndex = item.title.indexOf(token);
      if (titleIndex >= 0) {
        tokenScore += isWordStart(item.title, titleIndex) ? TITLE_WORD_BONUS : TITLE_BONUS;
      }

      if (item.courseTitle.includes(token)) tokenScore += COURSE_BONUS;
      if (item.subjectTitle.includes(token)) tokenScore += SUBJECT_BONUS;

      const textHits = countOccurrences(item.text, token, TEXT_OCCURRENCE_LIMIT);
      if (textHits) tokenScore += textHits * TEXT_BONUS;

      if (tokenScore > 0) matchedTokens += 1;
      score += tokenScore;
    }

    if (matchedTokens === 0) continue;

    scored.push({
      allMatched: matchedTokens === tokens.length,
      result: {
        entry: item.entry,
        score,
        snippet: buildSnippet(item.rawText, tokens),
      },
    });
  }

  // Сначала результаты, где совпали ВСЕ слова запроса; если таких нет —
  // показываем частичные совпадения (иначе длинный запрос даёт пустоту).
  const allMatched = scored.filter((item) => item.allMatched);
  const pool = allMatched.length ? allMatched : scored;

  pool.sort((a, b) => {
    if (b.result.score !== a.result.score) return b.result.score - a.result.score;

    const orderA = a.result.entry.o;
    const orderB = b.result.entry.o;
    if (orderA != null && orderB != null && orderA !== orderB) return orderA - orderB;

    return a.result.entry.t.localeCompare(b.result.entry.t, "ru");
  });

  return {
    tokens,
    total: pool.length,
    results: pool.slice(0, limit).map((item) => item.result),
  };
}

// ---------------------------------------------------------------------------
// Сниппеты и подсветка
// ---------------------------------------------------------------------------

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTokenRegExp(tokens: string[]): RegExp | null {
  const parts = tokens.filter((token) => token.length > 0).map(escapeRegExp);
  if (!parts.length) return null;

  try {
    return new RegExp(parts.join("|"), "giu");
  } catch {
    return null;
  }
}

/** Возвращает фрагмент текста вокруг первого совпадения с запросом. */
export function buildSnippet(
  text: string,
  tokens: string[],
  options: { before?: number; after?: number } = {}
): string {
  const source = (text ?? "").trim();
  if (!source || !tokens.length) return "";

  const before = options.before ?? 48;
  const after = options.after ?? 150;

  const regex = buildTokenRegExp(tokens);
  if (!regex) return "";

  const match = regex.exec(source);
  if (!match || match.index == null) return "";

  let start = Math.max(0, match.index - before);
  let end = Math.min(source.length, match.index + after);

  // Не разрезаем слова по краям фрагмента
  if (start > 0) {
    const spaceIndex = source.indexOf(" ", start);
    if (spaceIndex !== -1 && spaceIndex < match.index) start = spaceIndex + 1;
  }
  if (end < source.length) {
    const spaceIndex = source.lastIndexOf(" ", end);
    if (spaceIndex > match.index + match[0].length) end = spaceIndex;
  }

  const slice = source.slice(start, end).replace(/\s+/g, " ").trim();

  return `${start > 0 ? "…" : ""}${slice}${end < source.length ? "…" : ""}`;
}

/** Разбивает текст на части: обычные и совпавшие с запросом (для подсветки). */
export function splitByTokens(text: string, tokens: string[]): HighlightPart[] {
  if (!text) return [];

  const regex = buildTokenRegExp(tokens);
  if (!regex) return [{ text, hit: false }];

  const parts: HighlightPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    const index = match.index ?? 0;
    const value = match[0];

    if (!value) break;

    if (index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, index), hit: false });
    }

    parts.push({ text: value, hit: true });
    lastIndex = index + value.length;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), hit: false });
  }

  return parts.length ? parts : [{ text, hit: false }];
}
