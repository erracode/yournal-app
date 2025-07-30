import { useState } from "react"
import {
  Copy,
  Check,
  Code,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Play,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface RichMessageProps {
  content: string
  isStreaming?: boolean
}

export function RichMessageRenderer({ content }: RichMessageProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  )
  const [clickedCards, setClickedCards] = useState<Set<string>>(new Set())

  // Parse content for different types of content
  const parseContent = (text: string) => {
    type Block = {
      type:
        | "text"
        | "code"
        | "suggestion"
        | "file"
        | "heading"
        | "interactive"
        | "expandable"
      content: string
      language?: string
      title?: string
      id?: string
      action?: string
    }

    const blocks: Block[] = []

    // Split by code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    let lastIndex = 0
    let match

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textContent = text.slice(lastIndex, match.index)
        if (textContent.trim()) {
          blocks.push({ type: "text", content: textContent.trim() })
        }
      }

      // Add code block
      blocks.push({
        type: "code",
        content: match[2],
        language: match[1] || "text",
      })

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex)
      if (remainingText.trim()) {
        blocks.push({ type: "text", content: remainingText.trim() })
      }
    }

    // Parse interactive elements
    const processedBlocks = blocks
      .map((block): Block[] => {
        if (block.type === "text") {
          const parts: Block[] = []
          let lastIndex = 0

          // Parse interactive cards: [CARD:action]content[/CARD]
          const cardRegex = /\[CARD:([^\]]+)\](.*?)\[\/CARD\]/g
          let cardMatch
          while ((cardMatch = cardRegex.exec(block.content)) !== null) {
            // Add text before card
            if (cardMatch.index > lastIndex) {
              parts.push({
                type: "text",
                content: block.content.slice(lastIndex, cardMatch.index),
              })
            }

            // Add interactive card
            parts.push({
              type: "interactive",
              content: cardMatch[2].trim(),
              action: cardMatch[1].trim(),
              id: `card-${Date.now()}-${Math.random()}`,
            })

            lastIndex = cardMatch.index + cardMatch[0].length
          }

          // Parse expandable sections: [EXPAND:title]content[/EXPAND]
          const expandRegex = /\[EXPAND:([^\]]+)\](.*?)\[\/EXPAND\]/g
          let expandMatch
          while ((expandMatch = expandRegex.exec(block.content)) !== null) {
            // Add text before expandable
            if (expandMatch.index > lastIndex) {
              parts.push({
                type: "text",
                content: block.content.slice(lastIndex, expandMatch.index),
              })
            }

            // Add expandable section
            parts.push({
              type: "expandable",
              content: expandMatch[2].trim(),
              title: expandMatch[1].trim(),
              id: `expand-${Date.now()}-${Math.random()}`,
            })

            lastIndex = expandMatch.index + expandMatch[0].length
          }

          // Parse suggestions: [SUGGESTION]content[/SUGGESTION]
          const suggestionRegex = /\[SUGGESTION\](.*?)\[\/SUGGESTION\]/g
          let suggestionMatch
          while (
            (suggestionMatch = suggestionRegex.exec(block.content)) !== null
          ) {
            // Add text before suggestion
            if (suggestionMatch.index > lastIndex) {
              parts.push({
                type: "text",
                content: block.content.slice(lastIndex, suggestionMatch.index),
              })
            }

            // Add suggestion
            parts.push({
              type: "suggestion",
              content: suggestionMatch[1].trim(),
            })

            lastIndex = suggestionMatch.index + suggestionMatch[0].length
          }

          // Add remaining text
          if (lastIndex < block.content.length) {
            parts.push({
              type: "text",
              content: block.content.slice(lastIndex),
            })
          }

          return parts
        }
        return [block]
      })
      .flat()

    return processedBlocks
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(text)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleCardClick = (cardId: string, action: string) => {
    setClickedCards((prev) => new Set([...prev, cardId]))

    // Handle different actions
    switch (action.toLowerCase()) {
      case "copy":
        navigator.clipboard.writeText("Copied!")
        break
      case "run":
        console.log("Running code...")
        break
      case "install":
        console.log("Installing package...")
        break
      case "open":
        window.open("https://example.com", "_blank")
        break
      default:
        console.log(`Action: ${action}`)
    }
  }

  const toggleExpandable = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const renderText = (text: string) => {
    // Simple markdown-like formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(
        /`(.*?)`/g,
        '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>'
      )
      .split("\n")
      .map((line, i) => (
        <div key={i} dangerouslySetInnerHTML={{ __html: line }} />
      ))
  }

  const blocks = parseContent(content)

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "code": {
            return (
              <div key={index} className="relative">
                <div className="flex items-center justify-between bg-muted p-2 rounded-t border-b">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    <span className="text-xs font-mono text-muted-foreground">
                      {block.language}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(block.content)}
                    className="h-6 px-2"
                  >
                    {copiedCode === block.content ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
                <pre className="bg-muted p-3 rounded-b overflow-x-auto">
                  <code className="text-sm font-mono">{block.content}</code>
                </pre>
              </div>
            )
          }

          case "suggestion": {
            return (
              <div
                key={index}
                className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Suggestion
                  </span>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {block.content}
                </p>
              </div>
            )
          }

          case "interactive": {
            const isClicked = clickedCards.has(block.id!)
            return (
              <div
                key={index}
                className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                  isClicked
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                    : "bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800"
                }`}
                onClick={() => handleCardClick(block.id!, block.action!)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {block.action}
                    </span>
                  </div>
                  {isClicked && <Check className="w-4 h-4 text-green-600" />}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {block.content}
                </p>
              </div>
            )
          }

          case "expandable": {
            const isExpanded = expandedSections.has(block.id!)
            return (
              <div key={index} className="border rounded-lg">
                <button
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-950/20 transition-colors"
                  onClick={() => toggleExpandable(block.id!)}
                >
                  <span className="text-sm font-medium">{block.title}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {isExpanded && (
                  <div className="p-3 border-t bg-gray-50 dark:bg-gray-950/10">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {renderText(block.content)}
                    </div>
                  </div>
                )}
              </div>
            )
          }

          case "text":
          default:
            return (
              <div key={index} className="text-sm leading-relaxed">
                {renderText(block.content)}
              </div>
            )
        }
      })}
    </div>
  )
}
