import { motion } from "framer-motion";

type Props = {
  completed: number;
  total: number;
};

export default function CourseProgress({ completed, total }: Props) {
  const safeCompleted = Math.min(Math.max(completed, 0), total);
  const percentage = total > 0 ? Math.round((safeCompleted / total) * 100) : 0;

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white/75 p-3 shadow-sm shadow-gray-200/50 backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-gray-600 dark:text-slate-300">
          Завершено {safeCompleted} из {total}
        </span>
        <span className="font-semibold tabular-nums text-cyan-700 dark:text-cyan-300">
          {percentage}%
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200/80 dark:bg-white/15">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-300 shadow-lg shadow-cyan-500/25"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
