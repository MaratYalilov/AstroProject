/** Reveal QCF only after its exact page font is ready. */
export function initQcfFonts() {
  if (!document.fonts || typeof FontFace === 'undefined') return; // Unicode remains visible in older browsers.
  const fonts = new Map<string, Promise<void>>();
  // All browsers use the same COLRv1 face; CSS selects the theme palette.
  const tajweedSource = '/fonts/mushaf-v4-woff2';
  const styles = document.createElement('style');
  styles.dataset.qcfFonts = '';
  document.head.append(styles);

  function loadPage(page: number, tajweed: boolean) {
    const key = tajweed ? `v4-${page}` : `v2-${page}`;
    if (fonts.has(key)) return;
    const family = tajweed ? `QCFT${page}` : `QCF${2000 + page}`;
    const url = tajweed
      ? `${tajweedSource}/colrv1/p${page}.woff2`
      : `/fonts/mushaf-v2-woff2/p${page}.woff2`;
    // Own the FontFace instead of loading a CSS-connected face: Astro/Vite
    // replaces the initial stylesheet while it hydrates in dev mode. Firefox
    // can leave the old CSS face's load promise pending after that replacement.
    const face = new FontFace(
      family,
      `url("${url}") format("woff2")`,
      { weight: '400', style: 'normal', display: 'block' },
    );
    const loading = face.load().then((loadedFace) => {
      if (loadedFace.status !== 'loaded') {
        throw new Error(`QCF page ${page} is unavailable`);
      }
      // Script-created faces survive stylesheet replacement and take precedence
      // over CSS-connected faces with the same family and descriptors.
      document.fonts.add(loadedFace);
      // Keep React-rendered HTML intact: readiness applies equally to existing
      // and later-inserted verses without mutating hydrated descendants.
      const selector = `.qcf-text[data-qcf-page="${page}"]${tajweed ? '[data-qcf-variant="tajweed"]' : ':not([data-qcf-variant="tajweed"])'}`;
      const palette = tajweed ? `font-palette:--qcf-light-${page};` : '';
      let css = `${selector} > .qcf-fallback{display:none}${selector} > .qcf-glyphs{display:inline;font-family:"${family}" !important;${palette}}`;
      if (tajweed) {
        css += `@font-palette-values --qcf-light-${page}{font-family:"${family}";base-palette:0}`;
        css += `@font-palette-values --qcf-dark-${page}{font-family:"${family}";base-palette:1}`;
        css += `:root.dark ${selector} > .qcf-glyphs{font-palette:--qcf-dark-${page}}`;
      }
      styles.append(document.createTextNode(css));
    }).catch((error) => {
      fonts.delete(key); // Allow a retry on reconnect or when another verse appears.
      console.warn(`QCF${tajweed ? ' v4' : ''} page ${page}: Unicode fallback retained.`, error);
    });
    fonts.set(key, loading);
  }

  function scan(root: ParentNode) {
    const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-qcf-page]'));
    if (root instanceof HTMLElement && root.matches('[data-qcf-page]')) elements.unshift(root);
    for (const element of elements) {
      const page = Number(element.dataset.qcfPage);
      const text = element.querySelector('.qcf-glyphs')?.textContent;
      if (Number.isInteger(page) && page >= 1 && page <= 604 && text) {
        loadPage(page, element.dataset.qcfVariant === 'tajweed');
      }
    }
  }

  // Lessons, theory panels and glossary entries also insert verses after hydration.
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof HTMLElement) scan(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  scan(document.body);
  window.addEventListener('online', () => scan(document.body));
}
