import { useEffect } from 'react';
import { getGlossaryLinkSlug, getGlossaryTarget } from '../../utils/glossaryTarget';

/** Wait for lesson text, including asynchronously loaded theory/comments. */
export function useGlossaryTermTarget(lessonKey: string | undefined) {
  useEffect(() => {
    let observer: MutationObserver | undefined;
    let timer: number | undefined;
    let frame: number | undefined;
    let highlighted: HTMLAnchorElement | undefined;

    const stop = () => {
      observer?.disconnect();
      window.clearTimeout(timer);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      highlighted?.classList.remove('glossary-term-target');
    };

    const locate = () => {
      stop();
      const slug = getGlossaryTarget(window.location.hash);
      const root = document.querySelector('main');
      if (!slug || !root) return;

      const reveal = () => {
        const target = [...root.querySelectorAll<HTMLAnchorElement>('a[href]')]
          .find(link => {
            if (getGlossaryLinkSlug(link.getAttribute('href')!, window.location.origin) !== slug) return false;
            for (let parent = link.parentElement; parent; parent = parent.parentElement) {
              if (parent instanceof HTMLDetailsElement) parent.open = true;
            }
            // Some lessons render separate desktop and mobile copies.
            return link.getClientRects().length > 0;
          });
        if (!target) return;
        if (target === highlighted && target.classList.contains('glossary-term-target')) return;
        highlighted?.classList.remove('glossary-term-target');
        if (frame !== undefined) window.cancelAnimationFrame(frame);
        highlighted = target;
        target.classList.add('glossary-term-target');
        frame = window.requestAnimationFrame(() => {
          target.scrollIntoView({ block: 'center', behavior: 'instant' });
          target.focus({ preventScroll: true });
        });
      };

      observer = new MutationObserver(reveal);
      observer.observe(root, { childList: true, subtree: true });
      timer = window.setTimeout(() => observer?.disconnect(), 20_000);
      reveal();
    };

    locate();
    window.addEventListener('hashchange', locate);
    return () => {
      stop();
      window.removeEventListener('hashchange', locate);
    };
  }, [lessonKey]);
}
