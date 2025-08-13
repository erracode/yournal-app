import { useState, useRef, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api"
import { RichMessageRenderer } from "./RichMessageRenderer"
import { Input } from "../ui/input"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  isStreaming?: boolean
  sources?: Array<{
    id: number
    content: string
    created_at: string
    relevance: number
  }>
}

export function RagChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Restore focus to input after clearing
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)

    // Create streaming message
    const streamingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    }

    setMessages((prev) => [...prev, streamingMessage])

    try {
      // Call RAG streaming endpoint
      const responseBody = await apiClient.ragChat(input)

      if (!responseBody) {
        throw new Error("No response body")
      }

      const reader = responseBody.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ""
      let sources: Array<{
        id: number
        content: string
        created_at: string
        relevance: number
      }> = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n").filter((line) => line.trim())

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6)) // Remove "data: " prefix
              if (data.response) {
                accumulatedContent += data.response

                // Update the streaming message
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === streamingMessage.id
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                )
              }
              if (data.sources) {
                sources = data.sources
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Mark streaming as complete with sources
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessage.id
            ? { ...msg, isStreaming: false, sources }
            : msg
        )
      )
    } catch (error) {
      console.error("RAG chat error:", error)

      // Update streaming message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessage.id
            ? {
                ...msg,
                content:
                  "Sorry, I'm having trouble responding right now. Please try again.",
                isStreaming: false,
              }
            : msg
        )
      )
    } finally {
      setIsLoading(false)

      // Restore focus to input after response completes
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm font-medium mb-2">
              Ask me about your journal entries
            </p>
            <p className="text-xs opacity-70 mb-6">
              I can help you analyze, summarize, or find patterns in your
              writing
            </p>

            {/* Suggestions section - prepared for clickable boxes */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-foreground">Try asking:</p>
              <div className="grid grid-cols-1 gap-2 max-w-sm mx-auto">
                <div
                  className="text-xs p-2 rounded border border-border/30 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() =>
                    handleSuggestionClick(
                      "What themes have I been writing about lately?"
                    )
                  }
                >
                  "What themes have I been writing about lately?"
                </div>
                <div
                  className="text-xs p-2 rounded border border-border/30 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() =>
                    handleSuggestionClick("Summarize my entries from this week")
                  }
                >
                  "Summarize my entries from this week"
                </div>
                <div
                  className="text-xs p-2 rounded border border-border/30 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() =>
                    handleSuggestionClick(
                      "Find entries where I mentioned work stress"
                    )
                  }
                >
                  "Find entries where I mentioned work stress"
                </div>
                <div
                  className="text-xs p-2 rounded border border-border/30 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() =>
                    handleSuggestionClick(
                      "What patterns do you see in my journaling?"
                    )
                  }
                >
                  "What patterns do you see in my journaling?"
                </div>

                {/* Additional space for future suggestions */}
                <div className="h-4"></div>

                <div
                  className="text-xs p-2 rounded border border-border/30 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() =>
                    handleSuggestionClick("Show me my most emotional entries")
                  }
                >
                  "Show me my most emotional entries"
                </div>
                <div
                  className="text-xs p-2 rounded border border-border/30 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() =>
                    handleSuggestionClick("What goals am I working towards?")
                  }
                >
                  "What goals am I working towards?"
                </div>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : ""
                }`}
              >
                {message.role === "user" ? (
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>
                ) : (
                  <div className="space-y-2">
                    <RichMessageRenderer
                      content={message.content}
                      isStreaming={message.isStreaming}
                    />
                  </div>
                )}
                <p className="text-xs opacity-70 mt-1">
                  {formatTime(message.timestamp)}
                  {message.isStreaming && (
                    <span className="ml-2 text-primary">typing...</span>
                  )}
                </p>
              </div>
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="bg-muted rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Searching your journal...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Auto-scroll target */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-background flex-shrink-0">
        <div className="flex-1 gap-2">
          <Input
            ref={inputRef}
            type="text"
            className="w-full"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your journal entries..."
            disabled={isLoading}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2 opacity-70">
          AI analyzes your journal entries to provide personalized insights
        </p>
      </form>
    </div>
  )
}
