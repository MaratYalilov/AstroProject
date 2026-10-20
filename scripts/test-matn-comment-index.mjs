import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buildSync } from 'esbuild';
const require = createRequire(import.meta.url);
function load(file) {
  // Compile one helper in memory. This does not invoke Astro or build the site.
  const compiled = buildSync({entryPoints:[file],bundle:true,platform:'node',format:'cjs',write:false});
  const module = {exports:{}};
  new Function('module','exports','require',compiled.outputFiles[0].text)(module,module.exports,require);
  return module.exports;
}
const { prepareMatnComments } = load('src/lib/interactive/prepareMatnComments.ts');
const { getGlossaryLinkSlugs } = load('src/utils/glossaryTarget.ts');
const raw = JSON.parse(fs.readFileSync('src/content/lessons/quran/koran-2-uroven/sharh.json','utf8'));
// Compare with the previous predicate independently of the new extractor.
function previousContains(text, slug) {
  const links = text.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))|\[[^\]]*\]\(<?([^\s)>]+)/gi);
  for (const m of links) {
    try {
      const u = new URL(m[1] ?? m[2] ?? m[3] ?? m[4], 'https://hutba.org');
      if (u.origin !== 'https://hutba.org') continue;
      const part = /^\/glossary\/([^/]+)\/?$/.exec(u.pathname);
      if (part && decodeURIComponent(part[1]) === slug) return true;
    } catch {}
  }
  return false;
}
assert.deepEqual(getGlossaryLinkSlugs(`<a href="/glossary/a/">x</a> [x](https://hutba.org/glossary/b) <a href='/glossary/a'>x</a> [x](</glossary/%D0%B0>) <a href=/glossary/c>x</a> [x](https://other.test/glossary/no) [x](/glossary/%ZZ)`), ['a','b','а','c']);
const slugs = fs.readdirSync('src/content/glossary').filter(f=>f.endsWith('.md')).map(f=>{
  const text=fs.readFileSync(`src/content/glossary/${f}`,'utf8');
  return /^url_slug:\s*["']?([^\r\n"']+)/m.exec(text)?.[1].trim();
}).filter(Boolean);
const lesson={id:1,slug:'test',subject:'quran',course:'koran-2-uroven',title:'test',blocks:[{type:'matn',group:'test',from:1,to:109}]};
const before=JSON.stringify(lesson);const prepared=prepareMatnComments(lesson);
assert.equal(JSON.stringify(lesson),before,'cached source JSON must not be mutated');
const index=prepared.blocks[0].comments;
assert.equal(Object.keys(index).length,109);
for(const [n,text] of Object.entries(raw)) {
  assert.ok(Array.isArray(index[n]),`comment button ${n}`);
  for(const slug of [...slugs,'missing-term']) assert.equal(index[n].includes(slug),previousContains(text,slug),`${n}: ${slug}`);
  assert.ok(!JSON.stringify(index).includes(text.slice(0,150)),'no raw commentary');
}
const range=prepareMatnComments({...lesson,blocks:[{type:'matn',group:'test',from:106,to:109}]}).blocks[0].comments;
assert.deepEqual(Object.keys(range),['106','107','108','109']);
const absent=prepareMatnComments({...lesson,blocks:[{type:'matn',group:'test',from:110,to:111}]}).blocks[0].comments;
assert.deepEqual(absent,{});
const noMatn={...lesson,blocks:[{type:'lesson-complete'}]};assert.equal(prepareMatnComments(noMatn),noMatn);
const course=JSON.parse(fs.readFileSync('src/content/lessons/quran/koran-2-uroven/lessons.bundle.json','utf8'));
for(const l of course) for(const block of prepareMatnComments(l).blocks) if(block.type==='matn') for(let n=block.from;n<=block.to;n++) assert.equal(Boolean(block.comments[n]),Boolean(raw[n]));
console.log(`PASS: 109 commentary entries, ${slugs.length} glossary slugs, ranges, absent comments, immutable sources and all course lessons. Compact full index: ${Buffer.byteLength(JSON.stringify(index))} bytes. No project build.`);
