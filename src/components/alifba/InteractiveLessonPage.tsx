import { useMemo } from "react";
import RenderBlock from "@/lib/interactive/renderBlock";
import LessonComplete from "./LessonComplete";
import { ReducedMotionProvider } from "../motion/ReducedMotionProvider";

type TitleSegment = {
  text: string;
  arab?: boolean;
};

type Props = {
  lesson: {
    id?: number;
    title: string | TitleSegment[];
    blocks: any[];
  };
  subject: string;
  course: string;
};

export default function InteractiveLessonPage({
  lesson,
  subject,
  course,
}: Props) {
  const arabname = useMemo(() => {
    const block = lesson.blocks.find(
      (item) =>
        item.type === "letter-lesson" &&
        item.letters?.[0]?.arabname
    );
    return block?.letters?.[0]?.arabname;
  }, [lesson.blocks]);

  // Если у урока нет собственного блока «Итог урока» (lesson-complete),
  // добавляем стандартную кнопку «Отметить завершённым» в конце —
  // так прогресс работает и в курсах на MatnBlock (koran-2-uroven, dzhazariyya).
  const hasCompleteBlock = useMemo(
    () => lesson.blocks.some((b) => b.type === "lesson-complete"),
    [lesson.blocks]
  );

  return (
    <ReducedMotionProvider>
    <div className="space-y-10 text-foreground">
      {/* Blocks */}
      {lesson.blocks.map((block, index) => (
        <RenderBlock
          key={index}
          block={block}
          lessonId={lesson.id}
          subject={subject}
          course={course}
          arabname={block.type === "writing-and-forms" ? arabname : undefined}
        />
      ))}

      {!hasCompleteBlock && (
        <LessonComplete
          lessonId={String(lesson.id ?? 0)}
          subject={subject}
          course={course}
          text="Отметьте урок пройденным, чтобы он учитывался в прогрессе курса."
        />
      )}
    </div>
    </ReducedMotionProvider>
  );
}
