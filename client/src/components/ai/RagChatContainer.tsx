import { useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RagChat } from "./RagChat"
import { useUIStore } from "@/stores/ui-store"

export function RagChatContainer() {
  const { ragChatPanel, openRagChatPanel, closeRagChatPanel } = useUIStore()

  // Keyboard shortcuts for RAG chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to toggle chat
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        if (ragChatPanel.open) {
          closeRagChatPanel()
        } else {
          openRagChatPanel()
        }
      }
      // Escape to close chat
      if (e.key === "Escape" && ragChatPanel.open) {
        closeRagChatPanel()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [ragChatPanel.open, openRagChatPanel, closeRagChatPanel])

  return (
    <AnimatePresence>
      {ragChatPanel.open && (
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
          className="fixed right-0 top-0 w-96 max-w-[90vw] bg-background/95 backdrop-blur-sm h-[calc(100vh-3.5rem)] overflow-hidden z-50"
        >
          <div className="sticky top-0 p-4 bg-background/80 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">AI Assistant</span>
                <span className="text-xs text-muted-foreground">(Ctrl+K)</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeRagChatPanel}
                className="h-6 w-6 p-0 hover:bg-muted/50"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="h-[calc(100%-4rem)] overflow-hidden">
            <RagChat open={ragChatPanel.open} onClose={closeRagChatPanel} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
