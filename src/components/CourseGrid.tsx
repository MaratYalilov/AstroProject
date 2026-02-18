// src/components/CourseGrid.tsx
import React from "react";
import type { CollectionEntry } from "astro:content";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

type CourseEntry = CollectionEntry<"courses">;

interface CourseGridProps {
  subjectSlug: string;
  subjectTitle?: string;
  courses: CourseEntry[];
  subjectIcon?: string;
}

const CourseGrid: React.FC<CourseGridProps> = ({ 
  subjectSlug, 
  courses, 
  subjectIcon 
}) => {
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sortedCourses.map((c) => {
        // Проверяем, есть ли дополнительная информация для отображения
        const hasAdditionalInfo = c.data.lessonsCount;
        
        return (
          <motion.a
            key={c.id}
            href={`/${subjectSlug}/${c.data.slug}`}
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="block h-full no-underline"
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
                  <div className="flex items-start gap-4">
                    {/* Номер курса в кружке */}
                    <div className="relative flex-shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-lg font-semibold transition-all duration-300 group-hover:scale-110 group-hover:from-lime-50 group-hover:to-lime-100 dark:from-gray-800 dark:to-gray-700 dark:group-hover:from-lime-900/30 dark:group-hover:to-lime-50/30">
                        {c.data.order || "№"}
                      </div>
                    </div>
                    
                    {/* Заголовок и описание */}
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold leading-tight text-gray-900 dark:text-gray-100">
                        {c.data.title}
                      </CardTitle>
                      {c.data.description && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {c.data.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Нижняя часть с кнопкой */}
                <div className="mt-auto flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {/* Показываем только если есть данные */}
                    {c.data.lessonsCount ? (
                      <>
                        {c.data.lessonsCount && (
                          <span>{c.data.lessonsCount} уроков</span>
                        )}
                      </>
                    ) : (
                      // Если нет дополнительной информации, оставляем пустой div для выравнивания
                      <span>&nbsp;</span>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="group/btn h-8 gap-1 text-xs transition-all duration-300  hover:text-lime-700 dark:hover:text-emerald-500"
                  >
                    <span>Открыть курс</span>
                    <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </Button>
                </div>
              </div>
              
              {/* Анимационная полоска снизу */}
              <div className="absolute bottom-0 left-0 z-20 h-1 w-0 bg-gradient-to-r from-lime-400 to-emerald-400 transition-all duration-500 group-hover:w-full dark:from-lime-500 dark:to-emerald-500" />
            </Card>
          </motion.a>
        );
      })}
    </div>
  );
};

export default CourseGrid;