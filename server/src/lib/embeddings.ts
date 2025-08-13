// Embedding generation utility for vector search
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        console.log('🔍 Generating embedding for text:', text.substring(0, 100) + '...')

        // Use Ollama's embedding model
        const response = await fetch('http://localhost:11434/api/embeddings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'nomic-embed-text', // 768-dimensional model
                prompt: text
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ Embedding API error:', response.status, errorText)
            throw new Error(`Embedding generation failed: ${response.status} - ${errorText}`)
        }

        const data = await response.json() as { embedding?: number[] }

        if (!data.embedding || !Array.isArray(data.embedding)) {
            console.error('❌ Invalid embedding response:', data)
            throw new Error('Invalid embedding response format')
        }

        console.log('✅ Generated embedding with', data.embedding.length, 'dimensions')
        return data.embedding
    } catch (error) {
        console.error('❌ Error generating embedding:', error)
        // Fallback: return a zero vector if embedding fails
        console.log('⚠️ Using fallback zero vector')
        return new Array(768).fill(0)
    }
}

// Extract text content from JSONB entry content
export function extractTextFromContent(content: any): string {
    if (typeof content === 'string') {
        return content
    }

    if (typeof content === 'object' && content !== null) {
        // Handle Yoopta editor content structure
        if (content.type === 'doc') {
            return extractTextFromBlocks(content.content || [])
        }

        // Handle array of blocks
        if (Array.isArray(content)) {
            return extractTextFromBlocks(content)
        }

        // Handle Yoopta editor value structure
        if (content.type === 'Paragraph' && content.value) {
            return extractTextFromValue(content.value)
        }

        // Handle empty-block structure (Yoopta editor format)
        if (content['empty-block'] && content['empty-block'].value) {
            return extractTextFromValue(content['empty-block'].value)
        }

        // Handle other Yoopta block types
        if (content.type && content.value) {
            return extractTextFromValue(content.value)
        }
    }

    return JSON.stringify(content)
}

function extractTextFromValue(value: any): string {
    if (Array.isArray(value)) {
        return value
            .map(item => {
                // Handle paragraph nodes
                if (item.type === 'paragraph' && item.props) {
                    return item.props.children || ''
                }
                // Handle text nodes
                if (item.type === 'text') {
                    return item.props?.text || ''
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

    // Handle single value
    if (value && typeof value === 'object') {
        if (value.type === 'paragraph' && value.props) {
            return value.props.children || ''
        }
        if (value.type === 'text') {
            return value.props?.text || ''
        }
    }

    return ''
}

function extractTextFromBlocks(blocks: any[]): string {
    if (!Array.isArray(blocks)) return ''

    return blocks
        .map(block => {
            if (block.type === 'paragraph') {
                return extractTextFromContent(block.content || [])
            }
            if (block.type === 'heading') {
                return extractTextFromContent(block.content || [])
            }
            return ''
        })
        .join(' ')
        .trim()
} 