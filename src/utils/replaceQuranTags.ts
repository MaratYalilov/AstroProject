// src/utils/replaceQuranTags.ts
import { renderAyahBlock, renderAyahRangeBlock } from "./quranRenderer";

// Поддерживаем:
// {Quran}2:255{/Quran}
// {Quran}2:1-5{/Quran}
const QURAN_TAG_REGEX = /\{Quran\}(\d+):(\d+)(?:-(\d+))?\{\/Quran\}/gi;

export function replaceQuranTags(input: string): string {
  if (!input) return "";

  return input.replace(
    QURAN_TAG_REGEX,
    (
      match: string,
      surahStr: string,
      fromAyahStr: string,
      toAyahStr?: string,
    ) => {
      try {
        const surah = Number(surahStr);
        const fromAyah = Number(fromAyahStr);
        const hasRange = typeof toAyahStr !== "undefined" && toAyahStr !== "";
        const toAyah = hasRange ? Number(toAyahStr) : fromAyah;

        if (
          !Number.isFinite(surah) ||
          !Number.isFinite(fromAyah) ||
          !Number.isFinite(toAyah)
        ) {
          console.warn("[QuranTags] Invalid numbers in tag:", match);
          return match;
        }

        if (!hasRange || fromAyah === toAyah) {
          // одиночный аят
          return renderAyahBlock(surah, fromAyah);
        }

        // диапазон аятов: один общий блок
        return renderAyahRangeBlock(surah, fromAyah, toAyah);
      } catch (e) {
        console.error("[QuranTags] Error rendering tag:", match, e);
        // fallback – оставляем исходный тег, чтобы было видно проблему
        return match;
      }
    },
  );
}
