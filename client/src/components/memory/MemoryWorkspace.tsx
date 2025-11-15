import { useState } from "react"
import { useUser } from "@/lib/auth-hooks"
import { useEntries, useCreateEntry, useDeleteEntry } from "@/lib/entries-hooks"
import { MemoryList } from "./MemoryList"
import { MemoryCapture } from "./MemoryCapture"
import { ExpandSuggestionPanelContainer } from "./ExpandSuggestionPanelContainer"
import { RagChatContainer } from "../ai/RagChatContainer"
import type { Entry } from "@/lib/entries-hooks"

export function MemoryWorkspace() {
  const { data: user, isLoading: userLoading } = useUser()
  const {
    data: entriesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: entriesLoading,
  } = useEntries()
  const createEntryMutation = useCreateEntry()
  const deleteEntryMutation = useDeleteEntry()

  // Flatten all memories from all pages and reverse to show newest at bottom
  const allEntries =
    entriesData?.pages.flatMap((page) => page.entries).reverse() || []

  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const handleSaveEntry = async (
    entryContent: Record<string, unknown>,
    textContent: string
  ) => {
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
    // This function is now just a callback for the parent component
    // The actual editing logic is handled inside MemoryList
    console.log("Edit entry requested:", entry.id)
  }

  const handleDeleteEntry = async (id: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this memory? This action cannot be undone."
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
      {/* Main Content - 3 Column Grid Layout */}
      <main className="flex-1 overflow-hidden">
        <div className="grid grid-cols-3 gap-6 h-full">
          {/* Left Column - Reserved for future features */}
          <div className="col-span-1"></div>

          {/* Center Column - Memory Center */}
          <div className="col-span-1 px-6 py-6 overflow-y-auto scrollbar-thin">
            <MemoryList
              entries={allEntries}
              isLoading={entriesLoading}
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={hasNextPage}
              fetchNextPage={fetchNextPage}
              onEditEntry={handleEditEntry}
              onDeleteEntry={handleDeleteEntry}
            />

            <MemoryCapture
              isSaving={isSaving}
              lastSaved={lastSaved}
              onSaveEntry={handleSaveEntry}
            />
          </div>

          {/* Right Column - AI Tools (Chat & Memory Assistant) */}
          <RagChatContainer />

          {/* Memory Assistant Panel (animated like Chat panel) */}
          <ExpandSuggestionPanelContainer />
        </div>
      </main>
    </div>
  )
}
