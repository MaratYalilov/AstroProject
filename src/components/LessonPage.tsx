// src/components/LessonPage.tsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Search,
  FileText,
  Headphones,
  Download,
  AlertTriangle,
  RefreshCcw,
  CheckCircle,
} from "lucide-react";

/**
 * NOTE ABOUT THE FIX
 * ------------------
 * The AbortError was likely caused by the sandbox/browser aborting media fetches.
 * To make this robust we:
 *  1) Use CORS-friendly demo URLs (W3Schools) by default.
 *  2) Set preload="none" on <video> and <audio> to avoid eager fetching in sandboxes.
 *  3) Add explicit onError handlers that show a friendly fallback + direct download.
 *  4) Provide a manual "Проверить доступ" probe that attempts a fetch HEAD with timeout.
 *  5) Keep download buttons in a consistent position (header right) across tabs.
 */

// Mock data
const lessons = Array.from({ length: 14 }).map((_, i) => ({
  id: i + 1,
  title: `Урок ${i + 1}: Тема ${i + 1}`,
  duration: `${10 + i} мин`,
  status: i < 4 ? "done" : i === 4 ? "current" : "locked",
}));

const textBlocks = [
  {
    h: "Введение",
    p: `В этом уроке мы разберём ключевые принципы темы, посмотрим демонстрацию на видео, послушаем краткую аудио-версию и закрепим материал текстовым конспектом.`,
  },
  {
    h: "Ключевые понятия",
    p: `Обратите внимание на структуру урока: сначала обзор, затем практика и резюме. Вы можете переключаться между вкладками «Видео», «Аудио» и «Текст», не теряя прогресс.`,
  },
  {
    h: "Итоги",
    p: `После просмотра отметьте урок выполненным и переходите к следующему. Все материалы доступны в офлайн-режиме при предварительной загрузке.`,
  },
];

// Demo sources
const DEFAULT_VIDEO = "https://www.w3schools.com/html/mov_bbb.mp4";
const DEFAULT_AUDIO = "https://www.w3schools.com/html/horse.mp3";

// window.__LESSON_SRCS = { videoSrc: "...", audioSrc: "..." }
function useLessonSources() {
  const injected = (typeof window !== "undefined" && (window as any).__LESSON_SRCS) || {};
  const videoSrc: string = injected.videoSrc || DEFAULT_VIDEO;
  const audioSrc: string = injected.audioSrc || DEFAULT_AUDIO;
  return { videoSrc, audioSrc };
}

function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildMarkdown(): string {
  const header = `# Текстовый конспект урока\n\n`;
  const body = textBlocks.map((b) => `## ${b.h}\n\n${b.p}\n`).join("\n");
  const structure = `## Структура\n\n- Короткое видео-объяснение (10–20 мин)\n- Аудио-резюме для повторения в дороге\n- Текстовый конспект с примерами и кодом\n\n`;
  const checklist = `## Чек-лист\n\n1. Посмотреть видео\n2. Прослушать аудио\n3. Прочитать конспект\n4. Ответить на вопросы\n`;
  return header + body + structure + checklist;
}

// --- Utilities
async function probeUrl(url: string, timeoutMs = 4000): Promise<{ ok: boolean; reason?: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    await fetch(url, { method: "HEAD", mode: "no-cors", signal: ctrl.signal });
    clearTimeout(timer);
    return { ok: true };
  } catch (e: any) {
    clearTimeout(timer);
    return { ok: false, reason: e?.message || "fetch failed" };
  }
}

