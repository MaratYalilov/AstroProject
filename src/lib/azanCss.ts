import { createHash } from 'node:crypto'
import fullCss from '../styles/tailwind.css?inline'
import { withoutFontFaces } from './criticalCss'

export { fullCss }
// Font declarations are already inline. Keep exactly one CSS owner per font.
export const deferredCss = withoutFontFaces(fullCss)
export const cssVersion = createHash('sha256').update(deferredCss).digest('hex').slice(0, 16)
export const deferredCssUrl = `/styles/azan/${cssVersion}.css`
