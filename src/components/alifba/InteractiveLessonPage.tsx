import RenderBlock
from "@/lib/interactive/renderBlock";

type Props = {
  lesson: {
    title: string;
    blocks: any[];
  };
};

export default function InteractiveLessonPage({
  lesson,
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
