import type { APIRoute } from 'astro';
import { indexDownload } from '../../../utils/quranIndexReview';

export const prerender = false;
export const GET: APIRoute = () => new Response(indexDownload, {
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': 'attachment; filename="quran-merged-reviewed-index.json"',
    'X-Robots-Tag': 'noindex',
  },
});
