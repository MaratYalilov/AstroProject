// src/components/alifba/AlphabetGrid.tsx
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Volume2 } from "lucide-react";
import { Howl } from "howler";

interface AlphabetLetter {
  char: string;
  name: string;
  arabName: string;
  audio: string;
}

const ALPHABET_DATA: AlphabetLetter[] = [
  { char: "أ", name: "әлиф", arabName: "أَلِف", audio: "/media/quran/muallim-sani/audio/alifba/01_alif.mp3" },
  { char: "ب", name: "бә", arabName: "بَاء", audio: "/media/quran/muallim-sani/audio/alifba/02_ba.mp3" },
  { char: "ت", name: "тә", arabName: "تَاء", audio: "/media/quran/muallim-sani/audio/alifba/03_ta.mp3" },
  { char: "ث", name: "ҫә", arabName: "ثَاء", audio: "/media/quran/muallim-sani/audio/alifba/04_sa.mp3" },
  { char: "ج", name: "дҗим", arabName: "جِيم", audio: "/media/quran/muallim-sani/audio/alifba/05_jim.mp3" },
  { char: "ح", name: "хә", arabName: "حَاء", audio: "/media/quran/muallim-sani/audio/alifba/06_ha.mp3" },
  { char: "خ", name: "ҳа", arabName: "خَاء", audio: "/media/quran/muallim-sani/audio/alifba/07_kha.mp3" },
  { char: "د", name: "дәль", arabName: "دَال", audio: "/media/quran/muallim-sani/audio/alifba/08_dal.mp3" },
  { char: "ذ", name: "ҙәль", arabName: "ذَال", audio: "/media/quran/muallim-sani/audio/alifba/09_zal.mp3" },
  { char: "ر", name: "ра", arabName: "رَاء", audio: "/media/quran/muallim-sani/audio/alifba/10_ra.mp3" },
  { char: "ز", name: "зәй", arabName: "زَاي", audio: "/media/quran/muallim-sani/audio/alifba/11_zai.mp3" },
  { char: "س", name: "син", arabName: "سِين", audio: "/media/quran/muallim-sani/audio/alifba/12_sin.mp3" },
  { char: "ش", name: "шин", arabName: "شِين", audio: "/media/quran/muallim-sani/audio/alifba/13_shin.mp3" },
  { char: "ص", name: "сад", arabName: "صَاد", audio: "/media/quran/muallim-sani/audio/alifba/14_sad.mp3" },
  { char: "ض", name: "дад", arabName: "ضَاد", audio: "/media/quran/muallim-sani/audio/alifba/15_dad.mp3" },
  { char: "ط", name: "Ṭа", arabName: "طَاء", audio: "/media/quran/muallim-sani/audio/alifba/16_to.mp3" },
  { char: "ظ", name: "ҙа", arabName: "ظَاء", audio: "/media/quran/muallim-sani/audio/alifba/17_zo.mp3" },
  { char: "ع", name: "ғәйн", arabName: "عَيْن", audio: "/media/quran/muallim-sani/audio/alifba/18_ain.mp3" },
  { char: "غ", name: "ғайн", arabName: "غَيْن", audio: "/media/quran/muallim-sani/audio/alifba/19_ghain.mp3" },
  { char: "ف", name: "фә", arabName: "فَاء", audio: "/media/quran/muallim-sani/audio/alifba/20_fa.mp3" },
  { char: "ق", name: "қаф", arabName: "قَاف", audio: "/media/quran/muallim-sani/audio/alifba/21_qaf.mp3" },
  { char: "ك", name: "кәф", arabName: "كَاف", audio: "/media/quran/muallim-sani/audio/alifba/22_kaf.mp3" },
  { char: "ل", name: "ләм", arabName: "لاَم", audio: "/media/quran/muallim-sani/audio/alifba/23_lam.mp3" },
  { char: "م", name: "мим", arabName: "مِيم", audio: "/media/quran/muallim-sani/audio/alifba/24_mim.mp3" },
  { char: "ن", name: "нун", arabName: "نُون", audio: "/media/quran/muallim-sani/audio/alifba/25_nun.mp3" },
  { char: "و", name: "уау", arabName: "وَاو", audio: "/media/quran/muallim-sani/audio/alifba/26_waw.mp3" },
  { char: "ه", name: "һә", arabName: "هَاء", audio: "/media/quran/muallim-sani/audio/alifba/27_ha2.mp3" },
  { char: "ء", name: "һәмзә", arabName: "هَمْزَة", audio: "/media/quran/muallim-sani/audio/alifba/28_hamza.mp3" },
  { char: "ي", name: "йә", arabName: "يَاء", audio: "/media/quran/muallim-sani/audio/alifba/29_ya.mp3" },
];

