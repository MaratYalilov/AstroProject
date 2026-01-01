import type { CollectionEntry } from 'astro:content'
import { replaceQuranTags } from '@/utils/replaceQuranTags'

type GlossaryEntry = CollectionEntry<'glossary'>

type Props = {
  entry: GlossaryEntry | null
}

export default function GlossaryDetail({ entry }: Props) {
  if (!entry) {
    return (
      <p className="text-muted-foreground">
        Выберите термин слева
      </p>
    )
  }

  return (
    <article className="prose prose-base md:prose-lg max-w-none">
      <h1>{entry.data.term}</h1>

      {entry.data.aliases?.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Также: {entry.data.aliases.join(', ')}
        </p>
      )}

      <div
        dangerouslySetInnerHTML={{
          __html: replaceQuranTags(entry.body),
        }}
      />
    </article>
  )
}
