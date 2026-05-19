// src/components/alifba/LetterIntroCombined.tsx
// Объединяет letter-intro, pronunciation-grid и makhraj в один блок

import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useRef } from "react";

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

export default function LetterIntroCombined({
  title,
  description,
  letters,
  pronunciationItems,
  pronunciationAudio,
  makhrajImage,
  makhrajDescription,
}: Props) {
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const playAudio = (src?: string) => {
    if (!src) return;
    if (!audioRefs.current[src]) {
      audioRefs.current[src] = new Audio(src);
    }
    audioRefs.current[src]?.play();
  };

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
              <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] auto-rows-fr gap-4 max-sm:gap-1.5">
                {letters.map((letter, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ y: -2 }}
                    className="relative z-[1] flex min-h-[175px] cursor-pointer flex-col items-center justify-between rounded-[18px] border border-gray-200 bg-white px-3 pb-4 pt-[18px] text-center shadow-sm shadow-gray-200/70 transition-colors duration-300 hover:border-cyan-200 hover:bg-cyan-50/50 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none dark:hover:border-white/15 dark:hover:bg-white/[0.08]"
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
                      <p className="mb-0 mt-1.5 text-sm text-gray-500 dark:text-[#b0b0b0] arab">
                        {letter.arabname}
                      </p>
                    )}
                    {/* {letter.audio && (
                      <button
                        
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center justify-center transition-colors z-10"
                        title="Прослушать"
                      >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                        </svg>
                      </button>
                    )} */}
                  </motion.div>
                ))}

                {pronunciationItems &&
                  pronunciationItems.length > 0 &&
                  pronunciationItems.map((item, index) => (
                    <motion.div
                      key={`pron-${index}`}
                      whileHover={{ y: -2 }}
                      className="group relative z-[1] flex cursor-pointer flex-col items-center justify-between rounded-[18px] border border-gray-200 bg-white px-2.5 py-3.5 text-center shadow-sm shadow-gray-200/70 transition-colors duration-300 hover:border-cyan-200 hover:bg-cyan-50/50 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none dark:hover:border-white/15 dark:hover:bg-white/[0.08]"
                      onClick={() => playAudio(item.audio)}
                      role="button"
                      tabIndex={0}
                    >
                      <span
                        className="mb-1.5 block py-3.5 text-[56px] font-normal leading-[1.3] text-gray-900 dark:text-[#e8e1d8]"
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
                    </motion.div>
                  ))}
              </div>
            )}



            {pronunciationAudio && (
              <div className="mt-2">
                <button
                  onClick={() => playAudio(pronunciationAudio)}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[25px] bg-sky-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-sky-500 dark:bg-sky-500 dark:hover:bg-sky-600"
                >
                  <Volume2 size={18} />
                  Прослушать всё
                </button>
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
