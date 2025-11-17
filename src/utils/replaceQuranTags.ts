// src/utils/replaceQuranTags.ts

import { renderAyahBlock } from './quranRenderer';

const QURAN_TAG_REGEX = /\{Quran\}(\d+):(\d+)\{\/Quran\}/g;

export function replaceQuranTags(input: string): string {
  return input.replace(QURAN_TAG_REGEX, (_, surahStr: string, ayahStr: string) => {
    const surah = Number(surahStr);
    const ayah = Number(ayahStr);

    try {
      return renderAyahBlock(surah, ayah);
    } catch (e) {
      console.error(e);
      // если что-то сломалось — оставим оригинальный тег, чтобы не потерять инфу
      return `{Quran}${surah}:${ayah}{/Quran}`;
    }
  });
}
