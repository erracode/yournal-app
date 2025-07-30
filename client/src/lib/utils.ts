import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Extract plain text from Yoopta editor content (fallback function)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractTextFromYoopta(content: any): string {
  try {
    if (typeof content === 'string') {
      return content
    }

    if (typeof content === 'object' && content !== null) {
      // Handle the specific Yoopta structure we have
      if (content['empty-block'] && content['empty-block'].value) {
        return extractTextFromValue(content['empty-block'].value)
      }

      // Handle other Yoopta block types
      if (content.type && content.value) {
        return extractTextFromValue(content.value)
      }
    }

    return ''
  } catch (error) {
    console.error('Error extracting text from Yoopta content:', error)
    return ''
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTextFromValue(value: any): string {
  if (Array.isArray(value)) {
    return value
      .map(item => {
        // Handle paragraph nodes with children
        if (item.type === 'paragraph' && item.children) {
          return extractTextFromChildren(item.children)
        }
        // Handle other node types
        if (item.props && item.props.children) {
          return item.props.children
        }
        return ''
      })
      .join(' ')
      .trim()
  }

  return ''
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTextFromChildren(children: any[]): string {
  if (!Array.isArray(children)) return ''

  return children
    .map(child => {
      if (child.text) {
        return child.text
      }
      if (child.children) {
        return extractTextFromChildren(child.children)
      }
      return ''
    })
    .join(' ')
    .trim()
}
