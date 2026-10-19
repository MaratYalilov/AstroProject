import { defineMiddleware } from 'astro:middleware'
import { fullCss, deferredCssUrl } from './lib/azanCss'
import { inlineAzanCriticalCss } from './lib/criticalCss'

export const onRequest = defineMiddleware(async ({ url }, next) => {
  const response = await next()
  if (url.pathname.replace(/\/$/, '') !== '/glossary/azan') return response
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/html')) return response

  const html = await response.text()
  const output = inlineAzanCriticalCss(html, fullCss, deferredCssUrl, import.meta.env.DEV)
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.delete('etag')
  return new Response(output, { status: response.status, statusText: response.statusText, headers })
})
