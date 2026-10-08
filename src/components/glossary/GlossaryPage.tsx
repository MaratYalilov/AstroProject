import { useMemo, useState, useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ReducedMotionProvider } from '../motion/ReducedMotionProvider'
import { Input } from '@/components/ui/input'
import { replaceQuranTags } from '@/utils/replaceQuranTags'
import { buildGlossaryEntryMetadata, glossaryIndexMetadata } from '@/utils/glossaryMetadata'
import { updatePageMetadata } from '@/utils/updatePageMetadata'
import type { GlossaryLessonLinks } from '@/lib/glossary/loadGlossaryLessonLinks'
import { withGlossaryTarget } from '@/utils/glossaryTarget'

type GlossaryEntry = {
  id: string
  body: string
  data: {
    term: string
    url_slug: string
    letter: string
    category: string
    tags: string[]
    aliases: string[]
    related: string[]
    used_in: any[]
    description?: string
  }
}

type Props = {
  entries: GlossaryEntry[]
  lessonLinks: GlossaryLessonLinks
  initialSlug?: string
}

const LETTERS = [
  'А','Б','В','Г','Д','Е','Ж','З','И','К','Л','М',
  'Н','О','П','Р','С','Т','У','Ф','Х','Ц','Ч','Ш',
  'Э','Ю','Я',
]

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const update = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return isMobile
}

function LessonBacklinks({ references, links, termSlug }: { references: unknown[]; links: GlossaryLessonLinks; termSlug: string }) {
  const groups = new Map<string, { title: string; lessons: { href: string; title: string }[] }>()
  for (const href of new Set(references)) {
    if (typeof href !== 'string' || !Object.hasOwn(links, href)) continue
    const lesson = links[href]
    if (!groups.has(lesson.coursePath)) {
      groups.set(lesson.coursePath, { title: lesson.courseTitle, lessons: [] })
    }
    groups.get(lesson.coursePath)!.lessons.push({ href, title: lesson.title })
  }
  if (!groups.size) return null

  return (
    <section className="mt-8 border-t pt-6" aria-label="Уроки по теме">
      <h2 className="mb-2 text-xl font-semibold">Уроки по теме</h2>
      <p className="mb-4 text-sm text-muted-foreground">Этот термин встречается в материалах следующих уроков.</p>
      <div className="space-y-3">
        {[...groups.entries()]
          .sort(([, a], [, b]) => a.title.localeCompare(b.title, 'ru'))
          .map(([path, group]) => (
            <details key={path} open={groups.size === 1} className="rounded-md border px-4 py-3">
              <summary className="cursor-pointer font-medium">
                {group.title} <span className="text-sm text-muted-foreground">({group.lessons.length})</span>
              </summary>
              <ul className="mt-3 space-y-2">
                {group.lessons.map(lesson => (
                  <li key={lesson.href}>
                    <a href={withGlossaryTarget(lesson.href, termSlug)} className="text-primary underline underline-offset-4 hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                      {lesson.title}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          ))}
      </div>
    </section>
  )
}

export default function GlossaryPage({ entries, lessonLinks, initialSlug }: Props) {
  const isMobile = useIsMobile()

  /* ---------------- helpers ---------------- */

  const getSlug = (e: GlossaryEntry) => e.data.url_slug

  /* ---------------- state ---------------- */

  // ВАЖНО: термин из URL (/glossary/<slug>) выбираем сразу при инициализации,
  // а не эффектом — иначе эффект «desktop auto-select» в том же коммите ещё
  // видит active === null и перебивает выбор первой статьёй (плюс подменяет URL
  // через replaceState → любой переход открывал /glossary/a-raf).
  const [active, setActive] = useState<GlossaryEntry | null>(() =>
    initialSlug
      ? entries.find(e => getSlug(e) === initialSlug) ?? null
      : null
  )

  const [letter, setLetter] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const hasInitializedDesktop = useRef(false)

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
      !isMobile &&
      !active &&
      // В URL уже указан конкретный термин (/glossary/<slug>) — авто-выбор
      // первой статьи здесь не нужен, иначе он перебьёт переход по ссылке.
      !initialSlug &&
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
  }, [filtered, active, isMobile])

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

      setQuery('')
      setLetter(null)
      setActive(entry ?? null)
    }

    window.addEventListener('popstate', onPopState)
    return () =>
      window.removeEventListener('popstate', onPopState)
  }, [entries])

  useEffect(() => {
    const path = active ? `/glossary/${getSlug(active)}` : '/glossary'
    const metadata = active
      ? buildGlossaryEntryMetadata(active.data)
      : glossaryIndexMetadata
    if (window.location.pathname !== path) {
      window.history.replaceState(null, '', path)
    }
    updatePageMetadata({ ...metadata, canonicalPath: path })
  }, [active])

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

  const handleTermClick = (
    event: MouseEvent<HTMLAnchorElement>,
    entry: GlossaryEntry
  ) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) return

    event.preventDefault()
    handleSelectEntry(entry)
  }

  const handleLetterClick = (l: string) => {
    setQuery('')
    setLetter(prev => (prev === l ? null : l))
  }

  useEffect(() => {
    if (!active) return

    const frameId = window.requestAnimationFrame(() => {
      document.dispatchEvent(new CustomEvent('quran:reinit'))
    })
    const timeoutId = window.setTimeout(() => {
      document.dispatchEvent(new CustomEvent('quran:reinit'))
    }, 250)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(timeoutId)
    }
  }, [active?.id, active?.body])

  /* ================= MOBILE ================= */

  if (isMobile) {
    return (
      <ReducedMotionProvider>
      <div className="space-y-4">
        {!active && (
          <>
            <Input
              className="h-auto bg-secondary py-2 shadow-none md:text-base"
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
                <li key={e.id}>
                  <a
                    href={`/glossary/${getSlug(e)}`}
                    onClick={event => handleTermClick(event, e)}
                    className="block px-4 py-3 hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <strong>{e.data.term}</strong>
                  </a>
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
            <LessonBacklinks references={active.data.used_in} links={lessonLinks} termSlug={getSlug(active)} />
          </div>
        )}
      </div>
      </ReducedMotionProvider>
    )
  }

  /* ================= DESKTOP ================= */

  return (
    <ReducedMotionProvider>
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
              <LessonBacklinks references={active.data.used_in} links={lessonLinks} termSlug={getSlug(active)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* LIST */}
      <div className="sticky top-24 h-[calc(100vh-6rem)] flex flex-col">
        <Input
          className="mb-4 h-auto bg-secondary py-2 shadow-none md:text-base"
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
            <li key={e.id}>
              <a
                href={`/glossary/${getSlug(e)}`}
                onClick={event => handleTermClick(event, e)}
                aria-current={active?.id === e.id ? 'page' : undefined}
                className={`block px-2 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                  active?.id === e.id
                    ? 'bg-primary/10 font-semibold'
                    : 'hover:bg-accent'
                }`}
              >
                {e.data.term}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
    </ReducedMotionProvider>
  )
}
