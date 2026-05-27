import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Lock, BookOpen, ChevronRight, X } from "lucide-react";
import CourseProgress from "./CourseProgress";

export type TitleSegment = {
  text: string;
  arab?: boolean;
};

export type LessonItem = {
  id: number;
  slug: string;
  title: string | TitleSegment[];
};

type Props = {
  lessons: LessonItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
  isOpen: boolean;
  onClose: () => void;
};

function LessonStatusIcon({
  status,
}: {
  status: "completed" | "current" | "next" | "locked";
}) {
  switch (status) {
    case "completed":
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/30">
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        </div>
      );
    case "current":
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/20 ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/25">
          <BookOpen className="h-3.5 w-3.5 text-cyan-400" />
        </div>
      );
    case "locked":
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
          <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />
        </div>
      );
    default:
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
          <span className="text-xs font-medium text-muted-foreground/60" />
        </div>
      );
  }
}

export default function CourseSidebar({
  lessons,
  currentIndex,
  onSelect,
  isOpen,
  onClose,
}: Props) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-80 lg:shrink-0 lg:border-r lg:border-border lg:h-screen lg:sticky lg:top-0 lg:overflow-y-auto lg:bg-background/95 lg:backdrop-blur-2xl lg:shadow-2xl lg:shadow-cyan-500/5">
        <SidebarContent
          lessons={lessons}
          currentIndex={currentIndex}
          onSelect={onSelect}
        />
      </aside>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            {/* Drawer */}
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-black/90 backdrop-blur-2xl border-r border-white/10 overflow-y-auto lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>

              <SidebarContent
                lessons={lessons}
                currentIndex={currentIndex}
                onSelect={(index) => {
                  onSelect(index);
                  onClose();
                }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarContent({
  lessons,
  currentIndex,
  onSelect,
}: {
  lessons: LessonItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-white/5">
        <h2 className="text-lg font-semibold text-foreground tracking-tight">
          Муаллим Сани
        </h2>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Интерактивный курс
        </p>
      </div>

      {/* Progress */}
      <div className="px-5 pt-4 pb-3">
        <CourseProgress current={currentIndex + 1} total={lessons.length} />
      </div>

      {/* Lessons list */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        {lessons.map((lesson, index) => {
          const status =
            index < currentIndex
              ? "completed"
              : index === currentIndex
                ? "current"
                : "next";

          return (
            <motion.button
              key={lesson.id}
              onClick={() => onSelect(index)}
              className={`
                group relative w-full flex items-center gap-3 rounded-2xl px-4 py-3.5
                text-left text-sm sm:text-base transition-all duration-300
                ${
                  status === "current"
                    ? "bg-cyan-500/10 ring-1 ring-cyan-400/30 shadow-lg shadow-cyan-500/10"
                    : "hover:bg-white/5"
                }
              `}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Current lesson glow */}
              {status === "current" && (
                <motion.div
                  className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/5 to-transparent"
                  layoutId="activeGlow"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              {/* Status icon */}
              <div className="relative z-10">
                <LessonStatusIcon status={status} />
              </div>

              {/* Lesson info */}
              <div className="relative z-10 flex-1 min-w-0">
                <span
                  className={`
                    block truncate font-semibold text-base
                    ${
                      status === "current"
                        ? "text-cyan-300"
                        : status === "completed"
                          ? "text-emerald-300"
                          : "text-muted-foreground"
                    }
                  `}
                >
                  {Array.isArray(lesson.title)
                    ? lesson.title.map((seg, i) =>
                        seg.arab ? (
                          <span key={i} className="arab">{seg.text}</span>
                        ) : (
                          <React.Fragment key={i}>{seg.text}</React.Fragment>
                        ),
                      )
                    : lesson.title}
                </span>
                <span className="block text-sm text-muted-foreground/40 mt-0.5">
                  Урок {lesson.id}
                </span>
              </div>

              {/* Chevron for current */}
              {status === "current" && (
                <ChevronRight className="relative z-10 h-4 w-4 text-cyan-400/60" />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <p className="text-[10px] text-muted-foreground/30 text-center">
          {lessons.length} уроков
        </p>
      </div>
    </div>
  );
}
