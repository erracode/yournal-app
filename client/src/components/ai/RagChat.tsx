import { useState, useRef, useEffect } from "react"
import { Send, Loader2, Bot, User, BookOpen, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api"
import { RichMessageRenderer } from "./RichMessageRenderer"
import { useEntries } from "@/lib/entries-hooks"

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

  // Get user's entries for RAG context
  const { data: entriesData } = useEntries()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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

  // Get total entries count for context
  const totalEntries =
    entriesData?.pages.reduce(
      (total, page) => total + page.entries.length,
      0
    ) || 0

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">AI Journal Assistant</h2>
          <Sparkles className="w-4 h-4 text-yellow-500" />
        </div>
        <div className="flex items-center gap-4 ml-auto text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            <span>{totalEntries} entries</span>
          </div>
          <span>Powered by your journal</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Ask me about your journal entries</p>
            <p className="text-xs mt-1">
              I can help you analyze, summarize, or find patterns in your
              writing
            </p>
            <div className="mt-4 space-y-2 text-xs">
              <p className="font-medium">Try asking:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• "What themes have I been writing about lately?"</li>
                <li>• "Summarize my entries from this week"</li>
                <li>• "Find entries where I mentioned work stress"</li>
                <li>• "What patterns do you see in my journaling?"</li>
              </ul>
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
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
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

                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Sources from your journal:
                        </p>
                        <div className="space-y-2">
                          {message.sources.slice(0, 3).map((source, index) => (
                            <div
                              key={source.id}
                              className="text-xs bg-background/50 rounded p-2 border"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-muted-foreground">
                                  {formatDate(source.created_at)}
                                </span>
                                <span className="text-xs bg-primary/10 text-primary px-1 rounded">
                                  {Math.round(source.relevance * 100)}% relevant
                                </span>
                              </div>
                              <p className="text-foreground line-clamp-2">
                                {source.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs opacity-70 mt-1">
                  {formatTime(message.timestamp)}
                  {message.isStreaming && (
                    <span className="ml-2 text-primary">typing...</span>
                  )}
                </p>
              </div>

              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
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
      <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your journal entries..."
            className="flex-1 px-3 py-2 border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !input.trim()}
            className="px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          AI analyzes your journal entries to provide personalized insights
        </p>
      </form>
    </div>
  )
}
