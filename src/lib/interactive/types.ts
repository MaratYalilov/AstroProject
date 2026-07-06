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

export type PronunciationNote = {
  /** info — серая карточка, warning — янтарная, error — красная (частые ошибки) */
  tone?: "info" | "warning" | "error";
  title?: string;
  /** Простой HTML разрешён (<b>, <strong>) */
  text?: string;
  /** Маркированный список; простой HTML разрешён */
  items?: string[];
};

export type PronunciationBlock = {
  type: "pronunciation";
  /** Заголовок секции, по умолчанию «Произношение» */
  title?: string;
  /** Арабское название буквы рядом с махраджем, напр. رَاء */
  arabname?: string;
  makhraj?: {
    image?: string;
    description?: string;
  };
  /** Основной абзац описания звука; простой HTML разрешён */
  description?: string;
  /** Маркированный список сразу после описания */
  points?: string[];
  /** Дополнительные карточки: примечания, правила, частые ошибки */
  notes?: PronunciationNote[];
  /** Шаги «Как произнести» */
  howTo?: string[];
  /** Арабская буква для поиска сыфатов в tajweed_sifat_v6.json, напр. "ف" */
  letter?: string;
};

export type SifatBlock = {
  type: "sifat";
  /** Заголовок, по умолчанию «🏷️ Постоянные свойства (Сыфат)» */
  title?: string;
  /** Арабская буква для поиска сыфатов в tajweed_sifat_v6.json, напр. "ف" */
  letter: string;
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
  | PronunciationBlock
  | SifatBlock
  | LessonCompleteBlock;
