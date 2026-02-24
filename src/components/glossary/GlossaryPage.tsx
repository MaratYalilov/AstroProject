import { useMemo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CollectionEntry } from 'astro:content'
import { replaceQuranTags } from '@/utils/replaceQuranTags'

type GlossaryEntry = CollectionEntry<'glossary'>

type Props = {
  entries: GlossaryEntry[]
  initialSlug?: string
}

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

export default function GlossaryPage({ entries, initialSlug }: Props) {
  const { isMobile, isChecking } = useIsMobile()

  const [letter, setLetter] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<GlossaryEntry | null>(null)

  const hasInitializedDesktop = useRef(false)

  /* ---------------- helpers ---------------- */

  const getSlug = (e: GlossaryEntry) =>
    e.data.url_slug ?? e.slug

  /* ---------------- letters ---------------- */

  const availableLetters = useMemo(() => {
    const set = new Set(entries.map(e => e.data.letter))
    return LETTERS.filter(l => set.has(l))
  }, [entries])

  /* ---------------- filter ---------------- */

  const filtered = useMemo(() => {
    const q = query.toLowerCase()

    return entries
      .filter(e => {
        if (q) {
          return (
            e.data.term.toLowerCase().includes(q) ||
            e.data.aliases.some(a =>
              a.toLowerCase().includes(q)
            )
          )
        }
        if (letter) return e.data.letter === letter
        return true
      })
      .sort((a, b) =>
        a.data.term.localeCompare(b.data.term, 'ru')
      )
  }, [entries, letter, query])

  /* ---------------- init from URL ---------------- */

  useEffect(() => {
    if (!initialSlug) return

    const entry = entries.find(
      e => getSlug(e) === initialSlug
    )

    if (entry) {
      setActive(entry)
      return
    }
  }, [initialSlug, entries])

  /* ---------------- desktop auto-select ---------------- */

  useEffect(() => {
    if (
      !isChecking &&
      !isMobile &&
      !active &&
      !hasInitializedDesktop.current &&
      filtered.length
    ) {
      hasInitializedDesktop.current = true
      setActive(filtered[0])

      window.history.replaceState(
        null,
        '',
        `/glossary/${getSlug(filtered[0])}`
      )
    }
  }, [filtered, active, isMobile, isChecking])

  /* ---------------- keep active valid ---------------- */

  useEffect(() => {
    if (!isMobile && active) {
      if (!filtered.some(e => e.id === active.id)) {
        setActive(filtered[0] ?? null)
      }
    }
  }, [filtered, active, isMobile])

  /* ---------------- Back / Forward ---------------- */

  useEffect(() => {
    const onPopState = () => {
      const slug = window.location.pathname.split('/').pop()
      if (!slug) return

      const entry = entries.find(
        e => getSlug(e) === slug
      )

      if (entry) setActive(entry)
    }

    window.addEventListener('popstate', onPopState)
    return () =>
      window.removeEventListener('popstate', onPopState)
  }, [entries])

  /* ---------------- UX helpers ---------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQuery('')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* ---------------- handlers ---------------- */

  const handleSelectEntry = (entry: GlossaryEntry) => {
    const slug = getSlug(entry)

    window.history.pushState(
      null,
      '',
      `/glossary/${slug}`
    )

    setActive(entry)

    if (isMobile) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 10)
    } else {
      window.scrollTo({ top: 0 })
    }
  }

  const handleBack = () => {
    setActive(null)
    window.history.pushState(null, '', '/glossary')
  }

  const handleLetterClick = (l: string) => {
    setQuery('')
    setLetter(prev => (prev === l ? null : l))
  }

  /* ---------------- LOADER ---------------- */

  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Загрузка…
      </div>
    )
  }

  /* ================= MOBILE ================= */

  if (isMobile) {
    return (
      <div className="space-y-4">
        {!active && (
          <>
            <input
              className="w-full border rounded-md px-3 py-2 bg-secondary"
              placeholder="Поиск…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              {availableLetters.map(l => (
                <button
                  key={l}
                  onClick={() => handleLetterClick(l)}
                  className={`px-2 py-1 rounded-md text-sm ${
                    letter === l
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <ul className="divide-y border rounded-md">
              {filtered.map(e => (
                <li
                  key={e.id}
                  onClick={() => handleSelectEntry(e)}
                  className="px-4 py-3 cursor-pointer hover:bg-accent"
                >
                  <strong>{e.data.term}</strong>
                </li>
              ))}
            </ul>
          </>
        )}

        {active && (
          <div>
            <button
              onClick={handleBack}
              className="text-sm text-muted-foreground mb-4"
            >
              ← Назад
            </button>

            <h1 className="text-2xl font-bold mb-4">
              {active.data.term}
            </h1>

            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{
                __html: replaceQuranTags(active.body ?? ''),
              }}
            />
          </div>
        )}
      </div>
    )
  }

  /* ================= DESKTOP ================= */

  return (
    <div className="grid grid-cols-[1fr_260px] gap-6 min-h-[600px]">
      {/* ARTICLE */}
      <div className="border-r pr-4">
        <AnimatePresence mode="wait">
          {active && (
            <motion.div
              key={active.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-3xl font-bold mb-6">
                {active.data.term}
              </h1>

              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{
                  __html: replaceQuranTags(active.body ?? ''),
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* LIST */}
      <div className="sticky top-24 h-[calc(100vh-6rem)] flex flex-col">
        <input
          className="mb-4 border rounded-md px-3 py-2 bg-secondary "
          placeholder="Поиск…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />

        <div className="flex flex-wrap gap-2 mb-2">
          {availableLetters.map(l => (
            <button
              key={l}
              onClick={() => handleLetterClick(l)}
              className={`px-2 py-1 rounded-md text-sm ${
                letter === l
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary'
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
              onClick={() => handleSelectEntry(e)}
              className={`px-2 py-2 cursor-pointer ${
                active?.id === e.id
                  ? 'bg-primary/10 font-semibold'
                  : 'hover:bg-accent'
              }`}
            >
              {e.data.term}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
