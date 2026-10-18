import type { GlossaryEntry } from '@/lib/glossary/glossaryPageData'
import { motion, AnimatePresence } from 'framer-motion'

type Props = {
  entry: GlossaryEntry
  opened: boolean
  onToggle: () => void
}

export default function GlossaryCard({
  entry,
  opened,
  onToggle,
}: Props) {
  return (
    <motion.div layout className="border rounded-lg p-4 bg-background">
      <button onClick={onToggle} className="w-full text-left">
        <h3 className="text-lg font-semibold">
          {entry.data.term}
        </h3>
      </button>

      <AnimatePresence initial={false}>
        {opened && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="prose prose-sm mt-4 max-w-none"
          >
            <div
              dangerouslySetInnerHTML={{
                __html: entry.body,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
