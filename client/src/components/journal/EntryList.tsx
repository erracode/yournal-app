import { useState } from "react"
import { Entry } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { EntryForm } from "./EntryForm"
import { YooptaContentRenderer } from "./YooptaContentRenderer"

interface EntryListProps {
  entries: Entry[]
  onUpdate: (id: number, content: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
  isLoading?: boolean
}

export function EntryList({
  entries,
  onUpdate,
  onDelete,
  isLoading = false,
}: EntryListProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState("")

  const handleEdit = (entry: Entry) => {
    setEditingId(entry.id)
    setEditingContent(JSON.stringify(entry.content))
  }

  const handleUpdate = async (content: string) => {
    if (editingId) {
      await onUpdate(editingId, content)
      setEditingId(null)
      setEditingContent("")
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditingContent("")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No entries yet. Start writing your thoughts!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="bg-white p-3 rounded-lg shadow-sm border"
        >
          {editingId === entry.id ? (
            <EntryForm
              initialContent={editingContent}
              onSubmit={handleUpdate}
              isEditing
              onCancel={handleCancel}
            />
          ) : (
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm text-gray-500">
                  {formatDate(entry.created_at)}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(entry)}
                    disabled={isLoading}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(entry.id)}
                    className="text-red-600 hover:text-red-700"
                    disabled={isLoading}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <YooptaContentRenderer
                content={entry.content}
                className="text-gray-800"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
