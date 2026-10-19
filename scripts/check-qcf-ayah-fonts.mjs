import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Verify the generated runtime assets without rebuilding or modifying fonts.
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const root = new URL('../public/fonts/qcf-ayah-v2/', import.meta.url);
try {
  const mappingBytes = await readFile(new URL('../src/data/quran-qcf-v2.json', import.meta.url));
  const mapping = JSON.parse(mappingBytes);
  const manifest = JSON.parse(await readFile(new URL('manifest.json', root)));
  assert.equal(manifest.format, 'hutba-qcf-v2-ayah-subsets-v1');
  assert.equal(manifest.mappingSha256, hash(mappingBytes), 'Regenerate subsets after changing the QCF map');
  assert.equal(Object.keys(mapping).length, 6236);
  let bytes = 0;
  for (const [reference, entry] of Object.entries(mapping)) {
    const file = `${reference.replace(':', '-')}.woff2`;
    const record = manifest.files[reference];
    assert.ok(record, `${reference}: missing manifest entry`);
    assert.equal(record.file, file, reference);
    assert.equal(record.page, entry.page, reference);
    assert.equal(record.validated, true, reference);
    assert.equal(record.sourceSha256, manifest.sources[String(entry.page)]?.sha256, reference);
    assert.equal(record.codesSha256, hash(Buffer.from(entry.code_v2)), reference);
    const payload = await readFile(new URL(file, root));
    assert.equal(payload.toString('ascii', 0, 4), 'wOF2', file);
    assert.equal(payload.readUInt32BE(8), payload.length, file);
    assert.equal(payload.length, record.bytes, file);
    assert.equal(hash(payload), record.sha256, file);
    bytes += payload.length;
  }
  console.log(`QCF V2: verified 6236 ayah fonts and manifest (${(bytes / 1048576).toFixed(2)} MiB). No build.`);
} catch (error) {
  console.error(`QCF ayah fonts: ${error.message}\nGenerate/copy public/fonts/qcf-ayah-v2 with its manifest. See README_Quran Renderer-QCF v2.md.`);
  process.exitCode = 1;
}
