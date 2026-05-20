// src/components/alifba/LetterIntroCombined.tsx
// Объединяет letter-intro, pronunciation-grid и makhraj в один блок

import { motion } from "framer-motion";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Letter = {
  name: string;
  arabic: string;
  arabname?: string;
  audio?: string;
  image?: string;
};

type PronunciationItem = {
  arabic: string;
  transcription: string;
  color?: string;
  audio?: string;
};

type Props = {
  title: string;
  description?: string;
  letters: Letter[];
  pronunciationItems?: PronunciationItem[];
  pronunciationAudio?: string;
  makhrajImage?: string;
  makhrajDescription?: string;
};

const arabicFont = "'AmiriLocal', 'Scheherazade New', 'Amiri', serif";
type AudioStatus = "idle" | "playing" | "paused" | "ended";

function AudioWave() {
  return (
    <div className="flex h-4 items-end gap-[3px]" aria-hidden="true">
      <span className="h-2 w-[3px] animate-pulse rounded-full bg-cyan-400" />
      <span className="h-4 w-[3px] animate-pulse rounded-full bg-cyan-400 delay-75" />
      <span className="h-3 w-[3px] animate-pulse rounded-full bg-cyan-400 delay-150" />
      <span className="h-4 w-[3px] animate-pulse rounded-full bg-cyan-400 delay-200" />
      <span className="h-2 w-[3px] animate-pulse rounded-full bg-cyan-400 delay-100" />
    </div>
  );
}

type AudioPillProps = {
  status: AudioStatus;
  progress: number;
  letterName: string;
  onToggle: () => void;
};

function AudioPill({
  status,
  progress,
  letterName,
  onToggle,
}: AudioPillProps) {
  const isPlaying = status === "playing";
  const isEnded = status === "ended";
  const Icon = isEnded ? RotateCcw : isPlaying ? Pause : Play;
  const title = `${letterName} • Огласовки`;
  const label = isEnded
    ? `Повторить ${title}`
    : isPlaying
      ? `Пауза ${title}`
      : `Воспроизвести ${title}`;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className={[
        "group relative inline-flex w-full max-w-[360px] items-center gap-3 overflow-hidden rounded-full",
        "border border-white/10 bg-white/70 px-3.5 py-3 text-left backdrop-blur-xl",
        "shadow-lg shadow-cyan-500/10 transition-all duration-300 hover:scale-[1.02]",
        "hover:border-cyan-300/40 hover:shadow-cyan-500/20",
        "dark:bg-white/10 dark:text-white",
        isPlaying
          ? "scale-[1.02] ring-2 ring-cyan-400/40 shadow-cyan-400/30"
          : "ring-1 ring-gray-200/70 dark:ring-white/5",
      ].join(" ")}
    >
      <span
        className={[
          "absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-sky-400/5 to-emerald-300/10 opacity-0 transition-opacity duration-300",
          isPlaying ? "animate-pulse opacity-100" : "group-hover:opacity-100",
        ].join(" ")}
      />

      <span
        className={[
          "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-300",
          "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20",
          "dark:bg-cyan-400 dark:text-slate-950",
          isPlaying ? "shadow-cyan-400/40" : "group-hover:bg-cyan-500",
        ].join(" ")}
      >
        <Icon
          size={20}
          className={isEnded ? "" : "translate-x-[1px]"}
          aria-hidden="true"
        />
      </span>

      <span className="relative min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="truncate text-sm font-semibold text-gray-950 dark:text-white sm:text-base">
            {title}
          </span>
          {isPlaying && <AudioWave />}
        </span>

        <span className="mt-2 block h-1 overflow-hidden rounded-full bg-gray-200/80 dark:bg-white/15">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-300 transition-all duration-300"
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </span>
      </span>
    </button>
  );
}

function activeCardClass(isActive: boolean): string {
  return isActive
    ? "ring-2 ring-cyan-400 scale-[1.03] shadow-lg shadow-cyan-500/20"
    : "";
}

