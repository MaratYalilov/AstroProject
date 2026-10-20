import fs from 'node:fs';

// Read-only check of CSS, scripts and island entry points in the current HTML.
// No build, deployment, cache changes or server restart.
const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/check-page-assets.mjs "https://hutba.org/page"');
  process.exit(2);
}
const pageUrl = new URL(input);
if (!['http:', 'https:'].includes(pageUrl.protocol)) throw new Error('Expected HTTP(S) URL');
const response = await fetch(pageUrl, {signal: AbortSignal.timeout(30000)});
if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
  throw new Error(`Page returned ${response.status}, ${response.headers.get('content-type')}`);
}
const html = await response.text();
const origin = new URL(response.url).origin;
const assets = new Set();
for (const m of html.matchAll(/(?:src|href|component-url|renderer-url)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
  const url = new URL((m[1] ?? m[2]).replaceAll('&amp;', '&'), response.url);
  if (url.origin === origin && url.pathname.startsWith('/_astro/')) assets.add(url.href);
}
if (!assets.size) throw new Error('No /_astro/ entry assets found; page was not verified');
const results = [];
const pending = [...assets];
let next = 0;
await Promise.all(Array.from({length: Math.min(5, pending.length)}, async () => {
  while (next < pending.length) {
    const url = pending[next++];
    try {
      const r = await fetch(url, {method:'HEAD',signal:AbortSignal.timeout(30000)});
      const type = r.headers.get('content-type') ?? '';
      const expected = url.split('?')[0].endsWith('.css') ? /text\/css/i
        : url.split('?')[0].endsWith('.js') ? /(?:java|ecma)script/i : null;
      results.push({url,status:r.status,type,ok:r.ok && (!expected || expected.test(type))});
    } catch (error) {results.push({url,ok:false,error:String(error)});}
  }
}));
results.sort((a,b)=>a.url.localeCompare(b.url));
for (const r of results) console.log(`${r.ok?'OK':'FAIL'} ${r.status??'network'} ${r.url}${r.error?' '+r.error:''}`);
const failures=results.filter(r=>!r.ok).length;
console.log(`${results.length} HTML entry assets checked, ${failures} failures. Imported JS dependencies and media are not included.`);
if(process.env.PAGE_ASSETS_REPORT) fs.writeFileSync(process.env.PAGE_ASSETS_REPORT, JSON.stringify({page:response.url,checkedAt:new Date().toISOString(),results},null,2));
if(failures) process.exitCode=1;
