// src/components/alifba/PronunciationBlock.tsx
// Блок «Произношение»: махрадж, описание звука, шаги «Как произнести»,
// постоянные свойства (сыфаты — компонент SifatBlock) и примечания.
// Данные приходят из JSON урока (block.type === "pronunciation").
// Размеры шрифтов соответствуют рендеру теории (TheoryContent): текст text-lg/leading-8, заголовок text-2xl.

import type { PronunciationNote } from "@/lib/interactive/types";
import SifatBlock from "./SifatBlock";

type Props = {
  title?: string;
  /** Арабская буква для поиска сыфатов в tajweed_sifat_v6.json, напр. "ف" */
  letter?: string;
  arabname?: string;
  makhraj?: {
    image?: string;
    description?: string;
  };
  description?: string;
  points?: string[];
  notes?: PronunciationNote[];
  howTo?: string[];
};

const NOTE_TONE_CLASS: Record<
  NonNullable<PronunciationNote["tone"]>,
  { card: string; title: string }
> = {
  info: {
    card: "border-gray-100 bg-gray-50 dark:border-white/[0.06] dark:bg-white/[0.02]",
    title: "text-gray-400 dark:text-gray-500",
  },
  warning: {
    card: "border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10",
    title: "text-amber-600 dark:text-amber-400",
  },
  error: {
    card: "border-red-100 bg-red-50/30 dark:border-red-900/30 dark:bg-red-900/10",
    title: "text-red-500 dark:text-red-400",
  },
};

function NoteCard({ note }: { note: PronunciationNote }) {
  const tone = NOTE_TONE_CLASS[note.tone ?? "info"];

  return (
    <div className={`mt-4 rounded-xl border p-4 ${tone.card}`}>
      {note.title && (
        <p
          className={`mb-3 text-lg font-semibold uppercase tracking-widest ${tone.title}`}
        >
          {note.title}
        </p>
      )}
      {note.text && (
        <p
          className="!mb-0 text-lg leading-8 text-slate-700 dark:text-slate-200"
          dangerouslySetInnerHTML={{ __html: note.text }}
        />
      )}
      {note.items && note.items.length > 0 && (
        <ul className="!mb-0 list-disc space-y-3 pl-6 text-lg leading-8 text-slate-700 marker:text-cyan-600 dark:text-slate-200 dark:marker:text-cyan-300">
          {note.items.map((item, index) => (
            <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PronunciationBlock({
  title = "Произношение",
  letter,
  arabname,
  makhraj,
  description,
  points,
  notes,
  howTo,
}: Props) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-200/60 dark:border-white/10 dark:bg-white/5 dark:shadow-2xl dark:shadow-black/20">
      <h2 className="mb-6 border-b border-gray-200 pb-2 text-2xl font-semibold leading-tight text-slate-950 dark:border-white/10 dark:text-white">
        {title}
      </h2>

      {/* Махрадж + описание */}
      <div className="mb-6 flex flex-col items-start gap-6 sm:flex-row">
        {(makhraj?.image || arabname) && (
          <div className="flex shrink-0 flex-col items-center gap-3">
            {makhraj?.image && (
              <img
                alt="Махрадж буквы"
                className="h-auto w-full max-w-[160px] rounded-xl border border-gray-200 bg-white dark:border-white/10 sm:max-w-[150px]"
                src={makhraj.image}
              />
            )}
            {arabname && (
              <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
                <span className="arab text-2xl leading-none text-fjord-500 dark:text-fjord-400">
                  {arabname}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  арабское название
                </span>
              </div>
            )}
            {makhraj?.description && (
              <p className="!my-0 max-w-[200px] text-center text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                {makhraj.description}
              </p>
            )}
          </div>
        )}

        <div className="flex-1">
          {description && (
            <p
              className="!mt-0 text-lg leading-8 text-slate-700 dark:text-slate-200"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          )}
          {points && points.length > 0 && (
            <ul className="mt-5 list-disc space-y-3 pl-6 text-lg leading-8 text-slate-700 marker:text-cyan-600 dark:text-slate-200 dark:marker:text-cyan-300">
              {points.map((point, index) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: point }} />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Как произнести */}
      {howTo && howTo.length > 0 && (
        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
          <p className="mb-3 text-lg font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Как произнести
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {howTo.map((step, index) => (
              <div key={index} className="flex flex-1 items-start gap-3">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fjord-100 text-sm font-semibold text-fjord-700 dark:bg-fjord-900/40 dark:text-fjord-300">
                  {index + 1}
                </div>
                <p
                  className="!mb-0 text-lg leading-8 text-slate-700 dark:text-slate-200"
                  dangerouslySetInnerHTML={{ __html: step }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Постоянные свойства (Сыфат) — компонент SifatBlock */}
      <SifatBlock letter={letter} />

      {/* Примечания: особенность буквы, частые ошибки */}
      {notes?.map((note, index) => (
        <NoteCard key={index} note={note} />
      ))}
    </section>
  );
}
