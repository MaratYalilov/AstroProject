import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ReducedMotionProvider } from '../motion/ReducedMotionProvider'

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
  const [activeLabel, setActiveLabel] = useState('')
  const [loadError, setLoadError] = useState(false)
  const glossaryRequest = useRef<Promise<GlossaryMap> | null>(null)
  const hoverTarget = useRef<HTMLAnchorElement | null>(null)

  // Definitions are needed only when a reader opens a term, not on page load.
  const loadGlossary = useCallback(() => {
    if (!glossaryRequest.current) {
      glossaryRequest.current = fetch('/api/glossary.json')
        .then(r => {
          if (!r.ok) throw new Error('Glossary request failed')
          return r.json() as Promise<GlossaryMap>
        })
        .then(data => {
          setGlossary(data)
          return data
        })
        .catch(error => {
          glossaryRequest.current = null // A later tap can retry.
          throw error
        })
    }
    return glossaryRequest.current
  }, [])

  // ---------- обработка hover / tap ----------
  useEffect(() => {
    const isMobile = () => window.matchMedia('(max-width: 768px)').matches

    const onEnter = async (e: MouseEvent | FocusEvent) => {
      if (isMobile()) return

      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a.glossary-link')
      if (!link) return

      const slug = link.getAttribute('href')?.split('/').pop()
      if (!slug) return
      hoverTarget.current = link
      let data: GlossaryMap
      try {
        data = await loadGlossary()
      } catch {
        return // The ordinary article link remains available.
      }
      if (hoverTarget.current !== link || !link.isConnected || !(slug in data)) return

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
          <h3>${data[slug].term}</h3>
          <p>${data[slug].description}</p>
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

    const onLeave = (e: MouseEvent | FocusEvent) => {
      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a.glossary-link')
      if (!link || (e.relatedTarget instanceof Node && link.contains(e.relatedTarget))) return
      hoverTarget.current = null
      setActive(current => current?.isMobile ? current : null)
    }

    const onClick = (e: MouseEvent) => {
      if (!isMobile() || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return

      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a.glossary-link')
      if (!link) return

      const slug = link.getAttribute('href')?.split('/').pop()
      if (!slug) return

      e.preventDefault()
      setActiveLabel(link.textContent?.trim() || slug)
      setLoadError(false)

      setActive({
        slug,
        x: 0,
        y: 0,
        isMobile: true,
      })
      void loadGlossary().catch(() => setLoadError(true))
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hoverTarget.current = null
        setActive(null)
      }
    }
    document.addEventListener('mouseover', onEnter)
    document.addEventListener('mouseout', onLeave)
    document.addEventListener('focusin', onEnter)
    document.addEventListener('focusout', onLeave)
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('mouseover', onEnter)
      document.removeEventListener('mouseout', onLeave)
      document.removeEventListener('focusin', onEnter)
      document.removeEventListener('focusout', onLeave)
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [loadGlossary])

  // ---------- если нет активного элемента ----------
  if (!active) return null

  const entry = glossary?.[active.slug] ?? {
    term: activeLabel,
    description: loadError
      ? 'Не удалось загрузить определение. Откройте полную статью или попробуйте ещё раз.'
      : glossary ? 'Определение доступно в полной статье.' : 'Загрузка определения...',
  }

  // ---------- DESKTOP POPOVER ----------
  if (!active.isMobile) {
    return (
      <ReducedMotionProvider>
      <AnimatePresence>
        <motion.div
        key="popover"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
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
        className="glossary-popover"
      >

          <strong>{entry.term}</strong>
          <div>{entry.description}</div>
        </motion.div>
      </AnimatePresence>
      </ReducedMotionProvider>
    )
  }

  // ---------- MOBILE BOTTOM-SHEET ----------
  return (
    <ReducedMotionProvider>
    <AnimatePresence>
      <motion.div
        key="sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setActive(null)}
        className="fixed inset-0 z-50 overflow-x-hidden"
        style={{ background: 'var(--overlay-dim)' }}
      >
        <motion.div
          key="sheet"
          role="dialog"
          aria-label={entry.term}
          aria-busy={!glossary && !loadError}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          onClick={e => e.stopPropagation()}
          className="absolute bottom-0 inset-x-0 rounded-t-2xl bg-white dark:bg-gray-900 p-4 pb-24"

          // параметры перетаскивания (свайпа)
          drag="y" // можно тянуть по вертикали
          dragConstraints={{ top: 0, bottom: 0 }} // не тянуть вверх за начальную позицию
          dragElastic={0.2} // чуть «резины»
          onDragEnd={(_, info) => {
            // info.offset.y - сколько проскролили
            // info.velocity.y - скорость движения
            if (info.offset.y > 100 || info.velocity.y > 500) {
              setActive(null) // свайп вниз - закрываем лист
            }
            
          }}
        >
          <div className="text-center mb-2 opacity-40">─────</div>
          <strong className="block mb-1">{entry.term}</strong>
          <div className="mb-3">{entry.description}</div>

          {/* Ссылка на полную статью */}
          <a
            href={`/glossary/${active.slug}`}
            className="block text-center text-emerald-600 dark:text-emerald-400 font-medium mt-2"
            onClick={() => setActive(null)} // закрываем лист при переходе
          >
            Читать полностью →
          </a>
        </motion.div>

      </motion.div>
    </AnimatePresence>
    </ReducedMotionProvider>
  )
}
