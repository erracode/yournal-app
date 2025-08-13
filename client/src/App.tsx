import { useUser, useSignOut } from "@/lib/auth-hooks"
import { AuthForm } from "@/components/auth/AuthForm"
import { RichTextJournal } from "@/components/journal/RichTextJournal"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { BookOpen, LogOut } from "lucide-react"

function App() {
  const { data: user, isLoading } = useUser()
  const signOutMutation = useSignOut()

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
      {/* Minimal Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b/50">
        <div className="flex items-center gap-0.5">
          <BookOpen className="w-3 h-3 text-primary" />
          <span className="text-xs font-medium text-foreground">yournal</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground/70">
            {user.user_metadata?.full_name || user.email}
          </span>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            disabled={signOutMutation.isPending}
            className="h-7 w-7 p-0"
          >
            <LogOut className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <RichTextJournal />
      </div>
    </div>
  )
}

export default App
