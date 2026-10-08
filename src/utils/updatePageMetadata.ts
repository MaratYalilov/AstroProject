type PageMetadata = {
  title: string;
  description: string;
  ogTitle: string;
  ogType?: string;
  canonicalPath: string;
};

export function updatePageMetadata(metadata: PageMetadata): void {
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const canonicalUrl = new URL(
    metadata.canonicalPath,
    canonical?.href || window.location.href,
  ).href;

  const updateMeta = (attribute: 'name' | 'property', key: string, content: string) => {
    let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(attribute, key);
      document.head.appendChild(meta);
    }
    meta.content = content;
  };

  document.title = metadata.title;
  updateMeta('name', 'description', metadata.description);
  updateMeta('property', 'og:title', metadata.ogTitle);
  updateMeta('property', 'og:description', metadata.description);
  updateMeta('property', 'og:url', canonicalUrl);
  if (metadata.ogType) updateMeta('property', 'og:type', metadata.ogType);

  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalUrl;
}
