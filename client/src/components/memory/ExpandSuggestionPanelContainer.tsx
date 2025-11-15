import { motion, AnimatePresence } from "motion/react"
import { ExpandSuggestionPanel } from "./ExpandSuggestionPanel"
import { useUIStore } from "@/stores/ui-store"

export function ExpandSuggestionPanelContainer() {
  const { suggestionPanel, closeSuggestionPanel } = useUIStore()

  return (
    <AnimatePresence>
      {suggestionPanel.open && (
        <motion.div
          initial={{ x: "100%", opacity: 0, scale: 0.95 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: "100%", opacity: 0, scale: 0.95 }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 200,
            duration: 0.4,
          }}
          className="fixed right-0 top-0 h-full w-[380px] max-w-[90vw] bg-background"
        >
          <ExpandSuggestionPanel
            entryId={suggestionPanel.entryId ?? 0}
            entryText={suggestionPanel.entryText}
            open={suggestionPanel.open}
            onClose={closeSuggestionPanel}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
