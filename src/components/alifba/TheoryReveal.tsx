import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ChevronDown, Sparkles } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import ReactMarkdown from "react-markdown";

type Props = {
  title: string;
  source: string;
};

const theoryModules = import.meta.glob<string>(
  "/src/content/lessons/quran/muallim-sani/theory/*.md",
  {
    query: "?raw",
    import: "default",
  },
);

function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/^---[\s\S]*?---\s*/, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
  markdown,
}: {
  markdown: string;
}) {
  return (
    <ReactMarkdown
      skipHtml
      components={{
        h1: ({ children }) => (
          <h2 className="mb-5 mt-2 text-3xl font-semibold leading-tight text-slate-950 dark:text-white">
            {children}
          </h2>
        ),
        h2: ({ children }) => (
          <h3 className="mb-4 mt-9 text-2xl font-semibold leading-tight text-slate-950 dark:text-white">
            {children}
          </h3>
        ),
        h3: ({ children }) => (
          <h4 className="mb-3 mt-7 text-xl font-semibold leading-snug text-slate-900 dark:text-slate-50">
            {children}
          </h4>
        ),
        p: ({ children }) => (
          <p className="my-5 text-lg leading-8 text-slate-700 dark:text-slate-200">
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-950 dark:text-white">
            {children}
          </strong>
        ),
        ul: ({ children }) => (
          <ul className="my-6 space-y-3 pl-6 text-lg leading-8 text-slate-700 dark:text-slate-200">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="my-6 list-decimal space-y-3 pl-6 text-lg leading-8 text-slate-700 dark:text-slate-200">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="pl-1 marker:text-cyan-600 dark:marker:text-cyan-300">
            {children}
          </li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-7 rounded-2xl border border-cyan-200/70 bg-cyan-50/70 px-5 py-4 text-lg leading-8 text-slate-800 shadow-sm shadow-cyan-100/60 dark:border-cyan-300/15 dark:bg-cyan-300/10 dark:text-slate-100 dark:shadow-none">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-base text-slate-900 dark:bg-white/10 dark:text-slate-100">
            {children}
          </code>
        ),
        table: ({ children }) => (
          <div className="my-6 overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/10">
            <table className="w-full border-collapse text-left text-base text-slate-700 dark:text-slate-200">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.04]">
            {children}
          </thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
            {children}
          </tbody>
        ),
        tr: ({ children }) => (
          <tr className="transition-colors hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className="px-4 py-3 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 sm:px-5">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-3 text-lg sm:px-5 [&:first-child]:font-arabic [&:first-child]:text-2xl">
            {children}
          </td>
        ),
      }}

    >
      {markdown}
    </ReactMarkdown>
  );
}

export default function TheoryReveal({
  title,
  source,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentId = useId();
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || markdown !== null || isLoading) return;

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    loadTheoryMarkdown(source)
      .then((content) => {
        if (!isCancelled) setMarkdown(content);
      })
      .catch(() => {
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
  }, [isOpen, source]);

  const handleOpen = () => {
    setIsOpen((value) => !value);
  };

  const handleAnimationComplete = () => {
    if (isOpen && sectionRef.current) {
      sectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <motion.section
      ref={sectionRef}
      layout
      className="scroll-mt-28 overflow-hidden rounded-3xl border border-white/70 bg-white/75 p-4 shadow-xl shadow-slate-200/70 backdrop-blur-2xl transition-colors duration-300 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/20 sm:p-5"
    >

      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-cyan-50/55 to-emerald-50/70 p-5 dark:border-white/10 dark:from-white/[0.08] dark:via-cyan-300/[0.08] dark:to-emerald-300/[0.06] sm:p-6">
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

          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsOpen((value) => !value)}
            aria-expanded={isOpen}
            aria-controls={contentId}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-white dark:bg-white dark:text-slate-950 dark:shadow-cyan-400/10 dark:hover:bg-cyan-50 dark:focus:ring-offset-slate-950 sm:w-auto"
          >
            {isOpen ? "Скрыть теорию" : "Открыть теорию"}
            <ChevronDown
              size={18}
              className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </motion.button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={contentId}
            key="theory-content"
            initial={{ height: 0, opacity: 0, filter: "blur(8px)" }}
            animate={{ height: "auto", opacity: 1, filter: "blur(0px)" }}
            exit={{ height: 0, opacity: 0, filter: "blur(8px)" }}
            transition={{
              height: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: 0.24 },
              filter: { duration: 0.24 },
            }}
            onAnimationComplete={handleAnimationComplete}
            className="overflow-hidden"

          >
            <div className="mx-auto max-w-3xl px-2 pb-4 pt-6 sm:px-4 sm:pb-6">
              <div className="sticky top-4 z-10 mb-6 flex items-center gap-2 rounded-2xl border border-white/80 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg shadow-slate-200/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/75 dark:text-slate-200 dark:shadow-black/20">
                <BookOpen size={17} className="text-cyan-600 dark:text-cyan-300" aria-hidden="true" />
                {title || "Теория урока"}
              </div>

              <article className="rounded-2xl border border-slate-200/80 bg-white/80 px-5 py-6 shadow-sm shadow-slate-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/35 dark:shadow-none sm:px-8 sm:py-8">
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

                {markdown && <TheoryContent markdown={markdown} />}

                {markdown && (
                  <div className="mt-8 flex justify-center border-t border-slate-200/60 pt-6 dark:border-white/10">
                    <motion.button
                      type="button"
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsOpen(false)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-200/60 backdrop-blur-sm transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-white dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:shadow-none dark:hover:bg-white/[0.1] dark:hover:text-white dark:focus:ring-offset-slate-950"
                    >
                      <ChevronDown
                        size={16}
                        className="rotate-180"
                        aria-hidden="true"
                      />
                      Скрыть теорию
                    </motion.button>
                  </div>
                )}
              </article>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
