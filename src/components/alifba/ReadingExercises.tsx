import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Pause,
  Play,
  RotateCcw,
  Snail,
  Square,
  Volume2,
  AudioLines,
} from "lucide-react";
import exercisesData from "@/content/lessons/quran/muallim-sani/exercises.json";
import { FORM_THEME, type FormName } from "./formTheme";
import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { Howl } from "howler";
import { useAudioPlayer } from "./useAudioPlayer";
import LetterComparisons from "./LetterComparisons";
import type { Comparison } from "./LetterComparisons";

type ExerciseSegment = {
  text: string;
  form?: FormName;
};

type Exercise = {
  id: number;
  audio: string;
  segments: ExerciseSegment[];
};

type ExerciseLesson = {
  lessonOrder: number;
  char: string;
  name: string;
  arabName: string;
  audioChar?: string;
  exercises: Exercise[];
};

type ReadingExercisesData = {
  title?: string;
  lessons: ExerciseLesson[];
};

type FlatExercise = Exercise & {
  lessonOrder: number;
  lessonName: string;
  lessonChar: string;
  arabName: string;
  globalIndex: number;
};

type PlaybackStatus = "idle" | "playing" | "paused" | "completed";

type Props = {
  lessonOrder?: number;
};

const LEGEND: { form: FormName; label: string }[] = [
  { form: "isolated", label: "Отдельная форма" },
  { form: "final", label: "Конечная форма" },
  { form: "middle", label: "Серединная форма" },
  { form: "initial", label: "Начальная форма" },
];

const SEQUENCE_GAP_MS = 2000; // 2 секунды паузы между упражнениями в плейлисте
const NORMAL_RATE = 1;
const SLOW_RATE = 0.75;

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
          className="w-[3px] rounded-full bg-cyan-400"
        />
      ))}
    </div>
  );
}

function normalizeForm(segment: ExerciseSegment): FormName | undefined {
  return segment.form;
}

function normalizeArabicMarks(text: string) {
  return text.replace(/\u0652/g, "\u06e1");
}

