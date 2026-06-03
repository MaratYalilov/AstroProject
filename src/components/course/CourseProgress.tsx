import { motion } from "framer-motion";

type Props = {
  completed: number;
  total: number;
};

export default function CourseProgress({ completed, total }: Props) {
  const safeCompleted = Math.min(Math.max(completed, 0), total);
  const percentage = total > 0 ? Math.round((safeCompleted / total) * 100) : 0;

  return (
    <div className="w-full space-y-2">
      {/* Label */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-medium">
          Завершено {safeCompleted} из {total}
        </span>
        <span className="text-cyan-400 font-semibold tabular-nums">
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-lg shadow-cyan-500/25"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
