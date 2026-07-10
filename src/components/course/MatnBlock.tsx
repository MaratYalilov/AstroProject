import React, { useEffect, useMemo, useRef, useState } from "react";
import { Howl } from "howler";
import { marked } from "marked";
import { BookOpen, ChevronDown, Pause, Play, Volume2 } from "lucide-react";
import { replaceQuranTags } from "../../utils/replaceQuranTags";
import mukaddimaData from "@/content/lessons/quran/koran-2-uroven/mukaddima.json";
import sharhData from "@/content/lessons/quran/koran-2-uroven/sharh.json";
import groupsData from "@/content/lessons/quran/koran-2-uroven/matn_groups.json";

export type MatnBeit = {
  n: number;
  /** Матн бейта (арабский, обе полустишия) */
  ar: string;
  /** Краткий перевод бейта */
  ru: string;
  /** Шарх Муллы Али аль-Кари (raw markdown; конвертируется в HTML при раскрытии) */
  sharh?: string;
  /** Границы бейта в аудио группы (секунды). Есть только у синхронизированных групп. */
  start?: number;
  end?: number;
};

type MatnGroup = {
  audio?: string;
  from: number;
  to: number;
  noSync?: boolean;
  times?: Record<string, [number, number]>;
};

type Props = {
  /** Заголовок блока, напр. «Мукаддима аль-Джазари: бейты 9–19» */
  title?: string;
  /** Ключ группы бейтов (аудио + тайминги) из matn_groups.json, напр. "01-9-19" */
  group: string;
  /** Диапазон бейтов — ссылки на ID в mukaddima.json / sharh.json */
  from: number;
  to: number;
};

// Матн «Мукаддимы» и шарх лежат в общих JSON; блок урока лишь ссылается на ID.
const MUKADDIMA = mukaddimaData as { n: number; ar: string; ru: string }[];
const MUK_MAP: Record<number, { ar: string; ru: string }> = Object.fromEntries(
  MUKADDIMA.map((b) => [b.n, { ar: b.ar, ru: b.ru }]),
);
const SHARH = sharhData as Record<string, string>;
const GROUPS = groupsData as Record<string, MatnGroup>;

async function toHtml(md: string): Promise<string> {
  const parsed = await marked.parse(md);
  // «Арабский оригинал» идёт в blockquote. Класс arab (проектный арабский
  // шрифт + RTL) вешаем и на сам blockquote, и на текстовые <p> внутри —
  // на <p> обязательно, иначе шрифт не доходит до текста по наследованию.
  const withArab = parsed.replace(
    /<blockquote>([\s\S]*?)<\/blockquote>/g,
    (_m, inner) =>
      `<blockquote class="arab">${inner.replace(/<p>/g, '<p class="arab">')}</blockquote>`,
  );
  return replaceQuranTags(withArab);
}

function AudioWave() {
  return (
    <span className="flex items-end gap-[3px]" aria-hidden="true">
      <span className="h-2 w-[3px] animate-pulse rounded-full bg-cyan-400" />
      <span className="h-4 w-[3px] animate-pulse rounded-full bg-cyan-400 delay-75" />
      <span className="h-3 w-[3px] animate-pulse rounded-full bg-cyan-400 delay-150" />
      <span className="h-4 w-[3px] animate-pulse rounded-full bg-cyan-400 delay-200" />
      <span className="h-2 w-[3px] animate-pulse rounded-full bg-cyan-400 delay-100" />
    </span>
  );
}

