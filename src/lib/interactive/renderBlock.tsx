import LetterIntro from "@/components/alifba/LetterIntro";
import LetterIntroCombined from "@/components/alifba/LetterIntroCombined";
import WritingAnimation from "@/components/alifba/WritingAnimation";
import LetterForms from "@/components/alifba/LetterForms";
import PronunciationGrid from "@/components/alifba/PronunciationGrid";
import TheoryReveal from "@/components/alifba/TheoryReveal";

import type {
  LessonBlock,
} from "./types";

type Props = {
  block: LessonBlock;
};

export default function RenderBlock({
  block,
}: Props) {
  switch (block.type) {
    case "letter-intro":
      return (
        <LetterIntro
          title={block.title}
          description={block.description || ""}
          letters={block.letters}
          makhrajImage={block.makhraj?.image}
        />
      );

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

case "pronunciation-grid":
  return (
    <PronunciationGrid
      title={block.title}
      audio={block.audio}
      items={block.items}
    />
  );

    case "writing-animation":
      return (
        <WritingAnimation
          title={block.title}
          animation={block.animation}
        />
      );

    case "letter-forms":
      return (
        <LetterForms
          title={block.title}
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
