// src/utils/quranRenderer.ts

// JSON-файлы через ?json, чтобы Astro/Vite не ругался
import surahsData from "../data/surahs.json?json";
import quranUthmaniData from "../data/quran-uthmani-hafs.json?json";
import quranKulievData from "../data/quran-kuliev-ru.json?json";
import qcfV2Data from "../data/quran-qcf-v2.json?json";

// Структура surahs.json (как в старом рендерере)
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

type AyahKey = string; // "2:3" и т.п.

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

// ---- Карты данных ----

const arabicMap: Record<AyahKey, string> = {};
const translationMap: Record<AyahKey, string> = {};
const qcfMap: Record<AyahKey, QcfV2Entry> = qcfV2Data as any;

// ---- Вспомогательные функции ----

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

// ---- Инициализация карт из JSON ----

(function buildMaps() {
  // Арабский текст (утманский) — на будущее / отладку
  const uthmaniRoot: any =
    (quranUthmaniData as any)?.quran?.["quran-uthmani-hafs"] ?? {};
  const uthmaniList: RawAyah[] = Object.values(uthmaniRoot) as RawAyah[];

  for (const item of uthmaniList) {
    const key = makeKey(item.surah, item.ayah);
    arabicMap[key] = item.verse;
  }

  // Перевод Кулиева
  const kulievRoot: any =
    (quranKulievData as any)?.quran?.["ru.kuliev"] ?? {};
  const kulievList: RawAyah[] = Object.values(kulievRoot) as RawAyah[];

  for (const item of kulievList) {
    const key = makeKey(item.surah, item.ayah);
    translationMap[key] = item.verse;
  }
})();

// ---- Публичные утилиты (если пригодятся ещё где-то) ----

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

// ---- Основная функция: рендер блока по тегу {Quran} ----

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
  const page = qcf.page;          // номер страницы mushaf
  const codeV2 = qcf.code_v2;     // строка QCF v2 для этого аята

  // --- 1. Мета-данные суры ---
  const meta = surahsList.find((s) => s.num === surah);
  if (!meta) {
    throw new Error(`Не найдено описание суры №${surah} в surahs.json`);
  }

  const surahNameRu = meta.name_ru;        // "аль-Бакара"
  const surahMeaningRu = meta.meaning_ru;  // "Корова"

  const sss = pad3(surah);
  const aaa = pad3(ayah);

  const imageSrc = `/ayat/${surah}_${ayah}.png`;
  const audioSrc = `/mp3/${sss}/${sss}${aaa}.mp3`;

  // Пример: "аль-Бакара-Корова, 2:222"
  const sourceLine = `${surahNameRu}-${surahMeaningRu}, ${surah}:${ayah}`;

  // ВАЖНО:
  //  - codeV2 выводим «как есть», без escape, чтобы QCF-глифы попали в DOM;
  //  - текстовые части (перевод / подписи) через escapeHtml.
  return `
<div class="Quran quran-ayah-block" data-surah="${surah}" data-ayah="${ayah}" data-page="${page}">
  <p class="Quran_p quran-ayah-block__arabic qcf-ayah qcf-page-${page}">
    ${codeV2}
  </p>

  <div class="quran-ayah-block__image">
    <img
      src="${imageSrc}"
      alt="Аят ${surah}:${ayah}"
      loading="lazy"
      onerror="this.style.display='none'"
    />
  </div>

  <div class="quran-ayah-block__translation">
    ${escapeHtml(translation)}
  </div>

  <div class="quran-ayah-block__source">
    ${escapeHtml(sourceLine)}
  </div>

  <div class="quran-ayah-block__audio">
    <audio controls preload="none">
      <source src="${audioSrc}" type="audio/mpeg" />
      Ваш браузер не поддерживает аудио-плеер.
    </audio>
  </div>
</div>
`.trim();
}
