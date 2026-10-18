import assert from "node:assert/strict";

// Run against an existing dev server. This does not build or start the project.
const origin = process.argv[2] || "http://127.0.0.1:4321";
const theoryQuery = new URLSearchParams({
  kind: "theory", subject: "quran", course: "muallim-sani", source: "40_nun-sukun.md",
});
const request = (path, headers) => fetch(new URL(path, origin), {
  headers, signal: AbortSignal.timeout(30_000),
});

const response = await request(`/api/interactive-html?${theoryQuery}`);
assert.equal(response.status, 200);
assert.match(response.headers.get("content-type"), /text\/html/);
const html = await response.text();
assert.ok(html.includes('data-quran-ayah='));
assert.ok(html.includes('qcf-glyphs'));
assert.ok(!html.includes("{Quran}"));
const etag = response.headers.get("etag");
assert.ok(etag);
for (const value of [etag, `W/${etag.replace(/^W\//, "")}`, `"other", ${etag}`, "*"]) {
  assert.equal((await request(response.url, { "If-None-Match": value })).status, 304);
}
theoryQuery.set("source", "theory/40_nun-sukun.md");
assert.equal(await (await request(`/api/interactive-html?${theoryQuery}`)).text(), html);

const comment = await request("/api/interactive-html?kind=sharh&beit=1");
assert.equal(comment.status, 200);
const commentHtml = await comment.text();
assert.match(commentHtml, /data-surah="41"\s+data-ayah="46"/);
assert.ok(commentHtml.includes('<blockquote class="arab">'));
assert.ok(!commentHtml.includes("{Quran}"));

for (const [query, status] of [
  ["kind=theory", 400], ["kind=other", 400], ["kind=sharh&beit=bad", 400],
  ["kind=sharh&beit=999", 404],
  ["kind=theory&subject=quran&course=wrong&source=40_nun-sukun.md", 404],
  ["kind=theory&subject=quran&course=muallim-sani&source=../../../../AGENTS.md", 404],
]) {
  assert.equal((await request(`/api/interactive-html?${query}`)).status, status, query);
}
const glossary = await request("/api/glossary/a-raf.json");
assert.equal(glossary.status, 200);
const { entry } = await glossary.json();
assert.ok(entry.body.includes("data-quran-ayah="));
assert.ok(!entry.body.includes("{Quran}"));
console.log("PASS: server-rendered theory, commentary and glossary; cache validators; invalid and out-of-course references.");
