import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const source = new URL('../src/data/tafsir/ksu-databases/russian.sqlite', import.meta.url);
const database = new DatabaseSync(source, { readOnly: true });
const rows = database.prepare('SELECT sura, aya, tafsir FROM russian ORDER BY sura, aya').all();
database.close();
if (rows.length !== 6236) throw new Error('Expected all 6236 ayah rows');
const verses = Object.fromEntries(rows.map(row => [`${row.sura}:${row.aya}`, row.tafsir]));
writeFileSync(new URL('../src/data/tafsir/saadi-reader-ru.json', import.meta.url), JSON.stringify({
  source: 'ksu-databases/russian.sqlite', sha256: createHash('sha256').update(readFileSync(source)).digest('hex'), verses,
}, null, 2) + '\n');
console.log(`Exported ${rows.length} rows; ${rows.filter(row => !row.tafsir.trim()).length} without separate commentary.`);
