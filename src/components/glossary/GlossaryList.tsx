import type { CollectionEntry } from 'astro:content'

type GlossaryEntry = CollectionEntry<'glossary'>

type Props = {
  entries: GlossaryEntry[]
  openedId: string | null
  onSelect: (id: string) => void
}

export default function GlossaryList({
  entries,
  openedId,
  onSelect,
}: Props) {
  return (
    <div className="space-y-1 max-h-[70vh] overflow-y-auto">
      {entries.map(entry => (
        <button
          key={entry.id}
          onClick={() => onSelect(entry.id)}
          className={`block w-full text-left px-3 py-2 rounded text-sm transition
            ${
              openedId === entry.id
                ? 'bg-muted font-medium'
                : 'hover:bg-muted/70'
            }
          `}
        >
          {entry.data.term}
        </button>
      ))}
    </div>
  )
}
