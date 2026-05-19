// src/components/lesson/PronunciationGrid.tsx

import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useRef } from "react";

type Item = {
  arabic: string;
  transcription: string;
  color?: string;
  audio?: string;
};

type Props = {
  title?: string;
  audio?: string;
  items: Item[];
};

export default function PronunciationGrid({
  title,
  audio,
  items,
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
      {title && (
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-950 dark:text-white">{title}</h2>
        </div>
      )}

      {audio && (
        <div className="mb-6">
          <button
            onClick={() => playAudio(audio)}
            className="flex items-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 font-semibold text-white transition hover:bg-cyan-500 dark:bg-cyan-500 dark:text-black dark:hover:bg-cyan-400"
          >
            <Volume2 size={20} />
            Прослушать всё
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-200/70 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-none"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 opacity-0 transition group-hover:opacity-100" />

            <div className="relative">
              <div
                className="mb-3 text-center text-5xl font-bold leading-none text-gray-950 dark:text-white"
                style={{ fontFamily: "'AmiriLocal', 'Scheherazade New', 'Amiri', serif" }}
              >
                {item.arabic}
              </div>

              <div className="mb-4 text-center text-lg text-gray-600 dark:text-slate-300">
                {item.transcription}
              </div>

              {item.audio && (
                <button
                  onClick={() => playAudio(item.audio)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-600/30 bg-cyan-50 px-4 py-2 font-medium text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-500/30 dark:bg-cyan-500/20 dark:text-cyan-300 dark:hover:bg-cyan-500/30"
                >
                  <Volume2 size={16} />
                  Слушать
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
