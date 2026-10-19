import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'

/** Keep the original cascade and all rules that can affect the server-rendered page. */
export function extractCriticalCss(css: string, html: string): string {
  const classes = new Set(['dark', 'light'])
  for (const match of html.matchAll(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    // React escapes '&' in Tailwind classes such as [&_svg]:size-4.
    const value = (match[1] ?? match[2]).replace(/&(?:amp|quot|apos|lt|gt|#(x[0-9a-f]+|\d+));/gi, (entity, numeric: string | undefined) => {
      if (numeric) return String.fromCodePoint(numeric[0].toLowerCase() === 'x' ? parseInt(numeric.slice(1), 16) : Number(numeric))
      return ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' } as Record<string, string>)[entity.toLowerCase()] ?? entity
    })
    for (const name of value.split(/\s+/)) {
      if (name) classes.add(name)
    }
  }

  function possible(node: selectorParser.Node): boolean {
    if (node.type === 'class') return classes.has(node.value)
    // Negation does not require the class to be present. State/attribute/tag
    // selectors are retained, including hover, focus, themes and pseudo-elements.
    if (node.type === 'pseudo' && node.value === ':not') return true
    if (node.type === 'pseudo' && [':is', ':where', ':has'].includes(node.value)) {
      return node.nodes.some(possible)
    }
    if (node.type === 'selector') return node.nodes.every(possible)
    return true
  }

  const root = postcss.parse(css)
  root.walkComments(comment => { comment.remove() })
  root.walkRules(rule => {
    if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return
    try {
      const selectors = selectorParser().astSync(rule.selector)
      for (const selector of [...selectors.nodes]) {
        if (!possible(selector)) selector.remove()
      }
      if (selectors.nodes.length) rule.selector = selectors.toString()
      else rule.remove()
    } catch {
      // Unknown syntax is kept. Dropping a rule would risk an unstyled first paint.
    }
  })
  root.walkAtRules(rule => {
    if (rule.nodes && rule.nodes.length === 0) rule.remove()
  })
  // Compact formatting without changing values, font declarations or selector order.
  root.walk(node => {
    node.raws.before = ''
    if (node.type === 'decl') node.raws.between = ':'
    else node.raws.between = ''
    if ('nodes' in node) node.raws.after = ''
  })
  return root.toString()
}

/** The deferred copy must not register the same font files a second time. */
export function withoutFontFaces(css: string): string {
  const root = postcss.parse(css)
  root.walkAtRules('font-face', rule => { rule.remove() })
  return root.toString()
}

/** Callers limit the trial to individually verified articles. */
export function inlineGlossaryCriticalCss(html: string, css: string, deferredHref: string, dev = false, scope = 'glossary-azan'): string {
  if (!/^[a-z0-9-]+$/.test(scope)) return html
  const devStyle = dev
    ? html.match(/<style\b[^>]*data-vite-dev-id="[^"]*[/\\]styles[/\\]tailwind\.css"[^>]*>[\s\S]*?<\/style>/i)
    : null
  const links = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(match => match[0])
    .filter(tag => /\brel=["']stylesheet["']/i.test(tag))
  if (!devStyle && links.length !== 1) return html
  const original = devStyle?.[0] ?? links[0]
  if (/\bmedia=|\bonload=/.test(original)) return html
  const href = deferredHref
  if (!href || !href.startsWith('/') || href.startsWith('//')) return html

  const critical = extractCriticalCss(css, html)
  // Fail closed if the subset is empty or would provide little reduction.
  if (!critical || critical.length > css.length * 0.8) return html
  const escaped = critical.replace(/<\/style/gi, '<\\/style')
  const link = `<link rel="stylesheet" href="${href}">`
  const deferred = link.replace(/>$/, ` media="print" onload="this.media='all';this.onload=null" data-deferred-css="${scope}">`)
  return html.replace(original,
    `<style data-critical-css="${scope}">${escaped}</style>${deferred}<noscript>${link}</noscript>`)
}
