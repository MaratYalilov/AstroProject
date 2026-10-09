import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import type { MouseEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ReducedMotionProvider } from '../motion/ReducedMotionProvider'
import { Input } from '@/components/ui/input'
import { replaceQuranTags } from '@/utils/replaceQuranTags'
import { buildGlossaryEntryMetadata, glossaryIndexMetadata } from '@/utils/glossaryMetadata'
import { updatePageMetadata } from '@/utils/updatePageMetadata'
import { updateGlossaryStructuredData } from '@/utils/glossaryStructuredData'
import type { GlossaryLessonLinks } from '@/lib/glossary/loadGlossaryLessonLinks'
import type { GlossarySummary, GlossaryEntry } from '@/lib/glossary/glossaryPageData'
import { createGlossaryEntryLoader } from '@/utils/loadGlossaryEntry'
import { withGlossaryTarget } from '@/utils/glossaryTarget'
import TeacherCredit from '../TeacherCredit'

type Props = {
  entries: GlossarySummary[]
  initialEntry?: GlossaryEntry
  lessonLinks?: GlossaryLessonLinks
  initialSlug?: string
  siteUrl: string
}

const LETTERS = [
  'А','Б','В','Г','Д','Е','Ж','З','И','К','Л','М',
  'Н','О','П','Р','С','Т','У','Ф','Х','Ц','Ч','Ш',
  'Э','Ю','Я',
]

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    setReady(true)
    const update = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return { isMobile, ready }
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

export default function GlossaryPage({ entries, initialEntry, lessonLinks: initialLessonLinks = {}, initialSlug, siteUrl }: Props) {
  const { isMobile, ready } = useIsMobile()

  /* ---------------- helpers ---------------- */

  const getSlug = (e: GlossarySummary) => e.data.url_slug

  /* ---------------- state ---------------- */

  // ВАЖНО: термин из URL (/glossary/<slug>) выбираем сразу при инициализации,
  // а не эффектом — иначе эффект «desktop auto-select» в том же коммите ещё
  // видит active === null и перебивает выбор первой статьёй (плюс подменяет URL
  // через replaceState → любой переход открывал /glossary/a-raf).
  const [active, setActive] = useState<GlossaryEntry | null>(initialEntry ?? null)
  const [lessonLinks, setLessonLinks] = useState(initialLessonLinks)
  const [loadingTerm, setLoadingTerm] = useState<string | null>(null)
  const requestId = useRef(0)
  const loader = useRef<ReturnType<typeof createGlossaryEntryLoader> | null>(null)
  if (!loader.current) {
    loader.current = createGlossaryEntryLoader(initialEntry
      ? { entry: initialEntry, lessonLinks: initialLessonLinks }
      : undefined)
  }

  const selectEntry = useCallback(async (summary: GlossarySummary, historyMode: 'push' | 'replace' | 'none' = 'none') => {
    const selection = ++requestId.current
    setLoadingTerm(summary.data.term)
    try {
      const payload = await loader.current!(summary.data.url_slug)
      if (selection !== requestId.current) return
      const path = `/glossary/${summary.data.url_slug}`
      if (historyMode === 'push') window.history.pushState(null, '', path)
      if (historyMode === 'replace') window.history.replaceState(null, '', path)
      setLessonLinks(payload.lessonLinks)
      setActive(payload.entry)
      setLoadingTerm(null)
      window.scrollTo({ top: 0 })
    } catch {
      if (selection !== requestId.current) return
      // The ordinary article URL still works if loading JSON is unavailable.
      window.location.assign(`/glossary/${summary.data.url_slug}`)
    }
  }, [])

  const clearEntry = useCallback(() => {
    requestId.current++
    setLoadingTerm(null)
    setActive(null)
    setLessonLinks({})
  }, [])

  useEffect(() => () => { requestId.current++ }, [])

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

  /* ---------------- desktop auto-select ---------------- */

  useEffect(() => {
    if (
      ready && !isMobile &&
      !active &&
      // В URL уже указан конкретный термин (/glossary/<slug>) — авто-выбор
      // первой статьи здесь не нужен, иначе он перебьёт переход по ссылке.
      !initialSlug &&
      !hasInitializedDesktop.current &&
      filtered.length
    ) {
      hasInitializedDesktop.current = true
      void selectEntry(filtered[0], 'replace')
    }
  }, [filtered, active, isMobile, ready, initialSlug, selectEntry])

  /* ---------------- keep active valid ---------------- */

  useEffect(() => {
    if (!isMobile && active) {
      if (!filtered.some(e => e.id === active.id)) {
        if (filtered[0]) void selectEntry(filtered[0], 'replace')
        else clearEntry()
      }
    }
  }, [filtered, active, isMobile, selectEntry, clearEntry])

  /* ---------------- Back / Forward ---------------- */

  useEffect(() => {
    const onPopState = () => {
      const slug = decodeURIComponent(window.location.pathname.split('/').filter(Boolean).pop() ?? '')

      const entry = entries.find(
        e => getSlug(e) === slug
      )

      setQuery('')
      setLetter(null)
      if (entry) void selectEntry(entry)
      else clearEntry()
    }

    window.addEventListener('popstate', onPopState)
    return () =>
      window.removeEventListener('popstate', onPopState)
  }, [entries, selectEntry, clearEntry])

  useEffect(() => {
    const path = active ? `/glossary/${getSlug(active)}` : '/glossary'
    const metadata = active
      ? buildGlossaryEntryMetadata(active.data)
      : glossaryIndexMetadata
    if (window.location.pathname !== path) {
      window.history.replaceState(null, '', path)
    }
    updatePageMetadata({ ...metadata, canonicalPath: path })
    updateGlossaryStructuredData(entries, siteUrl, active)
  }, [active, entries, siteUrl])

  /* ---------------- UX helpers ---------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQuery('')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* ---------------- handlers ---------------- */

  const handleSelectEntry = (entry: GlossarySummary) => { void selectEntry(entry, 'push') }

  const handleBack = () => {
    clearEntry()
    window.history.pushState(null, '', '/glossary')
  }

  const handleTermClick = (
    event: MouseEvent<HTMLAnchorElement>,
    entry: GlossarySummary
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
        {loadingTerm && <p role="status" className="text-sm text-muted-foreground">Загрузка: {loadingTerm}…</p>}
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
            <TeacherCredit glossary />

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
        {loadingTerm && <p role="status" className="mb-4 text-sm text-muted-foreground">Загрузка: {loadingTerm}…</p>}
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
              <TeacherCredit glossary />

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
