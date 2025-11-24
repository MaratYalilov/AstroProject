// src/components/blog.tsx
import React from "react";
import { motion } from "framer-motion";
import {
  Play,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";

export interface LessonSidebarItem {
  slug: string;
  title: string;
  order?: number;
  hasAudio?: boolean;
  hasVideo?: boolean;
  group?: string | number;
  groupOrder?: number;
  groupTitle?: string;
}

export interface BlogLessonPageProps {
  subject: string;
  course: string;
  courseTitle: string;
  currentLesson: {
    slug: string;
    title: string;
    order?: number;
    html: string;
    hasAudio?: boolean;
    hasVideo?: boolean;
    audio?: string | null;
    video?: string | null;
  };
  lessons: LessonSidebarItem[];
}

const DEFAULT_GROUP_TITLES: Record<number, string> = {
  1: "Вера в Аллаха",
  2: "Вера в ангелов",
  3: "Вера в Писания",
  4: "Вера в посланников",
  5: "Вера в Последний день",
  6: "Вера в предопределение",
};

const BlogLessonPage: React.FC<BlogLessonPageProps> = ({
  subject,
  course,
  courseTitle,
  currentLesson,
  lessons,
}) => {
  const storageKey = React.useMemo(
    () => `completed-lessons:${subject}/${course}`,
    [subject, course]
  );

  const [completedLessons, setCompletedLessons] = React.useState<Set<string>>(
    () => new Set()
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) {
        setCompletedLessons(new Set());
        return;
      }
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setCompletedLessons(new Set(parsed));
      } else {
        setCompletedLessons(new Set());
      }
    } catch (error) {
      console.error("Failed to load lesson completion state", error);
      setCompletedLessons(new Set());
    }
  }, [storageKey]);

  const persistCompletion = React.useCallback(
    (updater: (prev: Set<string>) => Set<string>) => {
      setCompletedLessons((prev) => {
        const next = updater(prev);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              storageKey,
              JSON.stringify(Array.from(next))
            );
          } catch (error) {
            console.error("Failed to store lesson completion state", error);
          }
        }
        return next;
      });
    },
    [storageKey]
  );

  const handleToggleCompletion = React.useCallback(() => {
    persistCompletion((prev) => {
      const next = new Set(prev);
      if (next.has(currentLesson.slug)) {
        next.delete(currentLesson.slug);
      } else {
        next.add(currentLesson.slug);
      }
      return next;
    });
  }, [persistCompletion, currentLesson.slug]);

  // toggle completion for arbitrary lesson (used in sidebar list)
  const toggleLessonCompletion = React.useCallback((slug: string) => {
  persistCompletion((prev) => {
    const next = new Set(prev);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    return next;
  });
  }, [persistCompletion]);


  const completedCount = React.useMemo(() => {
    if (!lessons.length) return 0;
    return lessons.reduce(
      (count, lesson) => count + (completedLessons.has(lesson.slug) ? 1 : 0),
      0
    );
  }, [lessons, completedLessons]);

  const progress = lessons.length
    ? Math.round((completedCount / lessons.length) * 100)
    : 0;



 // build grouped structure (same rules as in rendering)
const grouped = React.useMemo(() => {
  const map = new Map<number | string, LessonSidebarItem[]>();
  for (const l of lessons) {
    const tail = (l.slug || "").toString().split("/").pop() ?? "";
    const isPred = (tail && tail.startsWith("0-")) || String(l.group) === "0" || l.group === 0;
    const key = isPred ? "_pred" : (l.group ?? "ungrouped");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(l);
  }

  // convert map -> array and sort groups numerically (except _pred)
  const arr: { key: string | number; items: LessonSidebarItem[] }[] = [];
  if (map.has("_pred")) {
    arr.push({ key: "_pred", items: map.get("_pred")! });
    map.delete("_pred");
  }
  const rest = Array.from(map.entries()).map(([k, items]) => ({ key: k, items }));
  rest.sort((a, b) => {
    const aNum = typeof a.key === "number" ? a.key : Number(a.key);
    const bNum = typeof b.key === "number" ? b.key : Number(b.key);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
    return String(a.key).localeCompare(String(b.key));
  });

  // sort items inside each group by groupOrder -> order
  for (const g of rest) {
    g.items.sort((x, y) => (x.groupOrder ?? x.order ?? 999) - (y.groupOrder ?? y.order ?? 999));
  }

  arr.push(...rest);
  return arr;
}, [lessons]);

