import { Hono } from 'hono'
import { supabase } from '../lib/supabase'
import { generateEmbedding } from '../lib/embeddings'
import type { User } from '@supabase/supabase-js'

interface ContextWithUser {
    user: User
}

const entries = new Hono<{ Variables: ContextWithUser }>()

// Middleware to verify authentication
async function authMiddleware(c: any, next: any) {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    const token = authHeader.split(' ')[1]

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (error || !user) {
            return c.json({ error: 'Invalid token' }, 401)
        }

        c.set('user', user)
        await next()
    } catch (error) {
        return c.json({ error: 'Authentication failed' }, 401)
    }
}

// Get entries with pagination
entries.get('/', authMiddleware, async (c) => {
    try {
        const user = c.get('user')
        const page = parseInt(c.req.query('page') || '1')
        const limit = parseInt(c.req.query('limit') || '10')
        const offset = (page - 1) * limit

        // Get total count for pagination
        const { count, error: countError } = await supabase
            .from('entries')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)

        if (countError) {
            console.error('Error counting entries:', countError)
            return c.json({ error: 'Failed to fetch entries' }, 500)
        }

        // Get entries for current page
        const { data: entries, error } = await supabase
            .from('entries')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) {
            console.error('Error fetching entries:', error)
            return c.json({ error: 'Failed to fetch entries' }, 500)
        }

        const total = count || 0
        const totalPages = Math.ceil(total / limit)
        const hasMore = page < totalPages

        return c.json({
            entries: entries || [],
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasMore
            }
        })
    } catch (error) {
        console.error('Entries fetch error:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
})

// Create new entry with automatic embedding generation
entries.post('/', authMiddleware, async (c) => {
    try {
        const user = c.get('user')
        const { content, text_content } = await c.req.json()

        console.log('📝 Creating new entry for user:', user.id)

        // Parse content if it's a string (should be an object from Yoopta)
        let parsedContent = content
        if (typeof content === 'string') {
            try {
                parsedContent = JSON.parse(content)
            } catch (error) {
                console.error('❌ Error parsing content JSON:', error)
                parsedContent = content // Keep as string if parsing fails
            }
        }

        // First, create the entry without embedding
        const { data: entry, error: createError } = await supabase
            .from('entries')
            .insert({
                user_id: user.id,
                content: parsedContent, // Store as JSONB object
                text_content: text_content
            })
            .select()
            .single()

        if (createError) {
            console.error('❌ Error creating entry:', createError)
            return c.json({ error: 'Failed to create entry' }, 500)
        }

        console.log('✅ Entry created with ID:', entry.id)

        // Generate embedding for the text content
        try {
            console.log('📄 Using text content for embedding:', text_content?.substring(0, 100) + '...')

            const embedding = await generateEmbedding(text_content || '')
            console.log('🧠 Generated embedding, length:', embedding.length)

            // Update the entry with the embedding directly
            const { error: updateError } = await supabase
                .from('entries')
                .update({ embedding: embedding })
                .eq('id', entry.id)
                .eq('user_id', user.id)

            if (updateError) {
                console.error('❌ Error updating entry with embedding:', updateError)
                // Don't fail the request, just log the error
            } else {
                console.log('✅ Entry embedding updated successfully')
            }
        } catch (embeddingError) {
            console.error('❌ Error generating embedding:', embeddingError)
            // Don't fail the request if embedding generation fails
        }

        return c.json({ entry })
    } catch (error) {
        console.error('❌ Entry creation error:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
})

// Update entry
entries.put('/:id', authMiddleware, async (c) => {
    try {
        const user = c.get('user')
        const id = parseInt(c.req.param('id'))
        const { content, text_content } = await c.req.json()

        // Parse content if it's a string (should be an object from Yoopta)
        let parsedContent = content
        if (typeof content === 'string') {
            try {
                parsedContent = JSON.parse(content)
            } catch (error) {
                console.error('❌ Error parsing content JSON:', error)
                parsedContent = content // Keep as string if parsing fails
            }
        }

        // Update the entry content
        const { data: entry, error: updateError } = await supabase
            .from('entries')
            .update({
                content: parsedContent, // Store as JSONB object
                text_content: text_content
            })
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (updateError) {
            console.error('❌ Error updating entry:', updateError)
            return c.json({ error: 'Failed to update entry' }, 500)
        }

        // Regenerate embedding for the updated text content
        try {
            console.log('📄 Regenerating embedding for text content:', text_content?.substring(0, 100) + '...')

            const embedding = await generateEmbedding(text_content || '')
            console.log('🧠 Generated embedding, length:', embedding.length)

            // Update the entry with the new embedding directly
            const { error: embeddingError } = await supabase
                .from('entries')
                .update({ embedding: embedding })
                .eq('id', id)
                .eq('user_id', user.id)

            if (embeddingError) {
                console.error('❌ Error updating entry embedding:', embeddingError)
            } else {
                console.log('✅ Entry embedding updated successfully')
            }
        } catch (embeddingError) {
            console.error('❌ Error generating embedding:', embeddingError)
        }

        return c.json({ entry })
    } catch (error) {
        console.error('❌ Entry update error:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
})

// Delete entry
entries.delete('/:id', authMiddleware, async (c) => {
    try {
        const user = c.get('user')
        const id = parseInt(c.req.param('id'))

        const { error } = await supabase
            .from('entries')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (error) {
            console.error('Error deleting entry:', error)
            return c.json({ error: 'Failed to delete entry' }, 500)
        }

        return c.json({ success: true })
    } catch (error) {
        console.error('Entry deletion error:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
})

export default entries 