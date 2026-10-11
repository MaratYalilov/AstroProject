import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Official Hafs QCF fonts. Preserve the upstream binaries, without conversion.
// https://api-docs.quran.foundation/docs/tutorials/fonts/font-rendering/#font-files--cdn
const upstream = 'https://verses.quran.foundation/fonts/quran/hafs';
const families = [
  {
    name: 'QCF v2',
    directory: new URL('../public/fonts/mushaf-v2-woff2/', import.meta.url),
    manifest: new URL('../src/data/qcf-v2-woff2-manifest.json', import.meta.url),
    sources: { '': `${upstream}/v2/woff2` },
  },
  {
    name: 'QCF v4 Tajweed',
    directory: new URL('../public/fonts/mushaf-v4-woff2/', import.meta.url),
    manifest: new URL('../src/data/qcf-v4-woff2-manifest.json', import.meta.url),
    sources: {
      colrv1: `${upstream}/v4/colrv1/woff2`,
    },
  },
];
const refresh = process.argv.includes('--refresh');
const checkOnly = process.argv.includes('--check');
const checksum = (buffer) => createHash('sha256').update(buffer).digest('hex');

function validate(buffer, file) {
  if (buffer.length < 48 || buffer.toString('ascii', 0, 4) !== 'wOF2' || buffer.readUInt32BE(8) !== buffer.length) {
    throw new Error(`Invalid WOFF2 file: ${file}`);
  }
}

for (const family of families) {
  const jobs = Object.entries(family.sources).flatMap(([variant, source]) =>
    Array.from({ length: 604 }, (_, index) => ({
      page: index + 1,
      file: `${variant ? `${variant}/` : ''}p${index + 1}.woff2`,
      url: `${source}/p${index + 1}.woff2`,
    })),
  );
  let previousFiles = [];
  try {
    previousFiles = JSON.parse(await readFile(family.manifest, 'utf8')).files;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (!Array.isArray(previousFiles)) throw new Error(`Invalid ${family.name} manifest`);

  if (checkOnly) {
    if (previousFiles.length !== jobs.length) throw new Error(`Incomplete ${family.name} manifest. Run npm run fonts:download.`);
    for (const [index, job] of jobs.entries()) {
      const entry = previousFiles[index];
      if (entry.page !== job.page || entry.file !== job.file) throw new Error(`Invalid manifest entry: ${job.file}`);
      const buffer = await readFile(new URL(job.file, family.directory)).catch(() => {
        throw new Error(`Missing ${family.name} ${job.file}. Run npm run fonts:download before building.`);
      });
      validate(buffer, job.file);
      if (entry.bytes !== buffer.length || checksum(buffer) !== entry.sha256) {
        throw new Error(`WOFF2 checksum mismatch: ${family.name} ${job.file}. Run npm run fonts:download.`);
      }
    }
    console.log(`Verified ${family.name}: ${jobs.length} WOFF2 files and SHA-256 checksums.`);
    continue;
  }

  const previous = new Map(previousFiles.map((file) => [file.file, file]));
  const files = new Array(jobs.length);
  const failures = [];
  let nextJob = 0;
  let completed = 0;

  async function download(job, index) {
    const target = new URL(job.file, family.directory);
    const entry = previous.get(job.file);
    let buffer;
    if (!refresh && entry) {
      try {
        const cached = await readFile(target);
        validate(cached, job.file);
        if (cached.length === entry.bytes && checksum(cached) === entry.sha256) buffer = cached;
      } catch (error) {
        if (error.code !== 'ENOENT' && !error.message.startsWith('Invalid WOFF2')) throw error;
      }
    }
    if (!buffer) {
      await mkdir(new URL('./', target), { recursive: true });
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch(job.url, { signal: AbortSignal.timeout(30000) });
          if (!response.ok) throw new Error(`HTTP ${response.status}: ${job.file}`);
          buffer = Buffer.from(await response.arrayBuffer());
          validate(buffer, job.file);
          const temporary = new URL(`${job.file}.download`, family.directory);
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
    files[index] = { page: job.page, file: job.file, bytes: buffer.length, sha256: checksum(buffer) };
    completed++;
    if (completed % 100 === 0 || completed === jobs.length) console.log(`${family.name} WOFF2: ${completed}/${jobs.length}`);
  }

  // Six concurrent requests. Save successful entries even if some downloads fail,
  // so rerunning verifies and reuses those files instead of downloading them again.
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (nextJob < jobs.length) {
      const index = nextJob++;
      try {
        await download(jobs[index], index);
      } catch (error) {
        failures.push(`${jobs[index].file}: ${error.message}`);
        console.error(`${family.name}: ${failures.at(-1)}`);
      }
    }
  }));
  const metadata = family.name === 'QCF v2' ? { source: family.sources[''] } : { sources: family.sources };
  const temporaryManifest = new URL(`${family.manifest.href}.download`);
  await writeFile(temporaryManifest, `${JSON.stringify({ ...metadata, files: files.filter(Boolean) }, null, 2)}\n`);
  await rename(temporaryManifest, family.manifest);
  if (failures.length) throw new Error(`${failures.length} ${family.name} downloads failed. Run npm run fonts:download again.`);
  console.log(`Saved ${family.name}: ${jobs.length} fonts (${(files.reduce((sum, file) => sum + file.bytes, 0) / 1024 / 1024).toFixed(1)} MiB) to ${fileURLToPath(family.directory)}`);
}
