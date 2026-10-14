import assert from 'node:assert/strict';
import { resolveCourseProgress, lessonCompleteKey } from '../src/lib/interactive/lessonProgress.ts';

// Вставка калькаля меняет позиции, но сохраняет id ранее пройденных уроков.
const lessons = Array.from({ length: 41 }, (_, id) => ({ id, slug: `lesson-${id}` }));
lessons.push(
  { id: 44, slug: 'kalkalya' },
  { id: 41, slug: 'mim-sukun' },
  { id: 42, slug: 'drugie-idgamy' },
  { id: 43, slug: 'vidy-madda' },
);
const resume = (index, slug = null) =>
  lessons[resolveCourseProgress(lessons, index, slug, 'quran', 'muallim-sani')].slug;

assert.equal(resume('0'), 'lesson-0');
assert.equal(resume('40'), 'lesson-40');
assert.equal(resume('41'), 'mim-sukun', 'старое сохранение должно открыть мим, а не новый урок');
assert.equal(resume('42'), 'drugie-idgamy');
assert.equal(resume('43'), 'vidy-madda');
assert.equal(resume('41', 'kalkalya'), 'kalkalya', 'новый урок восстанавливается по slug');
assert.equal(resume('41', 'vidy-madda'), 'vidy-madda', 'slug важнее устаревшего индекса');
assert.equal(resume(null, 'mim-sukun'), 'mim-sukun');
for (const index of [null, '', '-1', '999', 'invalid']) assert.equal(resume(index), 'lesson-0');
assert.equal(resolveCourseProgress(lessons, '999', 'removed', 'quran', 'muallim-sani'), 0);
assert.equal(resolveCourseProgress([{ id: 10, slug: 'a' }, { id: 20, slug: 'b' }], '1', null, 'quran', 'other'), 1);
assert.equal(resolveCourseProgress([], '0', null, 'quran', 'other'), 0);
assert.equal(lessonCompleteKey('quran', 'muallim-sani', 41), 'lesson-complete-quran__muallim-sani__41');
assert.notEqual(lessonCompleteKey('quran', 'muallim-sani', 44), lessonCompleteKey('quran', 'muallim-sani', 41));
console.log('Passed: legacy lesson positions, slug resume, invalid/removed lessons, other courses and stable completion keys. No build.');
