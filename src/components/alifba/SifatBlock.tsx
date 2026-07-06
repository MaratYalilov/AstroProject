// src/components/alifba/SifatBlock.tsx
// Блок «Постоянные свойства (Сыфат)»: чипы сыфатов буквы из tajweed_sifat_v6.json
// с tooltip-определениями и ссылкой на курс «Коран, 2-й уровень».
// Используется внутри PronunciationBlock, а также как самостоятельный блок
// урока (block.type === "sifat" в renderBlock).

import sifatData from "@/content/lessons/quran/muallim-sani/tajweed_sifat_v6.json";
import sifatLessonsMap from "@/content/lessons/quran/koran-2-uroven/sifat_lessons_map.json";

/** Ссылка на курс, где сыфаты разбираются подробно */
const COURSE_URL = "/quran/koran-2-uroven";
const COURSE_TITLE = "Коран, 2-й уровень";

/** name_ru свойства -> slug урока курса 2-го уровня (deep-link ?lesson=) */
const LESSON_MAP: Record<string, string> = sifatLessonsMap as Record<string, string>;

function lessonUrlFor(name: string): string | undefined {
  const slug = LESSON_MAP[name];
  if (!slug || name === "_comment") return undefined;
  return `${COURSE_URL}?lesson=${encodeURIComponent(slug)}`;
}

type Props = {
  /** Арабская буква для поиска сыфатов, напр. "ف" */
  letter?: string;
  /** Заголовок блока */
  title?: string;
  /** true — самостоятельный блок урока (внешняя карточка-секция с h2),
   *  false/по умолчанию — вложенная карточка внутри PronunciationBlock */
  standalone?: boolean;
};

type SifatChip = {
  name: string;
  definition?: string;
};

/** Определения свойств: name_ru -> definition */
const SIFAT_DEFINITIONS: Record<string, string> = Object.fromEntries(
  (sifatData.properties ?? []).map((p: any) => [p.name_ru, p.definition]),
);

/** Возвращает список присущих букве сыфатов с определениями */
export function getSifatForLetter(letter?: string): SifatChip[] {
  if (!letter) return [];
  const entry = (sifatData.letters ?? []).find(
    (l: any) => l.letter === letter,
  );
  if (!entry?.sifat) return [];
  return Object.entries(entry.sifat)
    .filter(([, value]) => value === true)
    .map(([name]) => ({
      name,
      definition: SIFAT_DEFINITIONS[name],
    }));
}

export default function SifatBlock({
  letter,
  title = "🏷️ Постоянные свойства (Сыфат)",
  standalone = false,
}: Props) {
  const sifat = getSifatForLetter(letter);

  if (sifat.length === 0) return null;

  const body = (
    <>
      <div className="flex flex-wrap gap-2">
        {sifat.map((item) => {
          const href = lessonUrlFor(item.name);
          const chipClass =
            "inline-flex items-center rounded-full bg-fjord-100 px-3 py-1 text-xs text-fjord-700 dark:bg-fjord-900/40 dark:text-fjord-300";
          // Чип-ссылка: ведёт на урок этого свойства в курсе «Коран, 2-й уровень»
          if (href) {
            return (
              <a
                key={item.name}
                href={href}
                title={item.definition}
                className={`${chipClass} underline decoration-fjord-300 decoration-dotted underline-offset-2 transition-colors hover:bg-fjord-200 hover:text-fjord-900 dark:hover:bg-fjord-900/70 dark:hover:text-fjord-100`}
              >
                {item.name}
              </a>
            );
          }
          return (
            <span
              key={item.name}
              title={item.definition}
              className={`${chipClass} ${item.definition ? "cursor-help" : ""}`}
            >
              {item.name}
            </span>
          );
        })}
      </div>
      <p className="!mb-0 mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
        Нажмите на свойство, чтобы открыть его подробный разбор в курсе{" "}
        <a
          href={COURSE_URL}
          className="font-medium text-fjord-600 underline decoration-fjord-300 underline-offset-2 hover:text-fjord-700 hover:decoration-fjord-500 dark:text-fjord-400 dark:decoration-fjord-600 dark:hover:text-fjord-300"
        >
          «{COURSE_TITLE}»
        </a>
        , — при наведении курсора видно краткое определение.
      </p>
    </>
  );

  if (standalone) {
    return (
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-200/60 dark:border-white/10 dark:bg-white/5 dark:shadow-2xl dark:shadow-black/20">
        <h2 className="mb-6 border-b border-gray-200 pb-2 text-2xl font-semibold leading-tight text-slate-950 dark:border-white/10 dark:text-white">
          {title}
        </h2>
        {body}
      </section>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
      <p className="mb-3 text-lg font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {title}
      </p>
      {body}
    </div>
  );
}
