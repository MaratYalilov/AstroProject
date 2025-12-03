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
  numericParts?: number[];
  depth?: number;
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
  // Ключ для хранения последнего просмотренного урока
  const lastLessonKey = React.useMemo(
    () => `last-lesson:${subject}/${course}`,
    [subject, course]
  );

  const storageKey = React.useMemo(
    () => `completed-lessons:${subject}/${course}`,
    [subject, course]
  );

  const [completedLessons, setCompletedLessons] = React.useState<Set<string>>(
    () => new Set()
  );

  // Сохраняем текущий урок как последний просмотренный
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    
    try {
      // Сохраняем текущий урок в localStorage
      window.localStorage.setItem(lastLessonKey, currentLesson.slug);
      
      // Также можно сохранить метку времени для сортировки
      const lastLessons = JSON.parse(window.localStorage.getItem('recent-lessons') || '{}');
      lastLessons[lastLessonKey] = {
        slug: currentLesson.slug,
        subject,
        course,
        courseTitle,
        title: currentLesson.title,
        timestamp: Date.now()
      };
      window.localStorage.setItem('recent-lessons', JSON.stringify(lastLessons));
      
    } catch (error) {
      console.error("Failed to save last lesson", error);
    }
  }, [currentLesson.slug, lastLessonKey, subject, course, courseTitle, currentLesson.title]);

  // Функция для получения последнего просмотренного урока
  const getLastLessonSlug = React.useCallback(() => {
    if (typeof window === "undefined") return null;
    
    try {
      return window.localStorage.getItem(lastLessonKey);
    } catch (error) {
      console.error("Failed to get last lesson", error);
      return null;
    }
  }, [lastLessonKey]);

  // Проверяем, является ли текущий урок последним просмотренным
  const isLastViewedLesson = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    
    try {
      const lastSlug = window.localStorage.getItem(lastLessonKey);
      return lastSlug === currentLesson.slug;
    } catch (error) {
      return false;
    }
  }, [currentLesson.slug, lastLessonKey]);

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

  // ---------- правый аккордеон ----------
  const [query, setQuery] = React.useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const [openGroup, setOpenGroup] = React.useState<string | number | null>(null);
  const activeLessonRef = React.useRef<HTMLAnchorElement | null>(null);
  const sidebarScrollRef = React.useRef<HTMLDivElement | null>(null);

  // Получаем последний просмотренный урок при загрузке
  const lastViewedSlug = React.useMemo(() => getLastLessonSlug(), [getLastLessonSlug]);

  const filteredLessons = React.useMemo(() => {
    if (!normalizedQuery) return lessons;

    let result = lessons.filter((l) => {
      const title = (l.title ?? "").toString().toLowerCase();
      const orderStr = l.order != null ? String(l.order) : "";
      return title.includes(normalizedQuery) || orderStr.includes(normalizedQuery);
    });

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

  // --- ОСНОВНАЯ ЛОГИКА ГРУППИРОВКИ И НУМЕРАЦИИ ---
  const grouped = React.useMemo(() => {
    const processedLessons = lessons.map(lesson => {
      const fileName = lesson.slug.split('/').pop() || '';
      const numericParts = fileName.split('-')
        .map(part => {
          const num = parseInt(part, 10);
          return isNaN(num) ? null : num;
        })
        .filter((num): num is number => num !== null);
      
      const depth = Math.max(0, numericParts.length - 1);
      
      return {
        ...lesson,
        numericParts,
        depth,
        sortKey: numericParts.join('.')
      };
    });

    const groupsMap = new Map<number, typeof processedLessons>();
    
    for (const lesson of processedLessons) {
      const groupKey = lesson.group || lesson.numericParts[0] || 0;
      const groupNum = typeof groupKey === 'number' ? groupKey : parseInt(groupKey.toString(), 10);
      
      if (!groupsMap.has(groupNum)) {
        groupsMap.set(groupNum, []);
      }
      groupsMap.get(groupNum)!.push(lesson);
    }

    const sortedGroupKeys = Array.from(groupsMap.keys())
      .sort((a, b) => {
        if (a === 0) return -1;
        if (b === 0) return 1;
        return a - b;
      });

    const result = sortedGroupKeys.map(groupKey => {
      let groupLessons = groupsMap.get(groupKey)!;
      
      groupLessons = [...groupLessons].sort((a, b) => {
        for (let i = 0; i < Math.max(a.numericParts.length, b.numericParts.length); i++) {
          const aPart = a.numericParts[i] || 0;
          const bPart = b.numericParts[i] || 0;
          if (aPart !== bPart) {
            return aPart - bPart;
          }
        }
        return (a.title || '').localeCompare(b.title || '');
      });

      return {
        key: groupKey === 0 ? "_pred" : groupKey,
        items: groupLessons,
        lessonsWithNumbers: groupLessons.map(lesson => {
          if (groupKey === 0) {
            return {
              ...lesson,
              displayNumber: "0"
            };
          }
          
          const displayParts = [groupKey];
          if (lesson.numericParts.length > 1) {
            displayParts.push(...lesson.numericParts.slice(1));
          }
          
          return {
            ...lesson,
            displayNumber: displayParts.join('.')
          };
        })
      };
    });

    return result;
  }, [lessons]);

  // --- Группы для отображения в аккордеоне ---
  const displayGroups = React.useMemo(() => {
    const result = grouped.map(g => ({
      groupKey: g.key,
      groupTitle: g.key === "_pred" ? "Предисловие" : 
                 (typeof g.key === "number" && DEFAULT_GROUP_TITLES[g.key]) || 
                 `Группа ${g.key}`,
      items: normalizedQuery 
        ? g.lessonsWithNumbers.filter(l => {
            const title = (l.title ?? "").toString().toLowerCase();
            const orderStr = l.order != null ? String(l.order) : "";
            return title.includes(normalizedQuery) || orderStr.includes(normalizedQuery);
          })
        : g.lessonsWithNumbers
    })).filter(g => g.items.length > 0);
    
    return result;
  }, [grouped, normalizedQuery]);

  // --- Навигация prev/next ---
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

  const currentFlatIndex = flat.findIndex((f) => f.item.slug === currentLesson.slug);

  let prevLesson: LessonSidebarItem | null = null;
  let nextLesson: LessonSidebarItem | null = null;

  if (currentFlatIndex !== -1) {
    const cur = flat[currentFlatIndex];
    const nextInGroup = flat.find((f) => f.groupIndex === cur.groupIndex && f.idxInGroup === cur.idxInGroup + 1);
    if (nextInGroup) {
      nextLesson = nextInGroup.item;
    } else {
      const firstInNextGroup = flat.find((f) => f.groupIndex === cur.groupIndex + 1 && f.idxInGroup === 0);
      if (firstInNextGroup) nextLesson = firstInNextGroup.item;
    }

    const prevInGroup = flat.find((f) => f.groupIndex === cur.groupIndex && f.idxInGroup === cur.idxInGroup - 1);
    if (prevInGroup) {
      prevLesson = prevInGroup.item;
    } else {
      const itemsInPrevGroup = flat.filter((f) => f.groupIndex === cur.groupIndex - 1);
      if (itemsInPrevGroup.length > 0) prevLesson = itemsInPrevGroup[itemsInPrevGroup.length - 1].item;
    }
  } else {
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

  // --- Инициализация открытой группы (с учетом последнего просмотренного) ---
  React.useEffect(() => {
    if (displayGroups.length === 0) return;
    
    // Находим группу текущего урока
    const currentGroup = displayGroups.find(group => 
      group.items.some(item => item.slug === currentLesson.slug)
    );
    
    if (currentGroup && currentGroup.groupKey !== "_pred") {
      setOpenGroup(currentGroup.groupKey);
      // После установки группы — скроллим и выходим
      setTimeout(() => {
        const target = activeLessonRef.current;
        if (!target || !sidebarScrollRef.current) return;
        target.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
      return;
    }

    // Если нет открытой группы, пробуем открыть группу последнего просмотренного урока
    if (lastViewedSlug && lastViewedSlug !== currentLesson.slug) {
      const lastViewedGroup = displayGroups.find(group => 
        group.items.some(item => item.slug === lastViewedSlug)
      );
      if (lastViewedGroup && lastViewedGroup.groupKey !== "_pred") {
        setOpenGroup(lastViewedGroup.groupKey);
        setTimeout(() => {
          const target = activeLessonRef.current;
          if (!target || !sidebarScrollRef.current) return;
          target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }, 100);
        return;
      }
    }

    // Иначе открываем первую реальную группу
    const firstRealGroup = displayGroups.find(g => g.groupKey !== "_pred");
    if (firstRealGroup) {
      setOpenGroup(firstRealGroup.groupKey);
      setTimeout(() => {
        const target = activeLessonRef.current;
        if (!target || !sidebarScrollRef.current) return;
        target.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
    }

    // ВАЖНО: не включаем openGroup в массив зависимостей —
    // иначе эффект будет запускаться при каждом клике и перезаписывать выбор пользователя.
  }, [currentLesson.slug, displayGroups, lastViewedSlug]);

  // --- Предисловие ---
  const predGroup = displayGroups.find((g) => g.groupKey === "_pred");
  const predLesson = predGroup?.items?.[0] ?? null;

  // --- Функция для определения отступа ---
  const getDepthStyle = (depth: number) => {
    switch (depth) {
      case 0: return { marginLeft: '0px' };
      case 1: return { marginLeft: '0.5rem' };
      case 2: return { marginLeft: '1rem' };
      case 3: return { marginLeft: '1.5rem' };
      default: return { marginLeft: `${depth * 0.5}rem` };
    }
  };

  // --- Кнопка "Вернуться к последнему уроку" ---
  const LastViewedButton = React.useMemo(() => {
    if (!lastViewedSlug || lastViewedSlug === currentLesson.slug) return null;
    
    const lastLesson = lessons.find(l => l.slug === lastViewedSlug);
    if (!lastLesson) return null;
    
    return (
      <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Продолжить с</div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            asChild
          >
            <a href={buildLessonUrl(lastViewedSlug)}>
              <Play className="h-3 w-3 mr-1" />
              {lastLesson.title.substring(0, 40)}
              {lastLesson.title.length > 40 ? '...' : ''}
            </a>
          </Button>
        </div>
      </div>
    );
  }, [lastViewedSlug, currentLesson.slug, lessons, buildLessonUrl]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-12">
        {/* ЛЕВО: основная статья */}
        <section className="space-y-4 lg:col-span-8">
          {/* Баннер последнего просмотренного урока */}
          {/* {isLastViewedLesson && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-primary/10 border border-primary/30 rounded-lg"
            >
              <div className="flex items-center text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mr-2" />
                <span>Вы продолжаете с того места, где остановились в прошлый раз</span>
              </div>
            </motion.div>
          )} */}

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

                {/* Кнопка возврата к последнему уроку */}
                {LastViewedButton}

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
                  {/* 1) Предисловие — просто ссылка */}
                  {predLesson && (
                    <div className="mb-3">
                      <a
                        href={buildLessonUrl(predLesson.slug)}
                        className="flex w-full items-center gap-3 rounded-xl border border-border/70 px-3 py-2 text-left text-sm hover:bg-muted/50"
                        ref={predLesson.slug === currentLesson.slug ? activeLessonRef : undefined}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">0</span>
                          <div className="min-w-0">
                            <div className="truncate font-medium">{predLesson.title}</div>
                            <div className="mt-0.5 text-[10px] text-muted-foreground">Предисловие</div>
                          </div>
                        </div>
                      </a>
                    </div>
                  )}

                  {/* 2) Основные группы (1-6) */}
                  <div className="space-y-4">
                    {displayGroups
                      .filter((g) => g.groupKey !== "_pred")
                      .map((g) => {
                        const key = g.groupKey;
                        const numKey = typeof key === 'number' ? key : Number(key);
                        const title = DEFAULT_GROUP_TITLES[numKey] || g.groupTitle || `Группа ${key}`;
                        const isOpen = normalizedQuery ? g.items.length > 0 : openGroup === key;

                        return (
                          <div key={String(key)} className="rounded-lg">
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
                                  {String(numKey)}
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

                            {isOpen && (
                              <div className="mt-2 rounded-xl border border-border/60 bg-muted/40 px-2 py-2 text-xs text-muted-foreground">
                                <ul className="space-y-1">
                                  {g.items.map((l) => {
                                    const isCurrent = l.slug === currentLesson.slug;
                                    const isCompleted = completedLessons.has(l.slug);
                                    const isLastViewed = l.slug === lastViewedSlug;
                                    const depthStyle = getDepthStyle(l.depth || 0);

                                    return (
                                      <li key={l.slug} className="w-full">
                                        <div className="flex items-center justify-between" style={depthStyle}>
                                          <a
                                            href={buildLessonUrl(l.slug)}
                                            ref={isCurrent ? activeLessonRef as any : undefined}
                                            className={[
                                              "group flex w-full max-w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition hover:bg-muted/60",
                                              isCurrent ? "bg-primary/5 border border-primary/40" : "",
                                              isLastViewed && !isCurrent && "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                                            ]
                                              .filter(Boolean)
                                              .join(" ")}
                                          >
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                              {isLastViewed && !isCurrent && (
                                                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                              )}
                                              <span className={[
                                                "text-xs font-mono shrink-0 transition-colors",
                                                isCurrent ? "text-primary font-semibold" : 
                                                isLastViewed ? "text-amber-600 dark:text-amber-400 font-medium" : 
                                                "text-muted-foreground",
                                                isCompleted && "text-lime-600 dark:text-lime-400"
                                              ].filter(Boolean).join(" ")}>
                                                {l.displayNumber}
                                              </span>
                                              
                                              <div className="min-w-0 flex-1">
                                                <div className="truncate font-medium">
                                                  {renderHighlightedTitle(l.title)}
                                                </div>
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
