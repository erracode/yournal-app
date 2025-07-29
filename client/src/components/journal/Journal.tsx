import { useUser, useSignOut } from "@/lib/auth-hooks"
import {
  useEntries,
  useCreateEntry,
  useUpdateEntry,
  useDeleteEntry,
} from "@/lib/entries-hooks"
import { Button } from "@/components/ui/button"
import { EntryForm } from "./EntryForm"
import { EntryList } from "./EntryList"

export function Journal() {
  const { data: user, isLoading: userLoading } = useUser()
  const { data: entries = [], isLoading: entriesLoading } = useEntries()
  const signOutMutation = useSignOut()
  const createEntryMutation = useCreateEntry()
  const updateEntryMutation = useUpdateEntry()
  const deleteEntryMutation = useDeleteEntry()

  const handleCreateEntry = async (content: string) => {
    try {
      await createEntryMutation.mutateAsync(content)
    } catch (error) {
      console.error("Error creating entry:", error)
    }
  }

  const handleUpdateEntry = async (id: number, content: string) => {
    try {
      await updateEntryMutation.mutateAsync({ id, content })
    } catch (error) {
      console.error("Error updating entry:", error)
    }
  }

  const handleDeleteEntry = async (id: number) => {
    try {
      await deleteEntryMutation.mutateAsync(id)
    } catch (error) {
      console.error("Error deleting entry:", error)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOutMutation.mutateAsync()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  if (userLoading || entriesLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null // AuthForm will be rendered by parent
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Yournal</h1>
          <p className="text-gray-600">Your personal journal</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Welcome, {user.user_metadata?.full_name || user.email}
          </span>
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={signOutMutation.isPending}
          >
            {signOutMutation.isPending ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">New Entry</h2>
            <EntryForm
              onSubmit={handleCreateEntry}
              isLoading={createEntryMutation.isPending}
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">Your Entries</h2>
            <EntryList
              entries={entries}
              onUpdate={handleUpdateEntry}
              onDelete={handleDeleteEntry}
              isLoading={
                updateEntryMutation.isPending || deleteEntryMutation.isPending
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}
