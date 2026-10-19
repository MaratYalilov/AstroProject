import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

// Verify the generated runtime assets without rebuilding or modifying fonts.
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const directories = process.env.QCF_AYAH_FONT_DIR
  ? [resolve(process.env.QCF_AYAH_FONT_DIR)]
  : [
      fileURLToPath(new URL('../public/fonts/qcf-ayah-v2/', import.meta.url)),
      // Deployment keeps app/ and assets/ next to each other outside Git.
      fileURLToPath(new URL('../../assets/fonts/qcf-ayah-v2/', import.meta.url)),
    ];
try {
  let root;
  let manifest;
  for (const directory of directories) {
    let bytes;
    try {
      bytes = await readFile(join(directory, 'manifest.json'));
    } catch (error) {
      if (error.code === 'ENOENT' && !process.env.QCF_AYAH_FONT_DIR) continue;
      throw error;
    }
    // Do not hide a broken manifest or mismatched fonts by trying another copy.
    manifest = JSON.parse(bytes);
    root = directory;
    break;
  }
  assert.ok(root && manifest, `Missing manifest.json. Checked: ${directories.join(', ')}`);
  const mappingBytes = await readFile(new URL('../src/data/quran-qcf-v2.json', import.meta.url));
  const mapping = JSON.parse(mappingBytes);
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
    const payload = await readFile(join(root, file));
    assert.equal(payload.toString('ascii', 0, 4), 'wOF2', file);
    assert.equal(payload.readUInt32BE(8), payload.length, file);
    assert.equal(payload.length, record.bytes, file);
    assert.equal(hash(payload), record.sha256, file);
    bytes += payload.length;
  }
  console.log(`QCF V2: verified 6236 ayah fonts and manifest (${(bytes / 1048576).toFixed(2)} MiB) in ${root}. No build.`);
} catch (error) {
  console.error(`QCF ayah fonts: ${error.message}\nCopy qcf-ayah-v2 with manifest.json into public/fonts or the sibling assets/fonts directory. For another location set QCF_AYAH_FONT_DIR. See README_Quran Renderer-QCF v2.md.`);
  process.exitCode = 1;
}