const ARABIC_MARKS_RE = /[\u064b-\u065f\u0670\u06d6-\u06ed]/g;
const RIGHT_JOINING_ONLY = new Set([
  "ا",
  "أ",
  "إ",
  "آ",
  "ٱ",
  "د",
  "ذ",
  "ر",
  "ز",
  "و",
  "ؤ",
  "ء",
  "ة",
  "ى",
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

function flattenLessons(lessons: ExerciseLesson[]): FlatExercise[] {
  return lessons.flatMap((lesson) =>
    lesson.exercises.map((exercise) => ({
      ...exercise,
      lessonOrder: lesson.lessonOrder,
      lessonName: lesson.name,
      lessonChar: lesson.char,
      arabName: lesson.arabName,
      globalIndex: 0,
    })),
  ).map((exercise, globalIndex) => ({ ...exercise, globalIndex }));
}

function renderExerciseText(exercise: Exercise) {
  return exercise.segments.map((segment, index) => {
    const form = normalizeForm(segment);
    const previousSegment = exercise.segments[index - 1];
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
  });
}

function formatCounter(index: number | null, total: number) {
  if (index === null) return `0 / ${total}`;
  return `${index + 1} / ${total}`;
}

export default function ReadingExercises({ lessonOrder }: Props) {
  const data = exercisesData as ReadingExercisesData;
  const selectedLesson = useMemo(
    () =>
      typeof lessonOrder === "number"
        ? data.lessons.find((lesson) => lesson.lessonOrder === lessonOrder)
        : undefined,
    [data.lessons, lessonOrder],
  );
  const visibleLessons = useMemo(
    () => (selectedLesson ? [selectedLesson] : data.lessons),
    [data.lessons, selectedLesson],
  );
  const exercises = useMemo(() => flattenLessons(visibleLessons), [visibleLessons]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<PlaybackStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [slowMode, setSlowMode] = useState(false);
  const howlsRef = useRef<Record<string, Howl>>({});
  const playlistTokenRef = useRef(0);
  const currentHowlIdRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    // ВАЖНО: preload: false — в уроках части 2 до ~300 карточек;
    // одновременная преподгрузка сотен html5-audio открывает шторм
    // аудио-сессий WASAPI и роняет аудио-движок Windows (мониторы с
    // HDMI-звуком переинициализируются и «моргают»). Загрузка каждого
    // файла идёт лениво при первом воспроизведении.
    exercises.forEach((exercise) => {
      if (!howlsRef.current[exercise.audio]) {
        howlsRef.current[exercise.audio] = new Howl({
          src: [exercise.audio],
          preload: false,
          html5: true,
        });
      }
    });

    return () => {
      Object.values(howlsRef.current).forEach((howl) => howl.unload());
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [exercises]);

  useEffect(() => {
    Object.values(howlsRef.current).forEach((howl) => {
      howl.rate(slowMode ? SLOW_RATE : NORMAL_RATE);
    });
  }, [slowMode]);

  useEffect(() => {
    if (activeIndex === null) {
      setProgress(status === "completed" ? 100 : 0);
      return;
    }
    setProgress(((activeIndex + 1) / exercises.length) * 100);
  }, [activeIndex, exercises.length, status]);

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

  const stopAll = ({ markCompleted = false } = {}) => {
    playlistTokenRef.current += 1;
    Object.values(howlsRef.current).forEach((howl) => howl.stop());
    currentHowlIdRef.current = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveIndex(null);
    setStatus(markCompleted ? "completed" : "idle");
  };

  const getHowl = (audio: string) => {
    if (!howlsRef.current[audio]) {
      howlsRef.current[audio] = new Howl({
        src: [audio],
        preload: true,
        html5: true,
        rate: slowMode ? SLOW_RATE : NORMAL_RATE,
      });
    }
    return howlsRef.current[audio];
  };

  const playAt = (
    index: number,
    token = playlistTokenRef.current,
    { playlist = false }: { playlist?: boolean } = {},
  ) => {
    const exercise = exercises[index];
    if (!exercise) return;

    Object.values(howlsRef.current).forEach((howl) => howl.stop());
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const howl = getHowl(exercise.audio);
    howl.off("end");
    howl.rate(slowMode ? SLOW_RATE : NORMAL_RATE);

    setActiveIndex(index);
    setStatus("playing");

    const id = howl.play();
    currentHowlIdRef.current = id;

    howl.once("end", () => {
      if (currentHowlIdRef.current === id) {
        currentHowlIdRef.current = null;
      }

      if (playlistTokenRef.current !== token) return;

      if (!playlist) {
        setActiveIndex(null);
        setStatus("idle");
        return;
      }

      const nextIndex = index + 1;
      if (nextIndex < exercises.length) {
        timeoutRef.current = setTimeout(
          () => playAt(nextIndex, token, { playlist: true }),
          SEQUENCE_GAP_MS,
        );
      } else {
        setActiveIndex(null);
        setStatus("completed");
      }
    });
  };

  const handleCardClick = (index: number) => {
    playlistTokenRef.current += 1;
    playAt(index, playlistTokenRef.current, { playlist: false });
  };

  const handlePlayAll = () => {
    if (status === "playing") {
      Object.values(howlsRef.current).forEach((howl) => howl.pause());
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setStatus("paused");
      return;
    }

    playlistTokenRef.current += 1;
    const startIndex =
      status === "paused" && activeIndex !== null ? activeIndex : activeIndex ?? 0;
    playAt(startIndex, playlistTokenRef.current, { playlist: true });
  };

  const handleReplay = () => {
    playlistTokenRef.current += 1;
    playAt(activeIndex ?? 0, playlistTokenRef.current, {
      playlist: status === "playing",
    });
  };

  const activeExercise = activeIndex !== null ? exercises[activeIndex] : null;
  const isPlaying = status === "playing";
  const totalLessons = visibleLessons.length;

  if (typeof lessonOrder === "number" && !selectedLesson) {
    return null;
  }

  return (
    <>
      {/* ВАЖНО: без backdrop-blur — в уроках части 2 секция высотой в тысячи
          пикселей, размытие подложки такой площади пересчитывается на GPU
          каждый кадр и роняет драйвер на картах с малым объёмом VRAM. */}
      <section className="relative rounded-3xl border border-gray-200 bg-white p-4 shadow-lg shadow-gray-200/60 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl dark:shadow-black/20 sm:p-6">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-28 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-300/10" />

      <div className="relative flex flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            {/* <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
              Muallim Sani
            </p> */}
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 shadow-sm shadow-cyan-100/70 dark:border-cyan-300/20 dark:bg-white/10 dark:text-cyan-200 dark:shadow-none">
              < AudioLines size={13} aria-hidden="true" />
              Упражнения
            </div>
            {/* <h2 className="m-0 border-0 p-0 text-3xl font-bold text-gray-950 dark:text-white sm:text-4xl">
              {selectedLesson
                ? `Упражнения чтения: ${selectedLesson.char}`
                : data.title || "Упражнения"}
            </h2> */}
            {/* {selectedLesson && (
              <div className="mt-2 flex items-center gap-3">
                <span className="arab text-4xl leading-none text-gray-950 dark:text-[#e8e1d8]">
                  {selectedLesson.char}
                </span>
                <span className="arab text-xl text-gray-500 dark:text-slate-400">
                  {selectedLesson.arabName}
                </span>
              </div>
            )} */}
            {/* <p className="mt-3 max-w-3xl text-left text-sm leading-6 text-gray-600 dark:text-slate-300 sm:text-base">
              Нажмите на карточку, чтобы услышать чтение, или запустите весь набор
              упражнений как плейлист с автоматическим переходом.
            </p> */}
          </div>

          {/* <div className="grid grid-cols-3 gap-2 rounded-2xl border border-gray-200 bg-white/70 p-2 text-center shadow-sm shadow-gray-200/50 backdrop-blur dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none">
            <div className="px-3 py-2">
              <div className="text-lg font-bold text-gray-950 dark:text-white">
                {totalLessons}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-slate-400">букв</div>
            </div>
            <div className="border-x border-gray-200 px-3 py-2 dark:border-white/10">
              <div className="text-lg font-bold text-gray-950 dark:text-white">
                {exercises.length}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-slate-400">
                карточек
              </div>
            </div>
            <div className="px-3 py-2">
              <div className="text-lg font-bold text-gray-950 dark:text-white">
                {Math.round(progress)}%
              </div>
              <div className="text-[11px] text-gray-500 dark:text-slate-400">
                прогресс
              </div>
            </div>
          </div> */}
        </header>

<>
  {/* DESKTOP */}
  <div className="hidden flex-wrap gap-2 sm:flex">
    {LEGEND.map((item) => (
      <span
        key={item.form}
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/75 px-3 py-2 text-xs font-medium text-gray-700 shadow-sm shadow-gray-200/50 backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:shadow-none"
      >
        <span
          className={`h-2.5 w-2.5 rounded-full shadow-lg ${FORM_THEME[item.form].dot}`}
        />
        {item.label}
      </span>
    ))}
  </div>

  {/* MOBILE */}
  <div className="sm:hidden">
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button
        className="
          inline-flex items-center gap-2 rounded-full
          border border-gray-200 bg-white/75
          px-3 py-2 text-xs font-medium
          text-gray-700 shadow-sm shadow-gray-200/50
          backdrop-blur transition
          dark:border-white/10 dark:bg-white/[0.06]
          dark:text-slate-200 dark:shadow-none
        "
      >
        <div className="flex items-center gap-1">
          {LEGEND.map((item) => (
            <span
              key={item.form}
              className={`h-2.5 w-2.5 rounded-full ${FORM_THEME[item.form].dot}`}
            />
          ))}
        </div>

        Формы букв
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition duration-100 ease-out"
        enterFrom="scale-95 opacity-0"
        enterTo="scale-100 opacity-100"
        leave="transition duration-75 ease-in"
        leaveFrom="scale-100 opacity-100"
        leaveTo="scale-95 opacity-0"
      >
        <Menu.Items
          className="
            absolute left-0 z-30 mt-2 w-60 origin-top-left
            rounded-2xl border border-gray-200
            bg-white/95 p-2 shadow-2xl backdrop-blur-xl
            dark:border-white/10 dark:bg-slate-900/95
          "
        >
          <div className="flex flex-col gap-1">
            {LEGEND.map((item) => (
              <div
                key={item.form}
                className="
                  flex items-center gap-2 rounded-xl
                  px-3 py-2 text-sm
                  text-gray-700
                  dark:text-slate-200
                "
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full shadow-lg ${FORM_THEME[item.form].dot}`}
                />

                {item.label}
              </div>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  </div>
</>

        <div className="sticky top-[69px] z-20 order-first flex justify-center">
          <div
            className={[
              "group relative flex w-full max-w-[720px] items-center gap-2 overflow-hidden rounded-full",
              "border border-white/10 bg-white/80 p-2 text-left backdrop-blur-xl",
              "shadow-xl shadow-cyan-500/10 ring-1 ring-gray-200/70 transition-all duration-300",
              "dark:bg-slate-950/75 dark:text-white dark:ring-white/10",
              isPlaying ? "shadow-cyan-400/25 ring-2 ring-cyan-400/40" : "",
            ].join(" ")}
          >
            <span
              className={[
                "absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-sky-400/5 to-emerald-300/10 opacity-0 transition-opacity duration-300",
                isPlaying ? "animate-pulse opacity-100" : "group-hover:opacity-100",
              ].join(" ")}
            />

            <button
              type="button"
              onClick={handlePlayAll}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-500 dark:bg-cyan-400 dark:text-slate-950"
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
                      ? "Упражнение завершено"
                      : activeExercise
                        ? `${activeExercise.lessonName} `
                        : "Прослушайте упражнение"}
                  </p>
                  <p className="m-0 truncate text-left text-[12px] leading-4 text-gray-500 dark:text-slate-400">
                    {formatCounter(activeIndex, exercises.length)}
                    {slowMode ? " • медленно 0.75x" : " • обычная скорость"}
                  </p>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  {isPlaying && <AudioWave />}
                  <Volume2 size={18} className="text-gray-400" aria-hidden="true" />
                </div>
              </div>

              <span className="mt-2 block h-1 overflow-hidden rounded-full bg-gray-200/80 dark:bg-white/15">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-300 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </span>
            </div>

            <div className="relative flex shrink-0 items-center gap-1 border-l border-gray-200 pl-2 dark:border-white/10">
              <button
                type="button"
                onClick={handleReplay}
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 hover:text-cyan-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-cyan-300"
                aria-label="Повторить"
              >
                <RotateCcw size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => stopAll()}
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 hover:text-rose-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-rose-300"
                aria-label="Остановить"
              >
                <Square size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setSlowMode((value) => !value)}
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-full transition",
                  slowMode
                    ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20 dark:bg-cyan-400 dark:text-slate-950"
                    : "text-gray-600 hover:bg-gray-100 hover:text-cyan-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-cyan-300",
                ].join(" ")}
                aria-label="Медленный режим 0.75x"
                aria-pressed={slowMode}
              >
                <Snail size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* <AnimatePresence>
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
              Упражнение завершено
            </motion.div>
          )}
        </AnimatePresence> */}

        <div
          dir="rtl"
          className="grid grid-cols-1 gap-3 pb-24 sm:grid-cols-2 sm:pb-0 lg:grid-cols-3 xl:grid-cols-4"
        >
          {exercises.map((exercise, index) => {
            const isActive = activeIndex === index;

            return (
              // ВАЖНО: обычный button + CSS-эффекты вместо motion.button —
              // framer вешал will-change: transform на каждую из ~300 карточек,
              // создавая сотни постоянных GPU-слоёв (переполнение VRAM, TDR).
              // Также без backdrop-blur и полупрозрачности по той же причине.
              <button
                key={`${exercise.lessonOrder}-${exercise.id}-${exercise.audio}`}
                ref={(element) => {
                  cardRefs.current[index] = element;
                }}
                type="button"
                onClick={() => handleCardClick(index)}
                className={[
                  "group relative flex min-h-[132px] items-center justify-center overflow-hidden rounded-[18px] border p-4 text-center",
                  "bg-white shadow-sm shadow-gray-200/70 transition-all duration-300",
                  "hover:-translate-y-1 hover:border-cyan-300/60 hover:bg-cyan-50/50 hover:shadow-lg hover:shadow-cyan-500/10 active:translate-y-0 active:scale-[0.985]",
                  "dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none dark:hover:border-cyan-300/30 dark:hover:bg-white/[0.075]",
                  isActive
                    ? "scale-[1.025] border-cyan-300 ring-2 ring-cyan-400/50 shadow-xl shadow-cyan-500/20 dark:border-cyan-300/40"
                    : "border-gray-200",
                ].join(" ")}
              >
                <span
                  className={[
                    "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300",
                    "bg-gradient-to-br from-cyan-400/12 via-transparent to-emerald-300/10",
                    isActive ? "opacity-100" : "group-hover:opacity-100",
                  ].join(" ")}
                />

                {isActive && (
                  <motion.span
                    className="pointer-events-none absolute inset-0 rounded-[18px] border border-cyan-300/70"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  />
                )}

                <span
                  className="arab relative block text-center tracking-normal"
                  style={{
                    fontSize: "clamp(2.8rem, 5.4vw, 3.0rem)",
                    lineHeight: 1.25,
                  }}
                >
                  {renderExerciseText(exercise)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>

    {selectedLesson && (selectedLesson as any).comparisons && (
      <LetterComparisons
        comparisons={(selectedLesson as any).comparisons as Comparison[]}
      />
    )}
  </>
);
}
