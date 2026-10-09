import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { createRequire } from 'node:module'
import { buildSync } from 'esbuild'
import fg from 'fast-glob'
import matter from 'gray-matter'

const require = createRequire(import.meta.url)
function load(file) {
  const compiled = buildSync({ entryPoints: [file], bundle: true, platform: 'node', format: 'cjs', write: false })
  const module = { exports: {} }
  new Function('module', 'exports', 'require', compiled.outputFiles[0].text)(module, module.exports, require)
  return module.exports
}
const { buildGlossarySummaries, buildGlossaryEntry } = load('src/lib/glossary/glossaryPageData.ts')
const { createGlossaryEntryLoader } = load('src/utils/loadGlossaryEntry.ts')
const entries = fg.sync('src/content/glossary/*.md').map(file => {
  const parsed = matter(fs.readFileSync(file, 'utf8'))
  return { id: file, body: parsed.content, data: parsed.data }
})

test('поисковый список сохраняет названия и варианты без текстов статей и ссылок на уроки', () => {
  const summaries = buildGlossarySummaries(entries)
  assert.equal(summaries.length, entries.length)
  for (const [index, summary] of summaries.entries()) {
    const source = entries[index]
    assert.deepEqual(summary, { id: source.id, data: {
      term: source.data.term, url_slug: source.data.url_slug, letter: source.data.letter, aliases: source.data.aliases,
    } })
  }
  assert.ok(Buffer.byteLength(JSON.stringify(summaries)) < 200_000)
})

test('выбранная статья сохраняет свой текст, описание и обратные ссылки', () => {
  for (const source of entries) {
    const entry = buildGlossaryEntry(source)
    assert.equal(entry.body, source.body)
    assert.equal(entry.data.description, source.data.description)
    assert.deepEqual(entry.data.used_in, source.data.used_in)
    assert.ok(Buffer.byteLength(JSON.stringify(entry)) < 500_000, source.data.url_slug)
  }
})

const payload = source => ({ entry: buildGlossaryEntry(source), lessonLinks: {} })

test('статья из исходного HTML используется без дополнительного запроса', async () => {
  const initial = payload(entries[0])
  const loader = createGlossaryEntryLoader(initial, () => { throw new Error('Unexpected request') })
  assert.equal(await loader(initial.entry.data.url_slug), initial)
})

test('параллельные и повторные переходы используют один запрос к выбранной статье', async () => {
  const selected = payload(entries[1])
  const requests = []
  const loader = createGlossaryEntryLoader(undefined, async url => {
    requests.push(url)
    return new Response(JSON.stringify(selected))
  })
  const slug = selected.entry.data.url_slug
  const [first, second] = await Promise.all([loader(slug), loader(slug)])
  assert.deepEqual(first, selected)
  assert.equal(second, first)
  assert.equal(await loader(slug), first)
  assert.deepEqual(requests, [`/api/glossary/${encodeURIComponent(slug)}.json`])
})

test('неудачная загрузка не остаётся в кэше и может быть повторена', async () => {
  const selected = payload(entries[2])
  let attempts = 0
  const loader = createGlossaryEntryLoader(undefined, async () => {
    attempts++
    return attempts === 1 ? new Response('', { status: 503 }) : new Response(JSON.stringify(selected))
  })
  const slug = selected.entry.data.url_slug
  await assert.rejects(loader(slug), /503/)
  assert.deepEqual(await loader(slug), selected)
  assert.equal(attempts, 2)
})

test('ответ с другой статьёй отклоняется, чтобы текст и адрес не разошлись', async () => {
  const loader = createGlossaryEntryLoader(undefined, async () => new Response(JSON.stringify(payload(entries[0]))))
  await assert.rejects(loader(entries[1].data.url_slug), /Invalid glossary article response/)
})