// Flatten groups into array with group index info
const flat = React.useMemo(() => {
  const res: { item: LessonSidebarItem; groupKey: string | number; idxInGroup: number; groupIndex: number }[] = [];
  for (let gi = 0; gi < grouped.length; gi++) {
    const g = grouped[gi];
    for (let i = 0; i < g.items.length; i++) {
      res.push({ item: g.items[i], groupKey: g.key, idxInGroup: i, groupIndex: gi });
    }
  }
  return res;
}, [grouped]);

// find current position in flat
const currentFlatIndex = flat.findIndex((f) => f.item.slug === currentLesson.slug);

let prevLesson: LessonSidebarItem | null = null;
let nextLesson: LessonSidebarItem | null = null;

if (currentFlatIndex !== -1) {
  const cur = flat[currentFlatIndex];
  // attempt next in same group
  const nextInGroup = flat.find((f) => f.groupIndex === cur.groupIndex && f.idxInGroup === cur.idxInGroup + 1);
  if (nextInGroup) {
    nextLesson = nextInGroup.item;
  } else {
    // find first item in next group (groupIndex + 1)
    const firstInNextGroup = flat.find((f) => f.groupIndex === cur.groupIndex + 1 && f.idxInGroup === 0);
    if (firstInNextGroup) nextLesson = firstInNextGroup.item;
  }

  // attempt prev in same group
  const prevInGroup = flat.find((f) => f.groupIndex === cur.groupIndex && f.idxInGroup === cur.idxInGroup - 1);
  if (prevInGroup) {
    prevLesson = prevInGroup.item;
  } else {
    // find last item in previous group
    const itemsInPrevGroup = flat.filter((f) => f.groupIndex === cur.groupIndex - 1);
    if (itemsInPrevGroup.length > 0) prevLesson = itemsInPrevGroup[itemsInPrevGroup.length - 1].item;
  }
} else {
  // fallback to original linear behaviour if current not found
  const linearIndex = lessons.findIndex((l) => l.slug === currentLesson.slug);
  prevLesson = linearIndex > 0 ? lessons[linearIndex - 1] : null;
  nextLesson = linearIndex >= 0 && linearIndex < lessons.length - 1 ? lessons[linearIndex + 1] : null;
}





  const isCurrentLessonCompleted = completedLessons.has(currentLesson.slug);

  const buildLessonUrl = (slug: string) =>
    `/lesson?subject=${encodeURIComponent(
      subject
    )}&course=${encodeURIComponent(course)}&slug=${encodeURIComponent(slug)}`;

  // Реинициализация плагина Корана
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    document.dispatchEvent(new CustomEvent("quran:reinit"));
  }, [currentLesson.slug, currentLesson.html]);

  // ---------- правый аккордеон ----------
  const [query, setQuery] = React.useState("");
  const normalizedQuery = query.trim().toLowerCase();
  // openGroup: number or string (group key). Null = all closed
  const [openGroup, setOpenGroup] = React.useState<string | number | null>(null);
  const activeLessonRef = React.useRef<HTMLAnchorElement | null>(null);
  const sidebarScrollRef = React.useRef<HTMLDivElement | null>(null);

  const filteredLessons = React.useMemo(() => {
    if (!normalizedQuery) return lessons;

    let result = lessons.filter((l) => {
      const title = (l.title ?? "").toString().toLowerCase();
      const orderStr = l.order != null ? String(l.order) : "";
      return title.includes(normalizedQuery) || orderStr.includes(normalizedQuery);
    });

    // если по поиску currentLesson выпал — вернём его в начало
    if (
      normalizedQuery &&
      !result.some((l) => l.slug === currentLesson.slug)
    ) {
      const current = lessons.find((l) => l.slug === currentLesson.slug);
      if (current) {
        result = [current, ...result];
      }
    }

    return result;
  }, [lessons, normalizedQuery, currentLesson.slug]);

  const renderHighlightedTitle = (title: string) => {
    if (!normalizedQuery) return title;

    const lower = title.toLowerCase();
    const q = normalizedQuery;
    const parts: React.ReactNode[] = [];
    let index = 0;
    let key = 0;

    while (index < title.length) {
      const matchIndex = lower.indexOf(q, index);
      if (matchIndex === -1) {
        parts.push(<span key={key++}>{title.slice(index)}</span>);
        break;
      }

      if (matchIndex > index) {
        parts.push(
          <span key={key++}>{title.slice(index, matchIndex)}</span>
        );
      }

      parts.push(
        <span
          key={key++}
          className="bg-yellow-200/70 dark:bg-yellow-500/30 rounded px-0.5"
        >
          {title.slice(matchIndex, matchIndex + q.length)}
        </span>
      );

      index = matchIndex + q.length;
    }

    return parts;
  };

  React.useEffect(() => {
    if (!sidebarScrollRef.current) return;
    // scroll active anchor into view if we have it
    const container = sidebarScrollRef.current;
    const target = activeLessonRef.current;
    if (!target) return;

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const offset =
      targetRect.top -
      containerRect.top -
      containerRect.height / 2 +
      targetRect.height / 2;

    container.scrollTo({
      top: container.scrollTop + offset,
      behavior: "smooth",
    });
  }, [currentLesson.slug]);

  // --- Build groups from lessons ---
