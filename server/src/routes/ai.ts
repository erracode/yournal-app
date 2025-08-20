import { Hono } from 'hono'
import { supabase } from '../lib/supabase'
import { generateEmbedding } from '../lib/embeddings'
import { requestyClient } from '../lib/requesty'
import type { User } from '@supabase/supabase-js'

interface ContextWithUser {
    user: User
}

const ai = new Hono<{ Variables: ContextWithUser }>()

// Function to handle temporal queries (yesterday, today, last week, etc.)
async function handleTemporalQuery(message: string, userId: string): Promise<any[]> {
    const lowerMessage = message.toLowerCase()
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let startDate: Date
    let endDate: Date
    let description: string

    if (lowerMessage.includes('yesterday')) {
        startDate = yesterday
        endDate = today
        description = 'yesterday'
    } else if (lowerMessage.includes('today')) {
        startDate = today
        endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000)
        description = 'today'
    } else if (lowerMessage.includes('last week')) {
        const lastWeekStart = new Date(today)
        lastWeekStart.setDate(lastWeekStart.getDate() - 7)
        startDate = lastWeekStart
        endDate = today
        description = 'last week'
    } else if (lowerMessage.includes('this week')) {
        const weekStart = new Date(today)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        startDate = weekStart
        endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000)
        description = 'this week'
    } else {
        // Default to recent entries (last 7 days)
        const recentStart = new Date(today)
        recentStart.setDate(recentStart.getDate() - 7)
        startDate = recentStart
        endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000)
        description = 'recent'
    }

    console.log(`📅 Fetching entries from ${description}:`, startDate.toISOString(), 'to', endDate.toISOString())

    const { data: entries, error } = await supabase
        .from('entries')
        .select('id, content, text_content, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(10)

    if (error) {
        console.error('Error fetching temporal entries:', error)
        return []
    }

    // Add similarity score for temporal entries
    return (entries || []).map(entry => ({
        ...entry,
        similarity: 0.8 // High similarity for temporal matches
    }))
}

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

// Simple chat endpoint
ai.post('/chat', authMiddleware, async (c) => {
    try {
        const { message } = await c.req.json()

        const response = await requestyClient.createChatCompletion([
            { role: 'system', content: 'You are a helpful AI assistant.' },
            { role: 'user', content: message }
        ]) as any

        return c.json({ response: response.choices[0].message.content })
    } catch (error) {
        console.error('AI chat error:', error)
        return c.json({ error: 'AI service unavailable' }, 500)
    }
})

