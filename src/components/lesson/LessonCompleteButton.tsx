import React from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  subject: string;
  course: string;
  slug: string;
}

const LessonCompleteButton: React.FC<Props> = ({ subject, course, slug }) => {
  const storageKey = React.useMemo(
    () => `completed-lessons:${subject}/${course}`,
    [subject, course],
  );

  const [completed, setCompleted] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setCompleted(Array.isArray(parsed) && parsed.includes(slug));
    } catch {
      setCompleted(false);
    }
    setMounted(true);
  }, [storageKey, slug]);

  const toggle = () => {
    const next = !completed;
    setCompleted(next);

    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      const set = new Set<string>(
        Array.isArray(parsed) ? (parsed as string[]) : [],
      );
      if (next) set.add(slug);
      else set.delete(slug);
      window.localStorage.setItem(storageKey, JSON.stringify(Array.from(set)));
    } catch {
      // Хранилище может быть недоступно.
    }

    window.dispatchEvent(
      new CustomEvent("lesson-completion-change", {
        detail: { slug, completed: next },
      }),
    );
  };

  return (
    <Button
      size="sm"
      className={
        "shrink-0 gap-2 rounded-full border-primary/30 " +
        (completed
          ? ""
          : "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary")
      }
      variant={completed ? "default" : "outline"}
      onClick={toggle}
      disabled={!mounted}
    >
      <CheckCircle2
        className={"h-4 w-4 " + (completed ? "text-emerald-600" : "")}
      />
      {completed ? "Завершён" : "Отметить завершённым"}
    </Button>
  );
};

export default LessonCompleteButton;
