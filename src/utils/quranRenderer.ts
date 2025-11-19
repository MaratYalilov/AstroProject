// src/utils/quranRenderer.ts

// JSON-файлы
import surahsData from "../data/surahs.json" assert { type: "json" };
import quranUthmaniData from "../data/quran-uthmani-hafs.json" assert { type: "json" };
import quranKulievData from "../data/quran-kuliev-ru.json" assert { type: "json" };
import qcfV2Data from "../data/quran-qcf-v2.json" assert { type: "json" };

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
  const audioId = `quran-audio-${surah}-${ayah}`;

  return `
<div class="Quran quran-ayah-block" data-surah="${surah}" data-ayah="${ayah}" data-page="${page}">
  <p class="Quran_p quran-ayah-block__arabic qcf-ayah qcf-page-${page}">
    ${codeV2}
  </p>

  <div class="quran-ayah-block__translation">
    ${escapeHtml(translation)}
  </div>

  <div class="quran-ayah-block__source">
    ${escapeHtml(sourceLine)}
  </div>

  <div class="quran-ayah-block__audio">
    <button
      type="button"
      class="quran-audio-button inline-flex items-center gap-3 text-xs text-muted-foreground"
      data-audio-id="${audioId}"
      aria-label="Прослушать аят ${escapeHtml(sourceLine)}"
    >
      <span
        class="quran-audio-button__icon grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-transparent bg-muted text-xs transition-colors"
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
      <span class="quran-audio-button__label">
        Прослушать аят ${escapeHtml(sourceLine)}
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
</div>
`.trim();
}

// ---- ДИАПАЗОН {Quran}2:1-5{/Quran} ----

export function renderAyahRangeBlock(
  surahInput: number | string,
  fromAyahInput: number | string,
  toAyahInput: number | string,
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

  const arabicCodeParts: string[] = [];
  const translationParts: string[] = [];
  const audioTracks: string[] = [];
  const pages: number[] = [];

  for (let ayah = start; ayah <= end; ayah++) {
    const key = makeKey(surah, ayah);

    const translation = translationMap[key];
    if (!translation) {
      throw new Error(`Missing translation for ${key}`);
    }

    const qcf = getQcfV2ForAyah(surah, ayah);
    const page = qcf.page;
    const codeV2 = qcf.code_v2;

    pages.push(page);
    arabicCodeParts.push(codeV2);

    const sss = pad3(surah);
    const aaa = pad3(ayah);
    const audioSrc = `/mp3/${sss}/${sss}${aaa}.mp3`;
    audioTracks.push(audioSrc);

    translationParts.push(`
      <p class="quran-ayah-block__translation-line">
        <span class="quran-ayah-block__translation-ayah">${surah}:${ayah}</span>
        ${escapeHtml(translation)}
      </p>
    `.trim());
  }

  const combinedCodeV2 = arabicCodeParts.join(" ");
  const firstPage = pages[0] ?? 1;

  const arabicHtml = `
    <p class="Quran_p quran-ayah-block__arabic qcf-ayah qcf-page-${firstPage}">
      ${combinedCodeV2}
    </p>
  `.trim();

  const translationsHtml = translationParts.join("\n");

  const rangeText =
    start === end ? `${surah}:${start}` : `${surah}:${start}-${end}`;
  const sourceLine = `${surahNameRu}-${surahMeaningRu}, ${rangeText}`;

  const playlistAttr = JSON.stringify(audioTracks);
  const labelPrefix = start === end ? "Прослушать аят" : "Прослушать аяты";

  const audioId = `quran-audio-range-${surah}-${start}-${end}`;

  return `
<div
  class="Quran quran-ayah-block quran-ayah-range-block"
  data-surah="${surah}"
  data-from="${start}"
  data-to="${end}"
>
  ${arabicHtml}

  <div class="quran-ayah-block__translation">
    ${translationsHtml}
  </div>

  <div class="quran-ayah-block__source">
    ${escapeHtml(sourceLine)}
  </div>

  <div class="quran-ayah-block__audio">
    <button
      type="button"
      class="quran-audio-button inline-flex items-center gap-3 text-xs text-muted-foreground"
      data-audio-id="${audioId}"
      aria-label="Прослушать аяты ${escapeHtml(sourceLine)}"
    >
      <span
        class="quran-audio-button__icon grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-transparent bg-muted text-xs transition-colors"
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
      <span class="quran-audio-button__label">
        ${labelPrefix} ${escapeHtml(sourceLine)}
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
</div>
  `.trim();
}
