const assert = require('node:assert/strict');
const { chromium } = require(process.env.HUTBA_PLAYWRIGHT_PATH || 'playwright');

// Requires an existing local dev server and Playwright; never builds the site.
const base = new URL(process.env.HUTBA_TEST_URL || 'http://127.0.0.1:4321');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Use a local test server');
const url = new URL('/lesson', base);
url.search = new URLSearchParams({
  subject: 'akida', course: 'akida-6-stolpov',
  slug: 'akida/akida-6-stolpov/40-puti-k-mnogobozhiyu',
});

(async () => {
  const browser = await chromium.launch({ channel: process.env.HUTBA_BROWSER_CHANNEL || 'msedge', headless: true });
  try {
    for (const viewport of [{ width: 412, height: 823 }, { width: 1365, height: 900 }]) {
      const context = await browser.newContext({ viewport });
      let releaseScripts;
      const gate = new Promise(resolve => { releaseScripts = resolve; });
      await context.route('**/*', async route => {
        const request = route.request();
        const resourceUrl = new URL(request.url());
        // Font changes and media traffic are separate issues; isolate delayed hydration.
        if (resourceUrl.origin !== base.origin || ['font', 'media'].includes(request.resourceType())) {
          return route.abort();
        }
        if (request.resourceType() === 'script') await gate;
        await route.continue();
      });
      await context.addInitScript(() => {
        const originalScroll = window.scrollTo.bind(window);
        window.__unexpectedTopScrolls = [];
        window.scrollTo = (...args) => {
          const top = typeof args[0] === 'object' ? args[0].top : args[1];
          if (top === 0) window.__unexpectedTopScrolls.push(args);
          return originalScroll(...args);
        };
      });
      const page = await context.newPage();
      page.on('pageerror', error => console.error('Browser error:', error.message));
      page.on('response', response => {
        if (response.status() >= 400 && response.request().resourceType() === 'script') {
          console.error('Script response:', response.status(), response.url());
        }
      });
      try {
        await page.goto(url.href, { waitUntil: 'commit', timeout: 90_000 });
        await page.locator('article.lesson-reading:visible').waitFor({ timeout: 90_000 });
        await page.waitForFunction(() => [...document.querySelectorAll('article.lesson-reading')]
          .some(element => element.getBoundingClientRect().height > 3000));
        await page.evaluate(() => window.scrollTo({ top: 1800, behavior: 'instant' }));
        await page.waitForFunction(() => window.scrollY > 1500);
        const before = await page.evaluate(() => window.scrollY);
        releaseScripts();
        await page.waitForFunction(() => document.querySelector('[data-quran-audio-ready="true"]'), {}, { timeout: 90_000 });
        // Include the delayed sidebar callback (300 ms) and subsequent layout frames.
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
        const after = await page.evaluate(() => window.scrollY);
        const topScrolls = await page.evaluate(() => window.__unexpectedTopScrolls.length);
        console.log(`Reading during delayed script loading, width ${viewport.width}: ${before} -> ${after}; forced top scrolls: ${topScrolls}`);
        assert.equal(topScrolls, 0, 'Hydration must not force the reader back to the start');
        assert.ok(after > 1500, 'The reader remains in the lesson after scripts load');

        // Explicit glossary targets must still work after the automatic reset is removed.
        await page.evaluate(() => {
          const link = [...document.querySelectorAll('article.lesson-reading a.glossary-link')]
            .find(element => element.getClientRects().length);
          if (!link) throw new Error('No glossary link in lesson');
          location.hash = `term=${link.getAttribute('href').split('/').pop()}`;
        });
        await page.locator('a.glossary-term-target:visible').first().waitFor();
        console.log(`Explicit glossary target, width ${viewport.width}: OK`);
      } finally {
        releaseScripts();
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
