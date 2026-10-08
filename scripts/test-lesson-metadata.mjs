import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fg from 'fast-glob';
import matter from 'gray-matter';

const courses = new Map();
for (const file of await fg('src/content/courses/**/*.yml')) {
  const data = matter(`---\n${await fs.readFile(file, 'utf8')}\n---`).data;
  courses.set(`${data.subject}/${data.slug}`, data);
}

const descriptions = new Map();
let markdownCount = 0;
let interactiveCount = 0;

function check(description, label) {
  assert.equal(typeof description, 'string', `${label}: нет описания`);
  assert.ok(description.trim().length >= 50, `${label}: описание слишком короткое`);
  assert.ok(description.length <= 300, `${label}: описание требует сокращения`);
  assert.ok(!/[\u2013\u2014<>]|\{\/?(?:Quran|Dic)\}|&\w+;/.test(description), `${label}: разметка или длинное тире`);
  assert.ok(!descriptions.has(description), `${label}: описание повторяет ${descriptions.get(description)}`);
  descriptions.set(description, label);
}

for (const file of await fg('src/content/lessons/**/*.md')) {
  const key = file.slice('src/content/lessons/'.length).replace(/\.md$/, '');
  const course = courses.get(key.split('/').slice(0, 2).join('/'));
  if (!course || course.type === 'interactive') continue;
  check(matter(await fs.readFile(file, 'utf8')).data.description, key);
  markdownCount++;
}

for (const [key, course] of courses) {
  if (course.type !== 'interactive') continue;
  const files = await fg(`src/content/lessons/${key}/**/*.json`);
  const bundle = files.find(file => file.endsWith('/lessons.bundle.json'));
  for (const file of bundle ? [bundle] : files) {
    const data = JSON.parse(await fs.readFile(file, 'utf8'));
    for (const lesson of bundle ? data : [data]) {
      if (!lesson.blocks || !lesson.slug) continue;
      check(lesson.description, `${key}/${lesson.slug} (id ${lesson.id})`);
      interactiveCount++;
    }
  }
}

assert.ok(markdownCount > 0 && interactiveCount > 0, 'Проверка должна охватывать оба вида уроков');
console.log(`Проверено ${markdownCount + interactiveCount} отдельных описаний: ${markdownCount} обычных и ${interactiveCount} интерактивных уроков.`);
