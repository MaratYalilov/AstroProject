import { ListChecks } from "lucide-react";

type Props = {
  title?: string;
  /** Уровень заголовка: h1 в основной колонке, h2 в шапке сайдбара. */
  as?: "h1" | "h2";
};

const headingClass =
  "text-lg font-bold tracking-tight lg:my-0 lg:border-0 lg:pb-0 text-gray-950 dark:text-white";

export default function CourseHeading({ title, as = "h2" }: Props) {
  const text = title ?? "Курс";

  return (
    <div className="lg:flex lg:items-center lg:gap-3">
        <div className="mb-3 inline-flex lg:mb-0 lg:shrink-0 items-center gap-2 rounded-full border border-cyan-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 shadow-sm shadow-cyan-100/70 dark:border-cyan-300/20 dark:bg-white/10 dark:text-cyan-200 dark:shadow-none">
          <ListChecks size={13} aria-hidden="true" />
          Курс
        </div>
        {as === "h1"
          ? <h1 className={headingClass}>{text}</h1>
          : <h2 className={headingClass}>{text}</h2>}
    </div>
  );
}
