import alphabetData from "../content/lessons/quran/muallim-sani/AlphabetLetter.json";

/** Озвучка названий букв в таблицах теории из того же набора, что и урок 0. */
export function enhanceAlphabetAudio(root: HTMLElement): () => void {
  if (!root.querySelector("button[data-alphabet-letter]")) return () => {};

  const audio = document.createElement("audio");
  audio.preload = "none";
  audio.hidden = true;
  audio.dataset.alphabetAudio = "true";
  root.append(audio);

  let activeButton: HTMLButtonElement | null = null;
  let playbackRequest = 0;

  const resetButton = () => {
    activeButton?.setAttribute("aria-pressed", "false");
    activeButton?.removeAttribute("aria-busy");
    activeButton = null;
  };

  const handleClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>("button[data-alphabet-letter]");
    if (!button || !root.contains(button)) return;
    const letter = alphabetData.find(item => item.char === button.dataset.alphabetLetter);
    if (!letter) return;

    const request = ++playbackRequest;
    if (activeButton === button && !audio.paused) {
      audio.pause();
      resetButton();
      return;
    }

    audio.pause();
    resetButton();
    document.querySelectorAll("audio").forEach(other => {
      if (other !== audio && !other.paused) other.pause();
    });

    activeButton = button;
    button.setAttribute("aria-pressed", "true");
    button.setAttribute("aria-busy", "true");
    button.title = "Слушать название буквы";
    audio.src = letter.audio;
    void audio.play().then(() => {
      if (request === playbackRequest) button.removeAttribute("aria-busy");
    }).catch(() => {
      if (request !== playbackRequest) return;
      resetButton();
      button.title = "Не удалось загрузить аудио. Нажмите, чтобы повторить.";
    });
  };

  const handleOtherPlay = (event: Event) => {
    if (event.target !== audio && !audio.paused) {
      ++playbackRequest;
      audio.pause();
      resetButton();
    }
  };

  audio.addEventListener("ended", resetButton);
  audio.addEventListener("error", resetButton);
  audio.addEventListener("pause", () => {
    if (audio.paused) resetButton();
  });
  root.addEventListener("click", handleClick);
  document.addEventListener("play", handleOtherPlay, true);

  return () => {
    ++playbackRequest;
    audio.pause();
    resetButton();
    audio.remove();
    root.removeEventListener("click", handleClick);
    document.removeEventListener("play", handleOtherPlay, true);
  };
}
