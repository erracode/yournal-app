import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './api'

export type User = {
    id: string
    email: string
    user_metadata?: {
        full_name?: string
    }
}

// Query key for user session
export const userQueryKey = ['user'] as const

// Hook to get current user session
export function useUser() {
    return useQuery({
        queryKey: userQueryKey,
        queryFn: async () => {
            const session = await apiClient.getSession()
            return session?.user || null
        },
        retry: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}

// Hook for sign up mutation
export function useSignUp() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ email, password }: { email: string; password: string }) => {
            const response = await apiClient.signUp(email, password)
            return response
        },
        onSuccess: (data) => {
            // Update user state after successful signup
            if (data.user) {
                queryClient.setQueryData(userQueryKey, data.user)
            }
            queryClient.invalidateQueries({ queryKey: userQueryKey })
        },
    })
}

// Hook for sign in mutation
export function useSignIn() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ email, password }: { email: string; password: string }) => {
            const response = await apiClient.signIn(email, password)
            return response
        },
        onSuccess: (data) => {
            // Update user state after successful signin
            if (data.user) {
                queryClient.setQueryData(userQueryKey, data.user)
            }
            queryClient.invalidateQueries({ queryKey: userQueryKey })
        },
    })
}

// Hook for sign out mutation
export function useSignOut() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            await apiClient.signOut()
        },
        onSuccess: () => {
            // Clear user state after signout
            queryClient.setQueryData(userQueryKey, null)
            queryClient.invalidateQueries({ queryKey: userQueryKey })
        },
    })
} 