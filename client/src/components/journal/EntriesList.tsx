import { useRef, useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useIntersectionObserver, useDebounce } from "@uidotdev/usehooks"
import { BookOpen, X, Edit2, Loader2, Sparkles } from "lucide-react"
import { YooptaContentRenderer } from "./YooptaContentRenderer"
import { YooptaEntryEditor } from "./YooptaEntryEditor"
import { useUIStore } from "@/stores/ui-store"
import { useUpdateEntry } from "@/lib/entries-hooks"
import type { Entry } from "@/lib/entries-hooks"
import type { YooptaContentValue } from "@yoopta/editor"

interface EntriesListProps {
  entries: Entry[]
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  onEditEntry: (entry: Entry) => void
  onDeleteEntry: (id: number) => void
}

export function EntriesList({
  entries,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  onEditEntry,
  onDeleteEntry,
}: EntriesListProps) {
  const historyRef = useRef<HTMLDivElement>(null)

  // Editing state - moved inside component
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState("")

  // Update entry mutation
  const updateEntryMutation = useUpdateEntry()

  // Editing functions
  const handleEditEntry = (entry: Entry) => {
    setEditingId(entry.id)
    setEditingContent(JSON.stringify(entry.content))
    onEditEntry(entry)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingContent("")
  }

  const handleUpdateEntry = async (
    content: YooptaContentValue,
    textContent: string
  ) => {
    if (!editingId || !textContent.trim()) return

    try {
      await updateEntryMutation.mutateAsync({
        id: editingId,
        content,
        textContent,
      })
      setEditingId(null)
      setEditingContent("")
    } catch (error) {
      console.error("Error updating entry:", error)
    }
  }

  // Intersection Observer for infinite scroll
  const [loadMoreRef, loadMoreEntry] = useIntersectionObserver({
    threshold: 0, // Trigger as soon as element enters viewport
    root: null, // Use viewport as root
    rootMargin: "100px", // Trigger 100px before element is visible
  })

  // Debounce the intersection state to prevent rapid API calls
  const debouncedIsIntersecting = useDebounce(
    loadMoreEntry?.isIntersecting,
    500 // Increased debounce time to prevent multiple page loads
  )

  // Track if we've already triggered a fetch to prevent duplicates
  const [hasTriggeredFetch, setHasTriggeredFetch] = useState(false)

  // Track if we're loading older pages (not new entries)
  const [isLoadingOlderPages, setIsLoadingOlderPages] = useState(false)

  // Track last fetch time to prevent rapid successive calls
  const lastFetchTimeRef = useRef<number>(0)
  const FETCH_COOLDOWN = 1000 // 1 second cooldown between fetches

  // Trigger infinite scroll when intersection observer detects the load more element
  useEffect(() => {
    const now = Date.now()
    if (
      debouncedIsIntersecting &&
      hasNextPage &&
      !isFetchingNextPage &&
      !hasTriggeredFetch &&
      now - lastFetchTimeRef.current > FETCH_COOLDOWN
    ) {
      setHasTriggeredFetch(true)
      setIsLoadingOlderPages(true)
      lastFetchTimeRef.current = now
      fetchNextPage()
    }
  }, [
    debouncedIsIntersecting,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    hasTriggeredFetch,
  ])

  // Reset the trigger flag when fetching starts
  useEffect(() => {
    if (isFetchingNextPage) {
      setHasTriggeredFetch(false)
    }
  }, [isFetchingNextPage])

  // Reset trigger when intersection changes
  useEffect(() => {
    if (!debouncedIsIntersecting) {
      setHasTriggeredFetch(false)
    }
  }, [debouncedIsIntersecting])

  // Reset older pages loading flag when fetch completes
  useEffect(() => {
    if (!isFetchingNextPage && isLoadingOlderPages) {
      setIsLoadingOlderPages(false)
    }
  }, [isFetchingNextPage, isLoadingOlderPages])

  // Scroll to journal creation area when new entries are added (only on page 1)
  useEffect(() => {
    if (entries.length > 0 && historyRef.current) {
      const scrollToJournalCreation = () => {
        if (historyRef.current) {
          // Scroll to the journal creation area (writing section)
          const writingSection = document.querySelector(
            '[data-section="writing"]'
          )
          if (writingSection) {
            writingSection.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
          }
        }
      }

      // Small delay to ensure the new entry is rendered
      setTimeout(scrollToJournalCreation, 100)
    }
  }, [entries.length])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 48) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString()
    }
  }

  // Open the assistant panel for a specific entry
  const openAssistForEntry = (entry: Entry) => {
    const text =
      entry.text_content ||
      (typeof entry.content === "string" ? entry.content : "")
    // Debug: log when user opens assistant for an entry
    // This helps verify the button is wired and the panel will open
    // eslint-disable-next-line no-console
    console.log("[WritingAssistant] openAssistForEntry:", { entryId: entry.id })
    useUIStore.getState().openSuggestionPanel(entry.id, text)
  }

  return (
    <div ref={historyRef} className="space-y-1">
      {/* Intersection Observer Target - Load More Trigger (at the top) */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="h-4 w-full" aria-hidden="true" />
      )}

      <AnimatePresence>
        {isLoading ? (
          <motion.div
            key="loading-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-muted-foreground py-8"
          >
            <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p className="text-sm">Loading entries...</p>
          </motion.div>
        ) : entries.length === 0 ? (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-muted-foreground py-8"
          >
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No entries yet</p>
            <p className="text-xs">Start writing to see your journal history</p>
          </motion.div>
        ) : (
          // Show entries in chronological order (oldest first, from backend)
          entries.map((entry: Entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="group journal-entry relative"
            >
              <div className="text-xs text-muted-foreground flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      useUIStore.getState().suggestionPanel.open &&
                      useUIStore.getState().suggestionPanel.entryId === entry.id
                        ? "w-2 h-2 rounded-full mr-2 bg-primary inline-block"
                        : "w-2 h-2 rounded-full mr-2 bg-transparent inline-block"
                    }
                    aria-hidden="true"
                  />
                  <div
                    className={`transition-opacity duration-200 ${
                      useUIStore.getState().suggestionPanel.open &&
                      useUIStore.getState().suggestionPanel.entryId === entry.id
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <span>{formatDate(entry.created_at)}</span>
                    <span className="text-xs opacity-60">
                      (double-click to edit)
                    </span>
                  </div>
                </div>
                <div
                  className={`flex gap-1 transition-opacity duration-200 ${
                    useUIStore.getState().suggestionPanel.open &&
                    useUIStore.getState().suggestionPanel.entryId === entry.id
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <button
                    onClick={() => handleEditEntry(entry)}
                    className="p-1 rounded hover:bg-muted transition-colors"
                    title="Edit entry (or double-click the text)"
                  >
                    <Edit2 className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteEntry(entry.id)
                    }}
                    className="p-1 rounded hover:bg-muted transition-colors hover:text-red-600"
                    title="Delete entry"
                  >
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openAssistForEntry(entry)
                    }}
                    className="p-1 rounded hover:bg-muted transition-colors"
                    title="Open Writing Assistant"
                  >
                    <Sparkles className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {editingId === entry.id ? (
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                    <span>Editing entry</span>
                    <span className="text-xs opacity-60">
                      (⌘+Enter to save, Esc to cancel)
                    </span>
                  </div>
                  <YooptaEntryEditor
                    initialContent={editingContent}
                    onSubmit={handleUpdateEntry}
                    isEditing
                    onCancel={handleCancelEdit}
                    isLoading={updateEntryMutation.isPending}
                    placeholder="Edit your entry..."
                  />
                </div>
              ) : (
                <div
                  className="text-foreground leading-relaxed cursor-text rounded p-2 -m-2 transition-all duration-500 relative group/entry hover:bg-muted/20"
                  onDoubleClick={() => handleEditEntry(entry)}
                  title="Double-click to edit"
                >
                  <YooptaContentRenderer content={entry.content} />

                  {/* Bottom gradient effect on hover */}
                  <span className="absolute inset-x-0 -bottom-px block h-px w-full journal-entry-gradient opacity-0 transition duration-500 group-hover/entry:opacity-100" />
                  <span className="absolute inset-x-4 -bottom-px mx-auto block h-px w-1/2 journal-entry-gradient-blur opacity-0 transition duration-500 group-hover/entry:opacity-100" />
                </div>
              )}
            </motion.div>
          ))
        )}
      </AnimatePresence>

      {/* Infinite Scroll Loading Indicator */}
      {isFetchingNextPage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-4"
        >
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-2">
            Loading more entries...
          </p>
        </motion.div>
      )}
    </div>
  )
}
