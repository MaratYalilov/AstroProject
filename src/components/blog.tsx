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

  const currentIndex = lessons.findIndex((l) => l.slug === currentLesson.slug);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < lessons.length - 1
      ? lessons[currentIndex + 1]
      : null;

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
  const [openSlug, setOpenSlug] = React.useState<string | null>(
    currentLesson.slug
  );
  const activeLessonRef = React.useRef<HTMLButtonElement | null>(null);
  const sidebarScrollRef = React.useRef<HTMLDivElement | null>(null);

  const filteredLessons = React.useMemo(() => {
    if (!normalizedQuery) return lessons;

    let result = lessons.filter((l) => {
      const title = l.title.toLowerCase();
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
    if (!sidebarScrollRef.current || !activeLessonRef.current) return;

    const container = sidebarScrollRef.current;
    const target = activeLessonRef.current;
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

  // ---------- layout ----------
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-12">
        {/* ЛЕВО: основная статья */}
        <section className="space-y-4 lg:col-span-8">
          {/* Видео (если есть) */}
          {currentLesson.video && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="overflow-hidden">
                <CardHeader className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">
                      Видео-урок
                    </CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    asChild
                  >
                    <a href={currentLesson.video} download>
                      <Download className="h-4 w-4" />
                      Скачать видео
                    </a>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted">
                    <video
                      className="h-full w-full"
                      controls
                      preload="none"
                      playsInline
                    >
                      <source src={currentLesson.video} />
                    </video>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Аудио (если есть) */}
          {currentLesson.audio && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardHeader className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">
                      Аудио-урок
                    </CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    asChild
                  >
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

          {/* Основной текст */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <article
                  className="prose prose-sm sm:prose-base prose-neutral dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: currentLesson.html }}
                />
              </CardContent>
            </Card>
          </motion.div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="flex justify-start">
              <Button
                variant="secondary"
                className="gap-2"
                asChild
                disabled={!prevLesson}
              >
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
                {isCurrentLessonCompleted
                  ? "Снять отметку"
                  : "Отметить как завершённый"}
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

        {/* ПРАВО: аккордеон по урокам */}
        <aside className="lg:col-span-4">
          <div className="sticky top-[80px]">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base sm:text-lg">
                      Оглавление курса
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {lessons.length} уроков
                    </p>
                  </div>
                  <div className="hidden text-xs text-muted-foreground sm:block">
                    Прогресс
                    <Progress className="mt-1" value={progress} />
                    <span className="block text-[10px] text-muted-foreground">
                      {progress}% просмотрено
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="relative w-full">
                    <Input
                      placeholder="Поиск по урокам…"
                      className="pl-3 pr-8 text-sm"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div
                  ref={sidebarScrollRef}
                  className="h-[65vh] overflow-y-auto px-2 pb-3"
                >
                  {filteredLessons.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Ничего не найдено. Попробуйте изменить запрос.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {filteredLessons
                        .slice()
                        .sort((a, b) => {
                          // Сначала по groupOrder, потом по названию группы, потом по order
                          const gA = a.groupOrder ?? 999;
                          const gB = b.groupOrder ?? 999;
                          if (gA !== gB) return gA - gB;

                          const nA = String(a.group ?? "").toLowerCase();
                          const nB = String(b.group ?? "").toLowerCase();
                          if (nA !== nB) return nA.localeCompare(nB);

                          return (a.order ?? 999) - (b.order ?? 999);
                        })
                        .map((l, idx, arr) => {
                          const isCurrent = l.slug === currentLesson.slug;
                          const isCompleted = completedLessons.has(l.slug);
                          const isOpen = openSlug === l.slug;

                          const prev = idx > 0 ? arr[idx - 1] : null;
                          const isFirstInGroup =
                            !prev ||
                            String(prev.group ?? "") !== String(l.group ?? "") ||
                            (prev.groupOrder ?? 999) !== (l.groupOrder ?? 999);

                          return (
                            <li key={l.slug}>
                              {/* Заголовок группы */}
                              {isFirstInGroup && (
                                <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  {String(l.group ?? "Без группы")}
                                </div>
                              )}

                              {/* Кнопка-голова аккордеона */}
                              <button
                                type="button"
                                ref={isCurrent ? activeLessonRef : undefined}
                                onClick={() =>
                                  setOpenSlug((prevOpen) =>
                                    prevOpen === l.slug ? null : l.slug
                                  )
                                }
                                className={[
                                  "flex w-full items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2 text-left text-sm transition",
                                  isCurrent
                                    ? "border-primary/60 bg-primary/5"
                                    : "hover:border-lime-200 hover:bg-lime-50 dark:hover:border-border/60 dark:hover:bg-muted/50",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className={[
                                      "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-transparent bg-muted text-[11px] transition-colors",
                                      isCurrent && "bg-primary/10 border-primary/20",
                                      !isCurrent &&
                                        isCompleted &&
                                        "bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-900/30 dark:text-lime-50 dark:border-lime-800",
                                    ]
                                      .filter(Boolean)
                                      .join(" ")}
                                  >
                                    {l.order != null ? l.order : <Play className="h-3 w-3" />}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="truncate font-medium">
                                      {renderHighlightedTitle(l.title)}
                                    </div>
                                    <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                                      {l.hasVideo && (
                                        <span className="rounded-full bg-muted px-2 py-0.5">
                                          🎬 Видео
                                        </span>
                                      )}
                                      {l.hasAudio && (
                                        <span className="rounded-full bg-muted px-2 py-0.5">
                                          🎧 Аудио
                                        </span>
                                      )}
                                      {isCompleted && (
                                        <span className="flex items-center gap-1 rounded-full bg-lime-50 px-2 py-0.5 text-lime-700 dark:bg-lime-900/40 dark:text-lime-50">
                                          <CheckCircle2 className="h-3 w-3" />
                                          Завершён
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <ChevronDown
                                  className={[
                                    "h-4 w-4 shrink-0 transition-transform",
                                    isOpen ? "rotate-180" : "rotate-0",
                                  ].join(" ")}
                                />
                              </button>

                              {/* Тело аккордеона */}
                              {isOpen && (
                                <div className="mt-1 mb-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                                  <div className="mb-2">
                                    <span className="font-semibold">
                                      Урок {l.order != null ? l.order : "—"}
                                    </span>
                                    : {l.title}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Button size="sm" className="gap-1" asChild>
                                      <a href={buildLessonUrl(l.slug)}>Перейти к уроку</a>
                                    </Button>
                                    {l.hasVideo && (
                                      <span className="rounded-full bg-background px-2 py-0.5">
                                        🎬 Видео
                                      </span>
                                    )}
                                    {l.hasAudio && (
                                      <span className="rounded-full bg-background px-2 py-0.5">
                                        🎧 Аудио
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
                    </ul>
                  )}

                </div>

                {/* Прогресс для мобилок */}
                <div className="border-t border-border/60 px-4 py-3 text-xs sm:hidden">
                  <div className="mb-1">Прогресс по курсу</div>
                  <Progress value={progress} />
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {progress}% просмотрено
                  </div>
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
