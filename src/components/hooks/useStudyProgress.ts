import { useEffect, useState } from "react";
import { readCourseProgress, type StudyCourse, type StudyProgress } from "@/lib/studyProgress";
import { LESSON_COMPLETE_EVENT } from "@/lib/interactive/lessonProgress";

export function useStudyProgress(courses: (StudyCourse & { subject: string })[]) {
  const [savedProgress, setSavedProgress] = useState<Record<string, StudyProgress>>({});
  useEffect(() => {
    const refresh = () => {
      let storage: Storage | undefined;
      try { storage = window.localStorage; } catch { /* Storage may be disabled. */ }
      const next: Record<string, StudyProgress> = {};
      for (const course of courses) {
        next[`${course.subject}/${course.slug}`] = readCourseProgress(course.subject, course, storage);
      }
      setSavedProgress(next);
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener(LESSON_COMPLETE_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener(LESSON_COMPLETE_EVENT, refresh);
    };
  }, [courses]);
  return savedProgress;
}
