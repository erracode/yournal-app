import { useUser } from "@/lib/auth-hooks"
import { AuthForm } from "@/components/auth/AuthForm"
import { RichTextJournal } from "@/components/journal/RichTextJournal"

function App() {
  const { data: user, isLoading } = useUser()

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return <>{user ? <RichTextJournal /> : <AuthForm />}</>
}

export default App
