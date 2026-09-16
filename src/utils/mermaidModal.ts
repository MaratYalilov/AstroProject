/**
 * Попап для диаграмм Mermaid.
 *
 * Диаграммы рендерит astro-mermaid (SVG внутри <pre class="mermaid">), причём
 * появляются они в разное время: теория урока — после клика «Открыть теорию»,
 * схемы в .md-уроках — на старте страницы. Поэтому обработчик вешаем
 * делегированно на документ, а не на конкретные элементы.
 *
 * Клик по схеме открывает её в оверлее поверх страницы: масштаб (кнопки
 * и колесо мыши), перетаскивание, закрытие по Esc / клику по фону / крестику.
 */

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const ZOOM_STEP = 1.25;

let modal: HTMLDivElement | null = null;
let restoreFocus: Element | null = null;
let zoomApi: { in: () => void; out: () => void; fit: () => void } | null = null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function svgSize(svg: SVGSVGElement): { width: number; height: number } {
  const rect = svg.getBoundingClientRect();
  const width = parseFloat(svg.getAttribute("width") || "") || rect.width;
  const height = parseFloat(svg.getAttribute("height") || "") || rect.height;

  return { width: width || rect.width, height: height || rect.height };
}

export function closeMermaidModal(): void {
  if (!modal) return;

  modal.remove();
  modal = null;
  zoomApi = null;
  document.documentElement.classList.remove("mermaid-modal-open");
  document.body.style.overflow = "";

  if (restoreFocus instanceof HTMLElement) restoreFocus.focus();
  restoreFocus = null;
}

export function openMermaidModal(source: SVGSVGElement): void {
  closeMermaidModal();

  const { width, height } = svgSize(source);
  if (!width || !height) return;

  restoreFocus = document.activeElement;
  modal = document.createElement("div");
  modal.className = "mermaid-modal";
  modal.innerHTML = `
    <div class="mermaid-modal__backdrop" data-mermaid-close></div>
    <div class="mermaid-modal__panel" role="dialog" aria-modal="true" aria-label="Диаграмма">
      <div class="mermaid-modal__toolbar">
        <button type="button" class="mermaid-modal__btn" data-zoom-out title="Уменьшить">&minus;</button>
        <button type="button" class="mermaid-modal__btn mermaid-modal__btn--value" data-zoom-fit title="Вписать в окно">100%</button>
        <button type="button" class="mermaid-modal__btn" data-zoom-in title="Увеличить">+</button>
        <button type="button" class="mermaid-modal__btn mermaid-modal__btn--close" data-mermaid-close title="Закрыть (Esc)">Закрыть ✕</button>
      </div>
      <div class="mermaid-modal__stage">
        <div class="mermaid-modal__canvas"></div>
      </div>
    </div>
  `;

  const stage = modal.querySelector<HTMLDivElement>(".mermaid-modal__stage");
  const canvas = modal.querySelector<HTMLDivElement>(".mermaid-modal__canvas");
  const valueBtn = modal.querySelector<HTMLButtonElement>("[data-zoom-fit]");
  if (!stage || !canvas || !valueBtn) return;

  // Клон: оригинал остаётся на странице, попап можно закрыть в любой момент.
  const clone = source.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute("data-first-render");
  clone.removeAttribute("style");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  canvas.appendChild(clone);

  let scale = 1;
  let x = 0;
  let y = 0;

  const apply = () => {
    canvas.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    valueBtn.textContent = `${Math.round(scale * 100)}%`;
  };

  const fit = () => {
    const box = stage.getBoundingClientRect();
    const padding = 16;
    scale = clamp(
      Math.min(1, (box.width - padding) / width, (box.height - padding) / height),
      MIN_SCALE,
      MAX_SCALE,
    );
    x = (box.width - width * scale) / 2;
    y = (box.height - height * scale) / 2;
    apply();
  };

  const zoomAt = (factor: number, cx: number, cy: number) => {
    const next = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
    const k = next / scale;
    x = cx - (cx - x) * k;
    y = cy - (cy - y) * k;
    scale = next;
    apply();
  };

  const zoomCenter = (factor: number) => {
    const box = stage.getBoundingClientRect();
    zoomAt(factor, box.width / 2, box.height / 2);
  };

  // Перетаскивание схемы мышью/пальцем.
  let dragId: number | null = null;
  let dragX = 0;
  let dragY = 0;

  stage.addEventListener("pointerdown", (event) => {
    if (dragId !== null) return;
    dragId = event.pointerId;
    dragX = event.clientX;
    dragY = event.clientY;
    stage.classList.add("is-dragging");
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener("pointermove", (event) => {
    if (dragId !== event.pointerId) return;
    x += event.clientX - dragX;
    y += event.clientY - dragY;
    dragX = event.clientX;
    dragY = event.clientY;
    apply();
  });

  const endDrag = (event: PointerEvent) => {
    if (dragId !== event.pointerId) return;
    dragId = null;
    stage.classList.remove("is-dragging");
  };

  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  stage.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const box = stage.getBoundingClientRect();
      zoomAt(
        event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP,
        event.clientX - box.left,
        event.clientY - box.top,
      );
    },
    { passive: false },
  );

  stage.addEventListener("dblclick", fit);

  modal
    .querySelector("[data-zoom-in]")
    ?.addEventListener("click", () => zoomCenter(ZOOM_STEP));
  modal
    .querySelector("[data-zoom-out]")
    ?.addEventListener("click", () => zoomCenter(1 / ZOOM_STEP));
  valueBtn.addEventListener("click", fit);

  modal.addEventListener("click", (event) => {
    const target = event.target as Element | null;
    if (target?.closest("[data-mermaid-close]")) closeMermaidModal();
  });

  zoomApi = {
    in: () => zoomCenter(ZOOM_STEP),
    out: () => zoomCenter(1 / ZOOM_STEP),
    fit,
  };

  document.body.appendChild(modal);
  document.documentElement.classList.add("mermaid-modal-open");
  document.body.style.overflow = "hidden";

  fit();
  valueBtn.focus();
}

function onKeydown(event: KeyboardEvent): void {
  if (!modal) return;

  switch (event.key) {
    case "Escape":
      event.preventDefault();
      closeMermaidModal();
      break;
    case "+":
    case "=":
      event.preventDefault();
      zoomApi?.in();
      break;
    case "-":
    case "_":
      event.preventDefault();
      zoomApi?.out();
      break;
    case "0":
      event.preventDefault();
      zoomApi?.fit();
      break;
    default:
      break;
  }
}

/** Вешает делегированный обработчик кликов по диаграммам. Идемпотентно. */
export function initMermaidModal(): void {
  if (typeof document === "undefined") return;
  if (document.documentElement.hasAttribute("data-mermaid-modal-init")) return;

  document.documentElement.setAttribute("data-mermaid-modal-init", "1");

  document.addEventListener("keydown", onKeydown);

  document.addEventListener("click", (event) => {
    const target = event.target as Element | null;
    const pre = target?.closest?.("pre.mermaid");
    if (!pre || !pre.hasAttribute("data-processed")) return;

    const svg = pre.querySelector("svg");
    if (svg) openMermaidModal(svg);
  });
}
