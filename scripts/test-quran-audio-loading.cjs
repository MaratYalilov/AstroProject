const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.HUTBA_PLAYWRIGHT_PATH || 'playwright');
const base = new URL(process.env.HUTBA_TEST_URL || 'http://127.0.0.1:4321');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname));
const url = new URL('/lesson', base);
url.search = new URLSearchParams({subject:'akida',course:'akida-6-stolpov',slug:'akida/akida-6-stolpov/40-puti-k-mnogobozhiyu'});
// Use a real local MP3 with controlled delivery; no build or remote requests.
const audioBytes = fs.readFileSync('public/mp3/016/016036.mp3');
const deferred = () => {let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};

(async () => {
  const browser=await chromium.launch({channel:process.env.HUTBA_BROWSER_CHANNEL || 'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:412,height:823}});
  const errors=[];
  let scripts=deferred(), media=deferred(), failMedia=false;
  await context.route('**/*',async route=>{
    const request=route.request();
    if(new URL(request.url()).origin!==base.origin || request.resourceType()==='font')return route.abort();
    if(request.resourceType()==='script')await scripts.promise;
    if(/\.mp3(?:\?|$)/.test(request.url())) {
      await media.promise;
      return failMedia ? route.fulfill({status:404,body:''}) : route.fulfill({status:200,contentType:'audio/mpeg',body:audioBytes});
    }
    return route.continue();
  });
  await context.addInitScript(()=>{
    window.__audioPlayRequests=0;
    const play=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(){window.__audioPlayRequests++;return play.call(this);};
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error' && /hydration|hydrated|server rendered|didn.t match/i.test(m.text()))errors.push(m.text());});
  try {
    await page.goto(url.href,{waitUntil:'commit',timeout:90000});
    const button=page.locator('.quran-audio-button:visible').first();
    await button.waitFor({timeout:90000});
    await page.waitForFunction(()=>document.querySelector('.quran-audio-button__icon')?.getBoundingClientRect().width===36);
    const before=await button.boundingBox();
    await button.click();
    assert.equal(await button.locator('.quran-audio-button__icon').evaluate(e=>getComputedStyle(e,'::after').display),'block');
    console.log('Immediate loading ring before deferred lesson scripts: OK');
    scripts.resolve();
    await page.waitForFunction(()=>document.querySelector('[data-quran-audio-ready="true"]'),{},{timeout:90000});
    await page.waitForFunction(()=>[...document.querySelectorAll('.quran-audio-button')].some(e=>e.dataset.state==='loading'));
    assert.equal(await button.getAttribute('aria-busy'),'true');
    assert.equal(await button.locator('.quran-audio-button__icon').evaluate(e=>getComputedStyle(e,'::after').animationName),'quran-audio-loading');
    const after=await button.boundingBox();
    assert.equal(after.width,before.width);
    assert.equal(after.height,before.height);
    await button.click();
    assert.equal(await page.evaluate(()=>window.__audioPlayRequests),1);
    const shot=await button.boundingBox();
    await page.screenshot({path:'.astro/quran-audio-loading.png',clip:{x:Math.max(0,shot.x-6),y:Math.max(0,shot.y-6),width:shot.width+12,height:shot.height+12}});
    console.log('Loading state, animation, stable button size and duplicate tap: OK');
    media.resolve();
    await page.waitForFunction(()=>[...document.querySelectorAll('.quran-audio-button')].some(e=>e.dataset.state==='playing'));
    assert.equal(await button.getAttribute('aria-busy'),null);
    assert.equal(await button.locator('.quran-audio-button__icon').evaluate(e=>getComputedStyle(e,'::after').display),'none');
    console.log('Real MP3 starts playing and clears loading ring: OK');
    await button.evaluate(e=>e.closest('[data-quran-ayah]').querySelector('audio').dispatchEvent(new Event('waiting')));
    assert.equal(await button.getAttribute('data-state'),'loading');
    await button.evaluate(e=>e.closest('[data-quran-ayah]').querySelector('audio').dispatchEvent(new Event('playing')));
    assert.equal(await button.getAttribute('data-state'),'playing');
    await button.click();
    assert.equal(await button.getAttribute('data-state'),null);
    assert.equal(await button.getAttribute('aria-busy'),null);
    console.log('Buffering, resume and pause clear/update the ring: OK');

    // Pending requests from an earlier button must not reset the new selection.
    media=deferred();
    const second=page.locator('.quran-audio-button:visible').nth(1);
    const third=page.locator('.quran-audio-button:visible').nth(2);
    await second.click();
    assert.equal(await second.getAttribute('data-state'),'loading');
    await third.click();
    assert.equal(await second.getAttribute('data-state'),null);
    assert.equal(await second.getAttribute('aria-busy'),null);
    assert.equal(await third.getAttribute('data-state'),'loading');
    media.resolve();
    await page.waitForFunction(()=>[...document.querySelectorAll('.quran-audio-button')].filter(e=>e.getClientRects().length)[2]?.dataset.state==='playing');
    console.log('Switching while loading ignores stale playback rejection: OK');
    await third.click();

    // Exercise playlist advancement and final reset using the same delegated controller.
    const range=await page.evaluate(()=>{
      const original=document.querySelector('[data-quran-ayah]');
      const block=original.cloneNode(true);
      block.id='test-audio-playlist';
      const audio=block.querySelector('audio');
      audio.id='test-audio-playlist-element';
      audio.removeAttribute('data-quran-audio-events-initialized');
      audio.setAttribute('data-playlist',JSON.stringify(['/mp3/test-first.mp3','/mp3/test-second.mp3']));
      const button=block.querySelector('button.quran-audio-button');
      button.setAttribute('data-audio-id',audio.id);
      button.removeAttribute('data-quran-audio-initialized');
      document.body.append(block);
      document.dispatchEvent(new CustomEvent('quran:reinit'));
      return '#test-audio-playlist';
    });
    const rangeButton=page.locator(`${range} .quran-audio-button`);
    await rangeButton.click();
    await page.waitForFunction(()=>document.querySelector('#test-audio-playlist button').dataset.state==='playing');
    media=deferred();
    await rangeButton.evaluate(e=>e.closest('[data-quran-ayah]').querySelector('audio').dispatchEvent(new Event('ended')));
    assert.equal(await rangeButton.getAttribute('data-state'),'loading');
    media.resolve();
    await page.waitForFunction(()=>document.querySelector('#test-audio-playlist button').dataset.state==='playing');
    await rangeButton.evaluate(e=>e.closest('[data-quran-ayah]').querySelector('audio').dispatchEvent(new Event('ended')));
    assert.equal(await rangeButton.getAttribute('data-state'),null);
    assert.equal(await rangeButton.getAttribute('aria-busy'),null);
    console.log('Playlist next-track loading and final reset: OK');

    // A failed download must allow another attempt and leave no busy indicator.
    failMedia=true;
    const fourth=page.locator('.quran-audio-button:visible').nth(3);
    await fourth.evaluate(e=>{
      const audio=e.closest('[data-quran-ayah]').querySelector('audio');
      audio.src='/mp3/test-error.mp3';
      audio.load();
    });
    await fourth.click();
    await page.waitForFunction(()=>[...document.querySelectorAll('.quran-audio-button')].filter(e=>e.getClientRects().length)[3]?.title.includes('Не удалось'));
    assert.equal(await fourth.getAttribute('data-state'),null);
    assert.equal(await fourth.getAttribute('aria-busy'),null);
    failMedia=false;
    await fourth.click();
    await page.waitForFunction(()=>[...document.querySelectorAll('.quran-audio-button')].filter(e=>e.getClientRects().length)[3]?.dataset.state==='playing');
    console.log('Download failure and retry: OK');
    assert.deepEqual(errors,[]);
    console.log('No hydration errors: OK');
  } finally {
    scripts.resolve();media.resolve();
    await context.close();await browser.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
