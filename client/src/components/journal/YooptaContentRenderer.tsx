import { useMemo } from "react"

interface YooptaContentRendererProps {
  content: string | object
  className?: string
}

export function YooptaContentRenderer({
  content,
  className = "",
}: YooptaContentRendererProps) {
  const renderedContent = useMemo(() => {
    try {
      // Handle both string and object inputs
      const parsedContent =
        typeof content === "string" ? JSON.parse(content) : content

      return renderYooptaContent(parsedContent)
    } catch (error) {
      console.error("Failed to parse Yoopta content:", error)
      return "<p>Error rendering content</p>"
    }
  }, [content])

  return (
    <div
      className={`journal-content opacity-[0.9] max-w-none text-base leading-relaxed ${className}`}
      // className={`prose prose-sm max-w-none text-base leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  )
}

function renderYooptaContent(content: unknown): string {
  // Handle the actual Yoopta format: {"0e1d7e0a-c113-4215-a715-128d4e77150a":{"id":"...","type":"Paragraph","value":[...]}}
  if (typeof content === "object" && content !== null) {
    const contentObj = content as Record<string, unknown>

    // Render ALL blocks, not just the first one
    const allBlocks: unknown[] = []

    Object.keys(contentObj).forEach((blockKey) => {
      const block = contentObj[blockKey] as { value?: unknown[] }
      if (block && block.value && Array.isArray(block.value)) {
        allBlocks.push(...block.value)
      }
    })

    if (allBlocks.length > 0) {
      return renderYooptaBlocks(allBlocks)
    }

    // Fallback: try to render as array of blocks
    if (Array.isArray(content)) {
      return renderYooptaBlocks(content)
    }
  }

  // Handle array format directly
  if (Array.isArray(content)) {
    return renderYooptaBlocks(content)
  }

  return ""
}

function renderYooptaBlocks(blocks: unknown[]): string {
  if (!Array.isArray(blocks)) {
    return ""
  }

  return blocks
    .map((block) => {
      const typedBlock = block as {
        id: string
        type: string
        children: unknown[]
      }
      switch (typedBlock.type) {
        case "paragraph":
          return `<p>${renderText(typedBlock.children)}</p>`
        case "blockquote":
          return `<blockquote>${renderText(typedBlock.children)}</blockquote>`
        case "heading-one":
          return `<h1>${renderText(typedBlock.children)}</h1>`
        case "heading-two":
          return `<h2>${renderText(typedBlock.children)}</h2>`
        case "heading-three":
          return `<h3>${renderText(typedBlock.children)}</h3>`
        case "bulleted-list":
          return `<ul>${renderListItems(typedBlock.children)}</ul>`
        case "numbered-list":
          return `<ol>${renderListItems(typedBlock.children)}</ol>`
        case "list-item":
          return `<li>${renderText(typedBlock.children)}</li>`
        default:
          return `<p>${renderText(typedBlock.children)}</p>`
      }
    })
    .join("")
}

function renderText(children: unknown[]): string {
  if (!Array.isArray(children)) {
    return ""
  }

  return children
    .map((child) => {
      if (typeof child === "string") {
        return child
      }

      const typedChild = child as {
        text?: string
        bold?: boolean
        italic?: boolean
        underline?: boolean
        code?: boolean
      }
      if (typedChild.text) {
        let text = typedChild.text

        // Convert URLs and emails to clickable links
        text = convertUrlsToLinks(text)
        text = convertEmailsToLinks(text)

        if (typedChild.bold) {
          text = `<strong>${text}</strong>`
        }
        if (typedChild.italic) {
          text = `<em>${text}</em>`
        }
        if (typedChild.underline) {
          text = `<u>${text}</u>`
        }
        if (typedChild.code) {
          text = `<code>${text}</code>`
        }

        return text
      }

      return ""
    })
    .join("")
}

// Function to convert URLs in text to clickable links
function convertUrlsToLinks(text: string): string {
  // Enhanced regex to match various URL patterns
  // Matches: http://, https://, www., and common TLDs
  const urlRegex =
    /(https?:\/\/[^\s]+|www\.[^\s]+\.[^\s]+|[^\s]+\.[^\s]+\.[^\s]+)/g

  return text.replace(urlRegex, (url) => {
    // Ensure URLs have protocol
    let fullUrl = url
    if (url.startsWith("www.")) {
      fullUrl = `https://${url}`
    } else if (!url.startsWith("http")) {
      // For URLs without protocol, assume https
      fullUrl = `https://${url}`
    }

    // Create a safe link with target="_blank" and rel="noopener noreferrer"
    // The styling will be handled by CSS classes
    return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer">${url}</a>`
  })
}

// Function to convert email addresses to clickable mailto links
function convertEmailsToLinks(text: string): string {
  // Regex to match email addresses
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g

  return text.replace(emailRegex, (email) => {
    return `<a href="mailto:${email}" class="email-link">${email}</a>`
  })
}

function renderListItems(children: unknown[]): string {
  if (!Array.isArray(children)) {
    return ""
  }

  return children
    .map((child) => {
      const typedChild = child as {
        id: string
        type: string
        children: unknown[]
      }
      if (typedChild.type === "list-item") {
        return `<li>${renderText(typedChild.children)}</li>`
      }
      return ""
    })
    .join("")
}
