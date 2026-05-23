import RenderBlock
from "@/lib/interactive/renderBlock";

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
  return (
    <div className="space-y-10 text-foreground">
      {lesson.blocks.map((block, index) => (
        <RenderBlock
          key={index}
          block={block}
        />
      ))}
    </div>
  );
}
