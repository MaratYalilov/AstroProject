import React from "react";
import { BookOpen, Sparkles } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { marked } from "marked";
import { replaceQuranTags } from "../../utils/replaceQuranTags";

type TitleSegment = {
  text: string;
  arab?: boolean;
};

type Props = {
  title: string | TitleSegment[];
  source: string;
  subject?: string;
  course?: string;
};

// Общий glob для всех theory-файлов во всех курсах
const theoryModules = import.meta.glob<string>(
  "/src/content/lessons/**/theory/*.md",
  {
    query: "?raw",
    import: "default",
  },
);

function normalizeMarkdown(markdown: string): string {
  // Просто удаляем Frontmatter (служебную информацию в начале файла)
  return markdown.replace(/^---[\s\S]*?---\s*/, "").trim();
}

async function loadTheoryMarkdown(source: string): Promise<string> {
  const normalizedSource = source.replace(/^\/+/, "");
  const moduleKey = Object.keys(theoryModules).find(
    (key) =>
      key.endsWith(`/theory/${normalizedSource}`) ||
      key.endsWith(`/${normalizedSource}`),
  );

  if (!moduleKey) {
    throw new Error(`Theory markdown not found: ${source}`);
  }

  return normalizeMarkdown(await theoryModules[moduleKey]());
}

