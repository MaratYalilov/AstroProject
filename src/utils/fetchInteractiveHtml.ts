type HtmlReference =
  | { kind: "theory"; subject: string; course: string; source: string }
  | { kind: "sharh"; beit: number };

/** Request only the rendered public material, not its parser or Quran datasets. */
export async function fetchInteractiveHtml(reference: HtmlReference, signal?: AbortSignal): Promise<string> {
  const params = new URLSearchParams(Object.entries(reference).map(([key, value]) => [key, String(value)]));
  const response = await fetch(`/api/interactive-html?${params}`, {
    headers: { Accept: "text/html" },
    signal,
  });
  if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) {
    throw new Error(`Material request failed: ${response.status}`);
  }
  return response.text();
}
