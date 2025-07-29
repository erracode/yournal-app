import { useState, useRef, useEffect } from "react"
import { BookOpen, Settings, LogOut, X, Edit2, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { useIntersectionObserver, useDebounce } from "@uidotdev/usehooks"
import { useUser, useSignOut } from "@/lib/auth-hooks"
import {
  useEntries,
  useCreateEntry,
  useUpdateEntry,
  useDeleteEntry,
} from "@/lib/entries-hooks"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { YooptaEntryEditor } from "./YooptaEntryEditor"
import { YooptaContentRenderer } from "./YooptaContentRenderer"
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
  const signOutMutation = useSignOut()
  const createEntryMutation = useCreateEntry()
  const updateEntryMutation = useUpdateEntry()
  const deleteEntryMutation = useDeleteEntry()

  // Flatten all entries from all pages and reverse to show newest at bottom
  const allEntries =
    entriesData?.pages.flatMap((page) => page.entries).reverse() || []

  // Editing state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState("")

  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [autoSave, setAutoSave] = useState(false) // Disabled by default
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
      setTimeout(scrollToJournalCreation, 50)
    }
  }, [allEntries.length, entriesData?.pages.length])

  const handleSaveEntry = async (entryContent: string) => {
    if (!entryContent.trim()) return

    setIsSaving(true)

    try {
      // Save the entry (TanStack Query handles optimistic updates)
      await createEntryMutation.mutateAsync(entryContent)
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

  const handleUpdateEntry = async (entryContent: string) => {
    if (!editingId) return

    try {
      await updateEntryMutation.mutateAsync({
        id: editingId,
        content: entryContent,
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

  const handleSignOut = async () => {
    try {
      await signOutMutation.mutateAsync()
    } catch (error) {
      console.error("Error signing out:", error)
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
    <div className="h-screen bg-background flex flex-col">
      {/* Fixed Header - Compact */}
      <header className="flex items-center justify-between px-4 py-2 bg-background z-10">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">yournal</span>
          <span className="text-xs text-muted-foreground ml-2">Rich Text</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-2">
            {user.user_metadata?.full_name || user.email}
          </span>
          <ThemeToggle />
          <Button
            className="p-1.5 h-auto"
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            disabled={signOutMutation.isPending}
            className="p-1.5 h-auto"
          >
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-12 right-4 z-50 bg-background rounded-lg shadow-xl p-4 min-w-64">
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

      {/* Main Content - Full Scrollable Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div ref={historyRef} className="space-y-8">
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
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="group"
                  >
                    <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex justify-between items-center">
                      <span>{formatDate(entry.created_at)}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditEntry(entry)}
                          className="p-1 rounded hover:bg-muted transition-colors"
                          title="Edit entry"
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
                        className="text-foreground leading-relaxed cursor-pointer hover:bg-muted/50 rounded p-2 -m-2 transition-colors"
                        onClick={() => handleEditEntry(entry)}
                      >
                        <YooptaContentRenderer
                          content={entry.content}
                          //   className="text-foreground"
                        />
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

              {/* Save Button */}
              <Button
                onClick={() => {
                  // Trigger keyboard event to save
                  const event = new KeyboardEvent("keydown", {
                    key: "Enter",
                    metaKey: true,
                    bubbles: true,
                  })
                  document.dispatchEvent(event)
                }}
                disabled={isSaving}
                size="sm"
                variant="command"
                // className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors disabled:opacity-50"
                title="Save entry (⌘+Enter)"
              >
                Save
                <span className="ml-1 opacity-60">⌘+Enter</span>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
