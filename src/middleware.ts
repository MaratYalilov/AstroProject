import { defineMiddleware } from 'astro:middleware'
import { fullCss, deferredCssUrl } from './lib/azanCss'
import { inlineGlossaryCriticalCss } from './lib/criticalCss'

export const onRequest = defineMiddleware(async ({ url }, next) => {
  const response = await next()
  const path = url.pathname.replace(/\/$/, '')
  if (path !== '/glossary' && !path.startsWith('/glossary/')) return response
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/html')) return response

  const html = await response.text()
  const output = inlineGlossaryCriticalCss(html, fullCss, deferredCssUrl, import.meta.env.DEV)
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.delete('etag')
  return new Response(output, { status: response.status, statusText: response.statusText, headers })
})
