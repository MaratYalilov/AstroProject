// @ts-check
/** Reveal QCF only after its exact ayah (V2) or page (V4) font is ready. */
export function initQcfFonts() {
  if (!document.fonts || typeof FontFace === 'undefined') return; // Unicode remains visible in older browsers.
  // The inline head script and any later module call share one owner per document.
  const host = /** @type {Window & {__hutbaQcfFontsInitialized?: boolean}} */ (window);
  if (host.__hutbaQcfFontsInitialized) return;
  host.__hutbaQcfFontsInitialized = true;
  /** @type {Map<string, Promise<void>>} */
  const fonts = new Map();
  // All browsers use the same COLRv1 face; CSS selects the theme palette.
  const tajweedSource = '/fonts/mushaf-v4-woff2';
  const styles = document.createElement('style');
  styles.dataset.qcfFonts = '';
  document.head.append(styles);

  /** @param {number} page @param {boolean} tajweed @param {string} ayah */
  function loadFont(page, tajweed, ayah) {
    const key = tajweed ? `v4-${page}` : `v2-${ayah}`;
    if (fonts.has(key)) return;
    const family = tajweed ? `QCFT${page}` : `QCFA${ayah}`;
    const url = tajweed
      ? `${tajweedSource}/colrv1/p${page}.woff2`
      : `/fonts/qcf-ayah-v2/${ayah}.woff2`;
    // This is the only source of QCF FontFaces; qcf-v2.css has no font URLs.
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
        throw new Error(`QCF ${key} is unavailable`);
      }
      // Script-created faces survive stylesheet replacement. No competing
      // CSS-connected face may request the same file when glyphs are revealed.
      document.fonts.add(loadedFace);
      // Keep React-rendered HTML intact: readiness applies equally to existing
      // and later-inserted verses without mutating hydrated descendants.
      const selector = tajweed
        ? `.qcf-text[data-qcf-page="${page}"][data-qcf-variant="tajweed"]`
        : `.qcf-text[data-qcf-ayah="${ayah}"]:not([data-qcf-variant="tajweed"])`;
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
      console.warn(`QCF ${key}: Unicode fallback retained.`, error);
    });
    fonts.set(key, loading);
  }

  /** @param {HTMLElement} element */
  function loadForElement(element) {
    const page = Number(element.dataset.qcfPage);
    const text = element.querySelector('.qcf-glyphs')?.textContent;
    const tajweed = element.dataset.qcfVariant === 'tajweed';
    const ayah = element.dataset.qcfAyah ?? '';
    // Only renderer-generated numeric references are accepted as font paths/selectors.
    // Missing V2 identity keeps Unicode visible; never reveal a whole page via one subset.
    if (!tajweed && !/^(?:[1-9]|[1-9]\d|10\d|11[0-4])-(?:[1-9]|[1-9]\d|1\d\d|2[0-7]\d|28[0-6])$/.test(ayah)) return;
    if (Number.isInteger(page) && page >= 1 && page <= 604 && text) {
      loadFont(page, tajweed, ayah);
    }
  }

  // Аяты ниже первого экрана не должны тянуть свои шрифты сразу:
  // на мобильном это сотни килобайт в критическом пути. Грузим, когда блок
  // подходит к экрану; Unicode-фолбэк виден всё это время.
  const observed = new WeakSet();
  const viewportObserver =
    typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(
          (entries, intersectionObserver) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              const element = entry.target;
              if (!(element instanceof HTMLElement)) continue;
              intersectionObserver.unobserve(element);
              loadForElement(element);
            }
          },
          { rootMargin: '100% 0px' },
        );

  /** @param {ParentNode} root */
  function scan(root) {
    const elements = Array.from(root.querySelectorAll('[data-qcf-page]'));
    if (root instanceof HTMLElement && root.matches('[data-qcf-page]')) elements.unshift(root);

    for (const element of elements) {
      if (!(element instanceof HTMLElement) || observed.has(element)) continue;
      // Streaming HTML may insert the wrapper before its glyph text arrives.
      if (!element.querySelector('.qcf-glyphs')?.textContent) continue;
      observed.add(element);

      if (viewportObserver) {
        viewportObserver.observe(element);
      } else {
        loadForElement(element);
      }
    }
  }

  // Lessons, theory panels and glossary entries also insert verses after hydration.
  const observer = new MutationObserver((records) => {
    /** @type {Set<HTMLElement>} */
    const roots = new Set();
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof HTMLElement) roots.add(node);
        // Also finish wrappers whose children arrive in a later HTML chunk.
        const parent = node.parentElement?.closest('[data-qcf-page]');
        if (parent instanceof HTMLElement) roots.add(parent);
      }
    }
    // The parser can report both a parent and many descendants in one batch.
    // Scan each new subtree once instead of repeatedly walking the same article.
    for (const root of roots) {
      let parent = root.parentElement;
      while (parent && !roots.has(parent)) parent = parent.parentElement;
      if (!parent) scan(root);
    }
  });
  // In the head there may be no body yet. Observe the document root so HTML
  // added by the parser starts loading before deferred modules and hydration.
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan(document);
  // После обрыва соединения пробуем ещё раз все аяты: неудачные шрифты
  // остались в очереди, а успешные loadFont отбросит по кэшу.
  window.addEventListener('online', () => {
    for (const element of document.querySelectorAll('[data-qcf-page]')) {
      if (element instanceof HTMLElement) loadForElement(element);
    }
  });
}
