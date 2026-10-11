import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Восстанавливаем __dirname в ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Куда пишем результат
const OUTPUT = path.join(__dirname, "../src/styles/qcf-v2.css");

// Путь к шрифтам относительно public/
const FONT_BASE_URL = "/fonts/mushaf-v2-woff2";

let css = "";

// Для каждой страницы mushaf: 1..604
for (let page = 1; page <= 604; page++) {
  const fontId = 2000 + page; // 2001..2604

  css += `
@font-face {
  font-family: "QCF${fontId}";
  src: url("${FONT_BASE_URL}/p${page}.woff2") format("woff2");
  font-weight: normal;
  font-style: normal;
  font-display: block;
}

.qcf-page-${page} {
  font-family: "QCF${fontId}" !important;
}
`;
}

// (опционально) Можно добавить базовый класс без font-family
css += `
.qcf-ayah {
  direction: rtl;
  text-align: right;
  font-size: 1.5rem;
  line-height: 2.5;
  unicode-bidi: isolate;
}

/* До готовности нужной страницы виден читаемый Unicode, а не коды QCF. */
.qcf-fallback {
  font-family: "AmiriLocal", "Scheherazade New", "Amiri", serif;
}

.qcf-glyphs {
  display: none;
  font-weight: 400;
  font-style: normal;
  font-synthesis: none;
}
`;

fs.writeFileSync(OUTPUT, css, "utf8");

console.log("✅ qcf-v2.css regenerated with per-page fonts:", OUTPUT);
