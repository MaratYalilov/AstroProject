// src/components/SubjectGrid.tsx
import React from "react";
import { motion } from "framer-motion";
import { ReducedMotionProvider } from "./motion/ReducedMotionProvider";
import { Card, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { readCourseProgress, subjectProgress, type StudyCourse } from "@/lib/studyProgress";
import { useStudyProgress } from "./hooks/useStudyProgress";

export interface SubjectSummary {
  slug: string;
  title: string;
  emoji?: string;
  icon?: string;
  iconClass?: string;
  courses: StudyCourse[];
}

interface SubjectGridProps {
  items: SubjectSummary[];
}

const SubjectGrid: React.FC<SubjectGridProps> = ({ items }) => {
  const courses = React.useMemo(() => items.flatMap(subject =>
    subject.courses.map(course => ({ ...course, subject: subject.slug })),
  ), [items]);
  const savedProgress = useStudyProgress(courses);

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">Предметы не найдены.</p>;
  }

  return (
    <ReducedMotionProvider>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((s) => {
        const courseProgress = s.courses.map(course =>
          savedProgress[`${s.slug}/${course.slug}`] ?? readCourseProgress(s.slug, course),
        );
        const progress = subjectProgress(courseProgress);
        return (
        <motion.a
          key={s.slug}
          href={`/${s.slug}`}
          whileHover={{ y: -6, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="interaction-card block h-full no-underline"
        >
          <Card className="group relative h-full min-h-[180px] cursor-pointer overflow-hidden border border-border/70 bg-gradient-to-br from-white to-gray-50/50 transition-all duration-300 hover:border-lime-300/50 hover:shadow-lg hover:shadow-lime-100/50 dark:from-gray-900/50 dark:to-gray-800/30 dark:hover:border-lime-800/50 dark:hover:shadow-lime-900/20">
            {/* Фоновая иконка на всю высоту карточки */}
            {s.icon && (
              <div className="absolute inset-0">
                {/* Основная фоновая иконка */}
                <div 
                  className="absolute right-0 top-1/2 h-full w-full -translate-y-1/2 opacity-[0.04] transition-all duration-500 group-hover:opacity-[0.06] group-hover:scale-105"
                  style={{
                    backgroundImage: `url(${s.icon})`,
                    backgroundSize: 'auto 100%', // 70% от высоты карточки
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right center',
                    backgroundOrigin: 'content-box',
                    paddingRight: '0px',
                  }}
                />
                {/* Градиент для лучшей читаемости текста */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent dark:from-gray-900/90" />
              </div>
            )}
            
            {/* Контент карточки */}
            <div className="relative z-10 h-full p-6 flex flex-col">
              {/* Верхняя часть с иконкой и заголовком */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  {/* Основная иконка предмета */}
                  <div className="relative flex-shrink-0">
                    {s.icon ? (
                      <div className="relative">
                        <img
                          src={s.icon}
                          alt=""
                          className={`h-12 w-12 ${s.iconClass || ""}`}
                          width={48}
                          height={48}
                          loading="lazy"
                        />
                        {/* Акцентная рамка при наведении */}
                        {/* <div className="absolute inset-0 rounded-xl border-2 border-transparent transition-colors duration-300 group-hover:border-lime-400/30" /> */}
                      </div>
                      
                    ) : s.emoji ? (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-2xl transition-all duration-300 group-hover:scale-110 group-hover:from-lime-50 group-hover:to-lime-100 dark:from-gray-800 dark:to-gray-700">
                        {s.emoji}
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-lg font-medium transition-all duration-300 group-hover:scale-110 dark:from-gray-800 dark:to-gray-700">
                        {s.title.charAt(0)}
                      </div>
                    )
                    }
                  </div>
                  
                  {/* Заголовок и информация */}
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg font-semibold leading-tight text-gray-900 dark:text-gray-100">
                      {s.title}
                    </CardTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs font-medium text-lime-600 dark:text-lime-400">
                        {s.courses.length} {s.courses.length === 1 ? 'курс' : s.courses.length > 1 && s.courses.length < 5 ? 'курса' : 'курсов'}
                      </span>
                    </div>
                    {s.courses.length > 0 && (
                      <ul className="mt-3 list-none space-y-2 p-0 text-sm leading-snug text-muted-foreground">
                        {s.courses.map((course, index) => (
                          <li key={course.slug} className="flex items-start gap-2">
                            <span
                              aria-hidden="true"
                              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${courseProgress[index].finished ? "bg-lime-600 dark:bg-lime-400" : "bg-gray-400 dark:bg-gray-500"}`}
                            />
                            <span className="min-w-0 break-words">
                              {course.title}
                              <span className="sr-only">{courseProgress[index].finished ? ": курс завершён" : ": курс не завершён"}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                
                {/* Стрелочка для перехода
                <div className="transition-transform duration-300 group-hover:translate-x-1">
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-lime-500" />
                </div> */}

              </div>
              
              <div className="mt-auto pt-2">
                <div
                  role="progressbar"
                  aria-label={`Пройденные уроки по предмету «${s.title}»`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress.percentage}
                  aria-valuetext={`Пройдено ${progress.completed} из ${progress.total} уроков`}
                  className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
                >
                  <div className="h-full rounded-full bg-lime-500" style={{ width: `${progress.percentage}%` }} />
                </div>
                {/* Нижняя часть с кнопкой */}
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {progress.total > 0 ? `Пройдено ${progress.completed} из ${progress.total} уроков` : "Уроков пока нет"}
                  </span>
                  <span className="inline-flex items-center justify-center rounded-md px-3 py-2 font-medium group/btn h-8 gap-1 text-xs transition-all duration-300 hover:bg-lime-500/10 hover:text-lime-700 dark:hover:text-lime-400">
                    <span>Перейти</span>
                    <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </span>
                </div>
              </div>
            </div>
            
            {/* Анимационная полоска снизу */}
            <div className="absolute bottom-0 left-0 z-20 h-1 w-0 bg-gradient-to-r from-lime-400 to-emerald-400 transition-all duration-500 group-hover:w-full" />
          </Card>
        </motion.a>
        );
      })}
    </div>
    </ReducedMotionProvider>
  );
};

export default SubjectGrid;
