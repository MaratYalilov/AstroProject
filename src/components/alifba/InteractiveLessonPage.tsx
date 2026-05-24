import { useState } from "react";
import RenderBlock from "@/lib/interactive/renderBlock";

type Props = {
  lesson: {
    title: string;
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
  const [arabname, setArabname] = useState<string | undefined>();

  return (
    <div className="space-y-10 text-foreground">
      {/* Blocks */}
      {lesson.blocks.map((block, index) => {
        // Запоминаем arabname из блоков, содержащих letters
        if (
          (block.type === "letter-intro" || block.type === "letter-lesson") &&
          block.letters?.[0]?.arabname
        ) {
          if (block.letters[0].arabname !== arabname) {
            setArabname(block.letters[0].arabname);
          }
        }

        return (
          <RenderBlock
            key={index}
            block={block}
            arabname={block.type === "writing-and-forms" ? arabname : undefined}
          />
        );
      })}
    </div>
  );
}
