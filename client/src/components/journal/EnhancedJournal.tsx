import { useState, useRef, useEffect } from "react"
import { BookOpen, Settings, LogOut, X, Save } from "lucide-react"
import { useUser, useSignOut } from "@/lib/auth-hooks"
import { useEntries, useCreateEntry } from "@/lib/entries-hooks"
import { Button } from "@/components/ui/button"
import type { Entry } from "@/lib/entries-hooks"

export function EnhancedJournal() {
  const { data: user, isLoading: userLoading } = useUser()
  const { data: entriesData } = useEntries()
  const signOutMutation = useSignOut()
  const createEntryMutation = useCreateEntry()

  const [content, setContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [autoSave, setAutoSave] = useState(false) // Disabled by default
  const [optimisticEntries, setOptimisticEntries] = useState<Entry[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)

  // Flatten all entries from all pages and combine with optimistic entries
  const allEntries = [
    ...(entriesData?.pages.flatMap((page) => page.entries) || []),
    ...optimisticEntries,
  ]

  // Auto-save functionality (only if enabled)
  useEffect(() => {
    if (!content.trim() || !autoSave) return

    const timeoutId = setTimeout(async () => {
      if (content.trim()) {
        await handleSaveEntry(content.trim())
      }
    }, 2000) // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId)
  }, [content, autoSave])

  // Smooth scroll to bottom when new entries are added
  useEffect(() => {
    if (historyRef.current && allEntries.length > 0) {
      const scrollToBottom = () => {
        if (historyRef.current) {
          historyRef.current.scrollTop = historyRef.current.scrollHeight
        }
      }

      // Small delay to ensure the new entry is rendered
      setTimeout(scrollToBottom, 50)
    }
  }, [allEntries.length])

  // Scroll to bottom when optimistic entries are added
  useEffect(() => {
    if (optimisticEntries.length > 0 && historyRef.current) {
      const scrollToBottom = () => {
        if (historyRef.current) {
          historyRef.current.scrollTop = historyRef.current.scrollHeight
        }
      }

      // Immediate scroll for optimistic updates
      setTimeout(scrollToBottom, 10)
    }
  }, [optimisticEntries.length])

  const handleSaveEntry = async (entryContent: string) => {
    if (!entryContent.trim()) return

    // Create optimistic entry
    const optimisticEntry: Entry = {
      id: Date.now(), // Temporary ID
      content: entryContent,
      created_at: new Date().toISOString(),
      user_id: user?.id || "",
      updated_at: new Date().toISOString(),
    }

    // Add optimistic entry immediately
    setOptimisticEntries((prev) => [...prev, optimisticEntry])
    setContent("")
    setIsSaving(true)

    try {
      // Actually save the entry
      await createEntryMutation.mutateAsync(entryContent)
      setLastSaved(new Date())

      // Remove optimistic entry and let the real data flow in
      setOptimisticEntries((prev) =>
        prev.filter((entry) => entry.id !== optimisticEntry.id)
      )
    } catch (error) {
      console.error("Error saving entry:", error)
      // Remove optimistic entry on error
      setOptimisticEntries((prev) =>
        prev.filter((entry) => entry.id !== optimisticEntry.id)
      )
      // Restore content on error
      setContent(entryContent)
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Save on Ctrl+S or Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault()
      if (content.trim()) {
        handleSaveEntry(content.trim())
      }
    }
  }

  const handleManualSave = async () => {
    if (!content.trim()) return
    await handleSaveEntry(content.trim())
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
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-background z-10">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">yournal</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-2">
            {user.user_metadata?.full_name || user.email}
          </span>
          <button
            className="p-1.5 rounded hover:bg-muted transition-colors"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
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
        <div className="absolute top-12 right-4 z-50 bg-background rounded-lg shadow-xl border border-border p-4 min-w-64">
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
        <div className="max-w-4xl mx-auto px-8 py-8">
          <div ref={historyRef} className="space-y-12">
            {allEntries.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No entries yet</p>
                <p className="text-xs">
                  Start writing to see your journal history
                </p>
              </div>
            ) : (
              // Show entries in reverse chronological order (newest at bottom, oldest at top)
              [...allEntries].reverse().map((entry: Entry) => (
                <div
                  key={entry.id}
                  className={`group transition-all duration-700 ease-out ${
                    optimisticEntries.some((opt) => opt.id === entry.id)
                      ? "animate-in fade-in slide-in-from-top-8"
                      : ""
                  }`}
                >
                  <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {formatDate(entry.created_at)}
                  </div>
                  <div
                    className="text-foreground leading-relaxed font-serif"
                    style={{
                      fontFamily: '"Crimson Text", "Times New Roman", serif',
                      fontSize: "1.125rem",
                      lineHeight: "1.8",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {entry.content}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Writing Section - Clean Editor */}
          <div className="mt-12">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What's on your mind today?"
                className="w-full min-h-[120px] max-h-[300px] p-0 text-lg leading-relaxed bg-transparent border-none outline-none resize-none font-serif text-foreground placeholder:text-muted-foreground"
                style={{
                  fontFamily: '"Crimson Text", "Times New Roman", serif',
                  fontSize: "1.125rem",
                  lineHeight: "1.8",
                  letterSpacing: "0.01em",
                }}
              />
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
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
                {!autoSave && (
                  <span className="text-orange-600 dark:text-orange-400">
                    Auto-save disabled
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span>{content.length} characters</span>
                <span>
                  {
                    content.split(/\s+/).filter((word) => word.length > 0)
                      .length
                  }{" "}
                  words
                </span>
                {!autoSave && content.trim() && (
                  <Button
                    size="sm"
                    onClick={handleManualSave}
                    disabled={isSaving}
                    className="h-6 px-2 text-xs"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
