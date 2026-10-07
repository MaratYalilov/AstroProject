import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporaryRoot = path.resolve(os.tmpdir());
const fixture = await mkdtemp(path.join(temporaryRoot, 'hutba-lesson-preview-'));
const originalDirectory = process.cwd();
const originalMediaRoot = process.env.HUTBA_MEDIA_ROOT;

try {
  const media = path.join(fixture, 'external-assets/media');
  const courseThumbs = path.join(media, 'akida/akida-at-tahawiya/thumbs');
  await mkdir(courseThumbs, { recursive: true });
  await writeFile(path.join(courseThumbs, '02-biografiia-avtora-i-kommentatora.jpg'), 'fixture');

  // Exercise the production helper with media outside the application checkout.
  const result = await build({
    configFile: false,
    root,
    logLevel: 'error',
    build: {
      ssr: path.join(root, 'src/utils/lessonPreviewImage.ts'),
      write: false,
    },
  });
  const chunk = result.output.find(item => item.type === 'chunk' && item.isEntry);
  assert.ok(chunk);
  const bundledHelper = path.join(fixture, 'server/lessonPreviewImage.mjs');
  await mkdir(path.dirname(bundledHelper), { recursive: true });
  await writeFile(bundledHelper, chunk.code);
  await mkdir(path.join(fixture, 'working-directory'));
  process.chdir(path.join(fixture, 'working-directory'));
  const { getLessonPreviewImage } = await import(pathToFileURL(bundledHelper).href);

  process.env.HUTBA_MEDIA_ROOT = media;
  const video = '/media/akida/akida-at-tahawiya/video/02-biografiia-avtora-i-kommentatora.mp4';
  const thumbnail = '/media/akida/akida-at-tahawiya/thumbs/02-biografiia-avtora-i-kommentatora.jpg';
  assert.equal(getLessonPreviewImage(undefined, video, '/fallback.jpg'), thumbnail);
  assert.equal(getLessonPreviewImage(undefined, video + '?download=1#time'), thumbnail);
  assert.equal(getLessonPreviewImage('/manual.jpg', video), '/manual.jpg');
  assert.equal(getLessonPreviewImage(undefined, '/media/course/video/missing.jpg.mp4', '/fallback.jpg'), '/fallback.jpg');
  assert.equal(getLessonPreviewImage(undefined, 'https://example.com/video/lesson.mp4'), undefined);
  assert.equal(getLessonPreviewImage(undefined, '/media/%zz/video/lesson.mp4'), undefined);
  assert.equal(getLessonPreviewImage(undefined, '/media/../../../video/lesson.mp4'), undefined);
  assert.equal(getLessonPreviewImage(undefined, '/media/akida/akida-at-tahawiya/video/%2e%2e%2f%2e%2e%2f%2e%2e%2foutside.mp4'), undefined);
  process.env.HUTBA_MEDIA_ROOT = path.join(fixture, 'missing-media');
  assert.equal(getLessonPreviewImage(undefined, video, '/fallback.jpg'), '/fallback.jpg');
  process.env.HUTBA_MEDIA_ROOT = media;
  await writeFile(path.join(courseThumbs, 'added-after-build.jpg'), 'fixture');
  assert.equal(getLessonPreviewImage(undefined, '/media/akida/akida-at-tahawiya/video/added-after-build.mp4'), '/media/akida/akida-at-tahawiya/thumbs/added-after-build.jpg');

  // Retain runtime discovery for media added after the build.
  const laterThumbnail = path.join(fixture, 'working-directory/public/media/later/thumbs/new.jpg');
  await mkdir(path.dirname(laterThumbnail), { recursive: true });
  await writeFile(laterThumbnail, 'fixture');
  assert.equal(getLessonPreviewImage(undefined, '/media/later/video/new.mp4'), '/media/later/thumbs/new.jpg');
  console.log('Passed: external media directory, production bundle, new thumbnails, overrides, missing images, invalid paths and local media.');
} finally {
  process.chdir(originalDirectory);
  if (originalMediaRoot === undefined) delete process.env.HUTBA_MEDIA_ROOT;
  else process.env.HUTBA_MEDIA_ROOT = originalMediaRoot;
  // Only remove the dedicated fixture created directly inside the temp directory.
  assert.equal(path.dirname(path.resolve(fixture)), temporaryRoot);
  assert.ok(path.basename(fixture).startsWith('hutba-lesson-preview-'));
  await rm(fixture, { recursive: true, force: true });
}
