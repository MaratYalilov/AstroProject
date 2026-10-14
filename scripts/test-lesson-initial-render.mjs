import assert from 'node:assert/strict';
import test from 'node:test';

// Run against an already running local server; this script never builds the project.
const base = new URL(process.env.HUTBA_TEST_URL ?? 'http://127.0.0.1:7775');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Use a local test server');

const cases = [
  {
    name: 'обычный конспект доступен в серверном HTML до запуска React',
    subject: 'akida', course: 'akida-6-stolpov',
    slug: 'akida/akida-6-stolpov/40-puti-k-mnogobozhiyu',
    text: 'Напомню, на прошедших занятиях',
  },
  {
    name: 'урок с карточками сохраняет текст и карточки при серверном отображении',
    subject: 'arabic', course: 'arabskij-yazyk-abu-akhmad',
    slug: 'arabic/arabskij-yazyk-abu-akhmad/01-arabski-bagauddin-abuahmad',
    text: 'Местоимения и прилагательные (муж.р.)',
    flashcards: true,
  },
];

for (const entry of cases) {
  test(entry.name, async () => {
    const url = new URL('/lesson', base);
    url.search = new URLSearchParams({ subject: entry.subject, course: entry.course, slug: entry.slug });
    const response = await fetch(url, { signal: AbortSignal.timeout(90_000) });
    assert.equal(response.status, 200);
    const html = await response.text();
    // Inspect real article markup, not text serialized into Astro island props.
    const articles = html.match(/<article\b[^>]*class="[^"]*lesson-reading[^"]*"[^>]*>[\s\S]*?<\/article>/g) ?? [];
    assert.ok(articles.length > 0, 'Lesson article is present');
    for (const article of articles) {
      assert.ok(article.includes(entry.text), 'The initial article contains its lesson text');
      assert.doesNotMatch(article.slice(0, article.indexOf('>') + 1), /opacity\s*:\s*0(?:[;"\s]|$)/);
      assert.doesNotMatch(article, /dic-flashcard-marker/);
      if (entry.flashcards) {
        assert.match(article, /class="lesson-flashcards\b/);
        assert.match(article, /Русский → العربية/);
      }
    }
    assert.match(html, /Программа курса/);
    assert.match(html, /<video\b[^>]*preload="none"/);
  });
}
