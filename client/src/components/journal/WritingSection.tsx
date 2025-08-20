import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"
import { YooptaEntryEditor } from "./YooptaEntryEditor"
import { useUIStore } from "@/stores/ui-store"

interface WritingSectionProps {
  isSaving: boolean
  lastSaved: Date | null
  onSaveEntry: (content: any, textContent: string) => Promise<void>
}

export function WritingSection({
  isSaving,
  lastSaved,
  onSaveEntry,
}: WritingSectionProps) {
  return (
    <div className="mt-6" data-section="writing">
      <div className="relative">
        <YooptaEntryEditor
          onSubmit={onSaveEntry}
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
            <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Chat Button */}
          <Button
            onClick={() => useUIStore.getState().openRagChatPanel()}
            size="sm"
            variant="ghost"
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
  )
}
