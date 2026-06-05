import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

type Props = {
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
};

export default function LessonNavigation({
  currentIndex,
  total,
  onPrev,
  onNext,
}: Props) {
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;

  const baseButtonClass =
    "group relative flex min-h-[64px] flex-1 items-center gap-3 overflow-hidden rounded-[18px] border px-4 py-4 text-left shadow-sm backdrop-blur transition-all duration-300 sm:flex-none sm:px-5 lg:min-w-[250px]";
  const enabledButtonClass =
    "border-gray-200 bg-white/80 shadow-gray-200/60 hover:border-cyan-300/70 hover:bg-cyan-50/60 hover:shadow-lg hover:shadow-cyan-500/10 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none dark:hover:border-cyan-300/35 dark:hover:bg-white/[0.09]";
  const disabledButtonClass =
    "cursor-not-allowed border-gray-200 bg-white/45 text-gray-400 opacity-60 dark:border-white/10 dark:bg-white/[0.025] dark:text-slate-600";

  return (
    <nav className="mt-10 border-t border-gray-200/70 pt-5 dark:border-white/10">
      <div className="flex items-stretch justify-between gap-3 sm:items-center sm:gap-4">
        <motion.button
          type="button"
          onClick={onPrev}
          disabled={isFirst}
          className={[
            baseButtonClass,
            isFirst ? disabledButtonClass : enabledButtonClass,
          ].join(" ")}
          whileHover={!isFirst ? { y: -2, scale: 1.01 } : {}}
          whileTap={!isFirst ? { scale: 0.985 } : {}}
        >
          {!isFirst && (
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-400/12 via-transparent to-emerald-300/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          )}

          <span
            className={[
              "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-lg",
              isFirst
                ? "bg-gray-100 text-gray-400 shadow-gray-200/50 dark:bg-white/5 dark:text-slate-600 dark:shadow-none"
                : "bg-cyan-600 text-white shadow-cyan-500/25 dark:bg-cyan-400 dark:text-slate-950",
            ].join(" ")}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </span>

          <span className="relative z-10 min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-slate-400">
              Назад
            </span>
            <span
              className={[
                "block text-base font-bold leading-5 sm:text-lg",
                isFirst
                  ? "text-gray-400 dark:text-slate-600"
                  : "text-gray-950 dark:text-white",
              ].join(" ")}
            >
              Предыдущий урок
            </span>
          </span>
        </motion.button>

        <div className="hidden min-w-[84px] rounded-full border border-gray-200 bg-white/75 px-3 py-2 text-center text-sm font-semibold tabular-nums text-cyan-700 shadow-sm shadow-gray-200/50 backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:text-cyan-300 dark:shadow-none sm:block">
          {currentIndex + 1} / {total}
        </div>

        <motion.button
          type="button"
          onClick={onNext}
          disabled={isLast}
          className={[
            baseButtonClass,
            "justify-end text-right",
            isLast ? disabledButtonClass : enabledButtonClass,
          ].join(" ")}
          whileHover={!isLast ? { y: -2, scale: 1.01 } : {}}
          whileTap={!isLast ? { scale: 0.985 } : {}}
        >
          {!isLast && (
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-300/12 via-transparent to-cyan-400/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          )}

          <span className="relative z-10 min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-slate-400">
              Вперёд
            </span>
            <span
              className={[
                "block text-base font-bold leading-5 sm:text-lg",
                isLast
                  ? "text-gray-400 dark:text-slate-600"
                  : "text-gray-950 dark:text-white",
              ].join(" ")}
            >
              Следующий урок
            </span>
          </span>

          <span
            className={[
              "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-lg",
              isLast
                ? "bg-gray-100 text-gray-400 shadow-gray-200/50 dark:bg-white/5 dark:text-slate-600 dark:shadow-none"
                : "bg-emerald-500 text-white shadow-emerald-500/25",
            ].join(" ")}
          >
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </span>
        </motion.button>
      </div>
    </nav>
  );
}
