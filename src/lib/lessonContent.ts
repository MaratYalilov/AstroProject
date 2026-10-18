export type LessonContentSegment =
  | { kind: "html"; html: string }
  | {
      kind: "dic";
      lessonNumber: number;
      words: Array<{ arabic: string; russian: string }>;
    };

const CARD_MARKER_SOURCE =
  '<div class="dic-flashcard-marker" data-lesson="(\\d+)" data-words=\'([^\']+)\'></div>';

/**
 * Делит HTML урока на текстовые куски и карточки словаря.
 * Повторяет разбор, который раньше жил в LessonPage.
 */
export function splitLessonHtml(input: string): LessonContentSegment[] {
  const html = input.replace(/\r\n?/g, "\n");
  const segments: LessonContentSegment[] = [];
  const marker = new RegExp(CARD_MARKER_SOURCE, "g");
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = marker.exec(html)) !== null) {
    const before = html.slice(lastIndex, match.index);
    if (before) segments.push({ kind: "html", html: before });

    try {
      const words = JSON.parse(match[2]) as Array<{
        arabic: string;
        russian: string;
      }>;
      segments.push({
        kind: "dic",
        lessonNumber: Number(match[1]),
        words,
      });
    } catch {
      // Повреждённый маркер оставляем в тексте, чтобы не потерять разметку.
      segments.push({ kind: "html", html: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  const rest = html.slice(lastIndex);
  if (rest) segments.push({ kind: "html", html: rest });

  return segments;
}

/** В части старых уроков h1 пришёл из Markdown: второй такой же не добавляем. */
export function hasContentH1(html: string): boolean {
  return /<h1[\s>]/i.test(html);
}