// --- Build groups from filteredLessons (so search works across all groups) ---
const groups = React.useMemo(() => {
  // Map
  const map = new Map<string | number, { groupKey: string | number; groupTitle?: string; items: LessonSidebarItem[] }>();

  // NOTE: iterate over filteredLessons (not lessons) so the accordion shows search results from all groups
  for (const l of filteredLessons) {
    // detect predislovie (filename starting with 0- in slug tail) OR group === 0
    const tail = (l.slug || "").toString().split("/").pop() ?? "";
    const isPred = (tail && tail.startsWith("0-")) || String(l.group) === "0" || l.group === 0;
    if (isPred) {
      // Put predislovie under special key "_pred" to render first as single link
      const key = "_pred";
      if (!map.has(key)) {
        map.set(key, { groupKey: key, groupTitle: "Предисловие", items: [] });
      }
      map.get(key)!.items.push(l);
      continue;
    }
    const gKey = l.group ?? "ungrouped";
    const key = typeof gKey === "number" ? gKey : String(gKey);
    if (!map.has(key)) {
      map.set(key, { groupKey: key, groupTitle: l.groupTitle, items: [] });
    }
    map.get(key)!.items.push(l);
  }

  // Convert to array and sort groups by numeric key (except _pred first)
  const arr: Array<{ groupKey: string | number; groupTitle?: string; items: LessonSidebarItem[] }> = [];
  if (map.has("_pred")) {
    arr.push(map.get("_pred")!);
    map.delete("_pred");
  }

  // For the rest, want numeric ascending order if the key is numeric
  const rest = Array.from(map.values());
  rest.sort((a, b) => {
    const aKey = a.groupKey;
    const bKey = b.groupKey;
    const aNum = typeof aKey === "number" ? aKey : Number(aKey);
    const bNum = typeof bKey === "number" ? bKey : Number(bKey);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
      return aNum - bNum;
    }
    // fallback to string compare
    return String(aKey).localeCompare(String(bKey));
  });

  // ensure groupTitle is set: if not present, try to take from first item's groupTitle or DEFAULT_GROUP_TITLES for
  for (const g of rest) {
    const first = g.items[0];
    if (!g.groupTitle) {
      const numericKey = typeof g.groupKey === "number" ? g.groupKey : Number(String(g.groupKey));
      if (first?.groupTitle) g.groupTitle = first.groupTitle;
      else if (!Number.isNaN(numericKey) && DEFAULT_GROUP_TITLES[numericKey]) {
        g.groupTitle = DEFAULT_GROUP_TITLES[numericKey];
      } else {
        g.groupTitle = String(g.groupKey);
      }
    }
    // sort items inside group by groupOrder (ascending), fallback to order
    g.items.sort((x, y) => (x.groupOrder ?? x.order ?? 999) - (y.groupOrder ?? y.order ?? 999));
  }

  arr.push(...rest);
  return arr;
}, [filteredLessons]);


  // initial open group: open first real group (not pred), if any