function TheoryContent({
  html,
}: {
  html: string;
}) {
  return (
    <div
      className="max-w-none
        [&_h1]:mb-5 [&_h1]:mt-2 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:leading-tight [&_h1]:text-slate-950 dark:[&_h1]:text-white
        [&_h2]:mb-4 [&_h2]:mt-9 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:text-slate-950 dark:[&_h2]:text-white
        [&_h3]:mb-3 [&_h3]:mt-7 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:leading-snug [&_h3]:text-slate-900 dark:[&_h3]:text-slate-50
        [&_p]:my-5 [&_p]:text-lg [&_p]:leading-8 [&_p]:text-slate-700 dark:[&_p]:text-slate-200
        [&_strong]:font-semibold [&_strong]:text-slate-950 dark:[&_strong]:text-white
        [&_ul]:my-6 [&_ul]:list-disc [&_ul]:space-y-3 [&_ul]:pl-6 [&_ul]:text-lg [&_ul]:leading-8 [&_ul]:text-slate-700 dark:[&_ul]:text-slate-200
        [&_ol]:my-6 [&_ol]:list-decimal [&_ol]:space-y-3 [&_ol]:pl-6 [&_ol]:text-lg [&_ol]:leading-8 [&_ol]:text-slate-700 dark:[&_ol]:text-slate-200
        [&_li]:pl-1 [&_li]:marker:text-cyan-600 dark:[&_li]:marker:text-cyan-300
        [&_blockquote]:my-7 [&_blockquote]:rounded-2xl [&_blockquote]:border [&_blockquote]:border-cyan-200/70 [&_blockquote]:bg-cyan-50/70 [&_blockquote]:px-5 [&_blockquote]:py-4 [&_blockquote]:text-lg [&_blockquote]:leading-8 [&_blockquote]:text-slate-800 [&_blockquote]:shadow-sm [&_blockquote]:shadow-cyan-100/60 dark:[&_blockquote]:border-cyan-300/15 dark:[&_blockquote]:bg-cyan-300/10 dark:[&_blockquote]:text-slate-100 dark:[&_blockquote]:shadow-none
        [&_code]:rounded-md [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-base [&_code]:text-slate-900 dark:[&_code]:bg-white/10 dark:[&_code]:text-slate-100
        [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_table]:text-base [&_table]:text-slate-700 dark:[&_table]:text-slate-200 [&_table]:border [&_table]:border-slate-200/80 dark:[&_table]:border-white/10 [&_table]:rounded-xl [&_table]:overflow-hidden
        [&_thead]:border-b [&_thead]:border-slate-200/80 [&_thead]:bg-slate-50/80 dark:[&_thead]:border-white/10 dark:[&_thead]:bg-white/[0.04]
        [&_tbody]:divide-y [&_tbody]:divide-slate-200/80 dark:[&_tbody]:divide-white/10
        [&_tr]:transition-colors [&_tr]:hover:bg-slate-50/50 dark:[&_tr]:hover:bg-white/[0.02]
        [&_th]:px-4 [&_th]:py-3 [&_th]:text-sm [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-slate-600 dark:[&_th]:text-slate-400 sm:[&_th]:px-5
        [&_td]:px-4 [&_td]:py-3 [&_td]:text-lg sm:[&_td]:px-5 [&_td:first-child]:font-arabic [&_td:first-child]:text-2xl"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function TheoryReveal({
  title,
  source,
}: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentId = useId();
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (html !== null || isLoading) return;

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    loadTheoryMarkdown(source)
      .then(async (content) => {
        if (!isCancelled) {
          try {
            // marked.parse возвращает строку HTML (синхронно или асинхронно)
            const parsedHtml = await marked.parse(content);
            // Заменяем теги {Quran}...{/Quran} на HTML-блоки с аятами
            const htmlWithQuran = replaceQuranTags(parsedHtml);
            setHtml(htmlWithQuran);
          } catch (err) {
            console.error(err);
            setError("Не удалось загрузить теорию урока.");
          }
        }
      })
      .catch((err) => {
        console.error(err);
        if (!isCancelled) {
          setError("Не удалось загрузить теорию урока.");
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [source]);

  return (
    // ВАЖНО: обычный section без layout-анимации и backdrop-blur.
    // motion.section layout анимировал трансформом всю секцию при подгрузке
    // теории (текст появлялся растянутым/размытым), а backdrop-blur-2xl на
    // полотне высотой в тысячи пикселей переполнял VRAM и ронял драйвер GPU.
    <section
      ref={sectionRef}
      className="scroll-mt-28 overflow-hidden rounded-3xl border border-white/70 bg-white p-0 sm:p-4 shadow-xl shadow-slate-200/70 transition-colors duration-300 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/20"
    >

      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-cyan-50/55 to-emerald-50/70 p-4 sm:p-6 dark:border-white/10 dark:from-white/[0.08] dark:via-cyan-300/[0.08] dark:to-emerald-300/[0.06]">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 shadow-sm shadow-cyan-100/70 dark:border-cyan-300/20 dark:bg-white/10 dark:text-cyan-200 dark:shadow-none">
              <Sparkles size={13} aria-hidden="true" />
              Теория
            </div>

            <h2 className="text-2xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-3xl">
              Теперь давайте разберём подробнее
            </h2>

          </div>
        </div>
      </div>

      <div className="w-full px-0 pb-4 pt-6 sm:mx-auto sm:px-4 sm:pb-6">
        <div className="sticky top-4 z-10 mb-6 flex items-center gap-2 rounded-2xl border border-white/80 bg-white/85 px-3 py-3 text-sm font-semibold text-slate-700 shadow-lg shadow-slate-200/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/75 dark:text-slate-200 dark:shadow-black/20 sm:px-4">
          <BookOpen size={17} className="text-cyan-600 dark:text-cyan-300" aria-hidden="true" />
          {Array.isArray(title)
            ? title.map((seg, i) =>
                seg.arab ? (
                  <span key={i} className="arab">{seg.text}</span>
                ) : (
                  <React.Fragment key={i}>{seg.text}</React.Fragment>
                ),
              )
            : title || "Теория урока"}
        </div>

        {/* без backdrop-blur: статья — вся высота теории, размытие подложки
            такой площади слишком дорого для GPU */}
        <article className="rounded-2xl border border-slate-200/80 bg-white px-4 py-6 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-slate-950/35 dark:shadow-none sm:px-8 sm:py-8">
          {isLoading && (
            <div className="space-y-4" aria-live="polite">
              <div className="h-5 w-2/3 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
              <div className="h-4 w-full animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
              <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
            </div>
          )}

          {error && (
            <p className="m-0 text-lg leading-8 text-rose-700 dark:text-rose-200">
              {error}
            </p>
          )}

          {html && <TheoryContent html={html} />}
        </article>
      </div>

    </section>
  );
}
