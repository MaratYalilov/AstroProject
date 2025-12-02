// src/components/CourseGrid.tsx
import React from "react";
import type { CollectionEntry } from "astro:content";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type CourseEntry = CollectionEntry<"courses">;

interface CourseGridProps {
  subjectSlug: string;
  subjectTitle?: string;
  courses: CourseEntry[];
}

const CourseGrid: React.FC<CourseGridProps> = ({ subjectSlug, courses }) => {
  // Сортируем курсы по полю order
  const sortedCourses = [...courses].sort((a, b) => {
  // Если у обоих есть order, сортируем по нему
  if (a.data.order !== undefined && b.data.order !== undefined) {
    return a.data.order - b.data.order;
  }
  
  // Если order есть только у a, он должен быть выше
  if (a.data.order !== undefined && b.data.order === undefined) {
    return -1;
  }
  
  // Если order есть только у b, он должен быть ниже
  if (a.data.order === undefined && b.data.order !== undefined) {
    return 1;
  }
  
  // Если у обоих нет order, оставляем исходный порядок
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
      {sortedCourses.map((c) => (
        <motion.a
          key={c.id}
          href={`/${subjectSlug}/${c.data.slug}`}
          whileHover={{ y: -4, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="block"
        >
          <Card className="h-full cursor-pointer border border-border/70 transition-colors hover:border-lime-200 hover:bg-lime-50 dark:hover:border-border/60 dark:hover:bg-muted">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">
                {c.data.order && ( // Опционально показываем номер
                  <span className="mr-2 text-sm text-muted-foreground">
                    {c.data.order}.
                  </span>
                )}
                {c.data.title}
              </CardTitle>
              {c.data.description && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
                  {c.data.description}
                </p>
              )}
            </CardHeader>
            <CardContent className="flex justify-end">
              <Button variant="outline" size="sm">
                Открыть курс
              </Button>
            </CardContent>
          </Card>
        </motion.a>
      ))}
    </div>
  );
};

export default CourseGrid;