const arabicFont = "'AmiriLocal', 'Scheherazade New', 'Amiri', serif";

function AudioWave() {
  return (
    <div className="flex h-4 items-end gap-[3px]" aria-hidden="true">
      <motion.span
        animate={{ height: [4, 8, 4] }}
        transition={{ repeat: Infinity, duration: 0.5 }}
        className="w-[3px] rounded-full bg-cyan-400"
      />
      <motion.span
        animate={{ height: [4, 16, 4] }}
        transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }}
        className="w-[3px] rounded-full bg-cyan-400"
      />
      <motion.span
        animate={{ height: [4, 12, 4] }}
        transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }}
        className="w-[3px] rounded-full bg-cyan-400"
      />
      <motion.span
        animate={{ height: [4, 16, 4] }}
        transition={{ repeat: Infinity, duration: 0.5, delay: 0.3 }}
        className="w-[3px] rounded-full bg-cyan-400"
      />
      <motion.span
        animate={{ height: [4, 8, 4] }}
        transition={{ repeat: Infinity, duration: 0.5, delay: 0.15 }}
        className="w-[3px] rounded-full bg-cyan-400"
      />
    </div>
  );
}

function activeCardClass(isActive: boolean): string {
  return isActive
    ? "ring-2 ring-cyan-400 scale-[1.03] shadow-lg shadow-cyan-500/20"
    : "";
}

const baseCardClass =
  "relative z-[1] flex cursor-pointer flex-col items-center justify-between rounded-[18px] border border-gray-200 bg-white text-center shadow-sm shadow-gray-200/70 transition-all duration-300 hover:border-cyan-200 hover:bg-cyan-50/50 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none dark:hover:border-white/15 dark:hover:bg-white/[0.08]";

interface LetterCardProps {
  letter: AlphabetLetter;
  isActive: boolean;
  onClick: () => void;
}

function LetterCard({ letter, isActive, onClick }: LetterCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`${baseCardClass} ${activeCardClass(isActive)} px-3 pb-4 pt-[18px]`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <span
        className="mb-1.5 block py-2.5 text-[56px] font-normal leading-[1.1] text-gray-900 dark:text-[#e8e1d8]"
        style={{ fontFamily: arabicFont }}
      >
        {letter.char}
      </span>
      <p className="m-0 text-base font-semibold text-gray-900 dark:text-white">
        {letter.name}
      </p>
      <p className="arab mb-0 mt-1.5 text-sm text-gray-500 dark:text-[#b0b0b0]">
        {letter.arabName}
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
}