// Streaming chat endpoint
ai.post('/chat/stream', authMiddleware, async (c) => {
    try {
        const { message } = await c.req.json()

        const response = await requestyClient.createStreamingChatCompletion([
            { role: 'system', content: 'You are a helpful AI assistant.' },
            { role: 'user', content: message }
        ]) as Response

        return new Response(response.body, {
            headers: {
                'Content-Type': 'text/plain',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        })
    } catch (error) {
        console.error('Streaming chat error:', error)
        return c.json({ error: 'AI service unavailable' }, 500)
    }
})

// RAG chat endpoint with vector search
ai.post('/chat/rag', authMiddleware, async (c) => {
    try {
        const { message } = await c.req.json()
        const user = c.get('user')

        // Check if this is a temporal query (yesterday, today, last week, etc.)
        const temporalKeywords = [
            'yesterday', 'today', 'last week', 'this week', 'last month',
            'this month', 'recent', 'past', 'ago', 'entries from', 'from yesterday',
            'from today', 'from last week', 'from this week'
        ]

        const isTemporalQuery = temporalKeywords.some(keyword =>
            message.toLowerCase().includes(keyword.toLowerCase())
        )

        console.log('🔍 Query type:', isTemporalQuery ? 'Temporal' : 'Semantic')

        let relevantEntries: any[] = []
        let searchError: any = null

        if (isTemporalQuery) {
            // Handle temporal queries by getting entries from specific time periods
            console.log('📅 Processing temporal query:', message)
            relevantEntries = await handleTemporalQuery(message, user.id)
        } else {
            // Generate embedding for semantic queries
            const queryEmbedding = await generateEmbedding(message)

            // Use true vector search to find relevant entries
            console.log('🔍 Performing vector search for query:', message)
            const result = await supabase.rpc('match_entries', {
                query_embedding: queryEmbedding,
                match_threshold: 0.3, // Lower threshold for better recall
                match_count: 5,
                p_user_id: user.id
            })

            relevantEntries = result.data || []
            searchError = result.error
        }

        if (relevantEntries) {
            console.log(`✅ Found ${relevantEntries.length} relevant entries with vector search`)
            relevantEntries.forEach((entry: any, index: number) => {
                const similarity = entry.similarity ? Math.round(entry.similarity * 100) : 0
                console.log(`  ${index + 1}. ${similarity}% relevant: ${entry.text_content?.slice(0, 50)}...`)
            })
        }

        if (searchError || !relevantEntries || relevantEntries.length === 0) {
            console.log('🔍 No vector search results, falling back to recent entries')
            // Fallback to recent entries if vector search fails or finds nothing
            const { data: entries, error: entriesError } = await supabase
                .from('entries')
                .select('id, content, text_content, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5)

            if (entriesError) {
                console.error('Error fetching entries:', entriesError)
                return c.json({ error: 'Failed to fetch journal entries' }, 500)
            }

            // Use recent entries as fallback
            relevantEntries = entries.map((entry: any) => ({
                ...entry,
                similarity: 0.5 // Default similarity for recent entries
            }))
        }

        // Create context from relevant entries with similarity scores
        const context = relevantEntries && relevantEntries.length > 0
            ? `\n\nRelevant journal entries:\n${relevantEntries.map((entry: any) => {
                const similarity = entry.similarity ? Math.round(entry.similarity * 100) : 0
                return `- ${new Date(entry.created_at).toLocaleDateString()} (${similarity}% relevant): ${entry.text_content?.slice(0, 150) || 'No text content'}...`
            }).join('\n')}`
            : '\n\nNo relevant journal entries found.'

        const prompt = `You are an AI assistant that helps users analyze their journal entries. 
The user is asking: "${message}"

Your role is to:
1. Analyze the provided journal entries for context
2. Provide insights, patterns, or answers based on the user's journal content
3. Be helpful and supportive in your analysis
4. If no relevant entries are found, acknowledge this and offer general journaling advice
5. Keep responses concise and focused on the user's question

${context}

Please respond in a helpful and analytical way:`

        const response = await requestyClient.createStreamingChatCompletion([
            {
                role: 'system', content: `You are an AI assistant that helps users analyze their journal entries. 

Your role is to:
1. Analyze the provided journal entries for context
2. Provide insights, patterns, or answers based on the user's journal content
3. Be helpful and supportive in your analysis
4. If no relevant entries are found, acknowledge this and offer general journaling advice
5. Keep responses concise and focused on the user's question` },
            { role: 'user', content: `${message}\n\n${context}` }
        ]) as Response

        // Create a custom stream that includes sources
        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader()
                if (!reader) {
                    controller.close()
                    return
                }

                const decoder = new TextDecoder()
                let buffer = ''

                try {
                    // Send sources in the first chunk if available
                    if (relevantEntries && relevantEntries.length > 0) {
                        const sourcesData = JSON.stringify({
                            sources: relevantEntries.map((entry: any) => ({
                                id: entry.id,
                                content: entry.text_content?.slice(0, 100) + '...' || 'No text content',
                                created_at: entry.created_at,
                                relevance: entry.similarity || entry.relevance || 0.8
                            }))
                        })
                        controller.enqueue(new TextEncoder().encode(`data: ${sourcesData}\n\n`))
                    }

                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break

                        buffer += decoder.decode(value, { stream: true })
                        const lines = buffer.split('\n')
                        buffer = lines.pop() || '' // Keep incomplete line in buffer

                        for (const line of lines) {
                            if (line.trim() && line.startsWith('data: ')) {
                                try {
                                    // Requesty sends Server-Sent Events format
                                    const data = JSON.parse(line.slice(6)) // Remove "data: " prefix
                                    if (data.choices && data.choices[0]?.delta?.content) {
                                        // Send the response chunk in our expected format
                                        const responseData = JSON.stringify({
                                            response: data.choices[0].delta.content
                                        })
                                        controller.enqueue(new TextEncoder().encode(`data: ${responseData}\n\n`))
                                    }
                                } catch (error) {
                                    // Skip invalid JSON
                                    console.log('Invalid JSON in stream:', line)
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Stream processing error:', error)
                } finally {
                    controller.close()
                }
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        })
    } catch (error) {
        console.error('RAG chat error:', error)
        return c.json({ error: 'AI service unavailable' }, 500)
    }
})



// Generate AI suggestions for journal entries
ai.post('/suggestions', authMiddleware, async (c) => {
    try {
        const { entryText, entryId, context } = await c.req.json()
        const user = c.get('user')

        if (!entryText || !entryId) {
            return c.json({ error: 'Missing entryText or entryId' }, 400)
        }

        // Create a prompt for generating suggestions
        const prompt = `You are a helpful writing assistant. The user has written a journal entry and wants a direct, expanded version.

Original Entry:
"${entryText}"

${context ? `Additional Context from User:
"${context}"

` : ''}Provide a direct, expanded version of this entry that:
1. Maintains the original tone and intent
2. Adds relevant context and detail (but don't over-explain)
3. Uses clear, engaging language
4. Is structured well with proper paragraphs
5. Stays true to the user's voice and style
6. Is approximately 1.5-2x the length of the original (not excessively long)
${context ? '7. Incorporates the user\'s additional context appropriately' : ''}

IMPORTANT: Give the expanded version directly without any conversational text like "Here's an expanded version:" or "I hope this helps". Just provide the expanded content.`

        const response = await requestyClient.createChatCompletion([
            { role: 'system', content: 'You are a writing assistant that expands journal entries. Always provide direct, expanded content without conversational text or explanations.' },
            { role: 'user', content: prompt }
        ], { maxTokens: 300 })

        if (response && response.choices && response.choices[0]?.message?.content) {
            return c.json({
                suggestion: response.choices[0].message.content,
                entryId: entryId
            })
        } else {
            throw new Error('No response from AI service')
        }
    } catch (error) {
        console.error('Suggestion generation error:', error)
        return c.json({ error: 'Failed to generate suggestion' }, 500)
    }
})

// Health check for AI service
ai.get('/health', async (c) => {
    try {
        // Test Requesty connection with a simple request
        const response = await requestyClient.createChatCompletion([
            { role: 'user', content: 'Hello' }
        ], { maxTokens: 10 })

        if (response) {
            return c.json({ status: 'healthy', service: 'requesty' })
        } else {
            return c.json({ status: 'unhealthy', service: 'requesty' }, 503)
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return c.json({ status: 'unhealthy', service: 'requesty', error: errorMessage }, 503)
    }
})

export default ai 