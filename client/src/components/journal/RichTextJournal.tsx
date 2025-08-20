import { useState, useRef, useEffect } from "react"
import {
  BookOpen,
  X,
  Edit2,
  Loader2,
  Sparkles,
  MessageSquare,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { useIntersectionObserver, useDebounce } from "@uidotdev/usehooks"
import { useUser } from "@/lib/auth-hooks"
import {
  useEntries,
  useCreateEntry,
  useUpdateEntry,
  useDeleteEntry,
} from "@/lib/entries-hooks"
import { Button } from "@/components/ui/button"
import { YooptaEntryEditor } from "./YooptaEntryEditor"
import { YooptaContentRenderer } from "./YooptaContentRenderer"
import { RagChat } from "../ai/RagChat"
import { ExpandSuggestionPanel } from "./ExpandSuggestionPanel"
import type { Entry } from "@/lib/entries-hooks"

export function RichTextJournal() {
  const { data: user, isLoading: userLoading } = useUser()
  const {
    data: entriesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: entriesLoading,
  } = useEntries()
  const createEntryMutation = useCreateEntry()
  const updateEntryMutation = useUpdateEntry()
  const deleteEntryMutation = useDeleteEntry()

  // Flatten all entries from all pages and reverse to show newest at bottom
  const allEntries =
    entriesData?.pages.flatMap((page) => page.entries).reverse() || []

  // Editing state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState("")

  // Panel state for Writing Assistant
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelEntryId, setPanelEntryId] = useState<number | null>(null)
  const [panelEntryText, setPanelEntryText] = useState<string>("")

  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [autoSave, setAutoSave] = useState(false) // Disabled by default
  const [showChat, setShowChat] = useState(false)
  const historyRef = useRef<HTMLDivElement>(null)

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to toggle chat
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setShowChat((prev) => !prev)
      }
      // Escape to close chat
      if (e.key === "Escape" && showChat) {
        setShowChat(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [showChat])

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
    const currentPage = entriesData?.pages.length || 1

    if (
      allEntries.length > 0 &&
      historyRef.current &&
      currentPage === 1 // Only scroll when we're on the first page
    ) {
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
  }, [allEntries.length, entriesData?.pages.length])

  const handleSaveEntry = async (entryContent: any, textContent: string) => {
    if (!textContent.trim()) return

    setIsSaving(true)

    try {
      // Save the entry
      await createEntryMutation.mutateAsync({
        content: entryContent,
        textContent,
      })

      setLastSaved(new Date())
    } catch (error) {
      console.error("Error saving entry:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditEntry = (entry: Entry) => {
    setEditingId(entry.id)
    setEditingContent(JSON.stringify(entry.content))
  }

  const handleUpdateEntry = async (entryContent: any, textContent: string) => {
    if (!editingId || !textContent.trim()) return

    try {
      await updateEntryMutation.mutateAsync({
        id: editingId,
        content: entryContent,
        textContent,
      })
      setEditingId(null)
      setEditingContent("")
    } catch (error) {
      console.error("Error updating entry:", error)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingContent("")
  }

  const handleDeleteEntry = async (id: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this entry? This action cannot be undone."
      )
    ) {
      return
    }

    try {
      await deleteEntryMutation.mutateAsync(id)
    } catch (error) {
      console.error("Error deleting entry:", error)
    }
  }

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
    setPanelEntryId(entry.id)
    setPanelEntryText(text)
    setPanelOpen(true)
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-2 right-2 z-50 bg-background rounded-lg shadow-xl p-4 min-w-64">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">Settings</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="p-1 rounded hover:bg-muted"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Auto-save</span>
              <button
                onClick={() => setAutoSave(!autoSave)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSave ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                    autoSave ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - 3 Column Grid Layout */}
      <main className="flex-1 overflow-hidden">
        <div className="grid grid-cols-3 gap-6 h-full">
          {/* Left Column - Empty for now */}
          <div className="col-span-1"></div>

          {/* Center Column - Journal Content */}
          <div className="col-span-1 px-6 py-6 overflow-y-auto scrollbar-thin">
            <div ref={historyRef} className="space-y-1">
              {/* Intersection Observer Target - Load More Trigger (at the top) */}
              {hasNextPage && (
                <div
                  ref={loadMoreRef}
                  className="h-4 w-full"
                  aria-hidden="true"
                />
              )}

              <AnimatePresence>
                {entriesLoading ? (
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
                ) : allEntries.length === 0 ? (
                  <motion.div
                    key="empty-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center text-muted-foreground py-8"
                  >
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No entries yet</p>
                    <p className="text-xs">
                      Start writing to see your journal history
                    </p>
                  </motion.div>
                ) : (
                  // Show entries in chronological order (oldest first, from backend)
                  allEntries.map((entry: Entry) => (
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
                              panelOpen && panelEntryId === entry.id
                                ? "w-2 h-2 rounded-full mr-2 bg-primary inline-block"
                                : "w-2 h-2 rounded-full mr-2 bg-transparent inline-block"
                            }
                            aria-hidden="true"
                          />
                          <div
                            className={`transition-opacity duration-200 ${
                              panelOpen && panelEntryId === entry.id
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
                            panelOpen && panelEntryId === entry.id
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
                              handleDeleteEntry(entry.id)
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
                          <YooptaContentRenderer
                            content={entry.content}
                            //   className="text-foreground"
                          />

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

            {/* Writing Section - Rich Text Editor */}
            <div className="mt-6" data-section="writing">
              <div className="relative">
                <YooptaEntryEditor
                  onSubmit={handleSaveEntry}
                  isLoading={isSaving}
                  placeholder="What's on your mind today?"
                />
              </div>

              {/* Status Bar */}
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  {isSaving && (
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      Saving...
                    </span>
                  )}
                  {lastSaved && !isSaving && (
                    <span>Saved {lastSaved.toLocaleTimeString()}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Chat Button */}
                  <Button
                    onClick={() => setShowChat((prev) => !prev)}
                    size="sm"
                    variant="ghost"
                    // variant="gradient"
                    className="px-2 py-1 text-xs hover:bg-muted/50 transition-colors"
                    title="Toggle AI Chat (Ctrl+K)"
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    AI Chat
                    <span className="ml-1 opacity-60">Ctrl+K</span>
                  </Button>

                  {/* Save Button */}
                  <Button
                    onClick={() => {
                      // No-op here — saving is handled inside the YooptaEntryEditor via keyboard shortcut (⌘+Enter)
                    }}
                    disabled={isSaving}
                    size="sm"
                    variant="gradient"
                    title="Save entry (⌘+Enter)"
                  >
                    Save
                    <span className="ml-1 opacity-60">⌘+Enter</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Chat Panel */}
          <AnimatePresence>
            {showChat && (
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
                      <span className="text-xs text-muted-foreground">
                        (Ctrl+K)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowChat(false)}
                      className="h-6 w-6 p-0 hover:bg-muted/50"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="h-[calc(100%-4rem)] overflow-hidden">
                  <RagChat />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Writing Assistant Panel (animated like Chat panel) */}
          <AnimatePresence>
            {panelOpen && (
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
                  entryId={panelEntryId ?? 0}
                  entryText={panelEntryText}
                  open={panelOpen}
                  onClose={() => setPanelOpen(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
