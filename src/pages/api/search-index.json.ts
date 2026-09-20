import type { APIRoute } from "astro";
import { getSearchIndex } from "../../lib/search/buildSearchIndex";

// Индекс собирается один раз при билде и отдаётся как статический JSON.
export const prerender = true;

/**
 * GET /api/search-index.json — поисковый индекс по всем урокам сайта.
 * Используется компонентами поиска в навбаре и на странице /search.
 */
export const GET: APIRoute = async () => {
  const index = await getSearchIndex();

  return new Response(JSON.stringify(index), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Индекс меняется только при билде — можно кэшировать надолго
      "Cache-Control": "public, max-age=3600",
    },
  });
};
