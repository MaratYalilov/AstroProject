/**
 * Скрипт миграции: заменяет "color": "#hex" на "form": "name" во всех JSON-файлах
 * muallim-sani и удаляет поле color.
 *
 * Маппинг:
 *   #667f35 → initial
 *   #943634 → middle
 *   #78477d → final
 *   #3c6da2 → isolated
 *
 * Запуск: node scripts/migrate-colors-to-form.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "src", "content", "lessons", "quran", "muallim-sani");

const HEX_TO_FORM = {
  "#667f35": "initial",
  "#943634": "middle",
  "#78477d": "final",
  "#3c6da2": "isolated",
};

function migrateValue(value) {
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (HEX_TO_FORM[trimmed]) {
      return HEX_TO_FORM[trimmed];
    }
    return value;
  }
  return value;
}

function migrateObject(obj, path = "") {
  if (Array.isArray(obj)) {
    return obj.map((item, i) => migrateObject(item, `${path}[${i}]`));
  }

  if (obj !== null && typeof obj === "object") {
    const result = {};

    for (const [key, value] of Object.entries(obj)) {
      if (key === "color") {
        // Если color — пустая строка, просто пропускаем (удаляем)
        if (value === "") {
          continue;
        }
        // Иначе конвертируем в form
        const formValue = migrateValue(value);
        if (formValue !== value) {
          // Это hex → form
          result["form"] = formValue;
        } else {
          // Неизвестный color — оставляем как есть (на случай если что-то не то)
          result[key] = value;
        }
      } else {
        result[key] = migrateObject(value, `${path}.${key}`);
      }
    }

    return result;
  }

  return obj;
}

function main() {
  const files = readdirSync(DATA_DIR).filter(
    (f) => f.endsWith(".json") && f !== "AlphabetLetter.json" && f !== "000-alifba.json"
  );

  console.log(`Found ${files.length} JSON files to process.`);

  let totalColorFields = 0;
  let totalConverted = 0;

  for (const file of files) {
    const filePath = join(DATA_DIR, file);
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    // Count color fields before migration
    const colorCountBefore = JSON.stringify(data).match(/"color":/g)?.length || 0;
    totalColorFields += colorCountBefore;

    const migrated = migrateObject(data);

    const colorCountAfter = JSON.stringify(migrated).match(/"color":/g)?.length || 0;
    const converted = colorCountBefore - colorCountAfter;
    totalConverted += converted;

    if (converted > 0) {
      writeFileSync(filePath, JSON.stringify(migrated, null, 2) + "\n");
      console.log(`  ✅ ${file}: converted ${converted} color(s) → form`);
    } else {
      console.log(`  ➖ ${file}: no changes`);
    }
  }

  console.log(`\nDone! Total color fields: ${totalColorFields}, converted: ${totalConverted}`);
}

main();
