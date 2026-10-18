// Server-only: Quran datasets and Markdown parsing must not reach browser imports.
import { marked } from "marked";
import { replaceQuranTags } from "../../utils/replaceQuranTags";
import { prepareMermaidBlocks } from "../../utils/mermaid";
import sharhData from "../../content/lessons/quran/koran-2-uroven/sharh.json";

const theoryModules = import.meta.glob<string>(
  "/src/content/lessons/**/theory/*.md",
  { query: "?raw", import: "default" },
);

export async function renderTheoryHtml(
  subject: string,
  course: string,
  source: string,
): Promise<string | null> {
  // Exact lookup in bundled public content, never a filesystem path from a request.
  const normalized = source.replace(/^\/+/, "");
  const prefix = `/src/content/lessons/${subject}/${course}/`;
  const loader = theoryModules[`${prefix}theory/${normalized}`]
    ?? theoryModules[`${prefix}${normalized}`];
  if (!loader) return null;

  const markdown = (await loader()).replace(/^---[\s\S]*?---\s*/, "").trim();
  return prepareMermaidBlocks(replaceQuranTags(await marked.parse(markdown)));
}

export async function renderSharhHtml(beit: number): Promise<string | null> {
  const markdown = (sharhData as Record<string, string>)[String(beit)];
  if (typeof markdown !== "string") return null;
  const parsed = await marked.parse(markdown);
  // Preserve the Arabic typeface and direction of the original commentary renderer.
  const withArab = parsed.replace(
    /<blockquote>([\s\S]*?)<\/blockquote>/g,
    (_match, inner: string) =>
      `<blockquote class="arab">${inner.replace(/<p>/g, '<p class="arab">')}</blockquote>`,
  );
  return prepareMermaidBlocks(replaceQuranTags(withArab));
}
