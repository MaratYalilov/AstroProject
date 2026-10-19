import assert from 'node:assert/strict'
import { extractCriticalCss, inlineGlossaryCriticalCss, withoutFontFaces } from '../src/lib/criticalCss.ts'

const css = `
@font-face{font-family:AmiriLocal;src:url(/fonts/Amiri-Regular.woff2);font-display:swap}
:root{--background:white}*{box-sizing:border-box}
.card{color:red}.unused{color:pink}
.card:not(.missing){padding:4px}
:is(.missing,.dark) .card{background:black}
@media(min-width:768px){.card{display:grid}.unused{display:none}}
.\\[\\&_svg\\]\\:size-4 svg{width:1rem;height:1rem}
@supports(display:grid){.unused{gap:4px}}
`
const html = '<html><head><link rel="stylesheet" href="/_astro/Base.hash.css"></head><body><div class="card [&amp;_svg]:size-4"></div></body></html>'
const critical = extractCriticalCss(css, html)
assert.ok(critical.includes('.card:not(.missing)'))
assert.ok(critical.includes(':is(.missing,.dark)'))
assert.ok(critical.includes('min-width:768px'))
assert.ok(critical.includes('width:1rem'))
assert.ok(critical.includes('@font-face'))
assert.ok(critical.includes('font-display:swap'))
assert.ok(!critical.includes('.unused'))
const deferred = withoutFontFaces(css)
assert.ok(!deferred.includes('@font-face'))
assert.ok(deferred.includes('.unused'))
const transformed = inlineGlossaryCriticalCss(html, css, '/styles/azan/content-hash.css')
assert.ok(transformed.includes('data-critical-css="glossary"'))
assert.ok(transformed.includes('media="print"'))
assert.ok(transformed.includes('<noscript><link rel="stylesheet" href="/styles/azan/content-hash.css"></noscript>'))
assert.ok(!transformed.includes('/_astro/Base.hash.css'))
assert.equal(inlineGlossaryCriticalCss(html.replace('</head>', '<link rel="stylesheet" href="/other.css"></head>'), css, '/styles/azan/rest.css'), html.replace('</head>', '<link rel="stylesheet" href="/other.css"></head>'))
assert.equal(inlineGlossaryCriticalCss(html, '.card{color:red}', '/styles/azan/rest.css'), html, 'no subset benefit retains normal stylesheet')
const azab = inlineGlossaryCriticalCss(html, css, '/styles/azan/content-hash.css', false, 'glossary-azab-al-kabr')
assert.ok(azab.includes('data-critical-css="glossary-azab-al-kabr"'))
assert.ok(azab.includes('data-deferred-css="glossary-azab-al-kabr"'))
assert.equal(inlineGlossaryCriticalCss(html, css, '/styles/azan/rest.css', false, 'bad"scope'), html)
console.log('PASS: selector alternatives/negation, escaped SVG classes, media, font owner, noscript, safe fallback')
