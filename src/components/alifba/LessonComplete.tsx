import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";

type Props = {
  lessonId: string;
  arabic?: string;
  title?: string;
  text?: string;
  nextLesson?: string;
};

const COMPLETE_EVENT = "lesson-complete-changed";
const FIREWORK_EMOJIS = [
  "\u2728",
  "\u2b50",
  "\ud83c\udf89",
  "\ud83d\udc9a",
  "\ud83d\udc99",
];

export default function LessonComplete({
  lessonId,
  arabic,
  title,
  text,
  nextLesson,
}: Props) {
  const storageKey = `lesson-complete-${lessonId}`;

  const [done, setDone] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);

  useEffect(() => {
    setDone(localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  function handleClick() {
    localStorage.setItem(storageKey, "1");
    window.dispatchEvent(new Event(COMPLETE_EVENT));

    setDone(true);
    setShowFireworks(true);

    setTimeout(() => {
      setShowFireworks(false);
    }, 2500);
  }

  return (
    <section className="relative mt-10 overflow-hidden rounded-3xl border border-gray-200 bg-white/80 p-4 text-center shadow-lg shadow-gray-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl dark:shadow-black/20 sm:p-6">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-28 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-300/10" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 shadow-sm shadow-cyan-100/70 dark:border-cyan-300/20 dark:bg-white/10 dark:text-cyan-200 dark:shadow-none">
          <Sparkles size={13} aria-hidden="true" />
          Итог урока
        </div>

        {arabic && (
          <div className="arab text-4xl leading-tight text-gray-950 dark:text-[#e8e1d8] sm:text-5xl">
            {arabic}
          </div>
        )}

        <div className="space-y-3">
          {title && (
            <h2 className="m-0 text-2xl font-bold text-gray-950 dark:text-white sm:text-3xl">
              {title}
            </h2>
          )}

          {text && (
            <p className="m-0 text-sm leading-6 text-gray-600 dark:text-slate-300 sm:text-base">
              {text}
            </p>
          )}

          {nextLesson && (
            <p className="m-0 text-sm leading-6 text-gray-500 dark:text-slate-400">
              {nextLesson}
            </p>
          )}
        </div>

        {done ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-50/80 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-lg shadow-emerald-500/10 backdrop-blur dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-200"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
              <CheckCircle2 size={17} aria-hidden="true" />
            </span>
            Урок завершен
          </motion.div>
        ) : (
          <motion.button
            type="button"
            onClick={handleClick}
            whileHover={{ y: -2, scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-500 dark:bg-cyan-400 dark:text-slate-950"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-sky-400/10 to-emerald-300/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <CheckCircle2 className="relative h-5 w-5" aria-hidden="true" />
            <span className="relative">Отметить завершенным</span>
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showFireworks && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 42 }).map((_, i) => {
              const angle = (360 / 42) * i;
              const distance = 120 + ((i * 37) % 120);
              const emoji = FIREWORK_EMOJIS[i % FIREWORK_EMOJIS.length];

              return (
                <motion.div
                  key={i}
                  initial={{
                    x: 0,
                    y: 0,
                    opacity: 1,
                    scale: 0.4,
                  }}
                  animate={{
                    x: Math.cos((angle * Math.PI) / 180) * distance,
                    y: Math.sin((angle * Math.PI) / 180) * distance,
                    opacity: 0,
                    scale: 1.2,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 1.8,
                    ease: "easeOut",
                  }}
                  className="absolute left-1/2 top-1/2 text-2xl"
                >
                  {emoji}
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