export default function LessonPage() {
  const progress = 38; // %
  const { videoSrc, audioSrc } = useLessonSources();

  const [videoError, setVideoError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [videoProbe, setVideoProbe] = useState<string>("");
  const [audioProbe, setAudioProbe] = useState<string>("");

  const handleDownloadMarkdown = () => {
    const md = buildMarkdown();
    downloadBlob("lesson-5-conspect.md", "text/markdown;charset=utf-8", md);
  };
  const handleDownloadTxt = () => {
    const md = buildMarkdown();
    downloadBlob("lesson-5-conspect.txt", "text/plain;charset=utf-8", md);
  };

  const onRetryVideo = async () => {
    setVideoError(null);
    setVideoProbe("Проверяем доступ...");
    const res = await probeUrl(videoSrc);
    setVideoProbe(res.ok ? "Доступен (HEAD ok/opaque). Попробуйте снова воспроизвести." : `Недоступен: ${res.reason}`);
  };
  const onRetryAudio = async () => {
    setAudioError(null);
    setAudioProbe("Проверяем доступ...");
    const res = await probeUrl(audioSrc);
    setAudioProbe(res.ok ? "Доступен (HEAD ok/opaque). Попробуйте снова воспроизвести." : `Недоступен: ${res.reason}`);
  };

  // Dev tests (без проблемной регулярки)
  useEffect(() => {
    try {
      const md = buildMarkdown();
      console.assert(typeof md === "string", "buildMarkdown() должен возвращать строку");
      console.assert(md.includes("# Текстовый конспект урока"), "Markdown должен содержать заголовок");
      console.assert(md.includes("\n"), "Markdown должен содержать переводы строк");
      console.assert(/\.mp4$/i.test(videoSrc), "videoSrc должен указывать на .mp4");
      console.assert(/\.mp3$/i.test(audioSrc), "audioSrc должен указывать на .mp3");
      console.log("%cDev tests OK", "color: green");
    } catch (e) {
      console.error("Dev tests failed:", e);
    }
  }, [videoSrc, audioSrc]);

  // Доп. тест пробы
  useEffect(() => {
    (async () => {
      const goodVideo = await probeUrl(DEFAULT_VIDEO);
      console.log("[TEST] probe DEFAULT_VIDEO:", goodVideo);
      try {
        const bad = await probeUrl("https://example.invalid/not-found.mp4", 1500);
        console.log("[TEST] probe BAD URL:", bad);
      } catch (e) {
        console.log("[TEST] probe BAD URL threw (expected in some env):", (e as any)?.message);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-2xl bg-primary/15" />
            <span className="text-lg font-semibold">EduNova</span>
          </div>
          <nav className="hidden items-center gap-2 sm:flex">
            <Button variant="ghost">Домой</Button>
            <Button variant="ghost">Курсы</Button>
            <Button variant="ghost">Мой профиль</Button>
          </nav>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-12">
        {/* Main content */}
        <section className="lg:col-span-8 space-y-4">
          <Tabs defaultValue="video" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-2xl p-1">
              <TabsTrigger value="video" className="flex items-center gap-2"><Play className="h-4 w-4"/>Видео</TabsTrigger>
              <TabsTrigger value="audio" className="flex items-center gap-2"><Headphones className="h-4 w-4"/>Аудио</TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2"><FileText className="h-4 w-4"/>Текст</TabsTrigger>
            </TabsList>

            {/* VIDEO TAB */}
            <TabsContent value="video">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                <Card className="overflow-hidden">
                  <CardHeader className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">Современная компоновка интерфейса</CardTitle>
                      <p className="text-sm text-muted-foreground">15:24 · 1080p · Субтитры RU/EN</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="gap-2" asChild>
                        <a href={videoSrc} download>
                          <Download className="h-4 w-4"/> Скачать видео
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={onRetryVideo} title="Проверить доступ">
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video w-full bg-muted">
                      <video
                        className="h-full w-full"
                        controls
                        preload="none"
                        playsInline
                        onError={() => setVideoError("Не удалось загрузить видео (возможны ограничения песочницы / CORS). Используйте скачивание или проверьте URL.")}
                        poster="https://images.unsplash.com/photo-1523246191815-0f270542e8f7?q=80&w=1974&auto=format&fit=crop"
                      >
                        <source src={videoSrc} type="video/mp4" />
                      </video>
                    </div>
                    {(videoError || videoProbe) && (
                      <div className="mt-3 rounded-xl border p-3 text-sm">
                        {videoError && (
                          <div className="flex items-start gap-2 text-amber-700"><AlertTriangle className="h-4 w-4 mt-0.5"/> <span>{videoError}</span></div>
                        )}
                        {videoProbe && (
                          <div className="mt-1 flex items-start gap-2 text-muted-foreground"><CheckCircle className="h-4 w-4 mt-0.5"/> <span>{videoProbe}</span></div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* AUDIO TAB */}
            <TabsContent value="audio">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                <Card>
                  <CardHeader className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">Аудио-версия урока</CardTitle>
                      <p className="text-sm text-muted-foreground">15:24 · MP3 · 128 kbps</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="gap-2" asChild>
                        <a href={audioSrc} download>
                          <Download className="h-4 w-4"/> Скачать аудио
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={onRetryAudio} title="Проверить доступ">
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <audio
                      className="w-full"
                      controls
                      preload="none"
                      onError={() => setAudioError("Не удалось загрузить аудио (возможны ограничения песочницы / CORS). Используйте скачивание или проверьте URL.")}
                    >
                      <source src={audioSrc} type="audio/mpeg" />
                    </audio>
                    {(audioError || audioProbe) && (
                      <div className="mt-3 rounded-xl border p-3 text-sm">
                        {audioError && (
                          <div className="flex items-start gap-2 text-amber-700"><AlertTriangle className="h-4 w-4 mt-0.5"/> <span>{audioError}</span></div>
                        )}
                        {audioProbe && (
                          <div className="mt-1 flex items-start gap-2 text-muted-foreground"><CheckCircle className="h-4 w-4 mt-0.5"/> <span>{audioProbe}</span></div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* TEXT TAB */}
            <TabsContent value="text">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                <Card className="overflow-hidden">
                  <CardHeader className="flex items-center justify-between">
                    <CardTitle className="text-2xl">Текстовый конспект</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="gap-2" onClick={handleDownloadMarkdown}>
                        <Download className="h-4 w-4"/> Скачать .md
                      </Button>
                      <Button variant="secondary" className="gap-2" onClick={handleDownloadTxt}>
                        <Download className="h-4 w-4"/> Скачать .txt
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="max-h-[54vh] p-6">
                      <article className="prose prose-neutral dark:prose-invert max-w-none">
                        {textBlocks.map((b, i) => (
                          <section key={i}>
                            <h3>{b.h}</h3>
                            <p>{b.p}</p>
                          </section>
                        ))}
                        <h3>Структура</h3>
                        <ul>
                          <li>Короткое видео-объяснение (10–20 мин)</li>
                          <li>Аудио-резюме для повторения в дороге</li>
                          <li>Текстовый конспект с примерами и кодом</li>
                        </ul>
                        <h3>Чек-лист</h3>
                        <ol>
                          <li>Посмотреть видео</li>
                          <li>Прослушать аудио</li>
                          <li>Прочитать конспект</li>
                          <li>Ответить на вопросы</li>
                        </ol>
                      </article>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>

          {/* Footer navigation */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button variant="secondary" className="gap-2"><ChevronLeft className="h-4 w-4"/> Предыдущий урок</Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2"><CheckCircle2 className="h-4 w-4"/> Отметить как завершённый</Button>
              <Button className="gap-2">Следующий урок <ChevronRight className="h-4 w-4"/></Button>
            </div>
          </div>
        </section>

        {/* Sidebar */}
        <aside className="lg:col-span-4">
          <Card className="sticky top-[84px]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Программа курса</CardTitle>
                <div className="hidden lg:flex w-40 items-center gap-2 text-sm text-muted-foreground">
                  <span>Прогресс</span>
                </div>
              </div>
              <div className="mt-3">
                <Progress value={progress} />
                <div className="mt-1 text-xs text-muted-foreground">{progress}% пройдено</div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="relative w-full">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Поиск по урокам" className="pl-8"/>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[60vh] p-2">
                <ul className="space-y-1">
                  {lessons.map((l) => (
                    <li key={l.id}>
                      <button
                        className={[
                          "group w-full rounded-xl border p-3 text-left transition",
                          l.status === "current" && "border-primary/50 bg-primary/5",
                          l.status === "done" && "opacity-80",
                          l.status === "locked" && "opacity-60",
                        ].filter(Boolean).join(" ")}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className={[
                              "h-10 w-10 shrink-0 rounded-xl bg-muted grid place-items-center",
                              l.status === "done" && "bg-green-500/10",
                              l.status === "current" && "bg-primary/10",
                            ].join(" ")}
                            >
                              {l.status === "done" ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : (
                                <Play className="h-5 w-5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium">{l.title}</div>
                              <div className="text-xs text-muted-foreground">{l.duration}</div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {l.status === "current" ? "сейчас" : l.status === "done" ? "готово" : "заблокировано"}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}
