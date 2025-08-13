import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from './api'
import { extractTextFromYoopta } from './utils'

export type Entry = {
    id: number
    user_id: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: any // Yoopta content object - complex structure
    text_content?: string
    created_at: string
    updated_at: string
}

export type PaginationInfo = {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
}

export type EntriesResponse = {
    entries: Entry[]
    pagination: PaginationInfo
}

export type InfiniteEntriesData = {
    pages: EntriesResponse[]
    pageParams: number[]
}

// Query key for entries
export const entriesQueryKey = ['entries'] as const

// Hook to get user's entries with infinite scroll
export function useEntries() {
    return useInfiniteQuery({
        queryKey: entriesQueryKey,
        queryFn: async ({ pageParam = 1 }) => {
            const response = await apiClient.getEntries(pageParam, 20)
            return response as EntriesResponse
        },
        getNextPageParam: (lastPage) => {
            return lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined
        },
        initialPageParam: 1,
        staleTime: 1000 * 60 * 2, // 2 minutes

    })
}

// Hook for creating a new entry
export function useCreateEntry() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ content, textContent }: { content: object; textContent: string }) => {
            const response = await apiClient.createEntry(content, textContent)
            return response.entry
        },
        onSuccess: () => {
            // Refresh entries after successful creation
            queryClient.invalidateQueries({ queryKey: entriesQueryKey })
        },
    })
}

// Hook for updating an entry
export function useUpdateEntry() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, content, textContent }: { id: number; content: object; textContent: string }) => {
            const response = await apiClient.updateEntry(id, content, textContent)
            return response.entry
        },
        onSuccess: () => {
            // Refresh entries after successful update
            queryClient.invalidateQueries({ queryKey: entriesQueryKey })
        },
    })
}

// Hook for deleting an entry
export function useDeleteEntry() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: number) => {
            await apiClient.deleteEntry(id)
            return id
        },
        onSuccess: () => {
            // Invalidate and refetch entries
            queryClient.invalidateQueries({ queryKey: entriesQueryKey })
        },
    })
} 