import { useMemo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CollectionEntry } from 'astro:content'
import { replaceQuranTags } from '@/utils/replaceQuranTags'

type GlossaryEntry = CollectionEntry<'glossary'>
type Props = { entries: GlossaryEntry[] }

const LETTERS = [
  'А','Б','В','Г','Д','Е','Ж','З','И','К','Л','М',
  'Н','О','П','Р','С','Т','У','Ф','Х','Ц','Ч','Ш',
  'Э','Ю','Я',
]

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => {
      setIsMobile(mq.matches)
      setIsChecking(false)
    }
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  
  return { isMobile, isChecking }
}

export default function GlossaryPage({ entries }: Props) {
  const { isMobile, isChecking } = useIsMobile()
  const [letter, setLetter] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<GlossaryEntry | null>(null)
  const hasInitializedDesktop = useRef(false)

  /* буквы, у которых есть термины */
  const availableLetters = useMemo(() => {
    const set = new Set(entries.map(e => e.data.letter))
    return LETTERS.filter(l => set.has(l))
  }, [entries])

  /* фильтр: поиск глобально, буквы только если поиск пустой */
  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return entries
      .filter(e => {
        if (q) {
          return (
            e.data.term.toLowerCase().includes(q) ||
            e.data.aliases.some(a => a.toLowerCase().includes(q))
          )
        } else if (letter) {
          return e.data.letter === letter
        }
        return true
      })
      .sort((a, b) => a.data.term.localeCompare(b.data.term, 'ru'))
  }, [entries, letter, query])

  /* Автоматически выбираем первый элемент только в десктопной версии после определения устройства */
  useEffect(() => {
    if (!isChecking && !isMobile && !hasInitializedDesktop.current && entries.length > 0) {
      hasInitializedDesktop.current = true
      const sortedEntries = [...entries].sort((a, b) => 
        a.data.term.localeCompare(b.data.term, 'ru')
      )
      setActive(sortedEntries[0])
    }
  }, [entries, isMobile, isChecking])

  /* Обновляем активный элемент при изменении фильтрации только в десктопе */
  useEffect(() => {
    if (!isMobile && !isChecking && filtered.length > 0) {
      if (!active || !filtered.some(e => e.id === active.id)) {
        setActive(filtered[0])
      }
    }
  }, [filtered, isMobile, active, isChecking])

  /* Сбрасываем скролл окна при смене статьи в ДЕСКТОПНОЙ версии */
  useEffect(() => {
    if (!isMobile && active) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [active, isMobile])

  /* очистка поиска по Esc */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setQuery('') }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleSelectEntry = (entry: GlossaryEntry) => {
    setActive(entry)
    // Для мобильной версии
    if (isMobile) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 10)
    }
  }

  const handleBack = () => {
    setActive(null)
    // При возврате в мобильной версии скроллим к началу страницы
    if (isMobile) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 10)
    }
  }

  /* Обработчик клика на букву - очищаем поиск */
  const handleLetterClick = (selectedLetter: string) => {
    // Очищаем поиск
    setQuery('')
    // Переключаем букву (если та же буква - снимаем фильтр)
    setLetter(prev => prev === selectedLetter ? null : selectedLetter)
  }

  /* Показываем лоадер пока определяем устройство */
  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    )
  }

  /* ---------------- MOBILE ---------------- */
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Показываем поиск и фильтр если нет активной статьи */}
        {!active && (
          <>
            {/* Поиск */}
            <div className="relative mb-4">
              <input
                className="w-full border rounded-md px-3 py-2 pr-8 bg-background text-foreground placeholder:text-muted-foreground"
                placeholder="Поиск…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              )}
            </div>

            {/* Фильтр букв */}
            <div className="flex flex-wrap gap-2 mb-4">
              {availableLetters.map(l => (
                <button
                  key={l}
                  onClick={() => handleLetterClick(l)}
                  className={`px-2 py-1 rounded-md text-sm transition-colors ${
                    letter === l 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Список терминов */}
            <ul className="divide-y border rounded-md">
              {filtered.map(e => (
                <li
                  key={e.id}
                  className="py-3 px-4 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleSelectEntry(e)}
                >
                  <strong className="text-foreground">{e.data.term}</strong>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Показываем статью если выбрана */}
        {active && (
          <div>
            <button
              onClick={handleBack}
              className="mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Назад к списку
            </button>

            <h1 className="text-2xl font-bold mb-4 text-foreground">{active.data.term}</h1>

            <div
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: replaceQuranTags(active.body ?? '') }}
            />
          </div>
        )}
      </div>
    )
  }

  /* ---------------- DESKTOP ---------------- */
  return (
    <div className="grid grid-cols-[1fr_340px] gap-6 min-h-[600px]">
      {/* LEFT — ARTICLE */}
      <div className="border-r pr-4">
        <AnimatePresence mode="wait">
          {active ? (
            <motion.div
              key={active.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-3xl font-bold mb-6 text-foreground">{active.data.term}</h1>
              <div
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: replaceQuranTags(active.body ?? '') }}
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-muted-foreground pt-12"
            >
              <p>Ничего не найдено</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT — LIST */}
      <div className="flex flex-col max-h-[70vh]">
        <div className="relative mb-4">
          <input
            className="w-full border rounded-md px-3 py-2 pr-8 bg-background text-foreground placeholder:text-muted-foreground"
            placeholder="Поиск…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-2">
          {availableLetters.map(l => (
            <button
              key={l}
              onClick={() => handleLetterClick(l)}
              className={`px-2 py-1 rounded-md text-sm transition-colors ${
                letter === l 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <ul className="overflow-auto divide-y flex-1">
          {filtered.map(e => (
            <li
              key={e.id}
              className={`py-2 px-2 cursor-pointer transition-colors ${
                active?.id === e.id 
                  ? 'bg-primary/10 text-primary font-semibold rounded-md' 
                  : 'hover:bg-accent'
              }`}
              onClick={() => handleSelectEntry(e)}
            >
              <span className={active?.id === e.id ? 'text-primary' : 'text-foreground'}>
                {e.data.term}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}