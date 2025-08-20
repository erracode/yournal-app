// Requesty AI Client Configuration
// Based on: https://docs.requesty.ai/quickstart

export interface RequestyConfig {
    apiKey: string
    baseUrl: string
    model?: string
}

export interface ChatCompletionResponse {
    id: string
    object: string
    created: number
    model: string
    choices: Array<{
        index: number
        message: {
            role: string
            content: string
        }
        finish_reason: string
    }>
    usage: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
    }
}

export class RequestyClient {
    private config: RequestyConfig

    constructor(config: RequestyConfig) {
        this.config = config
    }

    async createChatCompletion(messages: Array<{ role: string; content: string }>, options?: {
        model?: string
        stream?: boolean
        temperature?: number
        maxTokens?: number
    }): Promise<ChatCompletionResponse | Response> {
        const model = options?.model || this.config.model || 'openai/gpt-4o'

        const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://yournal-app.com', // Optional: your app URL
                'X-Title': 'Yournal AI Assistant', // Optional: your app name
            },
            body: JSON.stringify({
                model,
                messages,
                stream: options?.stream || false,
                temperature: options?.temperature || 0.7,
                max_tokens: options?.maxTokens || 1000,
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Requesty API error: ${response.status} ${errorText}`)
        }

        if (options?.stream) {
            return response
        }

        return response.json() as Promise<ChatCompletionResponse>
    }

    async createStreamingChatCompletion(messages: Array<{ role: string; content: string }>, options?: {
        model?: string
        temperature?: number
        maxTokens?: number
    }) {
        return this.createChatCompletion(messages, { ...options, stream: true })
    }
}

// Create default client instance
export const requestyClient = new RequestyClient({
    apiKey: process.env.REQUESTY_API_KEY || '',
    baseUrl: process.env.REQUESTY_BASE_URL || 'https://router.requesty.ai/v1',
    model: 'openai/gpt-4o', // Default model
})
