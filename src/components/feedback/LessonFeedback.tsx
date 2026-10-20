type Props = {title: string | {text: string}[]; url: string};

/** Server-rendered link; form logic is only loaded on the feedback page. */
export default function LessonFeedback({title, url}: Props) {
  const label = (Array.isArray(title) ? title.map(part => part.text).join('') : title).trim();
  const params = new URLSearchParams({url, title: label});
  return (
    <div className="my-8 flex flex-col items-start justify-between gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-black/5 dark:bg-[#303638] dark:ring-white/10 sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-5" role="region" aria-label="Сообщить об ошибке">
      <p className="m-0 flex min-w-0 items-center gap-2 text-sm leading-5 text-slate-800 dark:text-slate-100 sm:gap-3 md:text-base">
        <svg className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4" />
          <path d="M12 17h.01" />
        </svg>
        <span>Заметили ошибку?</span>
      </p>
      <a href={`/feedback/bug?${params}`} data-lesson-feedback data-lesson-title={label}
        className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-full bg-sky-50 px-3 py-2 text-sm font-medium leading-5 text-sky-700 transition-colors hover:bg-sky-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600 dark:bg-sky-400/10 dark:text-sky-200 dark:hover:bg-sky-400/20 dark:focus-visible:outline-sky-300 sm:px-4">
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
          <path d="M8 8h8M8 12h6" />
        </svg>
        <span>Сообщить о неточности</span>
      </a>
    </div>
  );
}
