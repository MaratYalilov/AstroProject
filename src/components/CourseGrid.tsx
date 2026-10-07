// src/components/CourseGrid.tsx
import React from "react";
import type { CollectionEntry } from "astro:content";
import { motion } from "framer-motion";
import { ReducedMotionProvider } from "./motion/ReducedMotionProvider";
import { Card, CardTitle } from "@/components/ui/card";
import { ArrowRight, Check } from "lucide-react";
import { readCourseProgress, type StudyCourse } from "@/lib/studyProgress";
import { useStudyProgress } from "./hooks/useStudyProgress";

type CourseEntry = CollectionEntry<"courses">;

interface CourseGridProps {
  subjectSlug: string;
  subjectTitle?: string;
  courses: CourseEntry[];
  studyCourses: StudyCourse[];
  subjectIcon?: string;
}

const CourseGrid: React.FC<CourseGridProps> = ({ 
  subjectSlug, 
  courses, 
  studyCourses,
  subjectIcon 
}) => {
  const progressCourses = React.useMemo(() => studyCourses.map(course => ({
    ...course, subject: subjectSlug,
  })), [studyCourses, subjectSlug]);
  const savedProgress = useStudyProgress(progressCourses);
  const [lastTextbookLessonSlug, setLastTextbookLessonSlug] = React.useState<string | null>(null);

  React.useEffect(() => {
    let lastSlug: string | null = null;
    if (subjectSlug === "akida") {
      try {
        lastSlug = window.localStorage.getItem("last-lesson:akida/uchebnik-6-stolpov");
      } catch {
        // При недоступном хранилище открываем предисловие.
      }
    }
    setLastTextbookLessonSlug(lastSlug);
  }, [subjectSlug]);

  const sortedCourses = [...courses].sort((a, b) => {
    if (a.data.order !== undefined && b.data.order !== undefined) {
      return a.data.order - b.data.order;
    }
    
    if (a.data.order !== undefined && b.data.order === undefined) {
      return -1;
    }
    
    if (a.data.order === undefined && b.data.order !== undefined) {
      return 1;
    }
    
    return 0;
  });

  if (!sortedCourses.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Для этого предмета пока нет курсов.
      </p>
    );
  }

  return (
    <ReducedMotionProvider>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sortedCourses.map((c) => {
        const studyCourse = studyCourses.find(course => course.slug === c.data.slug)!;
        const progress = savedProgress[`${subjectSlug}/${c.data.slug}`]
          ?? readCourseProgress(subjectSlug, studyCourse);
        // Учебник открываем сразу, без промежуточной страницы-перенаправления.
        const isTextbook = subjectSlug === "akida" && c.data.slug === "uchebnik-6-stolpov";
        const href = isTextbook
          ? `/lesson?${new URLSearchParams({
              subject: subjectSlug,
              course: c.data.slug,
              slug: lastTextbookLessonSlug || "akida/uchebnik-6-stolpov/0-predislovie",
            })}`
          : `/${subjectSlug}/${c.data.slug}`;
        
        return (
          <motion.a
            key={c.id}
            href={href}
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="interaction-card block h-full no-underline"
          >
            <Card className="group relative h-full min-h-[180px] cursor-pointer overflow-hidden border border-border/70 bg-gradient-to-br from-white to-gray-50/50 transition-all duration-300 hover:border-lime-300/50 hover:shadow-lg hover:shadow-lime-100/50 dark:from-gray-900/50 dark:to-gray-800/30 dark:hover:border-lime-800/50 dark:hover:shadow-lime-900/20">
              
              {/* Фоновая иконка предмета */}
              {subjectIcon && (
                <div className="absolute inset-0">
                  <div 
                    className="absolute right-0 top-1/2 h-full w-full -translate-y-1/2 opacity-[0.04] transition-all duration-500 group-hover:opacity-[0.06] group-hover:scale-105"
                    style={{
                      backgroundImage: `url(${subjectIcon})`,
                      backgroundSize: 'auto 100%',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right center',
                      backgroundOrigin: 'content-box',
                      paddingRight: '0px',
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent dark:from-gray-900/90 dark:via-gray-900/70" />
                </div>
              )}
              
              {/* Контент карточки */}
              <div className="relative z-10 h-full p-6 flex flex-col">
                {/* Верхняя часть с номером и заголовком */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex min-w-0 items-start gap-4">
                    {/* Номер курса в кружке */}
                    <div className="relative flex-shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-lg font-semibold transition-all duration-300 group-hover:scale-110 group-hover:from-lime-50 group-hover:to-lime-100 dark:from-gray-800 dark:to-gray-700 dark:group-hover:from-lime-900/30 dark:group-hover:to-lime-50/30">
                        {c.data.order || "№"}
                      </div>
                    </div>
                    
                    {/* Заголовок и описание */}
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg font-semibold leading-tight text-gray-900 dark:text-gray-100">
                        {c.data.title}
                      </CardTitle>
                      {c.data.description && (
                        <p
                          className="mt-2 text-sm text-muted-foreground line-clamp-4"
                          title={c.data.description}
                        >
                          {c.data.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto space-y-2 border-t border-border/60 pt-4">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className={progress.finished ? "inline-flex items-center gap-1 text-lime-700 dark:text-lime-400" : "text-muted-foreground"}>
                      {progress.finished ? <><Check className="h-3.5 w-3.5" aria-hidden="true" />Курс завершён</> : "Прогресс курса"}
                    </span>
                    <span className="font-semibold tabular-nums text-lime-700 dark:text-lime-400">{progress.percentage}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`Прогресс курса «${c.data.title}»`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress.percentage}
                    aria-valuetext={`Пройдено ${progress.completed} из ${progress.total} уроков`}
                    className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
                  >
                    <div className="h-full rounded-full bg-lime-500" style={{ width: `${progress.percentage}%` }} />
                  </div>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {progress.total > 0 ? `Пройдено ${progress.completed} из ${progress.total} уроков` : "Уроков пока нет"}
                  </p>
                </div>
                {/* Нижняя часть с кнопкой */}
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex items-center justify-center rounded-md px-3 py-2 font-medium group/btn h-8 gap-1 text-xs transition-all duration-300  hover:text-lime-700 dark:hover:text-emerald-500">
                    <span>Открыть курс</span>
                    <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </span>
                </div>
              </div>
              
              {/* Анимационная полоска снизу */}
              <div className="absolute bottom-0 left-0 z-20 h-1 w-0 bg-gradient-to-r from-lime-400 to-emerald-400 transition-all duration-500 group-hover:w-full dark:from-lime-500 dark:to-emerald-500" />
            </Card>
          </motion.a>
        );
      })}
    </div>
    </ReducedMotionProvider>
  );
};

export default CourseGrid;
