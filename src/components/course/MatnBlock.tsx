import React, { useEffect, useRef, useState } from "react";
import { Howl } from "howler";
import { marked } from "marked";
import { BookMarked, Pause, Play, ChevronDown, Volume2 } from "lucide-react";
import { replaceQuranTags } from "../../utils/replaceQuranTags";

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

type Props = {
  /** Заголовок блока, напр. «Мукаддима аль-Джазари: бейты 9–19» */
  title?: string;
  /** mp3 группы бейтов (общий на группу, переиспользуется многими уроками) */
  audio?: string;
  from?: number;
  to?: number;
  /** true — тайминги бейтов недоступны (битый/неполный VTT): играем файл целиком без подсветки */
  noSync?: boolean;
  beits: MatnBeit[];
};

const AR = "font-arabic text-right leading-[2.1]";

async function toHtml(md: string): Promise<string> {
  const parsed = await marked.parse(md);
  return replaceQuranTags(parsed);
}

export default function MatnBlock({
  title,
  audio,
  from,
  to,
  noSync,
  beits,
}: Props) {
  const howlRef = useRef<Howl | null>(null);
  const rafRef = useRef<number | null>(null);
  const stopAtRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [activeN, setActiveN] = useState<number | null>(null);
  const [openSharh, setOpenSharh] = useState<Record<number, boolean>>({});
  const [sharhHtml, setSharhHtml] = useState<Record<number, string>>({});

  const synced =
    !noSync && beits.some((b) => typeof b.start === "number" && typeof b.end === "number");

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      howlRef.current?.unload();
      howlRef.current = null;
    };
  }, []);

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
    setPlaying(false);
    setActiveN(null);
  }

  function tick() {
    const h = howlRef.current;
    if (!h) return;
    const t = h.seek() as number;
    if (stopAtRef.current != null && t >= stopAtRef.current) {
      fullStop();
      return;
    }
    if (synced) {
      const cur = beits.find(
        (b) =>
          b.start != null && b.end != null && t >= b.start && t < b.end,
      );
      setActiveN(cur ? cur.n : null);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  /** Проиграть фрагмент [start, end]; если start/end не заданы — весь файл. */
  function playRange(start?: number, end?: number) {
    const h = getHowl();
    if (!h) return;
    h.stop();
    clearRaf();
    stopAtRef.current = end ?? null;
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
    if (synced) {
      const s = Math.min(
        ...beits.filter((b) => b.start != null).map((b) => b.start as number),
      );
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

  const heading =
    title ||
    (from != null && to != null
      ? from === to
        ? `Мукаддима аль-Джазари: бейт ${from}`
        : `Мукаддима аль-Джазари: бейты ${from}–${to}`
      : "Мукаддима аль-Джазари");

  return (
    <section className="scroll-mt-28 overflow-hidden rounded-3xl border border-amber-200/70 bg-white shadow-xl shadow-amber-100/50 dark:border-amber-300/15 dark:bg-slate-950/35 dark:shadow-black/20">
      <div className="flex flex-col gap-3 border-b border-amber-200/70 bg-gradient-to-br from-amber-50 to-white px-4 py-4 dark:border-amber-300/15 dark:from-amber-300/[0.08] dark:to-transparent sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-200">
          <BookMarked size={16} aria-hidden="true" />
          {heading}
        </div>
        {audio && (
          <button
            type="button"
            onClick={togglePlayAll}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-amber-300/80 bg-white px-3 py-2 text-sm font-semibold text-amber-800 shadow-sm transition-colors hover:bg-amber-50 dark:border-amber-300/25 dark:bg-white/10 dark:text-amber-100 dark:hover:bg-white/[0.14] sm:self-auto"
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
            {playing ? "Стоп" : "Слушать"}
          </button>
        )}
      </div>

      <ol className="divide-y divide-amber-200/60 dark:divide-amber-300/10">
        {beits.map((b) => {
          const active = activeN === b.n;
          return (
            <li
              key={b.n}
              className={`border-l-4 px-4 py-5 transition-colors duration-200 sm:px-6 ${
                active
                  ? "border-amber-500 bg-amber-100/80 dark:border-amber-400 dark:bg-amber-300/[0.16]"
                  : "border-transparent bg-transparent"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                    active
                      ? "border-amber-500 bg-amber-500 text-white ring-2 ring-amber-400/60 ring-offset-1 ring-offset-amber-100 dark:border-amber-400 dark:bg-amber-400 dark:text-slate-900 dark:ring-offset-transparent"
                      : "border-amber-300/70 bg-white text-amber-700 dark:border-amber-300/25 dark:bg-white/10 dark:text-amber-100"
                  }`}
                >
                  {b.n}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className={`${AR} m-0 text-2xl text-slate-950 dark:text-white`}>
                      {b.ar}
                    </p>
                    {synced && b.start != null && (
                      active ? (
                        <span
                          aria-label="Звучит сейчас"
                          className="mt-1 inline-flex h-8 w-8 flex-none animate-pulse items-center justify-center rounded-full bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-900"
                        >
                          <Volume2 size={15} />
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => playBeit(b)}
                          aria-label={`Слушать бейт ${b.n}`}
                          className="mt-1 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border border-amber-300/70 bg-white text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-300/25 dark:bg-white/10 dark:text-amber-100 dark:hover:bg-white/[0.14]"
                        >
                          <Play size={14} />
                        </button>
                      )
                    )}
                  </div>
                  <p className="mt-2 mb-0 text-lg leading-8 text-slate-700 dark:text-slate-200">
                    {b.ru}
                  </p>

                  {b.sharh && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => toggleSharh(b)}
                        aria-expanded={!!openSharh[b.n]}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/70 bg-white px-2.5 py-1.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-50 dark:border-amber-300/25 dark:bg-white/10 dark:text-amber-100 dark:hover:bg-white/[0.14]"
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
                        <div className="mt-3 rounded-2xl border border-amber-200/70 bg-white/80 px-4 py-3 dark:border-amber-300/15 dark:bg-white/[0.04]">
                          {sharhHtml[b.n] == null ? (
                            <p className="m-0 text-base text-slate-500 dark:text-slate-400">
                              Загрузка…
                            </p>
                          ) : (
                            <div
                              className="max-w-none
                                [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-950 dark:[&_h2]:text-white
                                [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-900 dark:[&_h3]:text-slate-50
                                [&_p]:my-3 [&_p]:text-base [&_p]:leading-7 [&_p]:text-slate-700 dark:[&_p]:text-slate-200
                                [&_strong]:font-semibold [&_strong]:text-slate-950 dark:[&_strong]:text-white
                                [&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul]:text-base [&_ul]:leading-7 [&_ul]:text-slate-700 dark:[&_ul]:text-slate-200
                                [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_ol]:text-base [&_ol]:leading-7 [&_ol]:text-slate-700 dark:[&_ol]:text-slate-200
                                [&_blockquote]:my-4 [&_blockquote]:rounded-xl [&_blockquote]:border [&_blockquote]:border-amber-200/70 [&_blockquote]:bg-amber-50/70 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:text-base [&_blockquote]:leading-8 [&_blockquote]:text-slate-800 dark:[&_blockquote]:border-amber-300/15 dark:[&_blockquote]:bg-amber-300/10 dark:[&_blockquote]:text-slate-100
                                [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_table]:text-sm [&_table]:text-slate-700 dark:[&_table]:text-slate-200 [&_table]:border [&_table]:border-slate-200/80 dark:[&_table]:border-white/10 [&_table]:rounded-xl [&_table]:overflow-hidden
                                [&_thead]:bg-slate-50/80 dark:[&_thead]:bg-white/[0.04]
                                [&_tbody]:divide-y [&_tbody]:divide-slate-200/80 dark:[&_tbody]:divide-white/10
                                [&_th]:px-3 [&_th]:py-2 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-slate-600 dark:[&_th]:text-slate-400
                                [&_td]:px-3 [&_td]:py-2 [&_td]:text-base"
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
    </section>
  );
}
