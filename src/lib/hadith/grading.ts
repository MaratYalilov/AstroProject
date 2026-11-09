// Shared by the reader and search. Classify the leading assessment, not words in its caveats.
export const gradeOptions = [
  { id: 'sahih', label: 'Достоверный (сахих)' },
  { id: 'hasan-sahih', label: 'Хороший-достоверный (хасан-сахих)' },
  { id: 'hasan', label: 'Хороший (хасан)' },
  { id: 'daif', label: 'Слабый (да‘иф)' },
  { id: 'very-daif', label: 'Очень слабый' },
  { id: 'munkar', label: 'Отвергаемый (мункар)' },
  { id: 'shadh', label: 'Отклоняющийся (шазз)' },
  { id: 'mawdu', label: 'Выдуманный (мавду‘)' },
  { id: 'mixed', label: 'Разные оценки' },
  { id: 'other', label: 'Другая оценка' },
  { id: 'ungraded', label: 'Без отдельной оценки' },
] as const;
export type GradeId = typeof gradeOptions[number]['id'];
export const searchGradeOptions = [
  { id: 'two-sahihs', label: 'Из двух Сахихов, кроме вступления' },
  ...gradeOptions,
] as const;
export type GradeFilterId = typeof searchGradeOptions[number]['id'];
export function isFromTwoSahihs(collection: string, book: number) {
  return collection === 'bukhari' || (collection === 'muslim' && book !== 0);
}
export function collectionMembership(collection: string, book: number): string | undefined {
  if (collection === 'bukhari') return 'Из Сахиха аль-Бухари';
  if (collection === 'muslim') return book === 0 ? 'Из вступления к Сахиху Муслима' : 'Из Сахиха Муслима';
}
type Grading = { ar?: string[]; ru?: string[] };
const unique = (values: string[] = []) => [...new Set(values.map(value => value.replace(/[\u2013\u2014]/g, '-').trim()).filter(Boolean))];
const arabic = (value: string) => value.normalize('NFKD').replace(/[\u064b-\u065f\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').trim();
export function arabicGrade(value: string): GradeId {
  const v = arabic(value);
  if (/^حسن\s+صحيح/.test(v)) return 'hasan-sahih';
  if (/^صحيح/.test(v)) return 'sahih';
  if (/^حسن/.test(v)) return 'hasan';
  if (/^ضعيف\s+جدا/.test(v)) return 'very-daif';
  if (/^ضعيف/.test(v)) return 'daif';
  if (/^منكر/.test(v)) return 'munkar';
  if (/^شاذ/.test(v)) return 'shadh';
  if (/^موضوع/.test(v)) return 'mawdu';
  return 'other';
}
const translations: Record<string, string> = {
  'صحيح م دون جملة التلاع': 'Достоверный (сахих). Приведён у Муслима, за исключением фразы о долинах (ат-тиля‘).',
  'صحيح الاسناد': 'Достоверная цепочка передатчиков (иснад).',
  'حسن الاسناد': 'Хорошая цепочка передатчиков (иснад).',
  'ضعيف الاسناد': 'Слабая цепочка передатчиков (иснад).',
  'صحيح لغيره': 'Достоверный благодаря подкрепляющим передачам (сахих ли-гайрихи).',
  'حسن لغيره': 'Хороший благодаря подкрепляющим передачам (хасан ли-гайрихи).',
  'صحيح مقطوع': 'Достоверное сообщение от последователя сподвижников (макту‘).',
  'صحيح موقوف': 'Достоверное сообщение от сподвижника (маукуф).',
  'مقطوع': 'Сообщение от последователя сподвижников (макту‘); само по себе это не оценка достоверности.',
};
export function gradeLabel(id: GradeId) { return gradeOptions.find(option => option.id === id)!.label; }
export function gradingInfo(grading?: Grading) {
  const ar = unique(grading?.ar);
  const suppliedRu = unique(grading?.ru);
  const categories = [...new Set(ar.map(arabicGrade).filter(id => id !== 'other'))];
  const category: GradeId = categories.length > 1 ? 'mixed' : categories[0] ?? (ar.length || suppliedRu.length ? 'other' : 'ungraded');
  const fallback = ar.map(value => {
    const normalized = arabic(value);
    if (translations[normalized]) return translations[normalized];
    const id = arabicGrade(value);
    if (id === 'other') return 'В данных есть арабская оценка или примечание; русский перевод не указан.';
    const simple = /^(?:صحيح|حسن|حسن صحيح|ضعيف|ضعيف جدا|منكر|شاذ|موضوع)\s*\*?$/.test(normalized);
    return `${gradeLabel(id)}.${simple ? '' : ' В арабском тексте оценки есть уточнения и оговорки; их полный русский перевод в данных отсутствует.'}`;
  });
  return { ar, ru: suppliedRu.length ? suppliedRu : unique(fallback), category, label: gradeLabel(category), generated: !suppliedRu.length && ar.length > 0 };
}
