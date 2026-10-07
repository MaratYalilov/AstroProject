import type { APIRoute } from "astro";
import { renderSocialCard } from "../utils/socialCard";

export const prerender = false;

// Keep repeated crawler requests inexpensive without retaining unlimited titles.
const cache = new Map<string, Promise<Buffer>>();
const normalize = (value: string | null, limit: number): string =>
  (value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);

export const GET: APIRoute = async ({ url }) => {
  const card = {
    title: normalize(url.searchParams.get("title"), 240) || "HUTBA",
    subtitle: normalize(url.searchParams.get("subtitle"), 100),
    subject: normalize(url.searchParams.get("subject"), 30),
  };
  const key = JSON.stringify(card);
  let pending = cache.get(key);
  if (!pending) {
    pending = renderSocialCard(card).catch((error) => {
      cache.delete(key);
      throw error;
    });
    if (cache.size >= 64) cache.delete(cache.keys().next().value!);
  } else {
    cache.delete(key);
  }
  cache.set(key, pending);
  return new Response(new Uint8Array(await pending), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
