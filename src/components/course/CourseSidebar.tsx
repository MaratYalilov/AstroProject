import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Check,
  ChevronRight,
  ListChecks,
  Lock,
  X,
} from "lucide-react";
import CourseProgress from "./CourseProgress";

export type TitleSegment = {
  text: string;
  arab?: boolean;
};

export type LessonItem = {
  id: number;
  slug: string;
  title: string | TitleSegment[];
};

type Props = {
  lessons: LessonItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
  isOpen: boolean;
  onClose: () => void;
};

const LESSON_COMPLETE_EVENT = "lesson-complete-changed";

function getCompletedLessonIds(lessons: LessonItem[]) {
  const completed = new Set<number>();

  if (typeof window === "undefined") {
    return completed;
  }

  lessons.forEach((lesson) => {
    try {
      if (localStorage.getItem(`lesson-complete-${lesson.id}`) === "1") {
        completed.add(lesson.id);
      }
    } catch (e) {
      // localStorage недоступен
    }
  });

  return completed;
}

function LessonStatusIcon({
  status,
}: {
  status: "completed" | "current" | "next" | "locked";
}) {
  switch (status) {
    case "completed":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-300/50">
          <Check className="h-4 w-4" />
        </div>
      );
    case "current":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-white shadow-lg shadow-cyan-500/25 ring-2 ring-cyan-300/60 dark:bg-cyan-400 dark:text-slate-950">
          <BookOpen className="h-4 w-4" />
        </div>
      );
    case "locked":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 ring-1 ring-gray-200 dark:bg-white/5 dark:ring-white/10">
          <Lock className="h-4 w-4 text-gray-400 dark:text-slate-500" />
        </div>
      );
    default:
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/75 shadow-sm shadow-gray-200/50 ring-1 ring-gray-200 dark:bg-white/[0.06] dark:shadow-none dark:ring-white/10">
          <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-slate-500" />
        </div>
      );
  }
}

