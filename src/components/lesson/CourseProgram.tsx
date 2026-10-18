import React from "react";
import { Play, X } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";

export interface CourseProgramLesson {
  slug: string;
  title: string;
  order?: number;
}

interface Props {
  subject: string;
  course: string;
  currentSlug: string;
  lessons: CourseProgramLesson[];
}

const buildLessonUrl = (subject: string, course: string, slug: string) =>
  `/lesson?subject=${encodeURIComponent(subject)}&course=${encodeURIComponent(
    course,
  )}&slug=${encodeURIComponent(slug)}`;

const CourseProgram: React.FC<Props> = ({
  subject,
  course,
  currentSlug,
  lessons,
}) => {
  const storageKey = React.useMemo(
    () => `completed-lessons:${subject}/${course}`,
    [subject, course],
  );

  const [completedLessons, setCompletedLessons] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [query, setQuery] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const sidebarScrollRef = React.useRef<HTMLDivElement | null>(null);
  const activeLessonRef = React.useRef<HTMLAnchorElement | null>(null);

  React.useEffect(() => {
    const read = () => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        setCompletedLessons(
          new Set(Array.isArray(parsed) ? (parsed as string[]) : []),
        );
      } catch {
        setCompletedLessons(new Set());
      }
    };

    read();

    const onChange = (event: Event) => {
      const detail = (
        event as CustomEvent<{ slug?: string; completed?: boolean }>
      ).detail;
      if (!detail?.slug) {
        read();
        return;
      }
      setCompletedLessons((prev) => {
        const next = new Set(prev);
        if (detail.completed) next.add(detail.slug!);
        else next.delete(detail.slug!);
        return next;
      });
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) read();
    };

    window.addEventListener("lesson-completion-change", onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("lesson-completion-change", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [storageKey]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredLessons = React.useMemo(() => {
    if (!normalizedQuery) return lessons;

    let result = lessons.filter((lesson) => {
      const title = lesson.title.toLowerCase();
      const order = lesson.order != null ? String(lesson.order) : "";
      return title.includes(normalizedQuery) || order.includes(normalizedQuery);
    });

    if (normalizedQuery && !result.some((item) => item.slug === currentSlug)) {
      const current = lessons.find((item) => item.slug === currentSlug);
      if (current) result = [current, ...result];
    }

    return result;
  }, [lessons, normalizedQuery, currentSlug]);

  const completedCount = lessons.reduce(
    (count, lesson) => count + (completedLessons.has(lesson.slug) ? 1 : 0),
    0,
  );
  const progress = lessons.length
    ? Math.round((completedCount / lessons.length) * 100)
    : 0;

  const renderHighlightedTitle = (title: string) => {
    if (!normalizedQuery) return title;

    const lower = title.toLowerCase();
    const parts: React.ReactNode[] = [];
    let index = 0;
    let key = 0;

    while (index < title.length) {
      const matchIndex = lower.indexOf(normalizedQuery, index);
      if (matchIndex === -1) {
        parts.push(<span key={key++}>{title.slice(index)}</span>);
        break;
      }
      if (matchIndex > index) {
        parts.push(<span key={key++}>{title.slice(index, matchIndex)}</span>);
      }
      parts.push(
        <span
          key={key++}
          className="rounded bg-yellow-200/70 px-0.5 dark:bg-yellow-500/30"
        >
          {title.slice(matchIndex, matchIndex + normalizedQuery.length)}
        </span>,
      );
      index = matchIndex + normalizedQuery.length;
    }

    return parts;
  };

  React.useEffect(() => {
    if (normalizedQuery) return;

    const scrollToActiveLesson = () => {
      const container = sidebarScrollRef.current;
      const target = activeLessonRef.current;
      if (!container || !target) return;

      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const relativeTop = targetRect.top - containerRect.top;
      const scrollTarget =
        container.scrollTop + relativeTop - containerRect.height / 3;

      container.scrollTo({
        top: Math.max(0, scrollTarget),
        behavior: "smooth",
      });
    };

    const timer = window.setTimeout(scrollToActiveLesson, 300);
    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollToActiveLesson);
    });

    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(raf);
    };
  }, [currentSlug, normalizedQuery]);

  return (
    <Card className="rounded-none sm:rounded-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg">
            Программа курса
          </CardTitle>
          <div className="hidden text-xs text-muted-foreground sm:block">
            Прогресс
          </div>
        </div>

        <div className="mt-3">
          <Progress value={progress} />
          <div className="mt-1 text-xs text-muted-foreground">
            {progress}% пройдено
          </div>
        </div>

        <div className="mt-4">
          <div className="relative w-full">
            <Input
              ref={searchInputRef}
              placeholder="Поиск по урокам…"
              className="bg-secondary pl-3 pr-8 text-sm lg:bg-transparent"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setQuery("");
                  searchInputRef.current?.focus();
                }
              }}
            />

            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Очистить поиск"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div
          ref={sidebarScrollRef}
          className="h-[60vh] overflow-y-auto px-2 pb-2"
        >
          {filteredLessons.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Ничего не найдено. Попробуйте изменить запрос.
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredLessons
                .slice()
                .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
                .map((lesson) => {
                  const isCurrent = lesson.slug === currentSlug;
                  const isCompleted = completedLessons.has(lesson.slug);

                  return (
                    <li key={lesson.slug} className="w-full">
                      <a
                        href={buildLessonUrl(subject, course, lesson.slug)}
                        ref={isCurrent ? activeLessonRef : undefined}
                        aria-current={isCurrent ? "page" : undefined}
                        className={[
                          "group block w-full max-w-full rounded-xl border border-border/70 p-3 text-sm transition",
                          isCurrent
                            ? "border-primary/60 bg-primary/5"
                            : "hover:border-emerald-200 hover:bg-lime-50 dark:hover:border-border/60 dark:hover:bg-muted/50",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={[
                              "grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-transparent bg-muted text-xs transition-colors",
                              isCurrent &&
                                isCompleted &&
                                "border-emerald-200 bg-emerald-50 text-emerald-600 dark:bg-primary/10 dark:text-emerald-500",
                              isCurrent &&
                                !isCompleted &&
                                "border-primary/20 bg-primary/10",
                              !isCurrent &&
                                isCompleted &&
                                "border-lime-200 bg-emerald-50 text-emerald-600 dark:bg-primary/10 dark:text-emerald-500",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            <Play className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="truncate font-medium transition-colors group-hover:text-lime-700 dark:group-hover:text-lime-50">
                              {renderHighlightedTitle(lesson.title)}
                            </div>

                            {lesson.order != null && (
                              <div className="text-[10px] uppercase text-muted-foreground transition-colors group-hover:text-lime-700 dark:group-hover:text-lime-50">
                                Урок {lesson.order}
                              </div>
                            )}
                          </div>
                        </div>
                      </a>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseProgram;
