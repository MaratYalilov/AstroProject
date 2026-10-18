import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import { renderTheoryHtml, renderSharhHtml } from "../../lib/interactive/serverHtml";

export const prerender = false;

export const GET: APIRoute = async ({ url, request }) => {
  const params = url.searchParams;
  let html: string | null;
  if (params.get("kind") === "theory") {
    const subject = params.get("subject");
    const course = params.get("course");
    const source = params.get("source");
    if (!subject || !course || !source) return new Response("Missing theory reference", { status: 400 });
    html = await renderTheoryHtml(subject, course, source);
  } else if (params.get("kind") === "sharh" && /^[1-9]\d{0,2}$/.test(params.get("beit") ?? "")) {
    html = await renderSharhHtml(Number(params.get("beit")));
  } else {
    return new Response("Invalid material reference", { status: 400 });
  }
  if (html === null) return new Response("Material not found", { status: 404 });

  const etag = `"${createHash("sha256").update(html).digest("hex")}"`;
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "public, max-age=0, must-revalidate",
    "X-Content-Type-Options": "nosniff",
    ETag: etag,
  };
  // Reverse proxies may weaken ETags when compressing an otherwise identical response.
  const unchanged = request.headers.get("if-none-match")?.split(",")
    .some(value => value.trim() === "*" || value.trim().replace(/^W\//, "") === etag);
  return unchanged
    ? new Response(null, { status: 304, headers })
    : new Response(html, { headers });
};
