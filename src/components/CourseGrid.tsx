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
  if (!courses.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Для этого предмета пока нет курсов.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <motion.a
          key={c.id}
          href={`/${subjectSlug}/${c.data.slug}`}
          whileHover={{ y: -4, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="block"
        >
          <Card className="h-full cursor-pointer border border-border/70 transition-colors hover:border-primary/70">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">
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
