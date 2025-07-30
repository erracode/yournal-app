import { useState } from "react"
import { useUser, useSignOut } from "@/lib/auth-hooks"
import { AuthForm } from "@/components/auth/AuthForm"
import { RichTextJournal } from "@/components/journal/RichTextJournal"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { BookOpen, MessageSquare, LogOut } from "lucide-react"
import { RagChat } from "./components/ai/RagChat"

function App() {
  const { data: user, isLoading } = useUser()
  const signOutMutation = useSignOut()
  const [view, setView] = useState<"journal" | "rag">("journal")

  const handleSignOut = async () => {
    try {
      await signOutMutation.mutateAsync()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm />
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Minimal Navigation */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-1">
          <Button
            variant={view === "journal" ? "default" : "ghost"}
            onClick={() => setView("journal")}
            size="sm"
            className="h-8 px-3 text-xs"
          >
            <BookOpen className="w-3 h-3 mr-1" />
            Journal
          </Button>
          <Button
            variant={view === "rag" ? "default" : "ghost"}
            onClick={() => setView("rag")}
            size="sm"
            className="h-8 px-3 text-xs"
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            AI Chat
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {user.user_metadata?.full_name || user.email}
          </span>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            disabled={signOutMutation.isPending}
            className="h-8 px-2"
          >
            <LogOut className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === "journal" ? <RichTextJournal /> : <RagChat />}
      </div>
    </div>
  )
}

export default App