export default function LetterIntroCombined({
  title,
  description,
  letters,
  pronunciationItems,
  makhrajImage,
  makhrajDescription,
}: Props) {
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const sequenceTokenRef = useRef(0);
  const [activeAudio, setActiveAudio] = useState<string | null>(null);
  const [pillStatus, setPillStatus] = useState<AudioStatus>("idle");
  const [pillProgress, setPillProgress] = useState(0);

  // Предзагрузка всех аудио при монтировании
  useEffect(() => {
    const allSrcs: string[] = [];

    letters.forEach((l) => {
      if (l.audio) allSrcs.push(l.audio);
    });

    pronunciationItems?.forEach((item) => {
      if (item.audio) allSrcs.push(item.audio);
    });

    const uniqueSrcs = [...new Set(allSrcs)];

    uniqueSrcs.forEach((src) => {
      const audio = new Audio();
      audio.preload = "auto";
      audio.src = src;
      audio.load();
      audioRefs.current[src] = audio;
    });

    return () => {
      Object.values(audioRefs.current).forEach((audio) => audio?.pause());
    };
  }, [letters, pronunciationItems]);

  const stopAllAudio = ({
    except,
    resetPill = true,
  }: {
    except?: string;
    resetPill?: boolean;
  } = {}) => {
    Object.entries(audioRefs.current).forEach(([src, audio]) => {
      if (audio) {
        if (src === except) return;
        audio.pause();
        audio.currentTime = 0;
      }
    });
    setActiveAudio(null);
    if (resetPill) {
      sequenceTokenRef.current += 1;
      setPillStatus("idle");
      setPillProgress(0);
    }
  };

  const ensureAudio = (src: string) => {
    if (!audioRefs.current[src]) {
      audioRefs.current[src] = new Audio(src);
    }

    return audioRefs.current[src]!;
  };

  const playSingle = (src: string): Promise<void> => {
    return new Promise((resolve) => {
      stopAllAudio();

      const audio = ensureAudio(src);
      audio.onended = () => {
        setActiveAudio(null);
        resolve();
      };
      audio.play();
      setActiveAudio(src);
    });
  };

  const playAudio = async (src?: string) => {
    if (!src) return;

    // Если кликнули по той же карточке — останавливаем
    if (activeAudio === src) {
      stopAllAudio();
      setActiveAudio(null);
      return;
    }

    await playSingle(src);
  };

  const SEQUENCE_GAP_MS = 800;

  const playSequence = async (srcList: string[], startIndex = 0) => {
    const playable = srcList.filter(Boolean);
    if (playable.length === 0) return;

    sequenceTokenRef.current += 1;
    const token = sequenceTokenRef.current;
    stopAllAudio({ resetPill: false });
    setPillStatus("playing");

    for (let index = startIndex; index < playable.length; index += 1) {
      const src = playable[index];
      if (!src) continue;
      const audio = ensureAudio(src);

      audio.ontimeupdate = () => {
        if (sequenceTokenRef.current !== token) return;
        const duration = audio.duration || 0;
        const itemProgress = duration ? audio.currentTime / duration : 0;
        setPillProgress(((index + itemProgress) / playable.length) * 100);
      };
      audio.onended = null;

      setActiveAudio(src);
      const ended = new Promise<void>((resolve) => {
        const intervalId = window.setInterval(() => {
          if (sequenceTokenRef.current !== token) {
            window.clearInterval(intervalId);
            resolve();
          }
        }, 100);

        audio.onended = () => {
          window.clearInterval(intervalId);
          resolve();
        };
      });

      try {
        await audio.play();
      } catch {
        if (sequenceTokenRef.current === token) {
          setPillStatus("idle");
          setPillProgress(0);
          setActiveAudio(null);
        }
        return;
      }

      await ended;

      if (sequenceTokenRef.current !== token) return;
      setPillProgress(((index + 1) / playable.length) * 100);
      await new Promise((r) => setTimeout(r, SEQUENCE_GAP_MS));
    }

    if (sequenceTokenRef.current === token) {
      setPillStatus("ended");
      setPillProgress(100);
      setActiveAudio(null);
    }
  };

  const handleAudioPillToggle = async () => {
    const srcList =
      pronunciationItems
        ?.map((item) => item.audio)
        .filter(Boolean)
        .reverse() as string[];
    if (!srcList || srcList.length === 0) return;

    if (pillStatus === "playing") {
      Object.values(audioRefs.current).forEach((audio) => audio?.pause());
      setPillStatus("paused");
      return;
    }

    if (pillStatus === "paused" && activeAudio) {
      const audio = ensureAudio(activeAudio);
      setPillStatus("playing");
      setActiveAudio(activeAudio);
      try {
        await audio.play();
      } catch {
        setPillStatus("idle");
        setPillProgress(0);
        setActiveAudio(null);
      }
      return;
    }

    const startIndex = pillStatus === "ended" ? 0 : 0;
    setPillProgress(0);
    await playSequence(srcList, startIndex);
  };

  const baseCardClass =
    "relative z-[1] flex cursor-pointer flex-col items-center justify-between rounded-[18px] border border-gray-200 bg-white text-center shadow-sm shadow-gray-200/70 transition-all duration-300 hover:border-cyan-200 hover:bg-cyan-50/50 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none dark:hover:border-white/15 dark:hover:bg-white/[0.08]";

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-200/60 dark:border-white/10 dark:bg-white/5 dark:shadow-2xl dark:shadow-black/20">
      {/* Заголовок */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-950 dark:text-white">{title}</h2>
      </div>

      {/* Grid: буквы + махрадж, описание на всю ширину */}
      <div className="grid min-h-[360px] gap-10 md:grid-cols-2 lg:grid-cols-[2fr_1fr]">
        {/* Левая часть: буквы + огласовки */}
        <div>
          <div className="flex flex-col gap-[18px]">
            {(letters.length > 0 ||
              (pronunciationItems && pronunciationItems.length > 0)) && (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-[minmax(140px,1fr)_minmax(0,3fr)]">
                {letters.length > 0 && (
                  <div className="contents lg:grid lg:auto-rows-fr lg:gap-4">
                    {letters.map((letter, index) => {
                      const isActive =
                        activeAudio === letter.audio && pillStatus !== "paused";
                      return (
                        <motion.div
                          key={index}
                          whileHover={{ y: -2 }}
                          className={`${baseCardClass} ${activeCardClass(isActive)} px-3 pb-4 pt-[18px]`}
                          onClick={() => playAudio(letter.audio)}
                          role="button"
                          tabIndex={0}
                        >
                          <span
                            className="mb-1.5 block py-2.5 text-[56px] font-normal leading-[1.1] text-gray-900 dark:text-[#e8e1d8]"
                            style={{ fontFamily: arabicFont }}
                          >
                            {letter.arabic}
                          </span>
                          <p className="m-0 text-base font-semibold text-gray-900 dark:text-white">
                            {letter.name}
                          </p>
                          {letter.arabname && (
                            <p className="arab mb-0 mt-1.5 text-sm text-gray-500 dark:text-[#b0b0b0]">
                              {letter.arabname}
                            </p>
                          )}
                          <div className="mt-2 flex h-4 justify-center">
                            <span
                              className={
                                isActive
                                  ? "opacity-100 transition-opacity duration-300"
                                  : "opacity-0 transition-opacity duration-300"
                              }
                            >
                              <AudioWave />
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {pronunciationItems && pronunciationItems.length > 0 && (
                  <div className="contents lg:flex lg:flex-col lg:items-center lg:gap-4">
                    <div className="contents lg:grid lg:w-full lg:auto-rows-fr lg:grid-cols-3 lg:gap-4">
                      {pronunciationItems.map((item, index) => {
                        const isActive =
                          activeAudio === item.audio && pillStatus !== "paused";
                        return (
                          <motion.div
                            key={`pron-${index}`}
                            whileHover={{ y: -2 }}
                            className={`${baseCardClass} ${activeCardClass(isActive)} px-2.5 py-3.5`}
                            onClick={() => playAudio(item.audio)}
                            role="button"
                            tabIndex={0}
                          >
                            <span
                              className="mb-1.5 block py-3.5 text-[56px] font-normal leading-[1.3] text-gray-900 dark:brightness-150"
                              style={{
                                fontFamily: arabicFont,
                                color: item.color,
                              }}
                            >
                              {item.arabic}
                            </span>
                            <p className="m-0 whitespace-nowrap text-lg font-normal text-gray-600 transition-colors duration-300 group-hover:text-gray-900 dark:text-[#cdcdcd] dark:group-hover:text-[#ebebeb]">
                              [{item.transcription}]
                            </p>
                            <div className="mt-2 flex h-4 justify-center">
                              <span
                                className={
                                  isActive
                                    ? "opacity-100 transition-opacity duration-300"
                                    : "opacity-0 transition-opacity duration-300"
                                }
                              >
                                <AudioWave />
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    <div className="col-span-2 flex justify-center lg:col-span-auto">
                      <AudioPill
                        status={pillStatus}
                        progress={pillProgress}
                        letterName={letters[0]?.name || title}
                        onToggle={handleAudioPillToggle}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Описание */}
          {description && (
            <div className="mt-5 text-xl font-normal leading-snug text-gray-700 max-sm:text-lg dark:text-slate-200">
              <p className="m-0">{description}</p>
            </div>
          )}
        </div>

        {/* Правая часть: махрадж */}
        {makhrajImage && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-[500px] transition duration-500 max-md:order-last"
          >
            <div>
              <img
                src={makhrajImage}
                alt="Махрадж буквы"
                className="h-auto w-full rounded-[10px] border-2 border-[#353535]/50 bg-white"
              />
            </div>
            {makhrajDescription && (
              <span className="block w-full p-2.5 text-center text-[22px] font-normal leading-[1.3] text-gray-800 dark:text-slate-200">
                {makhrajDescription}
              </span>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}
