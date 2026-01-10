import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

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
    )
  }

  // ---------- MOBILE BOTTOM-SHEET ----------
  return (
    <AnimatePresence>
      <motion.div
        key="sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setActive(null)}
        className="fixed inset-0 z-50 overflow-x-hidden"
        style={{ background: 'rgba(0,0,0,0.4)' }}
      >
        <motion.div
          key="sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          onClick={e => e.stopPropagation()}
          className="absolute bottom-0 inset-x-0 rounded-t-2xl bg-white dark:bg-gray-900 p-4 pb-6"

          // параметры перетаскивания (свайпа)
          drag="y" // можно тянуть по вертикали
          dragConstraints={{ top: 0, bottom: 0 }} // не тянуть вверх за начальную позицию
          dragElastic={0.2} // чуть «резины»
          onDragEnd={(_, info) => {
            // info.offset.y — сколько проскролили
            // info.velocity.y — скорость движения
            if (info.offset.y > 100 || info.velocity.y > 500) {
              setActive(null) // свайп вниз — закрываем лист
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
  )
}
