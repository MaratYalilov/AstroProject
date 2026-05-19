// src/components/lesson/WritingAnimation.tsx

import { motion } from "framer-motion";
import { useState } from "react";

type Props = {
  title: string;

  animation: {
    format: "gif" | "svg" | "lottie";
    src: string;
  };
};

export default function WritingAnimation({
  title,
  animation,
}: Props) {
  const [key, setKey] = useState(0);

  const replay = () => {
    setKey((prev) => prev + 1);
  };

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-200/60 dark:border-white/10 dark:bg-white/5 dark:shadow-2xl dark:shadow-black/20">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-950 dark:text-white">
          {title}
        </h2>
      </div>

      <motion.div
        key={key}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 p-10 dark:border-white/10 dark:bg-slate-900/60"
      >
        {animation.format === "gif" && (
          <img
            src={animation.src}
            alt=""
            className="max-h-[500px] object-contain"
          />
        )}

        {animation.format === "svg" && (
          <img
            src={animation.src}
            alt=""
            className="max-h-[500px] object-contain"
          />
        )}
      </motion.div>
    </section>
  );
}
