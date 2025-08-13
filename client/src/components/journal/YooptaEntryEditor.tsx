import { useMemo, useState, useEffect, useCallback } from "react"
import YooptaEditor, {
  createYooptaEditor,
  YooptaContentValue,
} from "@yoopta/editor"
import Paragraph from "@yoopta/paragraph"
import Blockquote from "@yoopta/blockquote"
import { plainText } from "@yoopta/exports"
import { Button } from "@/components/ui/button"

interface YooptaEntryEditorProps {
  onSubmit: (content: YooptaContentValue, textContent: string) => Promise<void>
  initialContent?: string
  isEditing?: boolean
  onCancel?: () => void
  isLoading?: boolean
  placeholder?: string
}

export function YooptaEntryEditor({
  onSubmit,
  initialContent = "",
  isEditing = false,
  onCancel,
  isLoading = false,
  placeholder = "Write your thoughts...",
}: YooptaEntryEditorProps) {
  const [editorKey, setEditorKey] = useState(0)
  const editor = useMemo(() => createYooptaEditor(), [editorKey])
  const [value, setValue] = useState<YooptaContentValue>(() => {
    if (initialContent) {
      try {
        return JSON.parse(initialContent)
      } catch (error) {
        console.error("Failed to parse initial content:", error)
        // Return empty Yoopta format matching the official example
        return {
          "empty-block": {
            id: "empty-block",
            type: "Paragraph",
            meta: {
              order: 0,
              depth: 0,
            },
            value: [
              {
                id: "empty-paragraph",
                type: "paragraph",
                children: [
                  {
                    text: "",
                  },
                ],
                props: {
                  nodeType: "block",
                },
              },
            ],
          },
        }
      }
    }
    // Return empty Yoopta format matching the official example
    return {
      "empty-block": {
        id: "empty-block",
        type: "Paragraph",
        meta: {
          order: 0,
          depth: 0,
        },
        value: [
          {
            id: "empty-paragraph",
            type: "paragraph",
            children: [
              {
                text: "",
              },
            ],
            props: {
              nodeType: "block",
            },
          },
        ],
      },
    }
  })

  const plugins = [Paragraph, Blockquote]

  const onChange = (newValue: YooptaContentValue) => {
    setValue(newValue)
  }

  // Check if content has any actual text
  const hasContent = (content: unknown): boolean => {
    if (!content || typeof content !== "object") return false

    // Check all blocks in the content
    const contentObj = content as Record<string, unknown>
    for (const blockKey in contentObj) {
      const block = contentObj[blockKey] as { value?: unknown[] }
      if (block && block.value && Array.isArray(block.value)) {
        for (const item of block.value) {
          const typedItem = item as { children?: unknown[] }
          if (
            typedItem &&
            typedItem.children &&
            Array.isArray(typedItem.children)
          ) {
            for (const child of typedItem.children) {
              const typedChild = child as { text?: string }
              if (
                typedChild &&
                typedChild.text &&
                typedChild.text.trim() !== ""
              ) {
                return true
              }
            }
          }
        }
      }
    }
    return false
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      await saveContent()
    },
    [editor, onSubmit]
  )

  const saveContent = useCallback(async () => {
    try {
      // Get the actual editor content
      const editorContent = editor.getEditorValue()

      // Validate that content is not empty
      if (!hasContent(editorContent)) {
        console.log("Cannot save empty entry")
        return
      }

      // Use the editor content, not the value state
      const textContent = plainText.serialize(editor, editorContent)
      await onSubmit(editorContent, textContent)

      // Always reset to empty state after successful save
      const emptyValue = {
        "empty-block": {
          id: "empty-block",
          type: "Paragraph",
          meta: {
            order: 0,
            depth: 0,
          },
          value: [
            {
              id: "empty-paragraph",
              type: "paragraph",
              children: [
                {
                  text: "",
                },
              ],
              props: {
                nodeType: "block",
              },
            },
          ],
        },
      }
      // Reset the editor immediately
      setValue(emptyValue)
      setEditorKey((prev) => prev + 1)
    } catch (error) {
      console.error("Error saving entry:", error)
    }
  }, [editor, onSubmit])

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Enter to save (works for both new entries and editing)
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        // Create a synthetic form event
        const syntheticEvent = {
          preventDefault: () => {},
        } as React.FormEvent
        handleSubmit(syntheticEvent)
      }

      // Escape to cancel (only when editing)
      if (e.key === "Escape" && isEditing && onCancel) {
        e.preventDefault()
        handleCancel()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleSubmit, isEditing, onCancel])

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden">
        <YooptaEditor
          key={editorKey}
          editor={editor}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          plugins={plugins}
          // className="min-h-[150px] p-0 text-base leading-relaxed"
        />
      </div>

      {isEditing && onCancel && (
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="command"
            size="sm"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
            <span className="ml-2 text-xs opacity-60">Esc</span>
          </Button>
        </div>
      )}
    </div>
  )
}
