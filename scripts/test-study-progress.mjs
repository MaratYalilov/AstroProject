import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const result = await build({
  configFile: false,
  root,
  logLevel: 'error',
  build: { ssr: `${root}/src/lib/studyProgress.ts`, write: false },
});
const chunk = result.output.find(item => item.type === 'chunk' && item.isEntry);
const { readCourseProgress, subjectProgress } = await import(`data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`);
const saved = new Map();
const storage = { getItem: key => saved.get(key) ?? null };
const standard = { slug: 'one', title: 'One', interactive: false, lessonIds: ['akida/one/first', 'akida/one/second'] };

assert.deepEqual(readCourseProgress('akida', standard), { completed: 0, total: 2, percentage: 0, finished: false });
saved.set('completed-lessons:akida/one', JSON.stringify(['akida/one/first', 'akida/one/first', 'akida/one/deleted', 'akida/other/second', 2]));
assert.deepEqual(readCourseProgress('akida', standard, storage), { completed: 1, total: 2, percentage: 50, finished: false });
saved.set('completed-lessons:akida/one', JSON.stringify(standard.lessonIds));
assert.equal(readCourseProgress('akida', standard, storage).finished, true);
assert.equal(readCourseProgress('fiqh', standard, storage).completed, 0);
for (const invalid of ['{invalid', '{"first":true}', 'null', '[false,2,null]']) {
  saved.set('completed-lessons:akida/one', invalid);
  assert.equal(readCourseProgress('akida', standard, storage).completed, 0);
}
assert.equal(readCourseProgress('akida', standard, { getItem() { throw new Error('Storage disabled'); } }).completed, 0);

const interactive = { slug: 'letters', title: 'Letters', interactive: true, lessonIds: [1, 2] };
saved.set('lesson-complete-quran__letters__1', '1');
saved.set('lesson-complete-2', '1');
saved.set('lesson-complete-quran__other__2', '1');
assert.deepEqual(readCourseProgress('quran', interactive, storage), { completed: 1, total: 2, percentage: 50, finished: false });
saved.set('lesson-complete-quran__letters__2', '1');
assert.equal(readCourseProgress('quran', interactive, storage).finished, true);
saved.delete('lesson-complete-quran__letters__1');
assert.equal(readCourseProgress('quran', interactive, storage).finished, false);
assert.equal(readCourseProgress('quran', { ...interactive, slug: 'other' }, storage).completed, 1);
assert.equal(readCourseProgress('arabic', interactive, storage).completed, 0);
assert.deepEqual(readCourseProgress('quran', { ...interactive, lessonIds: [] }, storage), { completed: 0, total: 0, percentage: 0, finished: false });
assert.equal(readCourseProgress('quran', { ...interactive, lessonIds: [2, 2] }, storage).total, 1);

const largeCourse = { slug: 'large', title: 'Large', interactive: false, lessonIds: Array.from({ length: 151 }, (_, i) => `akida/large/${i}`) };
saved.set('completed-lessons:akida/large', JSON.stringify(largeCourse.lessonIds.slice(0, -1)));
assert.equal(readCourseProgress('akida', largeCourse, storage).percentage, 99);
assert.equal(readCourseProgress('akida', largeCourse, storage).finished, false);
const combined = subjectProgress([
  readCourseProgress('quran', interactive, storage),
  readCourseProgress('akida', largeCourse, storage),
]);
assert.equal(combined.total, 153);
assert.equal(combined.completed, 151);
assert.equal(combined.percentage, 98);
assert.equal(combined.finished, false);
assert.deepEqual(subjectProgress([]), { completed: 0, total: 0, percentage: 0, finished: false });
console.log('Passed: existing completion formats, isolated courses/subjects, partial and full completion, removed lessons, invalid/disabled storage, zero lessons and aggregate progress.');
