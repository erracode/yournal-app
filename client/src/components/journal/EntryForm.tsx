import { YooptaEntryEditor } from "./YooptaEntryEditor"

interface EntryFormProps {
  onSubmit: (content: string) => Promise<void>
  initialContent?: string
  isEditing?: boolean
  onCancel?: () => void
  isLoading?: boolean
}

export function EntryForm({
  onSubmit,
  initialContent = "",
  isEditing = false,
  onCancel,
  isLoading = false,
}: EntryFormProps) {
  return (
    <YooptaEntryEditor
      onSubmit={onSubmit}
      initialContent={initialContent}
      isEditing={isEditing}
      onCancel={onCancel}
      isLoading={isLoading}
      placeholder="Write your thoughts..."
    />
  )
}
