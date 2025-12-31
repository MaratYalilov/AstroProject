import { useMemo, useState } from 'react'
import type { CollectionEntry } from 'astro:content'
import GlossaryCard from './GlossaryCard'

type GlossaryEntry = CollectionEntry<'glossary'>

type Props = {
  entries: GlossaryEntry[]
}

const LETTERS = [
  'А','Б','В','Г','Д','Е','Ж','З','И','К','Л','М',
  'Н','О','П','Р','С','Т','У','Ф','Х','Ц','Ч','Ш',
  'Э','Ю','Я',
]

export default function GlossaryPage({ entries }: Props) {
  const [letter, setLetter] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    return entries
      .filter(entry =>
        !letter || entry.data.letter === letter
      )
      .filter(entry => {
        const q = query.toLowerCase()
        return (
          entry.data.term.toLowerCase().includes(q) ||
          entry.data.aliases.some(a =>
            a.toLowerCase().includes(q)
          )
        )
      })
  }, [entries, letter, query])

  return (
    <div className="space-y-6">
      {/* Поиск */}
      <input
        className="w-full border rounded px-3 py-2"
        placeholder="Поиск термина…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      {/* Алфавит */}
      <div className="flex flex-wrap gap-2">
        {LETTERS.map(l => (
          <button
            key={l}
            onClick={() =>
              setLetter(prev => (prev === l ? null : l))
            }
            className={`px-2 py-1 rounded text-sm transition ${
              letter === l
                ? 'bg-primary text-white'
                : 'bg-muted hover:bg-muted/70'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Термины */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(entry => (
          <GlossaryCard
            key={entry.id}
            entry={entry}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Ничего не найдено
        </p>
      )}
    </div>
  )
}
