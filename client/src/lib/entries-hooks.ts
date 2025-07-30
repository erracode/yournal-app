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
        onMutate: async (newContent) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: entriesQueryKey })

            // Snapshot the previous value
            const previousEntries = queryClient.getQueryData(entriesQueryKey)

            // Optimistically update to the new value
            queryClient.setQueryData(entriesQueryKey, (old: InfiniteEntriesData | undefined) => {
                if (!old?.pages) return old

                const optimisticEntry: Entry = {
                    id: Date.now(), // Temporary ID
                    content: newContent.content, // Don't stringify - keep as object
                    text_content: newContent.textContent,
                    created_at: new Date().toISOString(),
                    user_id: '', // Will be filled by backend
                    updated_at: new Date().toISOString(),
                }

                // Add to the first page (at the beginning, so it appears at bottom after reversal)
                const updatedPages = [...old.pages]
                if (updatedPages[0]) {
                    updatedPages[0] = {
                        ...updatedPages[0],
                        entries: [optimisticEntry, ...updatedPages[0].entries]
                    }
                }

                return {
                    ...old,
                    pages: updatedPages
                }
            })

            // Return a context object with the snapshotted value
            return { previousEntries }
        },
        onError: (err, newContent, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousEntries) {
                queryClient.setQueryData(entriesQueryKey, context.previousEntries)
            }
        },
        onSettled: () => {
            // Always refetch after error or success
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
        onMutate: async ({ id, content, textContent }) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: entriesQueryKey })

            // Snapshot the previous value
            const previousEntries = queryClient.getQueryData(entriesQueryKey)

            // Optimistically update to the new value
            queryClient.setQueryData(entriesQueryKey, (old: InfiniteEntriesData | undefined) => {
                if (!old?.pages) return old

                const updatedPages = old.pages.map((page: EntriesResponse) => ({
                    ...page,
                    entries: page.entries.map((entry: Entry) =>
                        entry.id === id
                            ? {
                                ...entry,
                                content: content, // Don't stringify - keep as object
                                text_content: textContent,
                                updated_at: new Date().toISOString()
                            }
                            : entry
                    )
                }))

                return {
                    ...old,
                    pages: updatedPages
                }
            })

            // Return a context object with the snapshotted value
            return { previousEntries }
        },
        onError: (err, variables, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousEntries) {
                queryClient.setQueryData(entriesQueryKey, context.previousEntries)
            }
        },
        onSettled: () => {
            // Always refetch after error or success
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