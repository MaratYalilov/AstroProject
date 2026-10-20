export const feedbackStatuses = {
  new: 'Новое',
  in_progress: 'В работе',
  resolved: 'Исправлено',
} as const;
export type FeedbackStatus = keyof typeof feedbackStatuses;
export function isFeedbackStatus(value: unknown): value is FeedbackStatus {
  return typeof value === 'string' && Object.hasOwn(feedbackStatuses, value);
}
export class FeedbackError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
/** Only link back to this site, never javascript URLs or external destinations. */
export function normalizeFeedbackUrl(value: string, origin: string): string | null {
  if (!value || value.length > 2048 || /[\x00-\x1f\x7f]/.test(value)) return null;
  try {
    const url = new URL(value, origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    if (![origin, 'https://hutba.org'].includes(url.origin)) return null;
    return url.href;
  } catch { return null; }
}
export function feedbackTitle(value: string): string {
  return value.replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 250);
}
export function validateFeedback(form: URLSearchParams, origin: string) {
  const pageUrl = normalizeFeedbackUrl(form.get('pageUrl') ?? '', origin);
  const pageTitle = feedbackTitle(form.get('pageTitle') ?? '');
  const message = (form.get('message') ?? '').trim();
  if (!pageUrl) throw new FeedbackError('Не удалось определить адрес страницы. Откройте форму из нужного урока.');
  if (!pageTitle) throw new FeedbackError('Не удалось определить название урока. Откройте форму из нужного урока.');
  if (message.length < 10 || message.length > 4000) throw new FeedbackError('Опишите ошибку: от 10 до 4000 символов.');
  return {pageUrl, pageTitle, message};
}