export default function CourseSidebar({
  lessons,
  currentIndex,
  onSelect,
  isOpen,
  onClose,
}: Props) {
  return (
    <>
      <aside className="hidden lg:flex lg:h-screen lg:w-80 lg:shrink-0 lg:sticky lg:top-0 lg:overflow-hidden lg:border-r lg:border-gray-200 lg:bg-white/80 lg:backdrop-blur-xl lg:shadow-2xl lg:shadow-gray-200/60 dark:lg:border-white/10 dark:lg:bg-white/[0.04] dark:lg:shadow-black/20">
        <SidebarContent
          lessons={lessons}
          currentIndex={currentIndex}
          onSelect={onSelect}
        />
      </aside>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] overflow-hidden border-r border-gray-200 bg-white/90 shadow-2xl shadow-gray-900/20 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white/75 text-gray-600 shadow-sm shadow-gray-200/50 backdrop-blur transition hover:bg-cyan-50 hover:text-cyan-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:shadow-none dark:hover:bg-white/10 dark:hover:text-cyan-300"
                aria-label="Закрыть меню"
              >
                <X className="h-4 w-4" />
              </button>

              <SidebarContent
                lessons={lessons}
                currentIndex={currentIndex}
                onSelect={(index) => {
                  onSelect(index);
                  onClose();
                }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarContent({
  lessons,
  currentIndex,
  onSelect,
}: {
  lessons: LessonItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  const navRef = useRef<HTMLElement | null>(null);
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<number>>(
    () => getCompletedLessonIds(lessons)
  );

  useEffect(() => {
    const syncCompletedLessons = () => {
      setCompletedLessonIds(getCompletedLessonIds(lessons));
    };

    syncCompletedLessons();
    window.addEventListener("storage", syncCompletedLessons);
    window.addEventListener(LESSON_COMPLETE_EVENT, syncCompletedLessons);

    return () => {
      window.removeEventListener("storage", syncCompletedLessons);
      window.removeEventListener(LESSON_COMPLETE_EVENT, syncCompletedLessons);
    };
  }, [lessons]);

  useEffect(() => {
    const nav = navRef.current;
    const el = buttonRefs.current.get(currentIndex);
    if (!nav || !el) return;

    const raf = requestAnimationFrame(() => {
      const navRect = nav.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

      const delta =
        elRect.top - navRect.top - (navRect.height - elRect.height) / 2;

      nav.scrollTo({ top: nav.scrollTop + delta, behavior: "smooth" });
    });

    return () => cancelAnimationFrame(raf);
  }, [currentIndex, lessons.length]);

  const completedCount = lessons.reduce(
    (count, lesson) => count + (completedLessonIds.has(lesson.id) ? 1 : 0),
    0
  );

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-28 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-300/10" />

      <header className="relative border-b border-gray-200/70 p-5 dark:border-white/10">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 shadow-sm shadow-cyan-100/70 dark:border-cyan-300/20 dark:bg-white/10 dark:text-cyan-200 dark:shadow-none">
          <ListChecks size={13} aria-hidden="true" />
          Курс
        </div>
        <h2 className="text-lg font-bold tracking-tight text-gray-950 dark:text-white">
          Муаллим Сани
        </h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
          Интерактивные уроки
        </p>
      </header>

      <div className="relative px-5 pb-3 pt-4">
        <CourseProgress completed={completedCount} total={lessons.length} />
      </div>

      <nav ref={navRef} className="relative flex-1 space-y-2 overflow-y-auto px-3 pb-4">
        {lessons.map((lesson, index) => {
          const isCurrent = index === currentIndex;
          const isCompleted = completedLessonIds.has(lesson.id);
          const status = isCompleted
            ? "completed"
            : isCurrent
              ? "current"
              : "next";

          return (
            <motion.button
              ref={(el) => {
                if (el) {
                  buttonRefs.current.set(index, el);
                } else {
                  buttonRefs.current.delete(index);
                }
              }}
              key={lesson.id}
              type="button"
              onClick={() => onSelect(index)}
              className={[
                "group relative flex w-full items-center gap-3 overflow-hidden rounded-[18px] border px-4 py-3.5 text-left text-sm transition-all duration-300 sm:text-base",
                isCurrent
                  ? "border-cyan-300 bg-cyan-50/70 shadow-lg shadow-cyan-500/10 ring-2 ring-cyan-400/35 dark:border-cyan-300/40 dark:bg-cyan-300/10"
                  : "border-gray-200 bg-white/75 shadow-sm shadow-gray-200/50 hover:border-cyan-300/60 hover:bg-cyan-50/50 hover:shadow-lg hover:shadow-cyan-500/10 dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none dark:hover:border-cyan-300/30 dark:hover:bg-white/[0.075]",
              ].join(" ")}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
            >
              <span
                className={[
                  "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300",
                  "bg-gradient-to-br from-cyan-400/12 via-transparent to-emerald-300/10",
                  isCurrent ? "opacity-100" : "group-hover:opacity-100",
                ].join(" ")}
              />

              {isCurrent && (
                <motion.span
                  className="pointer-events-none absolute inset-0 rounded-[18px] border border-cyan-300/60"
                  layoutId="activeSidebarLesson"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              <div className="relative z-10">
                <LessonStatusIcon status={status} />
              </div>

              <div className="relative z-10 min-w-0 flex-1">
                <span
                  className={[
                    "block truncate text-base font-semibold",
                    status === "completed"
                      ? "text-emerald-700 dark:text-emerald-300"
                      : status === "current"
                        ? "text-cyan-800 dark:text-cyan-200"
                        : "text-gray-700 dark:text-slate-300",
                  ].join(" ")}
                >
                  {Array.isArray(lesson.title)
                    ? lesson.title.map((seg, i) =>
                        seg.arab ? (
                          <span key={i} className="arab">
                            {seg.text}
                          </span>
                        ) : (
                          <React.Fragment key={i}>{seg.text}</React.Fragment>
                        )
                      )
                    : lesson.title}
                </span>
                <span className="mt-0.5 block text-sm text-gray-500 dark:text-slate-500">
                  Урок {lesson.id}
                </span>
              </div>
              {isCurrent && (
                <ChevronRight className="relative z-10 h-4 w-4 text-cyan-600 dark:text-cyan-300" />
              )}
            </motion.button>
          );
        })}
      </nav>

      <footer className="relative border-t border-gray-200/70 p-4 dark:border-white/10">
        <p className="text-center text-[10px] font-medium uppercase tracking-[0.16em] text-gray-400 dark:text-slate-600">
          {lessons.length} уроков
        </p>
      </footer>
    </div>
  );
}
