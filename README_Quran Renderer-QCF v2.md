Ниже набросал README в виде файла — можешь просто сохранить как
`src/utils/README-quran-renderer.md` или `docs/quran-renderer.md`.

---

# Quran Renderer + QCF v2 — как всё устроено

Этот документ нужен, чтобы через полгода было понятно:

* откуда берётся текст аятов,
* как работает парсер `{Quran}2:255{/Quran}`,
* почему арабский рендерится через QCF-шрифты,
* что пересобирать, если что-то сломалось или нужно обновить данные.

---

## 1. Общая схема

Пайплайн такой:

1. В Markdown/контенте пишем теги:

   ```text
   {Quran}2:255{/Quran}
   ```

2. При сборке Astro контент прогоняется через `replaceQuranTags.ts`.

3. `replaceQuranTags.ts` находит все `{Quran}S:A{/Quran}`, парсит `S` (sura) и `A` (ayah), и для каждого вызывает:

   ```ts
   renderAyahBlock(surah, ayah)
   ```

4. `renderAyahBlock` из `quranRenderer.ts`:

   * берёт перевод аята (Кулиев) из локальных JSON;
   * берёт **code_v2** и **page** для mushaf-рендера из `quran-qcf-v2.json`;
   * берёт метаданные суры (название, смысл) из `surahs.json`;
   * возвращает готовый HTML-блок с:

     * арабским текстом через QCF v2 (строка глифов);
     * изображением аята `/ayat/{surah}_{ayah}.png` (если есть);
     * переводом;
     * строкой источника вида `аль-Бакара-Корова, 2:222`;
     * аудио `/mp3/{sss}/{sss}{aaa}.mp3`.

5. В React/страницах `currentLesson.html` уже содержит финальный HTML (без `{Quran}`), и дальше просто рендерится через `dangerouslySetInnerHTML`.

---

## 2. Файлы и их роли

### Данные

* `src/data/quran-uthmani-hafs.json`
  Арабский текст аятов (Утманский риуаят). Структура:

  ```json
  {
    "quran": {
      "quran-uthmani-hafs": {
        "...": {
          "id": 1,
          "surah": 1,
          "ayah": 1,
          "verse": "بِسْمِ اللَّهِ..."
        }
      }
    }
  }
  ```

  Сейчас используется только для карты `arabicMap` (на будущее / отладка).

* `src/data/quran-kuliev-ru.json`
  Перевод Кулиева. Структура аналогична:

  ```json
  {
    "quran": {
      "ru.kuliev": {
        "...": {
          "id": 1,
          "surah": 1,
          "ayah": 1,
          "verse": "Во имя Аллаха..."
        }
      }
    }
  }
  ```

  Отсюда заполняется `translationMap["s:a"]`.

* `src/data/surahs.json`
  Метаданные о сурах. Ожидаемый тип:

  ```ts
  type SurahMeta = {
    num: number;          // номер суры (1..114)
    arabic_name: string;  // арабское название
    name_ru: string;      // русское название ("аль-Бакара")
    meaning_ru: string;   // смысловое ("Корова")
    ayahs: number;
    start: number;
    type: string;
    rukus: number;
  };
  ```

  В рендере используется `name_ru` и `meaning_ru` для строки источника.

* `src/data/quran-qcf-v2.json`
  **Главный файл для mushaf-рендера.** Собирается отдельным скриптом (см. ниже). Структура:

  ```json
  {
    "2:3": {
      "page": 2,
      "code_v2": "ﱁﱂﱃ..." 
    },
    "2:222": {
      "page": 35,
      "code_v2": "ﲐﲑﲒ..."
    },
    ...
  }
  ```

  * `page` — номер страницы Mushaf al-Madina (1..604);
  * `code_v2` — строка QCF v2-глифов для **конкретного аята** (готова к отдаче шрифту).

---

### Скрипты

