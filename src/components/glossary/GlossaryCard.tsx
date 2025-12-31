import type { CollectionEntry } from 'astro:content'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { replaceQuranTags } from "../../utils/replaceQuranTags";

type GlossaryEntry = CollectionEntry<'glossary'>

export default function GlossaryCard({ entry }: { entry: GlossaryEntry }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div layout className="border rounded-lg p-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left"
      >
        <h3 className="text-lg font-semibold">
          {entry.data.term}
        </h3>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="prose prose-sm mt-4 max-w-none"
          >
            <div
              dangerouslySetInnerHTML={{ __html: replaceQuranTags(entry.body) }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
