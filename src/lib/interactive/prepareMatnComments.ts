// Server-only: raw commentaries must never be imported by a browser component.
import sharhData from "../../content/lessons/quran/koran-2-uroven/sharh.json";
import { getGlossaryLinkSlugs } from "../../utils/glossaryTarget";
import type { InteractiveLesson } from "./loadInteractiveLesson";

// An existing entry (including an empty list) means that a commentary exists.
const commentIndex: Record<string, string[]> = Object.fromEntries(
  Object.entries(sharhData).filter(([, text]) => Boolean(text)).map(([n, text]) =>
    [n, getGlossaryLinkSlugs(text)],
  ),
);

/** Only send availability and term references for the lesson's own beits. */
export function prepareMatnComments(lesson: InteractiveLesson): InteractiveLesson {
  if (!lesson.blocks.some(block => block.type === "matn")) return lesson;
  return {
    ...lesson,
    blocks: lesson.blocks.map(block => {
      if (block.type !== "matn") return block;
      const comments: Record<string, string[]> = {};
      for (let n = block.from; n <= block.to; n++) {
        if (commentIndex[n]) comments[n] = commentIndex[n];
      }
      return { ...block, comments };
    }),
  };
}
