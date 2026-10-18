import { renderTheoryHtml } from "./serverHtml";
import type { InteractiveLesson } from "./loadInteractiveLesson";

/** Include the selected lesson's theory in its first server render. */
export async function prepareInteractiveLesson(
  lesson: InteractiveLesson,
): Promise<InteractiveLesson> {
  const blocks = await Promise.all(lesson.blocks.map(async (block) => {
    if (block.type !== "theory") return block;
    const html = await renderTheoryHtml(lesson.subject, lesson.course, block.source);
    if (html === null) return block;
    return { ...block, initialHtml: html };
  }));

  // JSON modules are shared by requests: never mutate the original lesson.
  return { ...lesson, blocks };
}
