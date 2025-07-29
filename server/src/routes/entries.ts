import { Hono } from 'hono'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface ContextWithUser {
    user: User
}

const entries = new Hono<{ Variables: ContextWithUser }>()

// Middleware to verify authentication
async function authMiddleware(c: any, next: any) {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'No token provided' }, 401)
    }

    const token = authHeader.split(' ')[1]

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
        return c.json({ error: 'Invalid token' }, 401)
    }

    c.set('user', user)
    await next()
}

// Get paginated entries for the authenticated user
entries.get('/', authMiddleware, async (c) => {
    try {
        const user = c.get('user')
        const page = parseInt(c.req.query('page') || '1')
        const limit = parseInt(c.req.query('limit') || '20')
        const offset = (page - 1) * limit

        const { data, error, count } = await supabase
            .from('entries')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }) // Newest first (will appear at bottom)
            .range(offset, offset + limit - 1)

        if (error) {
            return c.json({ error: error.message }, 400)
        }

        return c.json({
            entries: data || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
                hasMore: page * limit < (count || 0)
            }
        })
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500)
    }
})

// Create a new entry
entries.post('/', authMiddleware, async (c) => {
    try {
        const user = c.get('user')
        const { content } = await c.req.json()

        if (!content) {
            return c.json({ error: 'Content is required' }, 400)
        }

        // Validate and process JSON content
        let processedContent = content

        try {
            // If it's a string, parse it to validate JSON
            if (typeof content === 'string') {
                processedContent = JSON.parse(content)
            }
            // If it's already an object, validate it's proper JSON
            else if (typeof content === 'object') {
                // Test if it can be stringified (valid JSON)
                JSON.stringify(content)
            }
        } catch (jsonError) {
            return c.json({ error: 'Invalid JSON content' }, 400)
        }

        const { data, error } = await supabase
            .from('entries')
            .insert([{
                user_id: user.id,
                content: processedContent
            }])
            .select()
            .single()

        if (error) {
            return c.json({ error: error.message }, 400)
        }

        return c.json({ entry: data })
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500)
    }
})

// Update an entry
entries.put('/:id', authMiddleware, async (c) => {
    try {
        const user = c.get('user')
        const id = c.req.param('id')
        const { content } = await c.req.json()

        if (!content) {
            return c.json({ error: 'Content is required' }, 400)
        }

        // Validate and process JSON content
        let processedContent = content

        try {
            // If it's a string, parse it to validate JSON
            if (typeof content === 'string') {
                processedContent = JSON.parse(content)
            }
            // If it's already an object, validate it's proper JSON
            else if (typeof content === 'object') {
                // Test if it can be stringified (valid JSON)
                JSON.stringify(content)
            }
        } catch (jsonError) {
            return c.json({ error: 'Invalid JSON content' }, 400)
        }

        // First check if the entry belongs to the user
        const { data: existingEntry, error: fetchError } = await supabase
            .from('entries')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (fetchError || !existingEntry) {
            return c.json({ error: 'Entry not found' }, 404)
        }

        const { data, error } = await supabase
            .from('entries')
            .update({
                content: processedContent,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) {
            return c.json({ error: error.message }, 400)
        }

        return c.json({ entry: data })
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500)
    }
})

// Delete an entry
entries.delete('/:id', authMiddleware, async (c) => {
    try {
        const user = c.get('user')
        const id = c.req.param('id')

        // First check if the entry belongs to the user
        const { data: existingEntry, error: fetchError } = await supabase
            .from('entries')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (fetchError || !existingEntry) {
            return c.json({ error: 'Entry not found' }, 404)
        }

        const { error } = await supabase
            .from('entries')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (error) {
            return c.json({ error: error.message }, 400)
        }

        return c.json({ message: 'Entry deleted successfully' })
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500)
    }
})

export default entries 