* **Python:** сборка `quran-qcf-v2.json` из API Quran.com

  Файл (условное имя): `scripts/build_quran_qcf_v2.py`

  Делает:

  * ходит в `https://api.quran.com/api/v4/verses/by_chapter/{chapter}` для всех 114 сур;
  * для каждого аята забирает поля `verse_key`, `code_v2`, `v2_page`;
  * собирает JSON вида `"s:a" → { page, code_v2 }`;
  * пишет результат в `src/data/quran-qcf-v2.json`.

  Запуск:

  ```bash
  python scripts/build_quran_qcf_v2.py
  ```

* **Node (ESM):** генерация CSS для шрифтов по страницам

  Файл: `scripts/generate-qcf-v2-css.mjs`

  Делает:

  * для страниц 1..604 считает номер шрифта: `fontId = 2000 + page` → `QCF2001.ttf` … `QCF2604.ttf`;
  * Генерирует `src/styles/qcf-v2.css`:

    ```css
    @font-face {
      font-family: "QCF2001";
      src: url("/fonts/mushaf-v2/QCF2001.ttf") format("truetype");
    }

    .qcf-page-1 {
      font-family: "QCF2001" !important;
    }

    /* ... до 604 */

    .qcf-ayah {
      direction: rtl;
      text-align: right;
      font-size: 1.5rem;
      line-height: 2.5;
      unicode-bidi: isolate;
    }
    ```

  Запуск:

  ```bash
  node scripts/generate-qcf-v2-css.mjs
  ```

---

### Шрифты и стили

* `public/fonts/mushaf-v2/QCF2001.ttf` … `QCF2604.ttf`
  Набор QCF v2-страничных шрифтов из репозитория `qpc-fonts` (`mushaf-v2`).

* `src/styles/qcf-v2.css`
  Сгенерированный CSS (см. выше).

* `src/styles/tailwind.css`

  Важно:

  * в самом верху:

    ```css
    @import "./qcf-v2.css";
    ```

    (иначе PostCSS ругается, и шрифты не подключаются).

  * у `.quran-ayah-block__arabic` **нет своего `font-family`**, чтобы не перебивать QCF:

    ```css
    .quran-ayah-block__arabic {
      text-align: right;
      margin-bottom: 12px;
      font-size: 1.5em;
      line-height: 2.5;
      direction: rtl !important;
      unicode-bidi: isolate;
      /* font-family не задаём, отвечает qcf-ayah + qcf-page-N */
    }
    ```

---

### Логика

* `src/utils/quranRenderer.ts`

  Отвечает за:

  1. Импорт JSON (через `?json`, чтобы Astro/Vite не ругались):

     ```ts
     import surahsData from "../data/surahs.json?json";
     import quranUthmaniData from "../data/quran-uthmani-hafs.json?json";
     import quranKulievData from "../data/quran-kuliev-ru.json?json";
     import qcfV2Data from "../data/quran-qcf-v2.json?json";
     ```

  2. Построение карт:

     * `arabicMap["s:a"]` — арабский текст (на будущее);
     * `translationMap["s:a"]` — перевод Кулиева;
     * `qcfMap["s:a"]` — `{ page, code_v2 }` из `quran-qcf-v2.json`.

  3. Функция:

     ```ts
     export function renderAyahBlock(surahInput, ayahInput): string
     ```

     Делает:

     * парсит числа `surah`, `ayah`;

     * достаёт `translationMap[key]`;

     * достаёт `qcfMap[key]` → `{ page, code_v2 }`;

     * ищет мету суры в `surahsList`:

       ```ts
       const meta = surahsList.find((s) => s.num === surah);
       const sourceLine = `${meta.name_ru}-${meta.meaning_ru}, ${surah}:${ayah}`;
       ```

     * возвращает HTML вида:

       ```html
       <div class="Quran quran-ayah-block" data-surah="2" data-ayah="222" data-page="35">
         <p class="Quran_p quran-ayah-block__arabic qcf-ayah qcf-page-35">
           …code_v2…
         </p>

         <div class="quran-ayah-block__image">
           <img src="/ayat/2_222.png" … />
         </div>

         <div class="quran-ayah-block__translation">
           …перевод Кулиева…
         </div>

         <div class="quran-ayah-block__source">
           аль-Бакара-Корова, 2:222
         </div>

         <div class="quran-ayah-block__audio">
           <audio src="/mp3/002/002222.mp3" …></audio>
         </div>
       </div>
       ```

  Ключевой момент:
  шрифт выбирается **комбинацией классов**

  ```html
  class="… qcf-ayah qcf-page-35"
  ```

  где:

  * `.qcf-ayah` — общий стиль для арабского блока (rtl, размер и т.п.);
  * `.qcf-page-35` — задаёт `font-family: "QCF2035"` (т.е. шрифт для нужной страницы).

