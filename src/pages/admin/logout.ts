import type { APIRoute } from 'astro';
import { adminSession, adminCookieName, validCsrf, destroyAdminSession } from '../../lib/feedback/auth';
import { privateFeedbackHeaders, requireSameOrigin, readFeedbackForm } from '../../lib/feedback/http';
import { FeedbackError } from '../../lib/feedback/validation';
export const prerender = false;
export const POST: APIRoute = async ({request, cookies, redirect}) => {
  const headers = new Headers(); privateFeedbackHeaders(headers);
  try {
    requireSameOrigin(request);
    const session = await adminSession(cookies.get(adminCookieName)?.value);
    const form = await readFeedbackForm(request);
    if (!session || !validCsrf(form.get('csrf') ?? '', session)) throw new FeedbackError('Обновите страницу и попробуйте снова.', 403);
    await destroyAdminSession(cookies.get(adminCookieName)!.value);
    cookies.delete(adminCookieName, {path: '/admin'});
    const response = redirect('/admin/login', 303);
    for (const [key, value] of headers) response.headers.set(key, value);
    return response;
  } catch (cause) {
    return new Response(cause instanceof FeedbackError ? cause.message : 'Не удалось выйти.', {status: cause instanceof FeedbackError ? cause.status : 503, headers});
  }
};
