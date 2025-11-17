// src/components/SubjectGrid.tsx
import React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface SubjectSummary {
  slug: string;          // "fiqh"
  title: string;         // "Фикх"
  emoji?: string;        // "⚖️"
  coursesCount: number;  // сколько курсов в предмете
}

interface SubjectGridProps {
  items: SubjectSummary[];
}

const SubjectGrid: React.FC<SubjectGridProps> = ({ items }) => {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">Предметы не найдены.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((s) => (
        <motion.a
          key={s.slug}
          href={`/${s.slug}`}
          whileHover={{ y: -4, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="block"
        >
          <Card className="h-full cursor-pointer border border-border/70 transition-colors hover:border-lime-200 hover:bg-lime-50 dark:hover:border-border/60 dark:hover:bg-muted">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">
                  {s.emoji && <span className="mr-2 text-xl">{s.emoji}</span>}
                  <span>{s.title}</span>
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Курсов: {s.coursesCount}
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex justify-end">
              <Button variant="outline" size="sm">
                Открыть
              </Button>
            </CardContent>
          </Card>
        </motion.a>
      ))}
    </div>
  );
};

export default SubjectGrid;
