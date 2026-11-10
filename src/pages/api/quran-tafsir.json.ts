import type { APIRoute } from 'astro';
import { originalLocalTafsir } from '../../utils/quranIndexTafsirs';

export const prerender = false;
export const GET: APIRoute = ({ url }) => {
  const entry = originalLocalTafsir(url.searchParams.get('source') ?? '');
  return new Response(JSON.stringify(entry ? { title: entry.title, paragraphs: entry.paragraphs } : { error: 'Толкование не найдено' }), {
    status: entry ? 200 : 404,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex, follow' },
  });
};
