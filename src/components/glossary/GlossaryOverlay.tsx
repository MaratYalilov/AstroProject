import { useEffect, useState } from 'react'

type GlossaryEntry = {
  term: string
  description: string
}

type GlossaryMap = Record<string, GlossaryEntry>

type ActiveState = {
  slug: string
  x: number
  y: number
  isMobile: boolean
  align?: 'center' | 'left' | 'right'
  placement?: 'top' | 'bottom'; // добавьте это
}


export default function GlossaryOverlay() {
  const [glossary, setGlossary] = useState<GlossaryMap | null>(null)
  const [active, setActive] = useState<ActiveState | null>(null)

  // ---------- загрузка глоссария ----------
  useEffect(() => {
    fetch('/api/glossary.json')
      .then(r => r.json())
      .then(setGlossary)
      .catch(() => setGlossary(null))
  }, [])

  // ---------- обработка hover / tap ----------
  useEffect(() => {
    if (!glossary) return

    const isMobile = () => window.matchMedia('(max-width: 768px)').matches

    const onEnter = (e: MouseEvent) => {
      if (isMobile()) return

      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a.glossary-link')
      if (!link) return

      const slug = link.getAttribute('href')?.split('/').pop()
      if (!slug || !(slug in glossary)) return

      const rect = link.getBoundingClientRect()

      const POPOVER_WIDTH = 320
      const GAP = 30

      // Создаем временный элемент для измерения высоты
      const tempTooltip = document.createElement('div')
      tempTooltip.style.cssText = `
        position: fixed;
        left: -9999px;
        width: ${POPOVER_WIDTH}px;
        visibility: hidden;
      `
      
      // Заполняем контент тултипа
      tempTooltip.innerHTML = `
        <div class="tooltip-content">
          <h3>${glossary[slug].term}</h3>
          <p>${glossary[slug].description}</p>
        </div>
      `
      
      document.body.appendChild(tempTooltip)
      const POPOVER_HEIGHT = tempTooltip.offsetHeight
      document.body.removeChild(tempTooltip)

      let x = rect.left + rect.width / 2
      let y = 0 - GAP
      let align: 'center' | 'left' | 'right' = 'center'

      // ПРЯМО НАД словом
      y = rect.top - POPOVER_HEIGHT + GAP
      
      // Если не влазит сверху
      const isTopEnoughSpace = y >= 0
      if (!isTopEnoughSpace) {
        // ПРЯМО ПОД словом
        y = rect.bottom + GAP
      }

      // Корректировка по горизонтали
      if (x + POPOVER_WIDTH / 2 > window.innerWidth) {
        x = window.innerWidth - POPOVER_WIDTH - GAP
        align = 'right'
      } else if (x - POPOVER_WIDTH / 2 < 0) {
        x = GAP
        align = 'left'
      }

      setActive({
        slug,
        x,
        y,
        isMobile: false,
        align,
        placement: isTopEnoughSpace ? 'top' : 'bottom',// для стрелочки в CSS
      })
    }

    const onLeave = () => setActive(null)

    const onClick = (e: MouseEvent) => {
      if (!isMobile()) return

      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a.glossary-link')
      if (!link) return

      const slug = link.getAttribute('href')?.split('/').pop()
      if (!slug || !(slug in glossary)) return

      e.preventDefault()

      setActive({
        slug,
        x: 0,
        y: 0,
        isMobile: true,
      })
    }

    document.addEventListener('mouseover', onEnter)
    document.addEventListener('mouseout', onLeave)
    document.addEventListener('click', onClick)

    return () => {
      document.removeEventListener('mouseover', onEnter)
      document.removeEventListener('mouseout', onLeave)
      document.removeEventListener('click', onClick)
    }
  }, [glossary])

  // ---------- если нет активного элемента ----------
  if (!active || !glossary) return null

  const entry = glossary[active.slug]

  // ---------- DESKTOP POPOVER ----------
  if (!active.isMobile) {
    return (
      <div
        style={{
          position: 'fixed',
          left: active.x,
          top: active.y,
          transform:
            active.align === 'left'
              ? 'translateX(0)'
              : active.align === 'right'
              ? 'translateX(-100%)'
              : 'translateX(-50%)',
          zIndex: 1000,
          maxWidth: 320,
          pointerEvents: 'none',
        }}
        className="glossary-popover glossary-popover--enter"
      >
        <strong>{entry.term}</strong>
        <div>{entry.description}</div>
      </div>
    )
  }

  // ---------- MOBILE BOTTOM-SHEET ----------
  return (
    <div
      onClick={() => setActive(null)}
      className="fixed inset-0 z-50 overflow-x-hidden"
      style={{ background: 'var(--overlay-dim)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="glossary-sheet absolute bottom-0 inset-x-0 rounded-t-2xl bg-white p-4 pb-6 dark:bg-gray-900"
      >
        <button
          type="button"
          onClick={() => setActive(null)}
          aria-label="Закрыть"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-lg text-muted-foreground hover:bg-muted"
        >
          ×
        </button>
        <div className="text-center mb-2 opacity-40">─────</div>
        <strong className="block mb-1">{entry.term}</strong>
        <div className="mb-3">{entry.description}</div>

        {/* Ссылка на полную статью */}
        <a
          href={`/glossary/${active.slug}`}
          className="block text-center text-emerald-600 dark:text-emerald-400 font-medium mt-2"
          onClick={() => setActive(null)}
        >
          Читать полностью →
        </a>
      </div>
    </div>
  )
}
