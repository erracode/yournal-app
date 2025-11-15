import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { X, Copy, Check } from "lucide-react"
import { apiClient } from "@/lib/api"

interface ExpandSuggestionPanelProps {
  entryId: number
  entryText: string
  open: boolean
  onClose: () => void
}

export function ExpandSuggestionPanel({
  entryId,
  entryText,
  open,
  onClose,
}: ExpandSuggestionPanelProps) {
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<string>("")
  const [isRegenerating, setIsRegenerating] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(false)
    setError(null)
    setSuggestion("")
    setContext("")
  }, [open, entryId, entryText])

  const generateSuggestion = async (customContext?: string) => {
    try {
      setLoading(true)
      setError(null)
      const finalContext = customContext !== undefined ? customContext : context
      const response = await apiClient.generateSuggestion(
        entryText,
        entryId,
        finalContext
      )
      setSuggestion(response.suggestion)
      setError(null)
    } catch (err) {
      console.error("Failed to generate suggestion:", err)
      setError("Failed to generate suggestion. Please try again.")
    } finally {
      setLoading(false)
      setIsRegenerating(false)
    }
  }

  // Remove insert and save functions since we're only allowing copy

  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(suggestion)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const handleRegenerate = () => {
    setIsRegenerating(true)
    generateSuggestion()
  }

  // Handle escape key to close panel
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose()
      }
    }

    if (open) {
      document.addEventListener("keydown", handleEscape)
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open, onClose])

  if (!open) return null

  // Allow embedding inside a motion wrapper that already provides the fixed container
  // when `embedded` is true. Default is false (full standalone panel).
  // Note: This is for future use when embedding is needed
  const isEmbedded = false

  const panelContent = (
    <>
      <div className="flex items-center justify-between p-4  ">
        <div className="flex flex-col">
                      <span className="text-sm font-medium">Memory Assistant</span>
                      <span className="text-xs text-muted-foreground">
              Suggestion for memory #{entryId}
            </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={!suggestion}
            className="h-8 w-8 p-0 relative"
            aria-label={copied ? "Copied" : "Copy to memory"}
          >
            <span className="sr-only">{copied ? "Copied" : "Copy to memory"}</span>
            <Copy
              className={`h-4 w-4 transition-all duration-300 ${
                copied ? "scale-0" : "scale-100"
              }`}
            />
            <Check
              className={`absolute inset-0 m-auto h-4 w-4 transition-all duration-300 ${
                copied ? "scale-100" : "scale-0"
              }`}
            />
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

      <div className="p-4 h-[calc(100%-8rem)] overflow-y-auto">
        <div className="mb-3 text-xs text-muted-foreground">Original Memory</div>
        <div className="mb-4 p-3 bg-muted/20  text-sm  whitespace-pre-wrap">
          {entryText || "(no text available)"}
        </div>

        {/* Context Input */}
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Additional Context (optional)</span>
            {context && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                Context provided
              </span>
            )}
          </div>
          <Textarea
            placeholder="Add any specific context, tone, or style you'd like the AI to consider..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="resize-none"
            rows={2}
          />
        </div>

        <div className="mb-3 text-xs text-muted-foreground">
          AI Suggestion {loading ? "(generating...)" : ""}
        </div>

        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted/20 rounded" />
            <div className="h-4 bg-muted/20 rounded w-5/6" />
            <div className="h-4 bg-muted/20 rounded w-3/4" />
          </div>
        ) : error ? (
          <div className="space-y-3">
            <div className="text-sm text-red-600">{error}</div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setLoading(true)
                setError(null)
                generateSuggestion()
              }}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-muted/20 p-3 text-sm min-h-[120px] rounded-lg">
              <div className="w-full min-h-[100px] text-sm whitespace-pre-wrap">
                {suggestion}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border/50 bg-background/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={suggestion ? handleRegenerate : () => generateSuggestion()}
            disabled={loading || isRegenerating}
            className="flex items-center gap-2"
          >
            {isRegenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Regenerating...
              </>
            ) : loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : suggestion ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Regenerate
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Generate
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            disabled={loading || !suggestion}
            className="relative"
            aria-label={copied ? "Copied" : "Copy to memory"}
          >
            <span className="sr-only">{copied ? "Copied" : "Copy to memory"}</span>
            <Copy
              className={`h-4 w-4 mr-2 transition-all duration-300 ${
                copied ? "scale-0" : "scale-100"
              }`}
            />
            <Check
              className={`absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 transition-all duration-300 ${
                copied ? "scale-100" : "scale-0"
              }`}
            />
                              {copied ? "Copied!" : "Copy to Memory"}
          </Button>
        </div>
      </div>
    </>
  )

  return isEmbedded ? (
    panelContent
  ) : (
    <div className="fixed right-0 top-0 h-[calc(100vh-3.5rem)] w-[380px] max-w-[90vw] bg-background/95 backdrop-blur-sm overflow-hidden">
      {panelContent}
    </div>
  )
}