* `src/utils/replaceQuranTags.ts`

  Ищет и заменяет теги `{Quran}`:

  ```ts
  const QURAN_TAG_REGEX = /\{Quran\}(\d+):(\d+)\{\/Quran\}/gi;

  export function replaceQuranTags(input: string): string {
    return input.replace(
      QURAN_TAG_REGEX,
      (match, surahStr, ayahStr) => {
        try {
          const surah = Number(surahStr);
          const ayah = Number(ayahStr);
          return renderAyahBlock(surah, ayah);
        } catch (e) {
          console.error("[QuranTags] Error rendering", match, e);
          return match; // фолбэк: оставляем тег
        }
      },
    );
  }
  ```

---

## 3. Как что пересобрать / поменять

### Обновить quran-qcf-v2.json

Нужно, если:

* поменялся API;
* хочешь обновить `code_v2` (например, для другой версии mushaf).

Шаги:

1. Убедиться, что Python-скрипт `build_quran_qcf_v2.py` актуален.

2. Запустить:

   ```bash
   python scripts/build_quran_qcf_v2.py
   ```

3. Проверить, что `src/data/quran-qcf-v2.json` содержит `"1:1"`, `"2:255"`, `"2:222"` и т.п.

---

### Обновить CSS для шрифтов (qcf-v2.css)

Нужно, если:

* переместили TTF-файлы;
* поменяли путь (`/fonts/mushaf-v2` → что-то другое).

Шаги:

1. Проверить путь в `generate-qcf-v2-css.mjs`:

   ```js
   const FONT_BASE_URL = "/fonts/mushaf-v2";
   ```

2. Запустить:

   ```bash
   node scripts/generate-qcf-v2-css.mjs
   ```

3. Убедиться, что `@import "./qcf-v2.css";` стоит **первой строкой** в `src/styles/tailwind.css`.

---

### Поменять формат строки источника

Сейчас:

```ts
const sourceLine = `${surahNameRu}-${surahMeaningRu}, ${surah}:${ayah}`;
```

Если нужно, например, `2:222 (аль-Бакара-Корова)`:

```ts
const sourceLine = `${surah}:${ayah} (${surahNameRu}-${surahMeaningRu})`;
```

---

### Поменять HTML-структуру блока аята

Ищем `renderAyahBlock` и правим шаблон `return \`...`` как обычно.

Важно:

* не забывать оставлять `qcf-ayah qcf-page-${page}` у арабского блока;
* внимательнее с `escapeHtml`: `code_v2` должен идти **как есть**, а перевод и подписи — через экранирование.

---

## 4. Типичные грабли (и что они означают)

* **Вместо нужного аята показывается другой (например, конец 2:12 + 2:13 + начало 2:14)**
  → почти всегда значит, что:

  * либо font-family настроен как `"QCF2001","QCF2002",...` (одна `.qcf-ayah` без `.qcf-page-N`),
  * либо используется шрифт не той страницы.
    ➜ Проверить `qcf-v2.css`: на каждую страницу должен быть свой `.qcf-page-<page>` с одним `font-family`.

* **`@import must precede all other statements`**
  → `@import "./qcf-v2.css";` стоит НЕ первой строкой в `tailwind.css`.
  ➜ Поднять импорт в самый верх файла.

* **`Expected identifier but found "import"` в quranRenderer.ts**
  → обычный импорт JSON без `?json` в Astro/Vite.
  ➜ заменить на `../file.json?json`.

---

Этого README должно хватать, чтобы через время вспомнить, как устроен весь пазл `{Quran}` → QCF v2, и что трогать, если нужно что-то обновить или починить.
