import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  Volume2,
  AudioLines,
} from "lucide-react";
import { FORM_THEME, type FormName } from "./formTheme";
import { Howl } from "howler";

// ─── Types ───────────────────────────────────────────────────────────────────

type ComparisonSegment = {
  text: string;
  form?: FormName;
};

type ComparisonSide = {
  audio: string;
  segments: ComparisonSegment[];
};

type Comparison = {
  id: number;
  left: ComparisonSide;
  right: ComparisonSide;
};

export type { Comparison, ComparisonSegment, ComparisonSide };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeArabicMarks(text: string) {
  return text;
}

const ARABIC_MARKS_RE = /[\u064b-\u065f\u0670\u06d6-\u06ed]/g;
const RIGHT_JOINING_ONLY = new Set([
  "ا", "أ", "إ", "آ", "ٱ",
  "د", "ذ", "ر", "ز", "و", "ؤ", "ء", "ة", "ى",
]);

function arabicBaseLetters(text: string) {
  return [...normalizeArabicMarks(text).replace(ARABIC_MARKS_RE, "")].filter(
    (char) => /[\u0621-\u064a\u0671]/u.test(char),
  );
}

function shouldJoinSegments(previous: string, current: string) {
  const previousLetters = arabicBaseLetters(previous);
  const currentLetters = arabicBaseLetters(current);
  const previousLast = previousLetters.at(-1);
  const currentFirst = currentLetters[0];
  if (!previousLast || !currentFirst) return false;
  if (RIGHT_JOINING_ONLY.has(previousLast)) return false;
  return currentFirst !== "ء";
}

// ─── RichText renderer for comparison segments ───────────────────────────────

function renderComparisonText(segments: ComparisonSegment[]) {
  return (
    <span className="inline">
      {segments.map((segment, index) => {
        const form = segment.form;
        const previousSegment = segments[index - 1];
        const joiner =
          previousSegment && shouldJoinSegments(previousSegment.text, segment.text)
            ? "\u200d"
            : "";

        return (
          <span
            key={`${segment.text}-${index}`}
            className={[
              "arab inline",
              form ? FORM_THEME[form].text : "text-gray-900 dark:text-[#e8e1d8]",
            ].join(" ")}
            style={{
              fontFamily: "inherit",
              direction: "inherit",
              fontSize: "inherit",
              lineHeight: "inherit",
              unicodeBidi: "normal",
            }}
          >
            {joiner}
            {segment.text}
          </span>
        );
      })}
    </span>
  );
}

// ─── Audio Wave ──────────────────────────────────────────────────────────────

function AudioWave() {
  return (
    <div className="flex h-4 items-end gap-[3px]" aria-hidden="true">
      {[8, 16, 11, 16, 7].map((height, index) => (
        <motion.span
          key={index}
          animate={{ height: [4, height, 4] }}
          transition={{
            repeat: Infinity,
            duration: 0.55,
            delay: index * 0.08,
          }}
          className="w-[3px] rounded-full bg-amber-400"
        />
      ))}
    </div>
  );
}

// ─── Floating Audio Pill ─────────────────────────────────────────────────────

function formatCounter(index: number | null, total: number) {
  if (index === null) return `0 / ${total}`;
  return `${index + 1} / ${total}`;
}

