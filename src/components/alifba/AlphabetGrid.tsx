// src/components/alifba/AlphabetGrid.tsx
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  { char: "ط", name: "та", arabName: "طَاء", audio: "/media/quran/muallim-sani/audio/alifba/16_to.mp3" },
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

  const playLetter = (index: number, isAutoNext = false) => {
    if (!isAutoNext) {
      setIsPlayingPlaylist(false);
    }

    stopAll();
    const letter = ALPHABET_DATA[index];
    const howl = howlsRef.current[letter.audio];

    if (howl) {
      setActiveIndex(index);
      howl.play();

      howl.once("end", () => {
        if (isPlayingPlaylist || isAutoNext) {
          const nextIndex = index + 1;
          if (nextIndex < ALPHABET_DATA.length) {
            playlistTimeoutRef.current = setTimeout(() => {
              playLetter(nextIndex, true);
            }, 800);
          } else {
            setIsPlayingPlaylist(false);
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
      setActiveIndex(null);
    } else {
      setIsPlayingPlaylist(true);
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

  return (
    <div className="relative w-full space-y-8">
      {/* Grid */}
      <div dir="rtl" className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-">
        {ALPHABET_DATA.map((letter, index) => (
          <LetterCard
            key={letter.audio}
            letter={letter}
            isActive={activeIndex === index}
            onClick={() => playLetter(index)}
          />
        ))}
      </div>

      {/* Floating Player */}
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-4 bg-white/10 dark:bg-slate-900/80 backdrop-blur-2xl px-6 py-3 rounded-full border border-white/20 shadow-2xl">
            <button
              onClick={togglePlaylist}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
            >
              {isPlayingPlaylist ? (
                <Pause size={24} fill="currentColor" />
              ) : activeIndex === ALPHABET_DATA.length - 1 ? (
                <RotateCcw size={24} />
              ) : (
                <Play size={24} fill="currentColor" className="translate-x-0.5" />
              )}
            </button>

            <div className="flex flex-col min-w-[140px] sm:min-w-[200px]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold text-white">
                  {isPlayingPlaylist
                    ? "Воспроизведение алфавита"
                    : "Запустить алфавит"}
                </span>
                {isPlayingPlaylist && activeIndex !== null && (
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {activeIndex + 1} / {ALPHABET_DATA.length}
                  </span>
                )}
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-cyan-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                />
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 border-l border-white/10 pl-4 ml-2">
              <Volume2 size={18} className="text-gray-400" />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
