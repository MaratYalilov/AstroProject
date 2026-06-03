import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
type Props = {
  lessonId: string;
  arabic?: string;
  title?: string;
  text?: string;
  nextLesson?: string;
};

export default function LessonComplete({ lessonId, arabic, title, text, nextLesson }: Props) {
  const storageKey = `lesson-complete-${lessonId}`;

  const [done, setDone] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  useEffect(() => {
  setDone(localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

function handleClick() {
  localStorage.setItem(
    `lesson-complete-${lessonId}`,
    "1"
  );
  window.dispatchEvent(new Event("lesson-complete-changed"));

  setDone(true);
  setShowFireworks(true);

  setTimeout(() => {
    setShowFireworks(false);
  }, 2500);
}

  return (
    <div className="relative mt-10 rounded-2xl border border-sky-200 bg-sky-50 p-6 text-center dark:border-sky-900/50 dark:bg-sky-950/20">
      <div className="arab text-4xl mb-3">
        {arabic}
      </div>

      <div className="font-medium mb-2">
        {title}
      </div>

      <p className="text-sm opacity-80">
        {text}
      </p>

      {nextLesson && (
        <p className="text-sm opacity-80 mb-5">
          {nextLesson}
        </p>
      )}

      {done ? (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          <CheckCircle2 size={18} />
          Урок завершён
        </div>
      ) : (
        <button
          onClick={handleClick}
          className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
        >
          Отметить завершённым
        </button>
      )}
        <AnimatePresence>
        {showFireworks && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 40 }).map((_, i) => {
                const angle = (360 / 40) * i;
                const distance = 180 + Math.random() * 120;

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
                    x:
                        Math.cos(angle * Math.PI / 180) *
                        distance,
                    y:
                        Math.sin(angle * Math.PI / 180) *
                        distance,
                    opacity: 0,
                    scale: 1.4,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                    duration: 2,
                    ease: "easeOut",
                    }}
                    className="absolute left-1/2 top-1/2 text-2xl"
                >
                    {
                    ["✨", "⭐", "🎉", "💚", "💙"][
                        Math.floor(Math.random() * 5)
                    ]
                    }
                </motion.div>
                );
            })}
            </div>
        )}
        </AnimatePresence>

    </div>
  );
}
