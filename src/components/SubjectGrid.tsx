import React, { useMemo, useState } from "react";
import type { Subject } from "@/data/catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

type Props = { items: Subject[] };

export default function SubjectGrid({ items }: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((s) => s.title.toLowerCase().includes(needle));
  }, [items, q]);

  return (
    <div className="space-y-4">
      {/* Поиск */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-2xl font-bold">Предметы</div>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по предметам"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Карточки */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s, idx) => (
          <motion.div
            key={s.slug}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.03 }}
          >
            <Card className="group relative overflow-hidden">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-2xl">
                  {s.emoji}
                </div>
                <div className="min-w-0">
                  <CardTitle className="truncate">{s.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Курсов: {s.courses.length}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-lg bg-muted px-2 py-1">📚 Программа</span>
                  <span className="rounded-lg bg-muted px-2 py-1">▶ Материалы</span>
                </div>
                <Button asChild variant="outline" className="group-hover:translate-x-0.5 transition">
                  <a href={`/${s.slug}/`}>Открыть</a>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
