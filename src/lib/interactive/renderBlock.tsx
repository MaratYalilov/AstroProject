import LetterIntroCombined from "@/components/alifba/LetterIntroCombined";
import TheoryReveal from "@/components/alifba/TheoryReveal";
import WritingAndFormsBlock from "@/components/alifba/WritingAndFormsBlock";
import AlphabetGrid from "@/components/alifba/AlphabetGrid";
import ReadingExercises from "@/components/alifba/ReadingExercises";
import LessonComplete from "@/components/alifba/LessonComplete";

import type {
  LessonBlock,
} from "./types";

type Props = {
  block: LessonBlock;
  arabname?: string;
  lessonId?: number;
};

export default function RenderBlock({
  block,
  arabname,
  lessonId,
}: Props) {
  switch (block.type) {
    case "letter-lesson": {
      return (
        <LetterIntroCombined
          title={block.title}
          description={block.description}
          letters={block.letters}
          pronunciationItems={block.pronunciation?.items}
          pronunciationAudio={block.pronunciation?.audio}
          makhrajImage={block.makhraj?.image}
          makhrajDescription={block.makhraj?.description}
        />
      );
    }

    case "writing-and-forms":
      return (
        <WritingAndFormsBlock
          title={block.title}
          arabname={arabname}
          animation={block.animation}
          forms={block.forms}
        />
      );

    case "theory":
      return (
        <TheoryReveal
          title={block.title}
          source={block.source}
        />
      );

    case "alphabet-grid":
      return <AlphabetGrid />;

    case "reading-exercises":
      return (
        <ReadingExercises
          lessonOrder={block.lessonOrder ?? lessonId}
        />
      );

    case "lesson-complete":
      return (
        <LessonComplete
          lessonId={String(lessonId ?? 0)}
          arabic={block.arabic}
          title={block.title}
          text={block.text}
          nextLesson={block.nextLesson}
        />
      );

    default:
      return (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
          Unknown block type:
          {" "}
          {(block as any).type}
        </div>
      );
  }
}
