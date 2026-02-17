// src/components/LessonPage.tsx
import React from "react";
import { motion } from "framer-motion";
import {
  Play,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Headphones,
  Download,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Video, Music } from "lucide-react";
import { LayoutList } from "lucide-react";

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

  const [mediaMode, setMediaMode] = React.useState<"video" | "audio" | "none">(
    currentLesson.video ? "video" : currentLesson.audio ? "audio" : "none"
  );

  React.useEffect(() => {
    setMediaMode(
      currentLesson.video ? "video" : currentLesson.audio ? "audio" : "none"
    );
  }, [currentLesson.video, currentLesson.audio, currentLesson.slug]);

  function getVideoPoster(videoUrl?: string | null): string | undefined {
    if (!videoUrl) return undefined;

    // /video/111-urok.mp4 -> /thumbs/111-urok.jpg
    return videoUrl
      .replace("/video/", "/thumbs/")
      .replace(/\.(mp4|webm|mov)$/i, ".jpg");
  }

  // ---------------------------
  // SUBTITLES: state + helpers
  // ---------------------------
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [vttUrl, setVttUrl] = React.useState<string | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);


  // Если true — попытаемся автоматически включить дорожку (textTrack.mode = 'showing')
  const AUTO_ENABLE_SUBS = false;

  /**
   * deriveVttPathFromVideoUrl
   * Преобразует путь вида:
   *  /media/.../video/01-name.mp4
   * в
   *  /media/.../vtt/01-name.vtt
   *
   * Если videoUrl не содержит "/video/", попробуем просто заменить расширение на .vtt
   */
  function deriveVttPathFromVideoUrl(videoUrl?: string | null): string | null {
    if (!videoUrl) return null;
    try {
      // Если URL абсолютный (с доменом), то мы всё равно работаем со строкой
      // Ищем сегмент "/video/" и заменяем на "/vtt/"
      if (videoUrl.includes("/video/")) {
        return videoUrl
          .replace(/\/video\//, "/vtt/")
          .replace(/\.(mp4|webm|mov)$/i, ".vtt");
      }
      // fallback: если нет /video/ — просто заменим расширение
      return videoUrl.replace(/\.(mp4|webm|mov)$/i, ".vtt");
    } catch {
      return null;
    }
  }

  // Проверяем доступность .vtt (HEAD, fallback GET). Устанавливаем vttUrl если найден.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const candidate = deriveVttPathFromVideoUrl(currentLesson.video);
    if (!candidate) {
      setVttUrl(null);
      return;
    }

    let aborted = false;

    // Попытка HEAD
    fetch(candidate, { method: "HEAD" })
      .then((res) => {
        if (aborted) return;
        if (res.ok) {
          setVttUrl(candidate);
        } else {
          // fallback: GET (некоторые сервера не поддерживают HEAD)
          return fetch(candidate, { method: "GET" }).then((r) => {
            if (!aborted && r.ok) setVttUrl(candidate);
            else if (!aborted) setVttUrl(null);
          });
        }
      })
      .catch(() => {
        if (!aborted) setVttUrl(null);
      });

    return () => {
      aborted = true;
    };
  }, [currentLesson.video]);

  // Автовключение дорожки (опционально)
  React.useEffect(() => {
    if (!AUTO_ENABLE_SUBS) return;
    if (!vttUrl) return;
    const vid = videoRef.current;
    if (!vid) return;

    let cancelled = false;

    function enableIfAvailable() {
      if (cancelled) return;
      if (!vid) return;
      try {
        const tts = Array.from(vid.textTracks || []);
        const tt = tts.find(
          (t) =>
            t.label === "Русский" ||
            t.language === "ru" ||
            (t as any).src?.endsWith(vttUrl)
        );
        if (tt) tt.mode = "showing";
      } catch {}
    }

    // Если дорожка уже есть в DOM, ждем загрузки
    const trackEl = vid.querySelectorAll("track");
    if (trackEl && trackEl.length > 0) {
      // небольшой таймаут, чтобы браузер успел инициализировать textTracks
      const to = setTimeout(enableIfAvailable, 250);
      return () => {
        cancelled = true;
        clearTimeout(to);
      };
    } else {
      // если трек ещё не добавлен, поставим таймаут на попытку включения
      const to = setTimeout(enableIfAvailable, 500);
      return () => {
        cancelled = true;
        clearTimeout(to);
      };
    }
  }, [vttUrl]);

  // --------------------------- 
  // end SUBTITLES
  // ---------------------------

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

  // ВАЖНО: refs отдельно для мобилки и десктопа, иначе React перезаписывает их
  const sidebarScrollMobileRef = React.useRef<HTMLDivElement | null>(null);
  const sidebarScrollDesktopRef = React.useRef<HTMLDivElement | null>(null);

  const activeLessonMobileRef = React.useRef<HTMLAnchorElement | null>(null);
  const activeLessonDesktopRef = React.useRef<HTMLAnchorElement | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredLessons = React.useMemo(() => {
    if (!normalizedQuery) return lessons;

    let result = lessons.filter((l) => {
      const title = l.title.toLowerCase();
      const orderStr = l.order != null ? String(l.order) : "";
      return (
        title.includes(normalizedQuery) || orderStr.includes(normalizedQuery)
      );
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
        parts.push(<span key={key++}>{title.slice(index, matchIndex)}</span>);
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
    React.useEffect(() => {
    if (typeof window === "undefined") return;

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;

    const container = isDesktop
      ? sidebarScrollDesktopRef.current
      : sidebarScrollMobileRef.current;

    const target = isDesktop
      ? activeLessonDesktopRef.current
      : activeLessonMobileRef.current;

      if (container && target) {
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


  const courseProgramMobileRef = React.useRef<HTMLDivElement | null>(null);
  const courseProgramDesktopRef = React.useRef<HTMLDivElement | null>(null);

  const scrollToCourseProgram = () => {
    const target =
      courseProgramMobileRef.current || courseProgramDesktopRef.current;

    if (!target) return;

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };


const hasVideo = Boolean(currentLesson.video);
const hasAudio = Boolean(currentLesson.audio);
const hasAnyMedia = hasVideo || hasAudio;
const hasBothMedia = hasVideo && hasAudio;

// Overlay кнопки "предыдущий/следующий урок" вынесены в отдельный компонент, чтобы не дублировать код для мобилки и десктопа
const PrevNextOverlay = ({ mode }: { mode: "video" | "audio" }) => (
  <>
    {prevLesson && (
      <a
        href={buildLessonUrl(prevLesson.slug)}
        className={`
          absolute left-3 ${mode === "audio" ? "top-3" : "top-1/2 -translate-y-1/2"}
          z-20
          flex items-center gap-1
          rounded-full
          bg-black/40 text-white
          px-3 py-2
          backdrop-blur
          hover:bg-black/60
          transition
          active:scale-95
          text-sm font-semibold
          ${isPlaying ? "opacity-0 pointer-events-none" : "opacity-100"}
        `}
      >
        <ChevronLeft className="h-5 w-5" />
        {prevLesson.order != null && <span>{prevLesson.order} урок</span>}
      </a>
    )}

    {nextLesson && (
      <a
        href={buildLessonUrl(nextLesson.slug)}
        className={`
          absolute right-3 ${mode === "audio" ? "top-3" : "top-1/2 -translate-y-1/2"}
          z-20
          flex items-center gap-1
          rounded-full
          bg-black/40 text-white
          px-3 py-2
          backdrop-blur
          hover:bg-black/60
          transition
          active:scale-95
          text-sm font-semibold
          ${isPlaying ? "opacity-0 pointer-events-none" : "opacity-100"}
        `}
      >
        {nextLesson.order != null && <span>{nextLesson.order} урок</span>}
        <ChevronRight className="h-5 w-5" />
      </a>
    )}
  </>
);


  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ========================= */}
      {/* FULL WIDTH MOBILE (YouTube) */}
      {/* ========================= */}
      <div className="w-full lg:hidden">
        {/* ВИДЕО / АУДИО */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="overflow-hidden rounded-none border-0">

            <CardContent className="space-y-4 p-0">
              {/* MEDIA (VIDEO / AUDIO) MOBILE*/}
              {mediaMode === "video" && currentLesson.video ? (
                <div className="relative aspect-video w-full bg-black overflow-hidden">
                   <video
                      ref={videoRef}
                      className="h-full w-full"
                      controls
                      preload="none"
                      playsInline
                      poster={getVideoPoster(currentLesson.video)}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => setIsPlaying(false)}
                    >
                      <source src={currentLesson.video} />
                      {vttUrl && (
                        <track
                          kind="subtitles"
                          src={vttUrl}
                          srcLang="ru"
                          label="Русский"
                          default
                        />
                      )}
                      Ваш браузер не поддерживает субтитры &lt;track&gt;.
                    </video>
                    {/* PREV NEXT BUTTON MOBILE*/}
                      <PrevNextOverlay mode="video" />
                </div>
              ) : mediaMode === "audio" && currentLesson.audio ? (
                // <div className="relative w-full border-t border-border/70 bg-muted/30 p-4">
                <div className="relative w-full min-h-[140px] rounded-xl border border-border/70 bg-muted/30 p-4 flex flex-col">
                    {/* Пустое пространство сверху (можно добавить контент) */}
                  <div className="flex-grow"></div>
                  <audio className="w-full" 
                    controls 
                    preload="none"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                  >
                    <source src={currentLesson.audio} />
                    
                  </audio>
                  {/* PREV NEXT BUTTON MOBILE*/}
                  <PrevNextOverlay mode="audio" />
                </div>
              ) : (
                <div className="border-t border-border/70 bg-muted/30 p-6 text-sm text-muted-foreground">
                  Для этого урока видео и аудио отсутствует.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* TOOLBAR УРОКА MOBILE*/}
        <Card className="rounded-none border-x-0 border-border/70 border-t-0">
          <CardContent className="p-2">
            <div className="relative w-full">
              {/* ЛЕВАЯ ТЕНЬ */}
              <div className="pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-background to-transparent z-10" />

              {/* ПРАВАЯ ТЕНЬ */}
              <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-background to-transparent z-10" />

              {/* СКРОЛЛ-ПАНЕЛЬ */}
              <div
                className="
                  flex w-full gap-2
                  overflow-x-auto whitespace-nowrap
                  scrollbar-hide
                  pb-1
                  px-1
                "
              >
                {/* TOOLBAR Prev MOBILE */}
                {!hasAnyMedia && prevLesson && (
                <Button
                  variant="secondary"
                  size="sm"
                  className={`
                    gap-2 
                    rounded-full
                    border-primary/30 
                    bg-primary/10 
                    text-primary 
                    hover:bg-primary/20
                 `}
                  aria-label={prevLesson ? `Урок ${prevLesson.order ?? ""}` : "Нет предыдущего урока"}
                  asChild
                  disabled={!prevLesson}
                >
                  <a href={prevLesson ? buildLessonUrl(prevLesson.slug) : "#"}>
                    
                    {prevLesson && prevLesson.order != null ? <><ChevronLeft className="h-4 w-4" /><span>{prevLesson.order} урок</span></>: ""}
                  </a>
                </Button>
                )}

                {/*Кнопку Видео/Аудио показываем только если есть ОБА */}
                {hasBothMedia && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2 rounded-full border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                  type="button"
                  onClick={() =>
                    setMediaMode((prev) => (prev === "video" ? "audio" : "video"))
                  }
                >
                  {mediaMode === "video" ? (
                    <>
                      <Headphones className="h-4 w-4" />
                      Аудио
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4" />
                      Видео
                    </>
                  )}
                </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2 rounded-full border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                  type="button"
                  onClick={scrollToCourseProgram}
                >
                  <LayoutList className="h-4 w-4" />
                  Программа
                </Button>

                <Button
                  size="sm"
                  className={
                    "shrink-0 gap-2 rounded-full border-primary/30 " +
                    (isCurrentLessonCompleted
                      ? ""
                      : "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary")
                  }
                  variant={isCurrentLessonCompleted ? "default" : "outline"}
                  onClick={handleToggleCompletion}
                >
                  <CheckCircle2
                    className={
                      "h-4 w-4 " +
                      (isCurrentLessonCompleted ? "text-emerald-600" : "")
                    }
                  />
                  {isCurrentLessonCompleted ? "Завершён" : "Отметить завершённым"}
                </Button>

                {/* TOOLBAR Next MOBILE */}
                {!hasAnyMedia && nextLesson &&(
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2 rounded-full border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                  asChild
                  disabled={!nextLesson}
                >
                  <a href={nextLesson ? buildLessonUrl(nextLesson.slug) : "#"}>
                    
                    {nextLesson && nextLesson.order != null ? <span>{nextLesson.order} урок</span>: "Нет следующего урока"}
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </Button>
                )}
              </div>
            </div>

          </CardContent>
        </Card>


        {/* ТЕКСТ УРОКА */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="overflow-visible rounded-none border-0 shadow-none">
            <CardContent className="px-4 py-4">
              <article
                className="
                  prose
                  prose-sm
                  prose-neutral dark:prose-invert
                  max-w-none
                "
                dangerouslySetInnerHTML={{ __html: currentLesson.html }}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* ПРОГРАММА КУРСА (МОБИЛКА) */}
        <aside ref={courseProgramMobileRef} className="w-full">
          <div>
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
                  ref={sidebarScrollMobileRef}
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
                                ref={
                                  isCurrent ? activeLessonMobileRef : undefined
                                }
                                className={[
                                  "group block w-full max-w-full rounded-xl border border-border/70 p-3 text-sm transition",
                                  isCurrent
                                    ? "border-primary/60 bg-primary/5"
                                    : `hover:border-emerald-200 hover:bg-lime-50 
                                      dark:hover:border-border/60 dark:hover:bg-muted/50`,
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className={[
                                      `grid h-9 w-9 shrink-0 
                                      place-items-center rounded-xl 
                                      border border-transparent 
                                      bg-muted text-xs transition-colors`,
                                      // Текущий И завершенный (новое условие с наивысшим приоритетом)
                                      isCurrent && isCompleted && `bg-emerald-50 text-emerald-600 border-emerald-200
                                      dark:bg-primary/10 dark:text-emerald-500 `,
                                      // Только текущий (но не завершенный)
                                      isCurrent && !isCompleted && "bg-primary/10 border-primary/20",
                                      // Только завершенный (но не текущий)
                                      !isCurrent && isCompleted && `bg-emerald-50 text-emerald-600 border-lime-200
                                      dark:bg-primary/10 dark:text-e dark:text-emerald-500 `,
                                    ]
                                      .filter(Boolean)
                                      .join(" ")}
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
      </div>

      {/* ========================= */}
      {/* DESKTOP (как было) */}
      {/* ========================= */}
      <div className="w-full hidden lg:block">
        <main
          className="
            mx-auto
            grid
            max-w-7xl
            grid-cols-1
            gap-6
            px-0 sm:px-6 lg:px-8
            py-6
            lg:grid-cols-12
          "
        >
          {/* ЛЕВАЯ ЧАСТЬ */}
          <section className="lg:col-span-8">
            {/* ВИДЕО / АУДИО */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-0 rounded-none shadow-none">

                {/* <CardHeader className="flex flex-col gap-2">
                  <CardTitle className="text-xl sm:text-2xl">
                    {currentLesson.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Курс: {courseTitle}
                  </p>
                </CardHeader> */}

                <CardContent className="p-0">
                  {/* MEDIA (VIDEO / AUDIO) */}
                  {mediaMode === "video" && currentLesson.video ? (
                    <div className="relative w-full aspect-video bg-muted">
                      <video
                        ref={videoRef}
                        className="h-full w-full"
                        controls
                        preload="none"
                        playsInline
                        poster={getVideoPoster(currentLesson.video)}
                      >
                        <source src={currentLesson.video} />
                        {vttUrl && (
                          <track
                            kind="subtitles"
                            src={vttUrl}
                            srcLang="ru"
                            label="Русский"
                            default
                          />
                        )}
                        Ваш браузер не поддерживает субтитры &lt;track&gt;.
                      </video>
                    </div>
                  ) : mediaMode === "audio" && currentLesson.audio ? (
                    <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                      <audio className="w-full" controls preload="none">
                        <source src={currentLesson.audio} />
                      </audio>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border/70 bg-muted/30 p-6 text-sm text-muted-foreground">
                      Для этого урока видео и аудио отсутствует.
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* TOOLBAR УРОКА */}
            <Card className="border-0 shadow-none ">
              <CardContent className="p-2 sm:p-4 " >
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 ">
  
              {/* Левая группа */}
              <div className="flex justify-start">
               
                {/* <Button
                  variant="secondary"
                  size="sm"
                  className={`
                    gap-2 
                    rounded-full
                    border-primary/30 
                    bg-primary/10 
                    text-primary 
                    hover:bg-primary/20
                 `}
                  aria-label={prevLesson ? `Урок ${prevLesson.order ?? ""}` : "Нет предыдущего урока"}
                  asChild
                  disabled={!prevLesson}
                >
                  <a href={prevLesson ? buildLessonUrl(prevLesson.slug) : "#"}>
                    <ChevronLeft className="h-4 w-4" />
                    {prevLesson && prevLesson.order != null ? <span>{prevLesson.order} урок</span>: "Нет предыдущего урока"}
                  </a>
                </Button> */}

              </div>

              {/* Центр */}
              <div className="flex items-center justify-center gap-2">
                {currentLesson.video && currentLesson.audio && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-full border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                    type="button"
                    onClick={() =>
                      setMediaMode((prev) => (prev === "video" ? "audio" : "video"))
                    }
                  >
                    {mediaMode === "video" ? (
                      <>
                        <Headphones className="h-4 w-4" />
                        Аудио-версия
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4" />
                        Видео-версия
                      </>
                    )}
                  </Button>
                )}

                {mediaMode === "video" && currentLesson.video && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-full border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                    asChild
                  >
                    <a href={currentLesson.video} download>
                      <Download className="h-4 w-4" />
                      Скачать
                    </a>
                  </Button>
                )}

                {mediaMode === "audio" && currentLesson.audio && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-full border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                    asChild
                  >
                    <a href={currentLesson.audio} download>
                      <Download className="h-4 w-4" />
                      Скачать
                    </a>
                  </Button>
                )}
              </div>

              {/* Правая группа */}
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  className={
                    "shrink-0 gap-2 rounded-full border-primary/30 " +
                    (isCurrentLessonCompleted
                      ? ""
                      : "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary")
                  }
                  variant={isCurrentLessonCompleted ? "default" : "outline"}
                  onClick={handleToggleCompletion}
                >
                  <CheckCircle2
                    className={
                      "h-4 w-4 " +
                      (isCurrentLessonCompleted ? "text-emerald-600" : "")
                    }
                  />
                  {isCurrentLessonCompleted ? "Завершён" : "Отметить завершённым"}
                </Button>
              </div>
            </div>

              </CardContent>
            </Card>

            {/* ТЕКСТ УРОКА (ВСЕГДА ПОД ВИДЕО) */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="overflow-visible rounded-none border-0 shadow-none">
                <CardContent className="px-4 py-4 sm:p-6">
                  <article
                    className="
                      prose
                      prose-sm sm:prose-base
                      prose-neutral dark:prose-invert
                      max-w-none
                    "
                    dangerouslySetInnerHTML={{ __html: currentLesson.html }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </section>

          {/* ПРАВАЯ ПАНЕЛЬ: список уроков */}
          <aside ref={courseProgramDesktopRef} className="lg:col-span-4">
            <div className="lg:sticky lg:top-[80px]">
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
                    ref={sidebarScrollDesktopRef}
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
                                  ref={
                                    isCurrent ? activeLessonDesktopRef : undefined
                                  }
                                  className={[
                                    "group block w-full max-w-full rounded-xl border border-border/70 p-3 text-sm transition",
                                    isCurrent
                                      ? "border-primary/60 bg-primary/5"
                                      :  `hover:border-emerald-200 hover:bg-lime-50 
                                      dark:hover:border-border/60 dark:hover:bg-muted/50`,
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        className={[
                                          `grid h-9 w-9 shrink-0 
                                          place-items-center rounded-xl 
                                          border border-transparent 
                                          bg-muted text-xs transition-colors`,
                                          // Текущий И завершенный (новое условие с наивысшим приоритетом)
                                          isCurrent && isCompleted && `bg-emerald-50 text-emerald-600 border-emerald-200
                                          dark:bg-primary/10 dark:text-emerald-500`,
                                          // Только текущий (но не завершенный)
                                          isCurrent && !isCompleted && "bg-primary/10 border-primary/20",
                                          // Только завершенный (но не текущий)
                                          !isCurrent && isCompleted && `bg-emerald-50 text-emerald-600 border-lime-200
                                          dark:bg-primary/10 dark:text-e dark:text-emerald-500 `,
                                        ]
                                        .filter(Boolean)
                                        .join(" ")}
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
    </div>
  );
};

export default LessonPage;
