import { useEffect } from "react";

/**
 * Диаграммы Mermaid в контенте, который рендерится на клиенте.
 *
 * Теория уроков подгружается как raw Markdown и превращается в HTML через
 * marked — то есть минуя markdown-конвейер Astro, в котором блоки ```mermaid
 * обрабатывает интеграция astro-mermaid (astro.config.mjs). Поэтому здесь:
 *
 *  1) приводим блоки кода к виду, который понимает astro-mermaid:
 *     <pre class="mermaid">…</pre> (внутри — текст диаграммы; marked отдаёт
 *     его уже с HTML-сущностями, а браузер вернёт их в текст при вставке в DOM);
 *  2) просим astro-mermaid отрисовать диаграммы, которые появились в DOM уже
 *     после загрузки страницы: его клиентский скрипт ищет pre.mermaid только
 *     при старте и реагирует на смену темы / на событие astro:after-swap.
 */

/** Признак диаграммы в готовом HTML. */
const MERMAID_MARKER = 'class="mermaid"';

/** Блок кода ```mermaid в том виде, в каком его отдаёт marked. */
const MARKED_MERMAID_BLOCK =
  /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g;

/** Есть ли в HTML хотя бы одна диаграмма Mermaid. */
export function hasMermaid(html: string | null | undefined): boolean {
  return typeof html === "string" && html.includes(MERMAID_MARKER);
}

/** Заменяет блоки ```mermaid на <pre class="mermaid">, понятный astro-mermaid. */
export function prepareMermaidBlocks(html: string): string {
  if (!html.includes("language-mermaid")) return html;

  return html.replace(MARKED_MERMAID_BLOCK, '<pre class="mermaid">$1</pre>');
}

/** Остались ли в DOM ещё не отрисованные диаграммы. */
function hasUnprocessedMermaid(): boolean {
  if (typeof document === "undefined") return false;

  return document.querySelector("pre.mermaid:not([data-processed])") !== null;
}

/**
 * Просим astro-mermaid отрисовать диаграммы, добавленные в DOM после загрузки
 * страницы. Интеграция всегда слушает событие astro:after-swap и на него
 * дорисовывает все ещё не обработанные pre.mermaid.
 */
export function requestMermaidRender(): void {
  if (typeof document === "undefined") return;

  document.dispatchEvent(new Event("astro:after-swap"));
}

/** Хук: отрисовать диаграммы после того, как HTML попал в DOM. */
export function useMermaidRender(html: string | null | undefined): void {
  useEffect(() => {
    if (!hasMermaid(html)) return;

    const timers: number[] = [];

    // rAF — чтобы дождаться коммита DOM (HTML вставляется через
    // dangerouslySetInnerHTML) и гарантированно увидеть pre.mermaid.
    const frame = requestAnimationFrame(() => {
      requestMermaidRender();

      // Страховка на случай, если скрипт astro-mermaid ещё не успел
      // зарегистрировать свой обработчик события: повторяем запрос один раз и
      // только если диаграммы действительно остались необработанными.
      timers.push(
        window.setTimeout(() => {
          if (hasUnprocessedMermaid()) requestMermaidRender();
        }, 1200),
      );
    });

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [html]);
}
