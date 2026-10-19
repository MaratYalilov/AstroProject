import { defineMiddleware } from 'astro:middleware'
import { fullCss, deferredCssUrl } from './lib/azanCss'
import { inlineGlossaryCriticalCss } from './lib/criticalCss'

const criticalPages = new Map([
  ['/glossary/azan', 'glossary-azan'],
  ['/glossary/azab-al-kabr', 'glossary-azab-al-kabr'],
])

export const onRequest = defineMiddleware(async ({ url }, next) => {
  const response = await next()
  const scope = criticalPages.get(url.pathname.replace(/\/$/, ''))
  if (!scope) return response
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/html')) return response

  const html = await response.text()
  const output = inlineGlossaryCriticalCss(html, fullCss, deferredCssUrl, import.meta.env.DEV, scope)
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.delete('etag')
  return new Response(output, { status: response.status, statusText: response.statusText, headers })
})
