import { useUser } from "@/lib/auth-hooks"
import { AuthForm } from "@/components/auth/AuthForm"
import { AppLayout } from "@/components/layout/AppLayout"
import { MemoryWorkspace } from "@/components/memory/MemoryWorkspace"

function App() {
  const { data: user, isLoading } = useUser()

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
    <AppLayout>
      <MemoryWorkspace />
    </AppLayout>
  )
}

export default App
