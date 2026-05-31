import React, { useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  Volume2,
  AudioLines,
  Check,
} from "lucide-react";
import { FORM_THEME, type FormName } from "./formTheme";
import { useAudioPlayer, type PlaybackStatus } from "./useAudioPlayer";

// ─── Types ───────────────────────────────────────────────────────────────────

type ComparisonSegment = {
  text: string;
  form?: FormName;
};

type Comparison = {
  id: number;
  audio: string;
  left: ComparisonSegment[];
  right: ComparisonSegment[];
};

export type { Comparison, ComparisonSegment };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeArabicMarks(text: string) {
  return text.replace(/\u0652/g, "\u06e1");
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
    <span className="arab inline">
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
              "inline",
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
            {normalizeArabicMarks(segment.text)}
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
  status: PlaybackStatus;
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
              {status === "completed"
                ? "Сравнение завершено"
                : "Прослушать все сравнения"}
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

// ─── Main Component ──────────────────────────────────────────────────────────

type LetterComparisonsProps = {
  comparisons: Comparison[];
};

export default function LetterComparisons({ comparisons }: LetterComparisonsProps) {
  const audioItems = useMemo(() => comparisons, [comparisons]);
  const {
    activeIndex,
    status,
    stopAll,
    handleCardClick,
    handlePlayAll,
    handleReplay,
  } = useAudioPlayer({ items: audioItems });

  const isPlaying = status === "playing";
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

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
            Обратите внимание на различия в произношении букв.
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

        {/* Completed banner */}
        <AnimatePresence>
          {status === "completed" && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/60 bg-emerald-50/80 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg shadow-emerald-500/10 backdrop-blur dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-200"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                <Check size={17} aria-hidden="true" />
              </span>
              Сравнение завершено
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comparison cards — horizontal layout, one per row */}
        <motion.div
          dir="rtl"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.025 } },
          }}
          className="flex flex-col gap-3 pb-24 sm:pb-0"
        >
          {comparisons.map((comparison, index) => {
            const isActive = activeIndex === index;

            return (
              <motion.button
                key={`comparison-${comparison.id}-${comparison.audio}`}
                ref={(element) => {
                  cardRefs.current[index] = element;
                }}
                type="button"
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: { opacity: 1, y: 0 },
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleCardClick(index)}
                className={[
                  "group relative flex w-full items-center justify-center overflow-hidden rounded-[18px] border px-5 py-4",
                  "bg-white/82 shadow-sm shadow-gray-200/70 backdrop-blur transition-all duration-300",
                  "hover:border-amber-300/60 hover:bg-amber-50/50 hover:shadow-lg hover:shadow-amber-500/10",
                  "dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none dark:hover:border-amber-300/30 dark:hover:bg-white/[0.075]",
                  isActive
                    ? "border-amber-300 ring-2 ring-amber-400/50 shadow-xl shadow-amber-500/20 dark:border-amber-300/40"
                    : "border-gray-200",
                ].join(" ")}
              >
                {/* Background gradient */}
                <span
                  className={[
                    "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300",
                    "bg-gradient-to-br from-amber-400/12 via-transparent to-yellow-300/10",
                    isActive ? "opacity-100" : "group-hover:opacity-100",
                  ].join(" ")}
                />

                {/* Pulse border for active card */}
                {isActive && (
                  <motion.span
                    className="pointer-events-none absolute inset-0 rounded-[18px] border border-amber-300/70"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  />
                )}

                {/* Comparison text: left — right, single line */}
                <span
                  className="arab relative inline-block tracking-normal whitespace-nowrap"
                  style={{
                    fontSize: "clamp(2.8rem, 5.4vw, 3.0rem)",
                    lineHeight: 1.25,
                  }}
                >
                  {renderComparisonText(comparison.left)}
                  <span className="mx-4 text-gray-400 dark:text-slate-500">
                    —
                  </span>
                  {renderComparisonText(comparison.right)}
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