function AudioPill({
  status,
  activeIndex,
  total,
  isPlaying,
  onPlayAll,
  onReplay,
  onStop,
}: {
  status: "idle" | "playing" | "paused" | "completed";
  activeIndex: number | null;
  total: number;
  isPlaying: boolean;
  onPlayAll: () => void;
  onReplay: () => void;
  onStop: () => void;
}) {
  return (
    <div
      className={[
        "group relative flex w-full max-w-[720px] items-center gap-2 overflow-hidden rounded-full",
        "border border-white/10 bg-white/80 p-2 text-left backdrop-blur-xl",
        "shadow-xl shadow-amber-500/10 ring-1 ring-gray-200/70 transition-all duration-300",
        "dark:bg-slate-950/75 dark:text-white dark:ring-white/10",
        isPlaying ? "shadow-amber-400/25 ring-2 ring-amber-400/40" : "",
      ].join(" ")}
    >
      <span
        className={[
          "absolute inset-0 bg-gradient-to-r from-amber-400/10 via-orange-400/5 to-yellow-300/10 opacity-0 transition-opacity duration-300",
          isPlaying ? "animate-pulse opacity-100" : "group-hover:opacity-100",
        ].join(" ")}
      />

      <button
        type="button"
        onClick={onPlayAll}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white shadow-lg shadow-amber-500/20 transition hover:bg-amber-500 dark:bg-amber-400 dark:text-slate-950"
        aria-label={isPlaying ? "Пауза" : "Запустить плейлист"}
      >
        {isPlaying ? (
          <Pause size={20} aria-hidden="true" />
        ) : (
          <Play size={20} className="translate-x-[1px]" aria-hidden="true" />
        )}
      </button>

      <div className="relative min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 truncate text-left text-sm font-semibold leading-5 text-gray-950 dark:text-white sm:text-base">
              Прослушать все сравнения
            </p>
            <p className="m-0 truncate text-left text-[12px] leading-4 text-gray-500 dark:text-slate-400">
              {formatCounter(activeIndex, total)}
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            {isPlaying && <AudioWave />}
            <Volume2 size={18} className="text-gray-400" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="relative flex shrink-0 items-center gap-1 border-l border-gray-200 pl-2 dark:border-white/10">
        <button
          type="button"
          onClick={onReplay}
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 hover:text-amber-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-amber-300"
          aria-label="Повторить"
        >
          <RotateCcw size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onStop}
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 hover:text-rose-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-rose-300"
          aria-label="Остановить"
        >
          <Square size={17} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ─── Custom hook for playing two audios per comparison ───────────────────────

type PlayState = {
  activeIndex: number | null;
  activeSide: "left" | "right" | null;
  status: "idle" | "playing" | "paused" | "completed";
};

function useComparisonPlayer({ comparisons }: { comparisons: Comparison[] }) {
  const [state, setState] = useState<PlayState>({
    activeIndex: null,
    activeSide: null,
    status: "idle",
  });
  const howlsRef = useRef<Record<string, Howl>>({});
  const playlistTokenRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preload all howls
  useEffect(() => {
    comparisons.forEach((comp) => {
      [comp.left, comp.right].forEach((side) => {
        if (!howlsRef.current[side.audio]) {
          howlsRef.current[side.audio] = new Howl({
            src: [side.audio],
            preload: true,
            html5: true,
          });
        }
      });
    });

    return () => {
      Object.values(howlsRef.current).forEach((howl) => howl.unload());
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparisons.map((c) => c.left.audio + c.right.audio).join(",")]);

  const stopAll = useCallback(({ markCompleted = false } = {}) => {
    playlistTokenRef.current += 1;
    Object.values(howlsRef.current).forEach((howl) => howl.stop());
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setState({
      activeIndex: null,
      activeSide: null,
      status: markCompleted ? "completed" : "idle",
    });
  }, []);

  const getHowl = useCallback((audio: string) => {
    if (!howlsRef.current[audio]) {
      howlsRef.current[audio] = new Howl({
        src: [audio],
        preload: true,
        html5: true,
      });
    }
    return howlsRef.current[audio];
  }, []);

  const playSide = useCallback(
    (
      index: number,
      side: "left" | "right",
      token = playlistTokenRef.current,
      { playlist = false }: { playlist?: boolean } = {},
    ) => {
      const comparison = comparisons[index];
      if (!comparison) return;

      const sideData = comparison[side];
      if (!sideData) return;

      Object.values(howlsRef.current).forEach((howl) => howl.stop());
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      const howl = getHowl(sideData.audio);
      howl.off("end");

      setState({ activeIndex: index, activeSide: side, status: "playing" });

      const id = howl.play();

      howl.once("end", () => {
        if (playlistTokenRef.current !== token) return;

        if (!playlist) {
          setState({ activeIndex: null, activeSide: null, status: "idle" });
          return;
        }

        // In playlist mode, play the other side of the same comparison
        const nextSide = side === "right" ? "left" : "right";
        const nextSideData = comparison[nextSide];

        if (nextSideData && playlistTokenRef.current === token) {
          // Play the other side
          timeoutRef.current = setTimeout(() => {
            if (playlistTokenRef.current !== token) return;
            const howl2 = getHowl(nextSideData.audio);
            howl2.off("end");
            setState({ activeIndex: index, activeSide: nextSide, status: "playing" });
            const id2 = howl2.play();
            howl2.once("end", () => {
              if (playlistTokenRef.current !== token) return;
              // Move to next comparison
              const nextIndex = index + 1;
              if (nextIndex < comparisons.length) {
                timeoutRef.current = setTimeout(() => {
                  playSide(nextIndex, "right", token, { playlist: true });
                }, 2000);
              } else {
                setState({ activeIndex: null, activeSide: null, status: "completed" });
              }
            });
          }, 2000);
        } else {
          const nextIndex = index + 1;
          if (nextIndex < comparisons.length) {
            timeoutRef.current = setTimeout(() => {
              playSide(nextIndex, "right", token, { playlist: true });
            }, 2000);
          } else {
            setState({ activeIndex: null, activeSide: null, status: "completed" });
          }
        }
      });
    },
    [comparisons, getHowl],
  );

  const handleSideClick = useCallback(
    (index: number, side: "left" | "right") => {
      playlistTokenRef.current += 1;
      playSide(index, side, playlistTokenRef.current, { playlist: false });
    },
    [playSide],
  );

  const handlePlayAll = useCallback(() => {
    if (state.status === "playing") {
      Object.values(howlsRef.current).forEach((howl) => howl.pause());
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setState((prev) => ({ ...prev, status: "paused" }));
      return;
    }

    playlistTokenRef.current += 1;
    const startIndex =
      state.status === "paused" && state.activeIndex !== null
        ? state.activeIndex
        : state.activeIndex ?? 0;
    playSide(startIndex, "right", playlistTokenRef.current, { playlist: true });
  }, [state.status, state.activeIndex, playSide]);

  const handleReplay = useCallback(() => {
    playlistTokenRef.current += 1;
    if (state.activeIndex !== null && state.activeSide !== null) {
      playSide(state.activeIndex, state.activeSide, playlistTokenRef.current, {
        playlist: state.status === "playing",
      });
    } else {
      playSide(0, "right", playlistTokenRef.current, {
        playlist: state.status === "playing",
      });
    }
  }, [state.activeIndex, state.activeSide, state.status, playSide]);

  return {
    ...state,
    stopAll,
    handleSideClick,
    handlePlayAll,
    handleReplay,
  };
}

// ─── Main Component ──────────────────────────────────────────────────────────

type LetterComparisonsProps = {
  comparisons: Comparison[];
};

export default function LetterComparisons({ comparisons }: LetterComparisonsProps) {
  const {
    activeIndex,
    activeSide,
    status,
    stopAll,
    handleSideClick,
    handlePlayAll,
    handleReplay,
  } = useComparisonPlayer({ comparisons });

  const isPlaying = status === "playing";
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-scroll to active card
  useEffect(() => {
    if (activeIndex === null || status !== "playing") return;
    const card = cardRefs.current[activeIndex];
    if (!card) return;
    card.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [activeIndex, status]);

  if (!comparisons || comparisons.length === 0) return null;

  return (
    <section className="relative mt-8 rounded-3xl border border-gray-200 bg-white/80 p-4 shadow-lg shadow-gray-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl dark:shadow-black/20 sm:p-6">
      {/* Glow effect */}
      <div className="pointer-events-none absolute inset-x-8 top-0 h-28 rounded-full bg-amber-400/10 blur-3xl dark:bg-amber-300/10" />

      <div className="relative flex flex-col gap-6">
        {/* Header */}
        <header>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 shadow-sm shadow-amber-100/70 dark:border-amber-300/20 dark:bg-white/10 dark:text-amber-200 dark:shadow-none">
            <AudioLines size={13} aria-hidden="true" />
            Сравнение букв
          </div>
          <p className="m-0 text-sm leading-6 text-gray-600 dark:text-slate-300 sm:text-base">
            Обратите внимание на различия в произношении букв. Нажмите на
            слово, чтобы прослушать его произношение.
          </p>
        </header>

        {/* Audio Pill */}
        <div className="sticky top-[69px] z-20 order-first flex justify-center">
          <AudioPill
            status={status}
            activeIndex={activeIndex}
            total={comparisons.length}
            isPlaying={isPlaying}
            onPlayAll={handlePlayAll}
            onReplay={handleReplay}
            onStop={() => stopAll()}
          />
        </div>

        {/* Comparison cards */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.025 } },
          }}
          className="flex flex-col gap-3 pb-24 sm:pb-0"
        >
          {comparisons.map((comparison, index) => {
            const isLeftActive = activeIndex === index && activeSide === "left";
            const isRightActive = activeIndex === index && activeSide === "right";
            const isCardActive = activeIndex === index;

            return (
              <motion.div
                key={`comparison-${comparison.id}`}
                ref={(element) => {
                  cardRefs.current[index] = element;
                }}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: { opacity: 1, y: 0 },
                }}
                className={[
                  "group relative flex w-full items-center justify-center overflow-hidden rounded-[18px] border px-4 py-4 sm:px-5",
                  "bg-white/82 shadow-sm shadow-gray-200/70 backdrop-blur transition-all duration-300",
                  "dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none",
                  isCardActive
                    ? "border-amber-300 ring-2 ring-amber-400/50 shadow-xl shadow-amber-500/20 dark:border-amber-300/40"
                    : "border-gray-200 hover:border-amber-300/60 hover:bg-amber-50/50 hover:shadow-lg hover:shadow-amber-500/10 dark:hover:border-amber-300/30 dark:hover:bg-white/[0.075]",
                ].join(" ")}
              >
                {/* Background gradient */}
                <span
                  className={[
                    "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300",
                    "bg-gradient-to-br from-amber-400/12 via-transparent to-yellow-300/10",
                    isCardActive ? "opacity-100" : "group-hover:opacity-100",
                  ].join(" ")}
                />

                {/* Pulse border for active card */}
                {isCardActive && (
                  <motion.span
                    className="pointer-events-none absolute inset-0 rounded-[18px] border border-amber-300/70"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  />
                )}

                {/* Left side */}
                <div className="relative flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSideClick(index, "left");
                    }}
                    className={[
                      "arab tracking-normal whitespace-nowrap rounded-xl px-2 py-1 transition-all duration-200",
                      isLeftActive && isPlaying
                        ? "bg-amber-500/15 text-amber-700 shadow-inner ring-1 ring-amber-400/40 dark:text-amber-300"
                        : "hover:bg-amber-50 hover:shadow-sm dark:hover:bg-white/[0.08]",
                    ].join(" ")}
                    style={{
                      fontSize: "clamp(2.8rem, 5.4vw, 3.0rem)",
                      lineHeight: 1.25,
                    }}
                    aria-label="Прослушать левое слово"
                  >
                    {renderComparisonText(comparison.left.segments)}
                  </button>
                </div>

                {/* Separator */}
                <span className="relative mx-3 shrink-0 text-gray-400 dark:text-slate-500 sm:mx-4">
                  —
                </span>

                {/* Right side */}
                <div className="relative flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSideClick(index, "right");
                    }}
                    className={[
                      "arab tracking-normal whitespace-nowrap rounded-xl px-2 py-1 transition-all duration-200",
                      isRightActive && isPlaying
                        ? "bg-amber-500/15 text-amber-700 shadow-inner ring-1 ring-amber-400/40 dark:text-amber-300"
                        : "hover:bg-amber-50 hover:shadow-sm dark:hover:bg-white/[0.08]",
                    ].join(" ")}
                    style={{
                      fontSize: "clamp(2.8rem, 5.4vw, 3.0rem)",
                      lineHeight: 1.25,
                    }}
                    aria-label="Прослушать правое слово"
                  >
                    {renderComparisonText(comparison.right.segments)}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
