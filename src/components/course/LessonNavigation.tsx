import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

type Props = {
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
};

export default function LessonNavigation({
  currentIndex,
  total,
  onPrev,
  onNext,
}: Props) {
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;

  return (
    <div className="flex items-center justify-between gap-4 pt-8 border-t border-white/5">
      {/* Previous button */}
      <motion.button
        onClick={onPrev}
        disabled={isFirst}
        className={`
          group relative flex items-center gap-2 rounded-2xl px-6 py-3
          text-sm font-medium transition-all duration-300
          ${
            isFirst
              ? "cursor-not-allowed opacity-30"
              : "cursor-pointer hover:bg-white/5"
          }
        `}
        whileHover={!isFirst ? { x: -4, scale: 1.02 } : {}}
        whileTap={!isFirst ? { scale: 0.97 } : {}}
      >
        {/* Glow */}
        {!isFirst && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        )}

        <ArrowLeft className="relative z-10 h-4 w-4 text-cyan-400" />
        <span className="relative z-10 text-muted-foreground group-hover:text-foreground transition-colors">
          Предыдущий урок
        </span>
      </motion.button>

      {/* Divider */}
      <div className="hidden sm:block text-xs text-muted-foreground/40 font-medium">
        {currentIndex + 1} / {total}
      </div>

      {/* Next button */}
      <motion.button
        onClick={onNext}
        disabled={isLast}
        className={`
          group relative flex items-center gap-2 rounded-2xl px-6 py-3
          text-sm font-medium transition-all duration-300
          ${
            isLast
              ? "cursor-not-allowed opacity-30"
              : "cursor-pointer"
          }
        `}
        whileHover={!isLast ? { x: 4, scale: 1.02 } : {}}
        whileTap={!isLast ? { scale: 0.97 } : {}}
      >
        {/* Glow */}
        {!isLast && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-l from-emerald-500/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        )}

        <span className="relative z-10 text-muted-foreground group-hover:text-foreground transition-colors">
          Следующий урок
        </span>
        <ArrowRight className="relative z-10 h-4 w-4 text-emerald-400" />
      </motion.button>
    </div>
  );
}
