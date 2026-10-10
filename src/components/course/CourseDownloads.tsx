import { Download, FileText } from "lucide-react";

/** Скачиваемый материал курса (из поля downloads в YAML курса) */
export type CourseDownload = {
  title: string;
  url: string;
  /** Страница с описанием материала и ссылкой на файл. */
  pageUrl?: string;
  /** Короткий бейдж формата, например "PDF" */
  type?: string;
  /** Человекочитаемый размер, например "1,4 МБ" */
  size?: string;
};

export default function CourseDownloads({ downloads }: { downloads?: CourseDownload[] }) {
  return (
    <>
      {downloads && downloads.length > 0 && (
        <section aria-label="Материалы курса" className="w-full min-w-0">
          <div className="space-y-2">
            {downloads.map((item) => (
              <div key={item.url}>
                <a
                  href={item.url}
                  download
                  className="group flex items-center gap-3 rounded-xl border border-cyan-200/70 bg-cyan-50/50 px-3 py-3 text-gray-800 transition-colors hover:border-cyan-300/80 hover:bg-cyan-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-cyan-300/15 dark:bg-cyan-300/[0.04] dark:text-slate-200 dark:hover:border-cyan-300/30 dark:hover:bg-cyan-300/[0.08]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-100/70 text-cyan-700 dark:bg-cyan-300/10 dark:text-cyan-300">
                    <FileText className="h-5 w-5" aria-hidden="true" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-snug">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-xs text-gray-500 dark:text-slate-400">
                      {["Скачать", item.type, item.size].filter(Boolean).join(" · ")}
                    </span>
                  </span>

                  <Download className="h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                </a>
                {item.pageUrl && (
                  <a href={item.pageUrl} className="mt-2 block px-3 text-sm text-cyan-700 underline underline-offset-4 hover:no-underline dark:text-cyan-300">
                    О тетради и примеры страниц
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

    </>
  );
}
