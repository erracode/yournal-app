import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Copy } from "lucide-react"

interface ExpandSuggestionPanelProps {
  entryId: number
  entryText: string
  open: boolean
  onClose: () => void
  onInsert?: (
    suggestion: string,
    options?: { mode?: "append" | "replace" }
  ) => Promise<void>
  onSaveAsNew?: (suggestion: string) => Promise<void>
}

export function ExpandSuggestionPanel({
  entryId,
  entryText,
  open,
  onClose,
  onInsert,
  onSaveAsNew,
}: ExpandSuggestionPanelProps) {
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [variantIndex, setVariantIndex] = useState(0)
  const [variants, setVariants] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    setSuggestion("")
    setVariants([])

    // Mock suggestion generator (simulate latency)
    const t = setTimeout(() => {
      const base = `Expanded version of: ${entryText.substring(0, 180)}`
      const v1 = `${base}. This is an expanded narrative with more context, small bullets, and a short conclusion.`
      const v2 = `${base}. Quick summary: key points, action items, and clarifying questions to consider.`
      const v3 = `${base}. Detailed notes: who was involved, decisions made, and next steps with time hints.`

      setVariants([v1, v2, v3])
      setVariantIndex(0)
      setSuggestion(v1)
      setLoading(false)
    }, 700)

    return () => clearTimeout(t)
  }, [open, entryId, entryText])

  const handleInsert = async (mode: "append" | "replace" = "append") => {
    if (onInsert) {
      try {
        await onInsert(suggestion, { mode })
      } catch (err) {
        setError("Failed to insert suggestion")
      }
    }
  }

  const handleSaveAsNew = async () => {
    if (onSaveAsNew) {
      try {
        await onSaveAsNew(suggestion)
      } catch (err) {
        setError("Failed to save as new entry")
      }
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(suggestion)
    } catch {
      // ignore
    }
  }

  if (!open) return null

  // Allow embedding inside a motion wrapper that already provides the fixed container
  // when `embedded` is true. Default is false (full standalone panel).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // Note: TSX doesn't allow default prop values in destructuring for function components easily;
  // We'll handle optional prop presence.
  // @ts-ignore
  const isEmbedded = (arguments[0] && arguments[0].embedded) || false

  const panelContent = (
    <>
      <div className="flex items-center justify-between p-4  ">
        <div className="flex flex-col">
          <span className="text-sm font-medium">Writing Assistant</span>
          <span className="text-xs text-muted-foreground">
            Suggestion for entry #{entryId}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopy()}
            className="h-8 w-8 p-0"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 h-[calc(100%-112px)] overflow-y-auto">
        <div className="mb-3 text-xs text-muted-foreground">Original</div>
        <div className="mb-4 p-3 bg-muted/20  text-sm  whitespace-pre-wrap">
          {entryText || "(no text available)"}
        </div>

        <div className="mb-3 text-xs text-muted-foreground">
          Suggestion {loading ? "(generating...)" : ""}
        </div>

        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted/20 rounded" />
            <div className="h-4 bg-muted/20 rounded w-5/6" />
            <div className="h-4 bg-muted/20 rounded w-3/4" />
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : (
          <div className="space-y-3">
            <div className="bg-muted/20 p-3 text-sm  min-h-[120px]">
              <textarea
                className="w-full min-h-[100px] resize-none border-none outline-none text-sm"
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
              />
            </div>

            {/* Variants */}
            <div className="flex items-center gap-2">
              {variants.map((v, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setVariantIndex(idx)
                    setSuggestion(variants[idx])
                  }}
                  className={`text-xs px-2 py-1 rounded ${
                    idx === variantIndex
                      ? "bg-primary text-white"
                      : "bg-muted/10"
                  }`}
                >
                  Variant {idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border/50 bg-background/80 flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">Model: mock</div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleInsert("replace")}
            disabled={loading}
          >
            Replace
          </Button>
          <Button
            size="sm"
            onClick={() => handleInsert("append")}
            disabled={loading}
          >
            Insert
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSaveAsNew}
            disabled={loading}
          >
            Save as new
          </Button>
        </div>
      </div>
    </>
  )

  return isEmbedded ? (
    panelContent
  ) : (
    <div className="fixed right-0 top-0 h-full w-[380px] max-w-[90vw] ">
      {panelContent}
    </div>
  )
}
