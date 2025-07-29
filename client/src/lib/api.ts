const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

class ApiClient {
    private token: string | null = null

    setToken(token: string) {
        this.token = token
    }

    clearToken() {
        this.token = null
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
            const error = await response.json().catch(() => ({ error: 'Network error' }))
            throw new Error(error.error || 'Request failed')
        }

        return response.json()
    }

    // Auth endpoints
    async signUp(email: string, password: string, fullName?: string) {
        return this.request('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password, full_name: fullName }),
        })
    }

    async signIn(email: string, password: string) {
        const response = await this.request('/auth/signin', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        })

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
        return this.request('/auth/session')
    }

    // Entries endpoints
    async getEntries(page = 1, limit = 20) {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString()
        })
        return this.request(`/entries?${params}`)
    }

    async createEntry(content: string) {
        return this.request('/entries', {
            method: 'POST',
            body: JSON.stringify({ content }),
        })
    }

    async updateEntry(id: number, content: string) {
        return this.request(`/entries/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ content }),
        })
    }

    async deleteEntry(id: number) {
        return this.request(`/entries/${id}`, {
            method: 'DELETE',
        })
    }
}

export const apiClient = new ApiClient() 