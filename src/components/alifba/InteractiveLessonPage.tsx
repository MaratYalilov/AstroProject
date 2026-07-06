import { useMemo } from "react";
import RenderBlock from "@/lib/interactive/renderBlock";
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

  return (
    <ReducedMotionProvider>
    <div className="space-y-10 text-foreground">
      {/* Blocks */}
      {lesson.blocks.map((block, index) => (
        <RenderBlock
          key={index}
          block={block}
          lessonId={lesson.id}
          arabname={block.type === "writing-and-forms" ? arabname : undefined}
        />
      ))}
    </div>
    </ReducedMotionProvider>
  );
}
