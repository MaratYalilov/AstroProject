import LetterIntroCombined from "@/components/alifba/LetterIntroCombined";
import PronunciationBlock from "@/components/alifba/PronunciationBlock";
import SifatBlock from "@/components/alifba/SifatBlock";
import TheoryReveal from "@/components/alifba/TheoryReveal-OLD";
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

    case "pronunciation":
      return (
        <PronunciationBlock
          title={block.title}
          letter={block.letter}
          arabname={block.arabname}
          makhraj={block.makhraj}
          description={block.description}
          points={block.points}
          notes={block.notes}
          howTo={block.howTo}
        />
      );

    case "sifat":
      return (
        <SifatBlock
          letter={block.letter}
          title={block.title}
          standalone
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
          items={block.items}
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