export default function MatnBlock({ group, from, to }: Props) {
  const g = GROUPS[group];
  const audio = g?.audio;
  const noSync = g?.noSync ?? true;

  // Собираем бейты диапазона из общих JSON: матн — из mukaddima.json,
  // шарх — из sharh.json, тайминги — из matn_groups.json.
  const beits = useMemo<MatnBeit[]>(() => {
    const times = g?.times ?? {};
    const list: MatnBeit[] = [];
    for (let n = from; n <= to; n += 1) {
      const m = MUK_MAP[n];
      if (!m) continue;
      const be: MatnBeit = { n, ar: m.ar, ru: m.ru };
      if (SHARH[String(n)]) be.sharh = SHARH[String(n)];
      const t = times[String(n)];
      if (t) {
        be.start = t[0];
        be.end = t[1];
      }
      list.push(be);
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, from, to]);

  const howlRef = useRef<Howl | null>(null);
  const rafRef = useRef<number | null>(null);
  const stopAtRef = useRef<number | null>(null);
  const rangeRef = useRef<{ from: number; to: number } | null>(null);
  const liRefs = useRef<Record<number, HTMLLIElement | null>>({});
  const [playing, setPlaying] = useState(false);
  const [activeN, setActiveN] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [openSharh, setOpenSharh] = useState<Record<number, boolean>>({});
  const [sharhHtml, setSharhHtml] = useState<Record<number, string>>({});

  const synced =
    !noSync &&
    beits.some((b) => typeof b.start === "number" && typeof b.end === "number");

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      howlRef.current?.unload();
      howlRef.current = null;
    };
  }, []);

  // При воспроизведении активный бейт подскроливается в центр видимой области.
  useEffect(() => {
    if (!playing || activeN == null) return;
    const el = liRefs.current[activeN];
    el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  }, [activeN, playing]);

  function getHowl(): Howl | null {
    if (!audio) return null;
    if (!howlRef.current) {
      howlRef.current = new Howl({ src: [audio], html5: true, preload: false });
    }
    return howlRef.current;
  }

  function clearRaf() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function fullStop() {
    howlRef.current?.stop();
    clearRaf();
    stopAtRef.current = null;
    rangeRef.current = null;
    setPlaying(false);
    setActiveN(null);
    setProgress(0);
  }

  function tick() {
    const h = howlRef.current;
    if (!h) return;
    const t = h.seek() as number;
    const r = rangeRef.current;
    if (r && r.to > r.from) {
      setProgress(Math.min(100, Math.max(0, ((t - r.from) / (r.to - r.from)) * 100)));
    } else {
      const d = h.duration() || 0;
      if (d) setProgress(Math.min(100, (t / d) * 100));
    }
    if (stopAtRef.current != null && t >= stopAtRef.current) {
      fullStop();
      return;
    }
    if (synced) {
      const cur = beits.find(
        (b) => b.start != null && b.end != null && t >= b.start && t < b.end,
      );
      setActiveN(cur ? cur.n : null);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  /** Проиграть фрагмент [start, end]; если не заданы — весь файл. */
  function playRange(start?: number, end?: number) {
    const h = getHowl();
    if (!h) return;
    h.stop();
    clearRaf();
    stopAtRef.current = end ?? null;
    rangeRef.current =
      start != null && end != null ? { from: start, to: end } : null;
    h.off("play");
    h.off("end");
    h.once("play", () => {
      if (typeof start === "number") h.seek(start);
      rafRef.current = requestAnimationFrame(tick);
    });
    h.once("end", () => fullStop());
    h.play();
    setPlaying(true);
  }

  function togglePlayAll() {
    if (playing) {
      fullStop();
      return;
    }
    // при запуске чтения списка сворачиваем раскрытые шархи
    setOpenSharh({});
    if (synced) {
      // если у первых бейтов диапазона нет тайминга (Whisper их не поймал) —
      // стартуем с начала аудио, чтобы не пропустить их звучание.
      const s = beits[0]?.start ?? 0;
      const e = Math.max(
        ...beits.filter((b) => b.end != null).map((b) => b.end as number),
      );
      playRange(s, e);
    } else {
      playRange();
    }
  }

  function playBeit(b: MatnBeit) {
    if (!synced || b.start == null || b.end == null) return;
    playRange(b.start, b.end);
  }

  async function toggleSharh(b: MatnBeit) {
    const isOpen = !!openSharh[b.n];
    setOpenSharh((p) => ({ ...p, [b.n]: !isOpen }));
    if (!isOpen && b.sharh && sharhHtml[b.n] == null) {
      const html = await toHtml(b.sharh);
      setSharhHtml((p) => ({ ...p, [b.n]: html }));
    }
  }

  const rangeLabel =
    from != null && to != null
      ? from === to
        ? `Бейт ${from}`
        : `Бейты ${from}–${to}`
      : "Матн";

  return (
    <section className="relative rounded-3xl border border-gray-200 bg-white p-4 shadow-lg shadow-gray-200/60 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl dark:shadow-black/20 sm:p-6">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-300/10" />

      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-cyan-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 shadow-sm shadow-cyan-100/70 dark:border-cyan-300/20 dark:bg-white/10 dark:text-cyan-200 dark:shadow-none">
            <BookOpen size={13} aria-hidden="true" />
            Мукаддима аль-Джазари
          </div>
        </div>

        {audio && (
          <div className="sticky top-[69px] z-20">
          <button
            type="button"
            onClick={togglePlayAll}
            aria-label={playing ? "Пауза" : "Слушать чтение"}
            className={[
              "group relative flex w-full items-center gap-3 overflow-hidden rounded-full",
              "border border-white/10 bg-white/70 px-3.5 py-3 text-left ring-1 ring-gray-200/70 transition-all duration-300",
              "hover:border-cyan-300/40 hover:shadow-cyan-500/20",
              "dark:bg-white/10 dark:text-white dark:ring-white/5",
              playing
                ? "ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-400/25"
                : "shadow-lg shadow-cyan-500/10",
            ].join(" ")}
          >
            <span
              className={[
                "absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-sky-400/5 to-emerald-300/10 opacity-0 transition-opacity duration-300",
                playing ? "animate-pulse opacity-100" : "group-hover:opacity-100",
              ].join(" ")}
            />
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white shadow-lg shadow-cyan-500/20 transition group-hover:bg-cyan-500 dark:bg-cyan-400 dark:text-slate-950">
              {playing ? (
                <Pause size={20} aria-hidden="true" />
              ) : (
                <Play size={20} className="translate-x-[1px]" aria-hidden="true" />
              )}
            </span>
            <span className="relative min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold text-gray-950 dark:text-white sm:text-base">
                  {rangeLabel} · Саад аль-Гамди
                </span>
                {playing && <AudioWave />}
              </span>
              <span className="mt-2 block h-1 overflow-hidden rounded-full bg-gray-200/80 dark:bg-white/15">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-300 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </span>
            </span>
          </button>
          </div>
        )}

        <ol className="">
          {beits.map((b) => {
            const active = activeN === b.n;
            return (
              <li
                key={b.n}
                ref={(el) => {
                  liRefs.current[b.n] = el;
                }}
                className={[
                  "scroll-mt-28 border-l-4 py-5 pl-3 pr-1 transition-colors duration-200 sm:pl-4",
                  active
                    ? "border-amber-400 bg-amber-50 dark:border-amber-400 dark:bg-amber-300/[0.1]"
                    : "border-transparent bg-transparent",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-none flex-col items-center gap-2">
                    <span
                      className={[
                        "inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                        active
                          ? "border-amber-400 bg-amber-400 text-white ring-2 ring-amber-300/60 ring-offset-1 dark:text-slate-900"
                          : "border-gray-200 bg-white text-gray-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-300",
                      ].join(" ")}
                    >
                      {b.n}
                    </span>
                    {synced && b.start != null && (
                      active ? (
                        <span
                          aria-label="Звучит сейчас"
                          className="inline-flex h-9 w-9 animate-pulse items-center justify-center rounded-full bg-amber-400 text-white dark:text-slate-900"
                        >
                          <Volume2 size={16} />
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => playBeit(b)}
                          aria-label={`Слушать бейт ${b.n}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-cyan-700 transition-colors hover:bg-cyan-50 hover:text-cyan-800 dark:border-white/10 dark:bg-white/10 dark:text-cyan-300 dark:hover:bg-white/[0.16]"
                        >
                          <Play size={15} className="translate-x-[1px]" />
                        </button>
                      )
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      dir="rtl"
                      className="arab m-0 block w-full text-right text-slate-950 dark:text-[#e8e1d8]"
                    >
                      {b.ar}
                    </p>
                    <p className="mt-2 mb-0 text-lg leading-8 text-slate-700 dark:text-slate-200">
                      {b.ru}
                    </p>

                    {b.sharh && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => toggleSharh(b)}
                          aria-expanded={!!openSharh[b.n]}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-sm font-semibold text-cyan-800 transition-colors hover:border-cyan-300 hover:bg-cyan-100 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/[0.16]"
                        >
                          <ChevronDown
                            size={15}
                            className={`transition-transform duration-200 ${
                              openSharh[b.n] ? "rotate-180" : ""
                            }`}
                          />
                          Шарх Муллы Али аль-Кари
                        </button>
                        {openSharh[b.n] && (
                          <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                            {sharhHtml[b.n] == null ? (
                              <p className="m-0 text-base text-slate-500 dark:text-slate-400">
                                Загрузка…
                              </p>
                            ) : (
                              <div
                                className="max-w-none
                                  [&_h2]:mb-4 [&_h2]:mt-9 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:text-slate-950 dark:[&_h2]:text-white
                                  [&_h3]:mb-3 [&_h3]:mt-7 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:leading-snug [&_h3]:text-slate-900 dark:[&_h3]:text-slate-50
                                  [&_p]:my-5 [&_p]:text-lg [&_p]:leading-8 [&_p]:text-slate-700 dark:[&_p]:text-slate-200
                                  [&_strong]:font-semibold [&_strong]:text-slate-950 dark:[&_strong]:text-white
                                  [&_ul]:my-6 [&_ul]:list-disc [&_ul]:space-y-3 [&_ul]:pl-6 [&_ul]:text-lg [&_ul]:leading-8 [&_ul]:text-slate-700 dark:[&_ul]:text-slate-200
                                  [&_ol]:my-6 [&_ol]:list-decimal [&_ol]:space-y-3 [&_ol]:pl-6 [&_ol]:text-lg [&_ol]:leading-8 [&_ol]:text-slate-700 dark:[&_ol]:text-slate-200
                                  [&_li]:pl-1 [&_li]:marker:text-cyan-600 dark:[&_li]:marker:text-cyan-300
                                  [&_blockquote]:my-7 [&_blockquote]:rounded-2xl [&_blockquote]:border [&_blockquote]:border-cyan-200/70 [&_blockquote]:bg-cyan-50/70 [&_blockquote]:px-5 [&_blockquote]:py-4 [&_blockquote]:text-right [&_blockquote]:leading-8 [&_blockquote]:text-slate-800 dark:[&_blockquote]:border-cyan-300/15 dark:[&_blockquote]:bg-cyan-300/10 dark:[&_blockquote]:text-slate-100
                                  [&_blockquote_p]:my-1 [&_blockquote_p]:text-[clamp(1.6rem,3.5vw,1.8rem)] [&_blockquote_p]:leading-[2.1]
                                  [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_table]:text-base [&_table]:text-slate-700 dark:[&_table]:text-slate-200 [&_table]:border [&_table]:border-slate-200/80 dark:[&_table]:border-white/10 [&_table]:rounded-xl [&_table]:overflow-hidden
                                  [&_thead]:bg-slate-50/80 dark:[&_thead]:bg-white/[0.04]
                                  [&_tbody]:divide-y [&_tbody]:divide-slate-200/80 dark:[&_tbody]:divide-white/10
                                  [&_th]:px-4 [&_th]:py-3 [&_th]:text-sm [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-slate-600 dark:[&_th]:text-slate-400
                                  [&_td]:px-4 [&_td]:py-3 [&_td]:text-lg"
                                dangerouslySetInnerHTML={{ __html: sharhHtml[b.n] }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
