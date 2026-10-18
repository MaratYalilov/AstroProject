// src/utils/quranRenderer.ts

// JSON-файлы
import surahsData from "../data/surahs.json" with { type: "json" };
import quranUthmaniData from "../data/quran-uthmani-hafs.json" with { type: "json" };
import quranKulievData from "../data/quran-kuliev-ru.json" with { type: "json" };
import qcfV2Data from "../data/quran-qcf-v2.json" with { type: "json" };
import hamzaWaslAll from "../data/quran-hamza-wasl-all.json" with { type: "json" };
import hamzaWaslQcfData from "../data/quran-hamza-wasl-qcf.json" with { type: "json" };

// Типы
type SurahMeta = {
  num: number;
  arabic_name: string;
  name_ru: string;
  meaning_ru: string;
  ayahs: number;
  start: number;
  type: string;
  rukus: number;
};

const surahsList = surahsData as SurahMeta[];

type AyahKey = string; // "2:3"

interface RawAyah {
  id: number;
  surah: number;
  ayah: number;
  verse: string;
}

interface QcfV2Entry {
  page: number;
  code_v2: string;
}

// Карты
const arabicMap: Record<AyahKey, string> = {};
const translationMap: Record<AyahKey, string> = {};
const qcfMap: Record<AyahKey, QcfV2Entry> = qcfV2Data as any;
const hamzaWaslMap = new Map<AyahKey, (typeof hamzaWaslAll)[number][]>();
const hamzaWaslQcfMap = hamzaWaslQcfData as Record<string, { start: number; end: number; code: string; unicodeStart: number; unicodeEnd: number }>;
for (const entry of hamzaWaslAll) {
  const key = makeKey(entry.surah, entry.ayah);
  const entries = hamzaWaslMap.get(key) ?? [];
  entries.push(entry);
  hamzaWaslMap.set(key, entries);
}

// Утилиты
function makeKey(surah: number, ayah: number): AyahKey {
  return `${surah}:${ayah}`;
}

