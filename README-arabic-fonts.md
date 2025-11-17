
---

## Цель

Сделать так, чтобы **арабский текст** в Astro + Tailwind:

* показывался красивым шрифтом (Amiri / Scheherazade),
* шёл **справа налево**,
* не ломал остальной текст,
* работал как в `.astro`, так и в `md/mdx`.

---

## 1. Файлы шрифтов

**Куда положил:**

```text
public/
 ┗ fonts/
    ┣ Amiri-Bold.ttf
    ┣ Amiri-BoldItalic.ttf
    ┣ Amiri-Italic.ttf
    ┗ Amiri-Regular.ttf
```

> Важно: папка именно `public/fonts`,
> чтобы шрифты открывались по URL типа `/fonts/Amiri-Regular.ttf`.

Проверка в браузере:

* Открыть `http://localhost:4321/fonts/Amiri-Regular.ttf`
* Если файл скачивается — всё ок.

---

## 2. Tailwind: подключение шрифтов и классов

Файл: `src/styles/tailwind.css`

### 2.1. Подключение шрифтов через `@font-face`

В самом начале файла (до `@tailwind base;`):

```css
@font-face {
  font-family: "AmiriLocal";
  src: url("/fonts/Amiri-Regular.ttf") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "AmiriLocal";
  src: url("/fonts/Amiri-Bold.ttf") format("truetype");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "AmiriLocal";
  src: url("/fonts/Amiri-Italic.ttf") format("truetype");
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}

@font-face {
  font-family: "AmiriLocal";
  src: url("/fonts/Amiri-BoldItalic.ttf") format("truetype");
  font-weight: 700;
  font-style: italic;
  font-display: swap;
}
```

### 2.2. Базовые Tailwind-директивы

Дальше — как обычно:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 2.3. Глобальные стили и арабский текст

Внутри `@layer base` (там уже были переменные темы и `body`), добавил такие классы:

```css
@layer base {
  /* ... твои :root, .dark, body и т.п. ... */

  /* арабский inline-текст */
  .arab {
    @apply text-[1.1em] leading-relaxed;
    direction: rtl !important;
    unicode-bidi: isolate;
    font-family:
      "AmiriLocal",
      "Amiri",
      "Scheherazade New",
      "Noto Naskh Arabic",
      Tahoma,
      Arial,
      sans-serif !important;
  }

  /* арабский блок отдельной строкой */
  .arab-block {
    @apply block text-[1.3em] leading-loose my-3 text-center;
    direction: rtl !important;
    unicode-bidi: isolate;
    font-family:
      "AmiriLocal",
      "Amiri",
      "Scheherazade New",
      "Noto Naskh Arabic",
      Tahoma,
      Arial,
      sans-serif !important;
  }

  .arab-strong {
    @apply font-semibold;
  }
}
```

* `direction: rtl` + `unicode-bidi: isolate` — чтобы арабский шёл справа налево и не ломал окружение.
* `!important` — чтобы перебить Tailwind Typography (`prose`), если используется.
* `AmiriLocal` — твой локальный шрифт из `/public/fonts`.
* Остальные — fallback’и.

---

## 3. Tailwind: чтобы он вообще увидел `.arab`

Файл: `tailwind.config.mjs`

Главная проблема была тут: Tailwind не видел твои `md/mdx` → выкидывал `.arab` как «неиспользуемый».

**Что добавил в конфиг:**

```js
export default {
  darkMode: ["class"],
  content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}",
    "./src/content/**/*.{md,mdx}",   // если уроки/статьи лежат тут
  ],
  // ...
};
```

Смысл:
Tailwind **сканирует все эти файлы** и видит `class="arab"` →
поэтому **не выбрасывает этот класс** при сборке, и `.arab` реально попадает в итоговый CSS.

---

## 4. Как этим пользоваться

### 4.1. Inline арабский текст

```html
<p>
  645&nbsp;– <span class="arab">عَنْ عائشة رضي الله عنها ...</span>
</p>
```

### 4.2. Целый абзац арабского текста

```html
<p class="arab">
  عَنْ عائشة رضي الله عنها قَالَتْ كُنْتُ أَغْتَسِلُ أَنَا ...
</p>
```

### 4.3. Аят/фраза отдельным блоком по центру

```html
<p class="arab-block">
  ﴿وَعَلَّمَ ءَادَمَ الأَسْمَآءَ كُلَّهَا﴾
</p>
```

---

## 5. Что делать, если «вдруг опять не работает»

Быстрый чек-лист:

1. **Шрифты**

   * `public/fonts/Amiri-Regular.ttf` и остальные на месте.
   * `http://localhost:4321/fonts/Amiri-Regular.ttf` скачивается.

2. **Tailwind content**

   * В `tailwind.config.mjs` есть:

     ```js
     "./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}",
     "./src/content/**/*.{md,mdx}",
     ```

3. **Классы в HTML**

   * В рендере реально есть `<span class="arab">...` или `<p class="arab">...`.

4. **DevTools**

   * Выделяешь элемент с классом `arab`.
   * В Styles видишь блок `.arab { ... font-family: AmiriLocal ... }`.
   * Если не видишь — значит что-то сломалось в `tailwind.css` или в импорте стилей.

5. **Жёсткий перезапуск**

   * Остановить dev-сервер (`Ctrl+C`), запустить `npm run dev`.
   * В браузере — `Ctrl+F5`.

---

