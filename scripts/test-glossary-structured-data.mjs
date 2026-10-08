import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { createRequire } from 'node:module'
import { buildSync } from 'esbuild'
import fg from 'fast-glob'
import matter from 'gray-matter'

const require = createRequire(import.meta.url)
const compiled = buildSync({
  entryPoints: ['src/utils/glossaryStructuredData.ts'],
  bundle: true, platform: 'node', format: 'cjs', write: false,
})
const module = { exports: {} }
new Function('module', 'exports', 'require', compiled.outputFiles[0].text)(module, module.exports, require)
const {
  buildGlossaryStructuredData, serializeGlossaryStructuredData,
  updateGlossaryStructuredData, GLOSSARY_SCHEMA_ID,
} = module.exports
const site = 'https://hutba.org'
const entries = fg.sync('src/content/glossary/*.md').map(file => {
  const entry = matter(fs.readFileSync(file, 'utf8'))
  return { body: entry.content, data: entry.data }
})

test('каждая статья имеет собственный термин, определение и общий словарь', () => {
  const ids = new Set()
  for (const entry of entries) {
    const schema = buildGlossaryStructuredData(entries, site, entry)
    assert.equal(schema['@type'], 'DefinedTerm')
    assert.equal(schema.name, entry.data.term)
    assert.equal(schema.url, `${site}/glossary/${encodeURIComponent(entry.data.url_slug)}`)
    assert.ok(schema.description.trim(), entry.data.url_slug)
    assert.ok(!/<\/?(?:p|span|strong|div)\b|\{\/?Quran\}/i.test(schema.description), entry.data.url_slug)
    assert.equal(schema.inDefinedTermSet['@type'], 'DefinedTermSet')
    assert.equal(schema.inDefinedTermSet.url, `${site}/glossary`)
    assert.ok(!ids.has(schema['@id']), entry.data.url_slug)
    ids.add(schema['@id'])
    assert.deepEqual(JSON.parse(serializeGlossaryStructuredData(schema)), schema)
  }
})

test('каталог содержит все термины с теми же идентификаторами, что и статьи', () => {
  const schema = buildGlossaryStructuredData(entries, site)
  assert.equal(schema['@type'], 'DefinedTermSet')
  assert.equal(schema.hasDefinedTerm.length, entries.length)
  for (const [index, entry] of entries.entries()) {
    const term = buildGlossaryStructuredData(entries, site, entry)
    assert.equal(schema.hasDefinedTerm[index]['@id'], term['@id'])
    assert.equal(term.inDefinedTermSet['@id'], schema['@id'])
    assert.ok(!('description' in schema.hasDefinedTerm[index]))
  }
})

test('определение взято из видимого текста, а не из рекламного описания', () => {
  const entry = {
    data: { term: 'Термин, вариант', url_slug: 'пример', aliases: ['вариант', 'Другой'], description: 'Общее SEO-описание' },
    body: '<p>Термин <span>عربي</span>: первое значение &amp; пояснение.</p><p>{Quran}2:184{/Quran}</p><p>Второе &#171;значение&#187;.</p><p>Другие сведения.</p>',
  }
  const schema = buildGlossaryStructuredData([], site, entry)
  assert.equal(schema.description, 'Термин عربي : первое значение & пояснение. Второе «значение».')
  assert.deepEqual(schema.alternateName, ['Термин', 'вариант', 'Другой'])
  assert.equal(schema.url, `${site}/glossary/%D0%BF%D1%80%D0%B8%D0%BC%D0%B5%D1%80`)
})

test('Фидья содержит действительное определение и варианты написания', () => {
  const entry = entries.find(entry => entry.data.url_slug === 'fidya-fidiya')
  assert.ok(entry)
  const schema = buildGlossaryStructuredData(entries, site, entry)
  assert.ok(schema.description.includes('компенсацию'))
  assert.ok(schema.description.includes('постоянно не способен соблюдать'))
  assert.ok(schema.alternateName.includes('Фидйа'))
})

test('текст статьи не может закрыть встроенный блок JSON-LD', () => {
  const entry = { data: { term: '</script><script>alert(1)</script>', url_slug: 'safe' }, body: '<p>Определение.</p>' }
  const schema = buildGlossaryStructuredData([], site, entry)
  const serialized = serializeGlossaryStructuredData(schema)
  assert.ok(!serialized.includes('<'))
  assert.equal(JSON.parse(serialized).name, entry.data.term)
})

test('смена статьи и возврат в каталог обновляют один блок, сохраняя другие схемы', () => {
  const nodes = new Map()
  const unrelated = { id: 'other-schema', textContent: '{"@type":"Organization"}' }
  nodes.set(unrelated.id, unrelated)
  const originalDocument = globalThis.document
  globalThis.document = {
    getElementById: id => nodes.get(id) ?? null,
    createElement: () => ({ id: '', textContent: '', setAttribute(key, value) { this[key] = value } }),
    head: { appendChild(node) { nodes.set(node.id, node) } },
  }
  try {
    for (const active of [entries[0], entries[1], entries[0], null]) {
      updateGlossaryStructuredData(entries, site, active)
      const node = nodes.get(GLOSSARY_SCHEMA_ID)
      const schema = JSON.parse(node.textContent)
      assert.equal(node.type, 'application/ld+json')
      assert.equal(schema['@type'], active ? 'DefinedTerm' : 'DefinedTermSet')
      if (active) assert.equal(schema.name, active.data.term)
      assert.equal(nodes.size, 2)
      assert.equal(unrelated.textContent, '{"@type":"Organization"}')
    }
  } finally {
    if (originalDocument === undefined) delete globalThis.document
    else globalThis.document = originalDocument
  }
})
