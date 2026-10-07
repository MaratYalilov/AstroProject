import { lessonCompleteKey } from "./interactive/lessonProgress";

export interface StudyCourse {
  slug: string;
  title: string;
  interactive: boolean;
  lessonIds: (string | number)[];
}

export interface StudyProgress {
  completed: number;
  total: number;
  percentage: number;
  finished: boolean;
}

function progress(completed: number, total: number): StudyProgress {
  return {
    completed,
    total,
    percentage: total > 0 ? Math.floor((completed / total) * 100) : 0,
    finished: total > 0 && completed === total,
  };
}

export function readCourseProgress(
  subject: string,
  course: StudyCourse,
  storage?: Pick<Storage, "getItem">,
): StudyProgress {
  const lessonIds = [...new Set(course.lessonIds)];
  let completed = 0;
  try {
    if (storage && course.interactive) {
      completed = lessonIds.filter(id =>
        storage.getItem(lessonCompleteKey(subject, course.slug, id)) === "1",
      ).length;
    } else if (storage) {
      const saved: unknown = JSON.parse(storage.getItem(`completed-lessons:${subject}/${course.slug}`) || "[]");
      const completedIds = new Set(Array.isArray(saved) ? saved.filter(id => typeof id === "string") : []);
      completed = lessonIds.filter(id => typeof id === "string" && completedIds.has(id)).length;
    }
  } catch {
    // Unavailable storage or invalid saved data must not break the dashboard.
  }
  return progress(completed, lessonIds.length);
}

export function subjectProgress(courses: StudyProgress[]): StudyProgress {
  return progress(
    courses.reduce((sum, course) => sum + course.completed, 0),
    courses.reduce((sum, course) => sum + course.total, 0),
  );
}
