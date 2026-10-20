import { isIP } from 'node:net';
import { FeedbackError } from './validation';

export function privateFeedbackHeaders(headers: Headers) {
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'same-origin');
  headers.set('Content-Security-Policy', "form-action 'self'; frame-ancestors 'none'; base-uri 'self'");
}
export function feedbackRedirect(location: string, status = 303) {
  const headers = new Headers({Location: location});
  privateFeedbackHeaders(headers);
  return new Response(null, {status, headers});
}
export function requireSameOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    throw new FeedbackError('Не удалось проверить форму. Обновите страницу и попробуйте снова.', 403);
  }
}
/** Only the configured loopback nginx proxy can supply the real client IP. */
export function feedbackClientKey(request: Request, address: string) {
  const forwarded = request.headers.get('x-real-ip') ?? '';
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address) && isIP(forwarded) ? forwarded : address;
}
const limits = new Map<string, {count: number; until: number}>();
export function allowFeedbackRequest(key: string, max: number, period: number, now = Date.now()) {
  for (const [key, entry] of limits) if (entry.until <= now) limits.delete(key);
  const entry = limits.get(key);
  if (!entry) {
    if (limits.size >= 10000) return false;
    limits.set(key, {count: 1, until: now + period});
    return true;
  }
  entry.count++;
  return entry.count <= max;
}
export async function readFeedbackForm(request: Request): Promise<URLSearchParams> {
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) throw new FeedbackError('Не удалось прочитать форму.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new FeedbackError('Заполните форму.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 64000) { await reader.cancel(); throw new FeedbackError('Сообщение слишком большое.', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}
export function adminDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dubai'}).format(new Date(value));
}
