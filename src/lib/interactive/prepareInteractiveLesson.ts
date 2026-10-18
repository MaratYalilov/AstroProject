import { marked } from "marked";
import { replaceQuranTags } from "../../utils/replaceQuranTags";
import { prepareMermaidBlocks } from "../../utils/mermaid";
import type { InteractiveLesson } from "./loadInteractiveLesson";

// Server-only preparation. Keep the browser fallback for later course navigation.
const theoryModules = import.meta.glob<string>(
  "/src/content/lessons/**/theory/*.md",
  { query: "?raw", import: "default" },
);

/** Include the selected lesson's theory in its first server render. */
export async function prepareInteractiveLesson(
  lesson: InteractiveLesson,
): Promise<InteractiveLesson> {
  const blocks = await Promise.all(lesson.blocks.map(async (block) => {
    if (block.type !== "theory") return block;
    const source = block.source.replace(/^\/+/, "");
    const prefix = `/src/content/lessons/${lesson.subject}/${lesson.course}/`;
    const loader = theoryModules[`${prefix}theory/${source}`]
      ?? theoryModules[`${prefix}${source}`];
    if (!loader) return block;

    const markdown = (await loader()).replace(/^---[\s\S]*?---\s*/, "").trim();
    const html = prepareMermaidBlocks(replaceQuranTags(await marked.parse(markdown)));
    return { ...block, initialHtml: html };
  }));

  // JSON modules are shared by requests: never mutate the original lesson.
  return { ...lesson, blocks };
}
