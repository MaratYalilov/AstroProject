import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Official QCF v2 (Hafs), not the v1 or colored v4 fonts.
// https://api-docs.quran.foundation/docs/tutorials/fonts/font-rendering/#font-files--cdn
const source = 'https://verses.quran.foundation/fonts/quran/hafs/v2/woff2';
const directory = new URL('../public/fonts/mushaf-v2-woff2/', import.meta.url);
const manifestFile = new URL('../src/data/qcf-v2-woff2-manifest.json', import.meta.url);
const refresh = process.argv.includes('--refresh');
const checkOnly = process.argv.includes('--check');
const files = new Array(604);
let nextPage = 1;
let completed = 0;

function validate(buffer, page) {
  if (buffer.length < 48 || buffer.toString('ascii', 0, 4) !== 'wOF2' || buffer.readUInt32BE(8) !== buffer.length) {
    throw new Error(`Invalid WOFF2 file for page ${page}`);
  }
}

let previousFiles = [];
try {
  previousFiles = JSON.parse(await readFile(manifestFile, 'utf8')).files;
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

if (checkOnly) {
  if (previousFiles.length !== 604) throw new Error('Missing WOFF2 manifest. Run npm run fonts:download.');
  for (let page = 1; page <= 604; page++) {
    const entry = previousFiles[page - 1];
    if (entry.page !== page || entry.file !== `p${page}.woff2`) throw new Error(`Invalid manifest entry for page ${page}`);
    const buffer = await readFile(new URL(entry.file, directory)).catch(() => {
      throw new Error(`Missing ${entry.file}. Run npm run fonts:download before building.`);
    });
    validate(buffer, page);
    if (entry.bytes !== buffer.length || createHash('sha256').update(buffer).digest('hex') !== entry.sha256) {
      throw new Error(`WOFF2 checksum mismatch for page ${page}. Run npm run fonts:download.`);
    }
  }
  console.log('Verified all 604 WOFF2 files and SHA-256 checksums.');
  process.exit(0);
}

await mkdir(directory, { recursive: true });

async function download(page) {
  const filename = `p${page}.woff2`;
  const target = new URL(filename, directory);
  const previous = previousFiles.find((file) => file.page === page);
  let buffer;
  if (!refresh && previous) {
    try {
      const cached = await readFile(target);
      validate(cached, page);
      if (createHash('sha256').update(cached).digest('hex') === previous.sha256) buffer = cached;
    } catch (error) {
      if (error.code !== 'ENOENT' && !error.message.startsWith('Invalid WOFF2')) throw error;
    }
  }
  if (!buffer) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(`${source}/${filename}`, { signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error(`HTTP ${response.status} for page ${page}`);
        buffer = Buffer.from(await response.arrayBuffer());
        validate(buffer, page);
        const temporary = new URL(`${filename}.download`, directory);
        await writeFile(temporary, buffer);
        await rename(temporary, target);
        break;
      } catch (error) {
        buffer = undefined;
        if (attempt === 3) throw error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  files[page - 1] = { page, file: filename, bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex') };
  completed++;
  if (completed % 50 === 0 || completed === 604) console.log(`QCF v2 WOFF2: ${completed}/604`);
}

// Keep a small number of requests in flight; reuse verified local files on reruns.
await Promise.all(Array.from({ length: 6 }, async () => {
  while (nextPage <= 604) await download(nextPage++);
}));
await writeFile(manifestFile, `${JSON.stringify({ source, files }, null, 2)}\n`);
console.log(`Saved 604 WOFF2 fonts (${(files.reduce((sum, file) => sum + file.bytes, 0) / 1024 / 1024).toFixed(1)} MiB) to ${fileURLToPath(directory)}`);