React.useEffect(() => {
  if (!sidebarScrollRef.current) return;
  const container = sidebarScrollRef.current;
  const cur = lessons.find((l) => l.slug === currentLesson.slug);
  if (!cur) return;

  // Определяем группу
  const tail = (cur.slug || "").split("/").pop() ?? "";
  const isPred = tail.startsWith("0-") || String(cur.group) === "0" || cur.group === 0;
  const desiredKey = isPred ? "_pred" : (cur.group ?? "ungrouped");

  // **Главное:** открываем нужную группу
  setOpenGroup(desiredKey);

  // Ждём рендера и скроллим к активному уроку
  requestAnimationFrame(() => {
    const target = activeLessonRef.current;
    if (!target) return;
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const offset = targetRect.top - containerRect.top - containerRect.height / 2 + targetRect.height / 2;
    container.scrollTo({ top: container.scrollTop + offset, behavior: "smooth" });

    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });
}, [currentLesson.slug, lessons]);


  // Find single predislovie link (first item in _pred group)
  const predGroup = groups.find((g) => g.groupKey === "_pred");
  const predLesson = predGroup?.items?.[0] ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-12">
        {/* ЛЕВО: основная статья (оставил без изменений в сравнении с исходником) */}
        <section className="space-y-4 lg:col-span-8">
          {currentLesson.video && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <Card className="overflow-hidden">
                <CardHeader className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Видео-урок</CardTitle>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <a href={currentLesson.video} download>
                      <Download className="h-4 w-4" />
                      Скачать видео
                    </a>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted">
                    <video className="h-full w-full" controls preload="none" playsInline>
                      <source src={currentLesson.video} />
                    </video>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentLesson.audio && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <Card>
                <CardHeader className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Аудио-урок</CardTitle>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <a href={currentLesson.audio ?? ""} download>
                      <Download className="h-4 w-4" />
                      Скачать аудио
                    </a>
                  </Button>
                </CardHeader>
                <CardContent>
                  <audio className="w-full" controls preload="none">
                    <source src={currentLesson.audio ?? ""} />
                  </audio>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <article className="prose prose-sm sm:prose-base prose-neutral dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: currentLesson.html }} />
              </CardContent>
            </Card>
          </motion.div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="flex justify-start">
              <Button variant="secondary" className="gap-2" asChild disabled={!prevLesson}>
                <a href={prevLesson ? buildLessonUrl(prevLesson.slug) : "#"}>
                  <ChevronLeft className="h-4 w-4" />
                  Предыдущий урок
                </a>
              </Button>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 gap-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
                onClick={handleToggleCompletion}
                aria-pressed={isCurrentLessonCompleted}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {isCurrentLessonCompleted ? "Снять отметку" : "Отметить как завершённый"}
              </button>
            </div>
            <div className="flex justify-end">
              <Button className="gap-2" asChild disabled={!nextLesson}>
                <a href={nextLesson ? buildLessonUrl(nextLesson.slug) : "#"}>
                  Следующий урок
                  <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* ПРАВО: групповое оглавление */}
        <aside className="lg:col-span-4">
          <div className="sticky top-[80px]">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Оглавление курса</CardTitle>
                    <p className="text-xs text-muted-foreground">{lessons.length} уроков</p>
                  </div>
                  <div className="hidden text-xs text-muted-foreground sm:block">
                    Прогресс
                    <Progress className="mt-1" value={progress} />
                    <span className="block text-[10px] text-muted-foreground">{progress}% просмотрено</span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="relative w-full">
                    <Input
                      placeholder="Поиск по урокам…"
                      className="pl-3 pr-8 text-sm"
                      value={query}
                      onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setQuery("");
                      }}
                    />
                    {query && (
                      <button
                        type="button"
                        aria-label="Очистить поиск"
                        onClick={() => setQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-sm hover:bg-muted/50"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div ref={sidebarScrollRef} className="h-[65vh] overflow-y-auto px-2 pb-3">
                  {/* 1) Предисловие — просто ссылка (не раскрывается) */}
                  {predLesson && (
                    <div className="mb-3">
                      <a
                        href={buildLessonUrl(predLesson.slug)}
                        className="flex w-full items-center gap-3 rounded-xl border border-border/70 px-3 py-2 text-left text-sm hover:bg-muted/50"
                        ref={predLesson.slug === currentLesson.slug ? activeLessonRef : undefined}
                      >
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-[11px]">
                          {/* Предисловие — не число, показываем иконку */}
                          <Play className="h-3 w-3" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{predLesson.title}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">Предисловие</div>
                        </div>
                      </a>
                    </div>
                  )}

                  {/* 2) Основные группы (1..6) */}
                  <div className="space-y-4">
                    {groups
                      .filter((g) => g.groupKey !== "_pred")
                      .map((g) => {
                        const key = g.groupKey;
                        const title = g.groupTitle ?? String(key);
                        // если есть активный поиск — открываем все группы, где есть результаты (g.items.length > 0)
                        const isOpen = normalizedQuery ? g.items.length > 0 : openGroup === key;


                        return (
                          <div key={String(key)} className="rounded-lg">
                            {/* Group header — кликабельный, открывает/закрывает */}
                            <button
                              type="button"
                              onClick={() => setOpenGroup((prev) => (prev === key ? null : key))}
                              className={[
                                "flex w-full items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2 text-left text-sm transition",
                                isOpen ? "bg-primary/5 border-primary/60" : "hover:bg-muted/50",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              <div className="flex items-center gap-3">
                                <div className="rounded-full bg-muted px-3 py-1 text-sm font-semibold">
                                  {String(key)}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate font-medium">{title}</div>
                                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                                    {g.items.length} уроков
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                            </button>

                            {/* Group body: список ссылок на уроки, сортированные по groupOrder */}
                            {isOpen && (
                              <div className="mt-2 rounded-xl border border-border/60 bg-muted/40 px-2 py-2 text-xs text-muted-foreground">
                                <ul className="space-y-1">
                                  {g.items.map((l) => {
                                    const isCurrent = l.slug === currentLesson.slug;
                                    const isCompleted = completedLessons.has(l.slug);
                                    const numDisplay = l.groupOrder ?? l.order ?? "—";

                                    return (
                                      <li key={l.slug} className="w-full">
                                        <div className="flex items-center justify-between">
                                          <a
                                            href={buildLessonUrl(l.slug)}
                                            ref={isCurrent ? activeLessonRef as any : undefined}
                                            className={[
                                              "group flex w-full max-w-full items-center gap-3 rounded-md px-2 py-2 text-sm transition",
                                              isCurrent ? "bg-primary/5 border border-primary/40" : "hover:bg-muted/60",
                                            ]
                                              .filter(Boolean)
                                              .join(" ")}
                                          >
                                            <div
                                              className={[
                                                "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-[11px] transition-colors",
                                                isCurrent && "bg-primary/10 border-primary/20",
                                                isCompleted && "bg-lime-200 text-black border-lime-1000 dark:bg-lime-900/30 dark:text-lime-50 dark:border-lime-800"
                                              ]
                                                .filter(Boolean)
                                                .join(" ")}
                                              aria-hidden="true"
                                            >
                                              {numDisplay}
                                            </div>

                                            <div className="min-w-0">
                                              <div className="truncate font-medium">
                                                {renderHighlightedTitle(l.title)}
                                              </div>
                                            </div>
                                          </a>
                                        </div>
                                      </li>
                                    );
                                  })}


                                  
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Прогресс для мобилок */}
                <div className="border-t border-border/60 px-4 py-3 text-xs sm:hidden">
                  <div className="mb-1">Прогресс по курсу</div>
                  <Progress value={progress} />
                  <div className="mt-1 text-[11px] text-muted-foreground">{progress}% просмотрено</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default BlogLessonPage;
