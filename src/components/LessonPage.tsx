// src/components/LessonPage.tsx
import React from "react";
import { motion } from "framer-motion";
import {
  Play,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  FileText,
  Headphones,
  Download,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface LessonSidebarItem {
  slug: string; // например "fiqh/mishkat-taharat/05-omovenie-i-namaz"
  title: string;
  order?: number;
  hasAudio?: boolean;
  hasVideo?: boolean;
}

export interface LessonPageProps {
  subject: string;
  course: string;
  courseTitle: string;
  currentLesson: {
    slug: string;
    title: string;
    order?: number;
    html: string; // тело урока (HTML/Markdown → HTML)
    hasAudio?: boolean;
    hasVideo?: boolean;
    audio?: string | null;
    video?: string | null;
  };
  lessons: LessonSidebarItem[]; // все уроки курса (для правой панели)
}

const LessonPage: React.FC<LessonPageProps> = ({
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


function getVideoPoster(videoUrl?: string | null): string | undefined {
  if (!videoUrl) return undefined;

  // /video/111-urok.mp4 -> /thumbs/111-urok.jpg
  return videoUrl
    .replace("/video/", "/thumbs/")
    .replace(/\.(mp4|webm|mov)$/i, ".jpg");
}



  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

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

  const videoTabAvailable = Boolean(currentLesson.video);
  const audioTabAvailable = Boolean(currentLesson.audio);

  const buildLessonUrl = (slug: string) =>
    `/lesson?subject=${encodeURIComponent(
      subject
    )}&course=${encodeURIComponent(course)}&slug=${encodeURIComponent(slug)}`;

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    document.dispatchEvent(new CustomEvent("quran:reinit"));
  }, [currentLesson.slug, currentLesson.html]);

  // =============================
  // поиск по урокам (сайдбар)
  // =============================
  const [query, setQuery] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const sidebarScrollRef = React.useRef<HTMLDivElement | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredLessons = React.useMemo(() => {
    if (!normalizedQuery) return lessons;

    let result = lessons.filter((l) => {
      const title = l.title.toLowerCase();
      const orderStr = l.order != null ? String(l.order) : "";
      return title.includes(normalizedQuery) || orderStr.includes(normalizedQuery);
    });

    // если текущий урок не попал в фильтр — добавим его сверху,
    // чтобы он не "пропадал" из вида
    if (normalizedQuery && !result.some((l) => l.slug === currentLesson.slug)) {
      const current = lessons.find((l) => l.slug === currentLesson.slug);
      if (current) {
        result = [current, ...result];
      }
    }

    return result;
  }, [lessons, normalizedQuery, currentLesson.slug]);

  // подсветка совпадений в названии
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

  // =============================
  // автопрокрутка к активному уроку + скролл страницы наверх
  // =============================
  const activeLessonRef = React.useRef<HTMLAnchorElement | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    if (sidebarScrollRef.current && activeLessonRef.current) {
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
    }
  }, [currentLesson.slug]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-12">
        {/* ЛЕВАЯ ЧАСТЬ */}
        <section className="space-y-4 lg:col-span-8">
          <Tabs
            defaultValue={
              videoTabAvailable ? "video" : audioTabAvailable ? "audio" : "text"
            }
          >
            <TabsList className="grid w-full grid-cols-3 rounded-2xl p-1">
              <TabsTrigger
                value="video"
                disabled={!videoTabAvailable}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Видео
              </TabsTrigger>
              <TabsTrigger
                value="audio"
                disabled={!audioTabAvailable}
                className="flex items-center gap-2"
              >
                <Headphones className="h-4 w-4" />
                Аудио
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Текст
              </TabsTrigger>
            </TabsList>

            {/* ВИДЕО */}
            <TabsContent value="video">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="overflow-hidden">
                  <CardHeader className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl sm:text-2xl">
                        {currentLesson.title}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Курс: {courseTitle}
                      </p>
                    </div>
                    {currentLesson.video && (
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
                    )}
                  </CardHeader>
                  <CardContent>
                    {currentLesson.video ? (
                      <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted">
                        <video
                          className="h-full w-full"
                          controls
                          preload="none"
                          playsInline
                          poster={getVideoPoster(currentLesson.video)}
                        >
                          <source src={currentLesson.video} />
                        </video>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Для этого урока видео-запись отсутствует.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* АУДИО */}
            <TabsContent value="audio">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardHeader className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl sm:text-2xl">
                        Аудио-версия урока
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Курс: {courseTitle}
                      </p>
                    </div>
                    {currentLesson.audio && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        asChild
                      >
                        <a href={currentLesson.audio} download>
                          <Download className="h-4 w-4" />
                          Скачать аудио
                        </a>
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {currentLesson.audio ? (
                      <audio className="w-full" controls preload="none">
                        <source src={currentLesson.audio} />
                      </audio>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Для этого урока аудио-запись отсутствует.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* ТЕКСТ */}
            <TabsContent value="text">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-xl sm:text-2xl">
                      Текстовый конспект
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[60vh] p-6">
                      <article
                        className="prose prose-sm sm:prose-base prose-neutral dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: currentLesson.html }}
                      />
                    </ScrollArea>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>

          {/* Навигация по урокам */}
          <div className="flex items-center justify-between gap-3 pt-2">
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
            <div className="flex items-center gap-2">
              <Button
                type="button"
                className="gap-2"
                variant={isCurrentLessonCompleted ? "default" : "outline"}
                onClick={handleToggleCompletion}
                aria-pressed={isCurrentLessonCompleted}
              >
                <CheckCircle2 className="h-4 w-4" />
                {isCurrentLessonCompleted
                  ? "Снять отметку"
                  : "Отметить как завершённый"}
              </Button>
              <Button className="gap-2" asChild disabled={!nextLesson}>
                <a href={nextLesson ? buildLessonUrl(nextLesson.slug) : "#"}>
                  Следующий урок
                  <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* ПРАВАЯ ПАНЕЛЬ: список уроков */}
        <aside className="lg:col-span-4">
          <div className="sticky top-[80px]">
            <Card>
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
                    {progress}% просмотрено (условно)
                  </div>
                </div>
                <div className="mt-4">
                  <div className="relative w-full">
                    <Input
                      ref={searchInputRef}
                      placeholder="Поиск по урокам…"
                      className="pl-3 pr-8 text-sm"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
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
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition"
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
                        .sort(
                          (a, b) => (a.order ?? 999) - (b.order ?? 999)
                        )
                        .map((l) => {
                          const isCurrent = l.slug === currentLesson.slug;
                          const isCompleted = completedLessons.has(l.slug);
                          return (
                            <li key={l.slug} className="w-full">
                              <a
                                href={buildLessonUrl(l.slug)}
                                ref={isCurrent ? activeLessonRef : undefined}
                                className={[
                                  "group block w-full max-w-full rounded-xl border border-border/70 p-3 text-sm transition",
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
                                      "grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-transparent bg-muted text-xs transition-colors",
                                      isCurrent && "bg-primary/10 border-primary/20",
                                      !isCurrent &&
                                        isCompleted &&
                                        "bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-900/30 dark:text-lime-50 dark:border-lime-800",
                                    ]
                                      .filter(Boolean)
                                      .join(" ")}
                                    aria-label={
                                      isCompleted
                                        ? "Урок отмечен как завершенный"
                                        : undefined
                                    }
                                  >
                                    <Play className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="truncate font-medium transition-colors group-hover:text-lime-700 dark:group-hover:text-lime-50">
                                      {renderHighlightedTitle(l.title)}
                                    </div>
                                    {l.order != null && (
                                      <div className="text-[10px] uppercase text-muted-foreground transition-colors group-hover:text-lime-700 dark:group-hover:text-lime-50">
                                        Урок {l.order}
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
          </div>
        </aside>
      </main>
    </div>
  );
};

export default LessonPage;
