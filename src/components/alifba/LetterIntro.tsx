// src/components/lesson/LetterIntro.tsx

import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useRef } from "react";

type Letter = {
  arabic: string;
  name: string;
  arabname?: string;
  transcription?: string;
  audio?: string;
};

type Props = {
  title: string;
  description: string;
  letters: Letter[];
  makhrajImage?: string;
};

export default function LetterIntro({
  title,
  description,
  letters,
  makhrajImage,
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
    <section className="rounded-3xl border border-gray-200 bg-white p-0 shadow-lg shadow-gray-200/60 dark:border-white/10 dark:bg-white/5 dark:shadow-2xl dark:shadow-black/20 sm:p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-950 dark:text-white">{title}</h2>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap gap-4 mb-8">
            {letters.map((letter, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group relative min-w-[180px] overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm shadow-gray-200/70 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-none"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 opacity-0 transition group-hover:opacity-100 dark:from-cyan-500/10 dark:to-blue-500/10" />

                <div className="relative">
                  <div className="mb-4 text-center text-7xl font-bold leading-none text-gray-950 dark:text-white"
                       style={{ fontFamily: "'AmiriLocal', 'Scheherazade New', 'Amiri', serif" }}>
                    {letter.arabic}
                  </div>

                  <div className="text-center space-y-1">
                    <div className="text-xl font-semibold text-gray-900 dark:text-slate-200">
                      {letter.name}
                    </div>

                    {letter.arabname && (
                      <div className="arab text-gray-500 dark:text-slate-400">
                        {letter.arabname}
                      </div>
                    )}
                  </div>

                  {letter.audio && (
                    <button
                      onClick={() => playAudio(letter.audio)}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-500 dark:bg-cyan-500 dark:text-black dark:hover:bg-cyan-400"
                    >
                      <Volume2 size={18} />
                      Слушать
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6 dark:border-white/10 dark:bg-slate-900/60">
            <p className="whitespace-pre-line text-lg leading-8 text-gray-700 dark:text-slate-200">
              {description}
            </p>
          </div>
        </div>

        {makhrajImage && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            className="overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
          >
            <img
              src={makhrajImage}
              alt=""
              className="w-full h-full object-cover"
            />
          </motion.div>
        )}
      </div>
    </section>
  );
}
