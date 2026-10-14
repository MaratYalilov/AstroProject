export type QuranWaslMode = "off" | "basic" | "all";

/** One reading-hint mode and one small menu for all ayahs on the page. */
export function initQuranWaslHints() {
  const selector = "[data-quran-wasl-toggle]";
  const labels: Record<QuranWaslMode, string> = {
    off: "Выключены",
    basic: "В начале и после остановок",
    all: "Все слова с хамзой васль",
  };
  const initial = document.querySelector<HTMLElement>("[data-wasl-mode-initial]")?.dataset.waslModeInitial;
  let mode: QuranWaslMode = initial === "off" || initial === "all" ? initial : "basic";
  let menu: HTMLDivElement | undefined;
  let activeButton: HTMLButtonElement | undefined;
  document.documentElement.dataset.quranWaslMode = mode;

  function syncButtons(root: ParentNode) {
    const buttons = [...root.querySelectorAll<HTMLButtonElement>(selector)];
    if (root instanceof HTMLButtonElement && root.matches(selector)) buttons.unshift(root);
    for (const button of buttons) {
      const label = `Подсказки хамзы васль: ${labels[mode].toLowerCase()}`;
      button.setAttribute("aria-label", label);
      button.title = label;
      button.setAttribute("aria-expanded", String(button === activeButton));
    }
  }

  function closeMenu(returnFocus = false) {
    const previous = activeButton;
    if (menu) menu.hidden = true;
    activeButton = undefined;
    previous?.setAttribute("aria-expanded", "false");
    if (returnFocus) previous?.focus({ preventScroll: true });
  }

  function positionMenu() {
    if (!menu || !activeButton) return;
    const anchor = activeButton.getBoundingClientRect();
    const bounds = menu.getBoundingClientRect();
    const gap = 8;
    const inset = 12;
    const left = Math.max(inset, Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - inset));
    const above = anchor.top - bounds.height - gap;
    const top = above >= inset ? above : Math.max(inset, Math.min(anchor.bottom + gap, window.innerHeight - bounds.height - inset));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  function ensureMenu() {
    if (menu) return menu;
    menu = document.createElement("div");
    menu.id = "quran-wasl-menu";
    menu.className = "quran-wasl-menu";
    menu.hidden = true;
    menu.setAttribute("role", "dialog");
    menu.setAttribute("aria-label", "Подсказки хамзы васль");
    menu.innerHTML = `<fieldset><legend>Подсказки хамзы васль</legend>${Object.entries(labels).map(([value, label]) =>
      `<label><input type="radio" name="quran-wasl-mode" value="${value}"><span>${label}</span></label>`
    ).join("")}</fieldset>`;
    menu.addEventListener("change", event => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || !(input.value in labels)) return;
      mode = input.value as QuranWaslMode;
      document.documentElement.dataset.quranWaslMode = mode;
      closeMenu(true);
      syncButtons(document);
      document.dispatchEvent(new CustomEvent("quran-wasl-mode-change", { detail: { mode } }));
    });
    document.body.append(menu);
    return menu;
  }

  document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>(selector);
    if (button) {
      event.preventDefault();
      if (button === activeButton) { closeMenu(); return; }
      closeMenu();
      const popup = ensureMenu();
      // Содержимое вне модального dialog недоступно для мыши и фокуса.
      const host = button.closest<HTMLDialogElement>("dialog[open]") ?? document.body;
      if (popup.parentElement !== host) host.append(popup);
      activeButton = button;
      for (const input of popup.querySelectorAll<HTMLInputElement>("input")) input.checked = input.value === mode;
      popup.hidden = false;
      button.setAttribute("aria-expanded", "true");
      positionMenu();
      popup.querySelector<HTMLInputElement>("input:checked")?.focus({ preventScroll: true });
    } else if (menu && !menu.contains(event.target)) closeMenu();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && activeButton) { event.preventDefault(); closeMenu(true); }
  });
  document.addEventListener("focusin", event => {
    if (activeButton && event.target instanceof Node && !menu?.contains(event.target) && event.target !== activeButton) closeMenu();
  });
  document.addEventListener("close", event => {
    if (event.target instanceof HTMLDialogElement && activeButton && event.target.contains(activeButton)) closeMenu();
  }, true);
  window.addEventListener("resize", positionMenu);
  document.addEventListener("scroll", () => closeMenu(), true);
  syncButtons(document);
  new MutationObserver(records => {
    if (activeButton && !activeButton.isConnected) closeMenu();
    for (const record of records) for (const node of record.addedNodes) {
      if (node instanceof HTMLElement) syncButtons(node);
    }
  }).observe(document.body, { childList: true, subtree: true });
}