function pad3(n: number): string {
  return n.toString().padStart(3, "0");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Unicode остаётся доступен без JavaScript и при ошибке загрузки шрифта.
// QCF показывается только после загрузки шрифта конкретной страницы.
type QuranRenderOptions = { tajweed?: boolean };

function renderWaslToggle(hasHints: boolean): string {
  if (!hasHints) return "";
  // The standalone wasla outline from AmiriLocal, without its alif stem.
  const icon = `<svg viewBox="0 0 265 172" aria-hidden="true" focusable="false"><path d="M105 93Q122 68 135.5 51Q149 34 159 25Q187 0 213 0Q252 0 259 33Q265 62 244 95Q187 172 114 167Q98 165 81.5 159.5Q65 154 49 144Q37 137 27 147L18 154Q9 161 6 160Q0 155 4 146Q46 65 80 83Q85 86 91.5 88.5Q98 91 105 93ZM143 73Q133 85 125 97Q168 104 213 82Q217 62 209 53Q204 47 192 46Q169 46 143 73Z"/></svg>`;
  return `<button type="button" class="quran-ayah-block__wasl-toggle" data-quran-wasl-toggle aria-haspopup="dialog" aria-expanded="false" aria-controls="quran-wasl-menu" aria-label="Подсказки хамзы васль: в начале и после остановок" title="Подсказки хамзы васль: в начале и после остановок">${icon}</button>`;
}

function renderQcfText(page: number, codes: string, arabic: string, tajweed = false, allowEmptyFallback = false): string {
  // A split fragment may contain only the ayah-number glyph; its fallback is empty.
  if (!arabic && !allowEmptyFallback) throw new Error(`Missing Unicode fallback for QCF page ${page}`);
  // V4 uses the same code_v2/page map, but must never inherit a V2 font or readiness rule.
  const variant = tajweed ? ' data-qcf-variant="tajweed"' : '';
  const pageClass = tajweed ? `qcf-tajweed-page-${page}` : `qcf-page-${page}`;
  return `<span class="qcf-text" data-qcf-page="${page}"${variant} lang="ar" dir="rtl"><span class="qcf-fallback" aria-hidden="true">${escapeHtml(arabic)}</span><span class="qcf-glyphs ${pageClass}" aria-hidden="true">${escapeHtml(codes)}</span><span class="sr-only">${escapeHtml(arabic)}</span></span>`;
}

// Insert each hint immediately before its original word, keeping both together on a line.
// Word boundaries come from verified Quran.com word data, not counts of QCF glyphs.
function renderQcfAyah(surah: number, ayah: number, page: number, codes: string, arabic: string, tajweed = false): string {
  if (!arabic) throw new Error(`Missing Unicode fallback for ${surah}:${ayah}`);
  const entries = tajweed ? hamzaWaslMap.get(makeKey(surah, ayah)) : undefined;
  if (!entries?.length) return renderQcfText(page, codes, arabic, tajweed);
  const parts: string[] = [];
  let codeOffset = 0;
  let arabicOffset = 0;
  const append = (codePart: string, arabicPart: string) => {
    if (codePart || arabicPart) parts.push(renderQcfText(page, codePart, arabicPart, true, true));
  };
  for (const { word_number, reading, is_start } of entries) {
    const reference = `${surah}:${ayah}:${word_number}`;
    const position = hamzaWaslQcfMap[reference];
    if (!position || position.unicodeStart < arabicOffset || position.unicodeEnd > arabic.length || position.start < codeOffset || codes.slice(position.start, position.end).replace(/\s/gu, "") !== position.code) {
      throw new Error(`Invalid QCF word position for ${reference}`);
    }
    append(codes.slice(codeOffset, position.start), arabic.slice(arabicOffset, position.unicodeStart));
    const scope = is_start ? "basic" : "all";
    const hint = `<span class="quran-ayah-block__wasl-hint arab" data-hamza-wasl="${surah}:${ayah}" data-word-number="${word_number}" data-wasl-scope="${scope}" lang="ar" dir="rtl" aria-hidden="true">${escapeHtml(reading)}</span>`;
    const original = renderQcfText(page, codes.slice(position.start, position.end), arabic.slice(position.unicodeStart, position.unicodeEnd), true);
    parts.push(`<span class="qcf-wasl-pair">${hint}${original}</span>`);
    codeOffset = position.end;
    arabicOffset = position.unicodeEnd;
  }
  append(codes.slice(codeOffset), arabic.slice(arabicOffset));
  return parts.join("");
}

// Инициализация карт
(function buildMaps() {
  const uthmaniRoot: any =
    (quranUthmaniData as any)?.quran?.["quran-uthmani-hafs"] ?? {};
  const uthmaniList: RawAyah[] = Object.values(uthmaniRoot) as RawAyah[];

  for (const item of uthmaniList) {
    const key = makeKey(item.surah, item.ayah);
    arabicMap[key] = item.verse;
  }

  const kulievRoot: any =
    (quranKulievData as any)?.quran?.["ru.kuliev"] ?? {};
  const kulievList: RawAyah[] = Object.values(kulievRoot) as RawAyah[];

  for (const item of kulievList) {
    const key = makeKey(item.surah, item.ayah);
    translationMap[key] = item.verse;
  }
})();

// Публичные утилиты (если где-то пригодятся)
export function getQcfV2ForAyah(
  surah: number,
  ayah: number,
): QcfV2Entry {
  const key = makeKey(surah, ayah);
  const entry = qcfMap[key];
  if (!entry) {
    throw new Error(`No QCF v2 data for ayah ${key}`);
  }
  return entry;
}

/** Отдельный знак суджуда из тех же данных и шрифта, что и аят 84:21. */
export function renderSajdahSymbol(): string {
  const { page, code_v2 } = getQcfV2ForAyah(84, 21);
  // В этой записи перед номером аята расположен самостоятельный знак суджуда.
  const glyph = Array.from(code_v2.replace(/\s/gu, "")).at(-2);
  if (!glyph) throw new Error("Missing QCF sajdah symbol in 84:21");
  return `<span class="arab qcf-text qcf-sajdah-symbol" data-qcf-page="${page}" role="img" aria-label="Знак суджуда"><span class="qcf-glyphs qcf-page-${page}" aria-hidden="true">${escapeHtml(glyph)}</span></span>`;
}

export function getAyahText(
  surah: number,
  ayah: number,
): { arabic?: string; translation: string } {
  const key = makeKey(surah, ayah);
  const translation = translationMap[key];
  if (!translation) {
    throw new Error(`No translation found for ${key}`);
  }
  const arabic = arabicMap[key];
  return { arabic, translation };
}

// ---- ОДИНОЧНЫЙ АЯТ {Quran}2:255{/Quran} ----

export function renderAyahBlock(
  surahInput: number | string,
  ayahInput: number | string,
  options: QuranRenderOptions = {},
): string {
  const surah = Number(surahInput);
  const ayah = Number(ayahInput);

  if (!Number.isFinite(surah) || !Number.isFinite(ayah)) {
    throw new Error(`Invalid surah/ayah: ${surahInput}:${ayahInput}`);
  }

  const key = makeKey(surah, ayah);

  const translation = translationMap[key];
  if (!translation) {
    throw new Error(`Missing translation for ${key}`);
  }

  const qcf = getQcfV2ForAyah(surah, ayah);
  const page = qcf.page;
  const codeV2 = qcf.code_v2;

  const meta = surahsList.find((s) => s.num === surah);
  if (!meta) {
    throw new Error(`Не найдено описание суры №${surah} в surahs.json`);
  }

  const surahNameRu = meta.name_ru;
  const surahMeaningRu = meta.meaning_ru;

  const sss = pad3(surah);
  const aaa = pad3(ayah);

  const audioSrc = `/mp3/${sss}/${sss}${aaa}.mp3`;
  const sourceLine = `${surahNameRu}-${surahMeaningRu}, ${surah}:${ayah}`;
  const audioId = `quran-audio-${surah}-${ayah}${options.tajweed ? '-tajweed' : ''}`;
  const hasWaslHints = Boolean(options.tajweed && hamzaWaslMap.has(key));

  return `
<div class="
    quran-ayah-block
    ${hasWaslHints ? "quran-ayah-block--has-wasl-hints" : ""}
    bg-amber-50 dark:bg-gray-800
    border-2 border-emerald-200 dark:border-emerald-700
    "
    data-quran-ayah="one_verse"
    data-surah="${surah}" 
    data-ayah="${ayah}" 
    data-page="${page}"
  >

  <p class="quran-ayah-block__arabic qcf-ayah" lang="ar" dir="rtl">
    ${renderQcfAyah(surah, ayah, page, codeV2, arabicMap[key], options.tajweed)}
  </p>

  <div class="quran-ayah-block__translation">
    ${escapeHtml(translation)}
  </div>

  <div class="quran-ayah-block__audio">
    <button
      type="button"
      class="quran-audio-button inline-flex items-center gap-3 text-xs text-muted-foreground"
      data-audio-id="${audioId}"
      aria-label="Прослушать аят ${escapeHtml(sourceLine)}"
      title="слушать"
    >
      <span
        class="quran-audio-button__icon shrink-0 bg-muted text-xs transition-colors"
      >
        <svg
          class="quran-audio-button__play"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          style="width:16px;height:16px;border:none;"
        >
          <polygon points="6 4 20 12 6 20 6 4"></polygon>
        </svg>
        <svg
          class="quran-audio-button__pause"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          style="width:16px;height:16px;border:none;"
        >
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
      </span>
      <span class="quran-ayah-block__source">
        ${escapeHtml(sourceLine)}
      </span>
    </button>

    <audio
      id="${audioId}"
      class="quran-audio-element"
      preload="none"
    >
      <source src="${audioSrc}" type="audio/mpeg" />
      Ваш браузер не поддерживает аудио-плеер.
    </audio>
  </div>
  ${renderWaslToggle(hasWaslHints)}
</div>
`.trim();
}

// ---- ДИАПАЗОН {Quran}2:1-5{/Quran} ----
export function renderAyahRangeBlock(
  surahInput: number | string,
  fromAyahInput: number | string,
  toAyahInput: number | string,
  options: QuranRenderOptions = {},
): string {
  const surah = Number(surahInput);
  const fromAyah = Number(fromAyahInput);
  const toAyah = Number(toAyahInput);

  if (
    !Number.isFinite(surah) ||
    !Number.isFinite(fromAyah) ||
    !Number.isFinite(toAyah)
  ) {
    throw new Error(
      `Invalid surah/ayah range: ${surahInput}:${fromAyahInput}-${toAyahInput}`,
    );
  }

  const start = Math.min(fromAyah, toAyah);
  const end = Math.max(fromAyah, toAyah);

  const meta = surahsList.find((s) => s.num === surah);
  if (!meta) {
    throw new Error(`Не найдено описание суры №${surah} в surahs.json`);
  }

  const surahNameRu = meta.name_ru;
  const surahMeaningRu = meta.meaning_ru;

  // Собираем данные по каждому аяту
  const perAyah: {
    ayah: number;
    page: number;
    codeV2: string;
    arabic: string;
    translationHtml: string;
    audioSrc: string;
  }[] = [];

  for (let ayah = start; ayah <= end; ayah++) {
    const key = makeKey(surah, ayah);

    const translation = translationMap[key];
    if (!translation) {
      throw new Error(`Missing translation for ${key}`);
    }

    const qcf = getQcfV2ForAyah(surah, ayah);
    const page = qcf.page;
    const codeV2 = qcf.code_v2;

    const sss = pad3(surah);
    const aaa = pad3(ayah);
    const audioSrc = `/mp3/${sss}/${sss}${aaa}.mp3`;

    perAyah.push({
      ayah,
      page,
      codeV2,
      arabic: arabicMap[key],
      translationHtml: `
      <p class="quran-ayah-block__translation-line">
        <span class="quran-ayah-block__translation-ayah">${surah}:${ayah}</span>
        ${escapeHtml(translation)}
      </p>
    `.trim(),
      audioSrc,
    });
  }

  // Группируем подряд идущие аяты по одной странице
  type Group = { page: number; ayahs: number[]; codes: string[]; arabic: string[] };
  const groups: Group[] = [];
  let currentGroup: Group | null = null;

  for (const item of perAyah) {
    if (currentGroup === null) {
      currentGroup = { page: item.page, ayahs: [item.ayah], codes: [item.codeV2], arabic: [item.arabic] };
    } else if (item.page === currentGroup.page) {
      currentGroup.ayahs.push(item.ayah);
      currentGroup.codes.push(item.codeV2);
      currentGroup.arabic.push(item.arabic);
    } else {
      groups.push(currentGroup);
      currentGroup = { page: item.page, ayahs: [item.ayah], codes: [item.codeV2], arabic: [item.arabic] };
    }
  }
  if (currentGroup !== null) groups.push(currentGroup);

  // Построим единый непрерывный арабский блок: внутри - span'ы по страницам
  // между группами ставим пробел, чтобы они шли подряд; можно заменить на '' если нужен без пробелов.
  const arabicInlineHtml = `
    <p class="quran-ayah-block__arabic qcf-ayah" lang="ar" dir="rtl">
      ${options.tajweed
        ? perAyah.map((item) => renderQcfAyah(surah, item.ayah, item.page, item.codeV2, item.arabic, true)).join(" ")
        : groups
        .map(
          (g) => renderQcfText(g.page, g.codes.join(" "), g.arabic.join(" "), options.tajweed),
        )
        .join(" ")}
    </p>
  `.trim();

  // Переводы — все подряд (как раньше)
  const translationsHtml = perAyah.map((p) => p.translationHtml).join("\n");

  // Аудио — плейлист всех треков по порядку
  const audioTracks = perAyah.map((p) => p.audioSrc);
  const playlistAttr = JSON.stringify(audioTracks);

  const rangeText = start === end ? `${surah}:${start}` : `${surah}:${start}-${end}`;
  const sourceLine = `${surahNameRu}-${surahMeaningRu}, ${rangeText}`;
  const labelPrefix = start === end ? "Прослушать аят" : "Прослушать аяты";
  const audioId = `quran-audio-range-${surah}-${start}-${end}${options.tajweed ? '-tajweed' : ''}`;
  const hasWaslHints = Boolean(options.tajweed && perAyah.some((item) => hamzaWaslMap.has(makeKey(surah, item.ayah))));

  return `
<div
  class="
    quran-ayah-block
    ${hasWaslHints ? "quran-ayah-block--has-wasl-hints" : ""}
    bg-amber-50 dark:bg-gray-800
    border-2 border-emerald-100 dark:border-emerald-700
  "
  data-quran-ayah="many_verses"
  data-surah="${surah}"
  data-from="${start}"
  data-to="${end}"
  data-pages="${groups.map((g) => g.page).join(",")}"
>
  ${arabicInlineHtml}

  <div class="quran-ayah-block__translation">
    ${translationsHtml}
  </div>

  <!--
  <div class="quran-ayah-block__source">
    ${escapeHtml(sourceLine)}
  </div>
  -->

  <div class="quran-ayah-block__audio">
    <button
      type="button"
      class="quran-audio-button inline-flex items-center gap-3 text-xs text-muted-foreground"
      data-audio-id="${audioId}"
      aria-label="${escapeHtml(labelPrefix + ' ' + sourceLine)}"
      title="слушать"
    >
      <span
        class="quran-audio-button__icon shrink-0 bg-muted text-xs transition-colors"
      >
        <svg
          class="quran-audio-button__play"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          style="width:16px;height:16px;border:none;"
        >
          <polygon points="6 4 20 12 6 20 6 4"></polygon>
        </svg>
        <svg
          class="quran-audio-button__pause"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          style="width:16px;height:16px;border:none;"
        >
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
      </span>
      <span class="quran-ayah-block__source">
        ${escapeHtml(sourceLine)}
      </span>
    </button>

    <audio
      id="${audioId}"
      class="quran-audio-element"
      preload="none"
      data-playlist='${playlistAttr}'
    >
      <source src="${audioTracks[0] ?? ""}" type="audio/mpeg" />
      Ваш браузер не поддерживает аудио-плеер.
    </audio>
  </div>
  ${renderWaslToggle(hasWaslHints)}
</div>
  `.trim();
}
