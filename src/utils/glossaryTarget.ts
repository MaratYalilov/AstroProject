/** The fragment identifies a term without changing the lesson's canonical URL. */
export function withGlossaryTarget(href: string, slug: string): string {
  return `${href.split('#')[0]}#term=${encodeURIComponent(slug)}`;
}

export function getGlossaryTarget(hash: string): string | null {
  if (!hash.startsWith('#term=')) return null;
  try {
    return decodeURIComponent(hash.slice(6)) || null;
  } catch {
    return null;
  }
}

export function getGlossaryLinkSlug(href: string, origin = 'https://hutba.org'): string | null {
  try {
    const url = new URL(href, origin);
    if (url.origin !== origin && url.origin !== 'https://hutba.org') return null;
    const match = /^\/glossary\/([^/]+)\/?$/.exec(url.pathname);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/** Comments can contain HTML anchors or Markdown links before rendering. */
export function containsGlossaryTermLink(text: string, slug: string): boolean {
  const links = text.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))|\[[^\]]*\]\(<?([^\s)>]+)/gi);
  for (const match of links) {
    const href = match[1] ?? match[2] ?? match[3] ?? match[4];
    if (getGlossaryLinkSlug(href) === slug) return true;
  }
  return false;
}
