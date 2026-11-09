import type { APIRoute } from 'astro';
import { chaptersFor, readView, searchLibrary } from '../../lib/hadith/reader';
import { searchGradeOptions } from '../../lib/hadith/grading';

export const prerender = false;
export const GET: APIRoute = ({ url }) => {
  const params = url.searchParams;
  let data: unknown = null;
  if (params.get('action') === 'chapters') data = chaptersFor(params.get('collection') ?? '', Number(params.get('book')));
  if (params.get('action') === 'read') data = readView(params.get('path') ?? '/hadith-sbornik');
  if (params.get('action') === 'search') {
    const rawPage = Number(params.get('page') ?? 1);
    const page = Number.isFinite(rawPage) ? Math.max(1, Math.min(10000, Math.floor(rawPage))) : 1;
    const grade = params.get('grade') ?? '';
    if (grade && !searchGradeOptions.some(option => option.id === grade)) return new Response(JSON.stringify({ error: 'Неизвестная оценка достоверности' }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    data = searchLibrary(params.get('q') ?? '', params.get('scope') ?? '', page, grade);
  }
  return new Response(JSON.stringify(data ?? { error: 'Раздел не найден' }), {
    status: data === null ? 404 : 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, follow' },
  });
};
