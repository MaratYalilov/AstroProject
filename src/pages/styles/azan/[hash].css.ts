import type { APIRoute } from 'astro'
import { cssVersion, deferredCss } from '../../../lib/azanCss'

export function getStaticPaths() {
  return [{ params: { hash: cssVersion } }]
}

export const GET: APIRoute = () => new Response(deferredCss, {
  headers: { 'Content-Type': 'text/css; charset=utf-8' },
})
