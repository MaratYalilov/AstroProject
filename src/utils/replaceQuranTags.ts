// src/utils/replaceQuranTags.ts
import { renderAyahBlock, renderAyahRangeBlock } from "./quranRenderer";

// Поддерживаем:
// {Quran}2:255{/Quran}
// {Quran}2:1-5{/Quran}
// {Quran}2:255-T{/Quran}, {Quran}2:1-5-T{/Quran} — таджвид QCF V4
const QURAN_TAG_REGEX = /\{Quran\}(\d+):(\d+)(?:-(\d+))?(-T)?\{\/Quran\}/gi;

export function replaceQuranTags(input: string): string {
  if (!input) return "";
  const audioOccurrences = new Map<string, number>();

  return input.replace(
    QURAN_TAG_REGEX,
    (
      match: string,
      surahStr: string,
      fromAyahStr: string,
      toAyahStr?: string,
      tajweedFlag?: string,
    ) => {
      try {
        const surah = Number(surahStr);
        const fromAyah = Number(fromAyahStr);
        const hasRange = typeof toAyahStr !== "undefined" && toAyahStr !== "";
        const toAyah = hasRange ? Number(toAyahStr) : fromAyah;
        const options = { tajweed: Boolean(tajweedFlag) };

        if (
          !Number.isFinite(surah) ||
          !Number.isFinite(fromAyah) ||
          !Number.isFinite(toAyah)
        ) {
          console.warn("[QuranTags] Invalid numbers in tag:", match);
          return match;
        }

        const html = !hasRange || fromAyah === toAyah
          ? renderAyahBlock(surah, fromAyah, options)
          : renderAyahRangeBlock(surah, fromAyah, toAyah, options);
        // Повторный пример должен управлять своим аудио, а не первым в документе.
        const audioId = html.match(/data-audio-id="([^"]+)"/)?.[1];
        if (!audioId) return html;
        const occurrence = (audioOccurrences.get(audioId) ?? 0) + 1;
        audioOccurrences.set(audioId, occurrence);
        return occurrence === 1 ? html : html.replaceAll(audioId, `${audioId}-${occurrence}`);
      } catch (e) {
        console.error("[QuranTags] Error rendering tag:", match, e);
        // fallback – оставляем исходный тег, чтобы было видно проблему
        return match;
      }
    },
  );
}
