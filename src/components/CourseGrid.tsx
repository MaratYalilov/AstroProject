import React from "react";
import type { Subject } from "@/data/catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

type Props = { subject: Subject };

export default function CourseGrid({ subject }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">{subject.title}</h1>
          <p className="text-muted-foreground">Выберите курс для перехода к урокам</p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {subject.courses.map((c, idx) => (
          <motion.div
            key={c.slug}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.03 }}
          >
            <Card className="group relative overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between">
                <CardTitle className="pr-3">{c.title}</CardTitle>
                <span className="shrink-0 rounded-xl bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {c.duration ?? "самостоятельный темп"}
                </span>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  Видео, аудио-резюме и текстовый конспект.
                </p>
                <Button asChild className="group-hover:translate-x-0.5 transition">
                  <a href={`/${subject.slug}/${c.slug}/`}>Открыть</a>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
