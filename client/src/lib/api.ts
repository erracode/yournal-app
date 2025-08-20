const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

class ApiClient {
    private token: string | null = null

    constructor() {
        // Get token from localStorage or session
        this.token = localStorage.getItem('auth_token')
    }

    setToken(token: string) {
        this.token = token
        localStorage.setItem('auth_token', token)
    }

    clearToken() {
        this.token = null
        localStorage.removeItem('auth_token')
    }

    private async request(endpoint: string, options: RequestInit = {}) {
        const url = `${API_URL}${endpoint}`
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        }

        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`
        }

        const response = await fetch(url, {
            ...options,
            headers,
        })

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`)
        }

        return response.json()
    }

    // Auth endpoints
    async signUp(email: string, password: string) {
        return this.request('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        })
    }

    async signIn(email: string, password: string) {
        const response = await this.request('/auth/signin', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        })

        // Store the token if login is successful
        if (response.session?.access_token) {
            this.setToken(response.session.access_token)
        }

        return response
    }

    async signOut() {
        await this.request('/auth/signout', {
            method: 'POST',
        })
        this.clearToken()
    }

    async getSession() {
        if (!this.token) return null
        try {
            return await this.request('/auth/session')
        } catch {
            this.clearToken()
            return null
        }
    }

    // Entries endpoints
    async getEntries(page = 1, limit = 10) {
        return this.request(`/entries?page=${page}&limit=${limit}`)
    }

    async createEntry(content: object, textContent: string) {
        return this.request('/entries', {
            method: 'POST',
            body: JSON.stringify({ content, text_content: textContent }),
        })
    }

    async updateEntry(id: number, content: object, textContent: string) {
        return this.request(`/entries/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ content, text_content: textContent }),
        })
    }

    async deleteEntry(id: number) {
        return this.request(`/entries/${id}`, {
            method: 'DELETE',
        })
    }

    // AI endpoints
    async chat(message: string) {
        return this.request('/ai/chat', {
            method: 'POST',
            body: JSON.stringify({ message }),
        })
    }

    async getAIHealth() {
        return this.request('/ai/health')
    }

    // Streaming chat method
    async streamChat(message: string): Promise<ReadableStream<Uint8Array> | null> {
        const url = `${API_URL}/ai/chat/stream`
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        }

        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ message }),
        })

        if (!response.ok) {
            throw new Error(`Streaming failed: ${response.status}`)
        }

        return response.body
    }

    // RAG chat method
    async ragChat(message: string): Promise<ReadableStream<Uint8Array> | null> {
        const url = `${API_URL}/ai/chat/rag`
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        }

        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ message }),
        })

        if (!response.ok) {
            throw new Error(`RAG chat failed: ${response.status}`)
        }

        return response.body
    }

    // Generate AI suggestions for journal entries
    async generateSuggestion(entryText: string, entryId: number, context?: string) {
        return this.request('/ai/suggestions', {
            method: 'POST',
            body: JSON.stringify({ entryText, entryId, context }),
        })
    }
}

export const apiClient = new ApiClient() 