export default function AlphabetGrid() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isPlayingPlaylist, setIsPlayingPlaylist] = useState(false);
  const [progress, setProgress] = useState(0);
  const howlsRef = useRef<Record<string, Howl>>({});
  const playlistTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPlaylistRef = useRef(false);

  // Preload audio
  useEffect(() => {
    ALPHABET_DATA.forEach((letter) => {
      if (!howlsRef.current[letter.audio]) {
        howlsRef.current[letter.audio] = new Howl({
          src: [letter.audio],
          preload: true,
          html5: true,
        });
      }
    });

    return () => {
      Object.values(howlsRef.current).forEach((howl) => howl.unload());
      if (playlistTimeoutRef.current) clearTimeout(playlistTimeoutRef.current);
    };
  }, []);

  const stopAll = () => {
    Object.values(howlsRef.current).forEach((howl) => howl.stop());
    if (playlistTimeoutRef.current) clearTimeout(playlistTimeoutRef.current);
  };
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const playLetter = (index: number, isAutoNext = false) => {
    if (!isAutoNext) {
      setIsPlayingPlaylist(false);
      isPlaylistRef.current = false;
    }

    stopAll();
    const letter = ALPHABET_DATA[index];
    const howl = howlsRef.current[letter.audio];

    if (howl) {
      setActiveIndex(index);
      // Убираем старые обработчики end, чтобы не было конфликтов
      howl.off("end");
      howl.play();

      howl.once("end", () => {
        // Используем ref, чтобы получить актуальное состояние плейлиста
        if (isPlaylistRef.current || isAutoNext) {
          const nextIndex = index + 1;
          if (nextIndex < ALPHABET_DATA.length) {
            playlistTimeoutRef.current = setTimeout(() => {
              playLetter(nextIndex, true);
            }, 800);
          } else {
            setIsPlayingPlaylist(false);
            isPlaylistRef.current = false;
            setActiveIndex(null);
          }
        } else {
          setActiveIndex(null);
        }
      });
    }
  };

  const togglePlaylist = () => {
    if (isPlayingPlaylist) {
      stopAll();
      setIsPlayingPlaylist(false);
      isPlaylistRef.current = false;
      setActiveIndex(null);
    } else {
      setIsPlayingPlaylist(true);
      isPlaylistRef.current = true;
      playLetter(0, true);
    }
  };

  useEffect(() => {
    if (activeIndex !== null) {
      setProgress(((activeIndex + 1) / ALPHABET_DATA.length) * 100);
    } else {
      setProgress(0);
    }
  }, [activeIndex]);
  
  // Scroll active card to center of viewport
  useEffect(() => {
    if (activeIndex !== null && cardRefs.current[activeIndex]) {
      const card = cardRefs.current[activeIndex];
      if (card) {
        const cardRect = card.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const offset = viewportHeight / 2 - cardRect.height / 2;

        // Если карточка выше середины экрана — скроллим так, чтобы она оказалась в центре
        // Если карточка уже видна и ниже середины — тоже центрируем
        // Для верхних карточек (когда cardRect.top < offset) — просто показываем полностью
        const scrollTarget = window.scrollY + cardRect.top - Math.max(offset, 80);

        window.scrollTo({
          top: scrollTarget,
          behavior: "smooth",
        });
      }
    }
  }, [activeIndex]);

  return (
    <div className="relative w-full space-y-6">
      {/* Player — над сеткой, sticky чтобы не перекрывал навигацию внизу */}
      <div className="sticky top-[69px] z-10 flex justify-center">
        <button
          type="button"
          onClick={togglePlaylist}
          className={[
            "group inline-flex w-full max-w-[400px] items-center gap-3 overflow-hidden rounded-full",
            "border border-white/10 bg-white/70 px-3.5 py-3 text-left backdrop-blur-xl",
            "shadow-lg shadow-cyan-500/10 transition-all duration-300 hover:scale-[1.02]",
            "hover:border-cyan-300/40 hover:shadow-cyan-500/20",
            "dark:bg-white/10 dark:text-white",
            isPlayingPlaylist
              ? "scale-[1.02] ring-2 ring-cyan-400/40 shadow-cyan-400/30"
              : "ring-1 ring-gray-200/70 dark:ring-white/5",
          ].join(" ")}
        >
          {/* Gradient background on active */}
          <span
            className={[
              "absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-sky-400/5 to-emerald-300/10 opacity-0 transition-opacity duration-300",
              isPlayingPlaylist ? "animate-pulse opacity-100" : "group-hover:opacity-100",
            ].join(" ")}
          />

          {/* Play/Pause button */}
          <span
            className={[
              "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-300",
              "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20",
              "dark:bg-cyan-400 dark:text-slate-950",
              isPlayingPlaylist ? "shadow-cyan-400/40" : "group-hover:bg-cyan-500",
            ].join(" ")}
          >
            {isPlayingPlaylist ? (
              <Pause size={20} aria-hidden="true" />
            ) : activeIndex === ALPHABET_DATA.length - 1 ? (
              <RotateCcw size={20} aria-hidden="true" />
            ) : (
              <Play size={20} className="translate-x-[1px]" aria-hidden="true" />
            )}
          </span>

          {/* Text + progress */}
          <span className="relative min-w-0 flex-1">
            <span className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-semibold text-gray-950 dark:text-white sm:text-base">
                {isPlayingPlaylist
                  ? "Воспроизведение алфавита"
                  : "Прослушать весь алфавит"}
              </span>
              {isPlayingPlaylist && activeIndex !== null && (
                <span className="shrink-0 text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">
                  {activeIndex + 1} / {ALPHABET_DATA.length}
                </span>
              )}
            </span>

            <span className="mt-2 block h-1 overflow-hidden rounded-full bg-gray-200/80 dark:bg-white/15">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-300 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </span>
            <span className="mt-1 block text-[12px] text-gray-400 dark:text-gray-300">
              или кликните букву
            </span>
          </span>

          {/* Volume icon */}
          <span className="hidden sm:flex items-center gap-2 border-l border-gray-200/70 dark:border-white/10 pl-4 ml-2">
            <Volume2 size={18} className="text-gray-400" />
          </span>
        </button>
      </div>

      {/* Grid */}
      <div ref={gridRef} dir="rtl" className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5">

        {ALPHABET_DATA.map((letter, index) => (
          <div
            key={letter.audio}
            ref={(el) => { cardRefs.current[index] = el; }}
          >
            <LetterCard
              letter={letter}
              isActive={activeIndex === index}
              onClick={() => playLetter(index)}
            />
          </div>

        ))}
      </div>

    </div>
  );
}
