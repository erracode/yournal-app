import { useState, useRef, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api"
import { Input } from "../ui/input"

import { GlowingEffect } from "../ui/glowing-effect"

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

interface RagChatProps {
  open: boolean
  onClose: () => void
}

export function RagChat({ open, onClose }: RagChatProps) {
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

  if (!open) return null

  return (
    <div className="fixed right-0 top-0 h-[calc(100vh-3.5rem)] w-[380px] max-w-[90vw] bg-background/95 backdrop-blur-sm overflow-hidden border-l border-border/50">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Journal Assistant</span>
            <span className="text-xs text-muted-foreground">
              Ask questions about your entries
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMessages([])}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
            <button
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>
        </div>

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

              {/* Suggestions section - using Card components with GlowingEffect */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-foreground">
                  Try asking:
                </p>
                <div className="grid grid-cols-1 gap-3 max-w-md mx-auto">
                  <SuggestionCard
                    text="What themes have I been writing about lately?"
                    onClick={() =>
                      handleSuggestionClick(
                        "What themes have I been writing about lately?"
                      )
                    }
                  />
                  <SuggestionCard
                    text="Summarize my entries from this week"
                    onClick={() =>
                      handleSuggestionClick(
                        "Summarize my entries from this week"
                      )
                    }
                  />
                  <SuggestionCard
                    text="Find entries where I mentioned work stress"
                    onClick={() =>
                      handleSuggestionClick(
                        "Find entries where I mentioned work stress"
                      )
                    }
                  />
                  <SuggestionCard
                    text="What patterns do you see in my journaling?"
                    onClick={() =>
                      handleSuggestionClick(
                        "What patterns do you see in my journaling?"
                      )
                    }
                  />
                  <SuggestionCard
                    text="Show me my most emotional entries"
                    onClick={() =>
                      handleSuggestionClick("Show me my most emotional entries")
                    }
                  />
                  <SuggestionCard
                    text="What goals am I working towards?"
                    onClick={() =>
                      handleSuggestionClick("What goals am I working towards?")
                    }
                  />
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
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
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
        <form
          onSubmit={handleSubmit}
          className="p-4 bg-background flex-shrink-0"
        >
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
    </div>
  )
}

// SuggestionCard component with GlowingEffect
interface SuggestionCardProps {
  text: string
  onClick: () => void
}

const SuggestionCard = ({ text, onClick }: SuggestionCardProps) => {
  return (
    <div className="relative h-12 rounded-lg border-2 p-1">
      <GlowingEffect
        spread={40}
        glow={true}
        disabled={false}
        proximity={32}
        inactiveZone={0.01}
        borderWidth={2}
      />
      <div
        className="border-0 relative flex h-full flex-col justify-center overflow-hidden rounded-lg p-2 cursor-pointer "
        // className="border-0 relative flex h-full flex-col justify-center overflow-hidden rounded-lg p-2 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={onClick}
      >
        <p className="text-xs text-center text-foreground leading-tight">
          "{text}"
        </p>
      </div>
    </div>
  )
}
