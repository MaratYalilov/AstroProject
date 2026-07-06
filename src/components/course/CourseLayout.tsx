import { useState, useCallback, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import CourseSidebar from "./CourseSidebar";
import LessonNavigation from "./LessonNavigation";
import InteractiveLessonPage from "../alifba/InteractiveLessonPage";
import type { LessonItem } from "./CourseSidebar";
import type { InteractiveLesson } from "../../lib/interactive/loadInteractiveLesson";
import { ReducedMotionProvider } from "../motion/ReducedMotionProvider";

const STORAGE_KEY_PREFIX = "course_progress_";

function getStorageKey(subject: string, course: string) {
  return `${STORAGE_KEY_PREFIX}${subject}_${course}`;
}

function loadProgress(subject: string, course: string): number {
  try {
    const key = getStorageKey(subject, course);
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      const index = parseInt(saved, 10);
      return isNaN(index) ? 0 : index;
    }
  } catch (e) {
    // localStorage недоступен
  }
  return 0;
}

function saveProgress(subject: string, course: string, index: number) {
  try {
    const key = getStorageKey(subject, course);
    localStorage.setItem(key, String(index));
  } catch (e) {
    // localStorage недоступен
  }
}

type Props = {
  lessons: InteractiveLesson[];
  subject: string;
  course: string;
  courseTitle?: string;
};

export default function CourseLayout({ lessons, subject, course, courseTitle }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  // Стартовый урок: приоритет у URL-параметра ?lesson=<slug> (deep-link),
  // иначе — сохранённый прогресс из localStorage.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("lesson");
    if (param) {
      const idx = lessons.findIndex((l) => l.slug === param);
      if (idx >= 0) {
        setCurrentIndex(idx);
        return;
      }
    }
    const saved = loadProgress(subject, course);
    if (saved > 0 && saved < lessons.length) setCurrentIndex(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, course]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const lessonItems: LessonItem[] = useMemo(
    () =>
      lessons.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        module: l.module,
      })),
    [lessons]
  );

  const currentLesson = lessons[currentIndex];

  // Сохраняем прогресс и отражаем текущий урок в URL (?lesson=<slug>) —
  // ссылку на конкретный урок можно копировать/отправлять (deep-link).
  useEffect(() => {
    saveProgress(subject, course, currentIndex);
    const slug = lessons[currentIndex]?.slug;
    if (slug) {
      window.history.replaceState(
        null,
        "",
        `?lesson=${encodeURIComponent(slug)}`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, course, currentIndex]);

  const scrollToTop = useCallback(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    scrollToTop();
  }, [scrollToTop]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(lessons.length - 1, prev + 1));
    scrollToTop();
  }, [lessons.length, scrollToTop]);

  const handleSelect = useCallback((index: number) => {
    setCurrentIndex(index);
    scrollToTop();
  }, [scrollToTop]);

  return (
    <ReducedMotionProvider>
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-cyan-950/10">
      {/* Sidebar */}
      <CourseSidebar
        lessons={lessonItems}
        currentIndex={currentIndex}
        onSelect={handleSelect}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        title={courseTitle}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header with hamburger + progress */}
        <div className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <motion.button
              onClick={() => setSidebarOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors shrink-0"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Menu className="h-4 w-4 text-muted-foreground" />
            </motion.button>

            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                initial={{ width: 0 }}
                animate={{
                  width: `${((currentIndex + 1) / lessons.length) * 100}%`,
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        {/* Lesson content */}
        <main className="flex-1 w-full mx-auto px-0 sm:px-6 lg:px-8 py-6 lg:py-10">
          {/* ВАЖНО: без AnimatePresence/motion — анимация opacity/y всего урока
              промоутила в GPU-слой страницу целиком (в уроках части 2 это
              огромная текстура, старый+новый урок одновременно), что
              переполняло видеопамять и роняло драйвер (экраны моргали). */}
          <div key={currentLesson?.slug ?? "empty"}>
            {currentLesson ? (
              <InteractiveLessonPage
                lesson={currentLesson}
                subject={subject}
                course={course}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Урок не найден
              </div>
            )}
          </div>

          {/* Bottom navigation */}
          {lessons.length > 1 && (
            <LessonNavigation
              currentIndex={currentIndex}
              total={lessons.length}
              onPrev={handlePrev}
              onNext={handleNext}
            />
          )}
        </main>
      </div>
    </div>
    </ReducedMotionProvider>
  );
}
