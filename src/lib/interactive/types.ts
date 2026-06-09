export type TitleSegment = {
  text: string;
  arab?: boolean;
};

export type LetterLessonBlock = {
  type: "letter-lesson";
  title: string | TitleSegment[];
  description?: string;
  letters: {
    name: string;
    arabic: string;
    arabname?: string;
    audio?: string;
    image?: string;
  }[];
  pronunciation?: {
    title?: string;
    audio?: string;
    items: {
      arabic: string;
      transcription: string;
      color?: string;
      audio?: string;
    }[];
  };
  makhraj?: {
    image?: string;
    description?: string;
  };
};

export type WritingAndFormsBlock = {
  type: "writing-and-forms";
  title: string;
  animation: {
    format: "gif" | "svg" | "lottie";
    src: string;
  };
  forms: {
    position:
      | "isolated"
      | "final"
      | "middle"
      | "initial";
    label: string;
    image: string;
  }[];
};

export type TheoryBlock = {
  type: "theory";
  title: string | TitleSegment[];
  source: string;
};

export type AlphabetGridBlock = {
  type: "alphabet-grid";
};

export type ReadingExercisesBlock = {
  type: "reading-exercises";
  lessonOrder?: number;
};

export type LessonCompleteBlock = {
  type: "lesson-complete";
  arabic?: string;
  title?: string;
  text?: string;
  items?: string[];
  nextLesson?: string;
};

export type LessonBlock =
  | LetterLessonBlock
  | WritingAndFormsBlock
  | AlphabetGridBlock
  | ReadingExercisesBlock
  | TheoryBlock
  | LessonCompleteBlock;
