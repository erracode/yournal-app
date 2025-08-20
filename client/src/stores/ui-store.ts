import { create } from 'zustand'

interface UIState {
    // Writing Assistant Panel
    suggestionPanel: {
        open: boolean
        entryId: number | null
        entryText: string
    }

    // RAG Chat Panel
    ragChatPanel: {
        open: boolean
    }

    // Entry Editor States
    editingEntry: {
        id: number | null
        content: string
    }

    // Actions
    openSuggestionPanel: (entryId: number, entryText: string) => void
    closeSuggestionPanel: () => void

    openRagChatPanel: () => void
    closeRagChatPanel: () => void

    setEditingEntry: (id: number | null, content?: string) => void
    clearEditingEntry: () => void

    // Utility
    closeAllPanels: () => void
}

export const useUIStore = create<UIState>((set, get) => ({
    // Initial State
    suggestionPanel: {
        open: false,
        entryId: null,
        entryText: '',
    },

    ragChatPanel: {
        open: false,
    },

    editingEntry: {
        id: null,
        content: '',
    },

    // Actions
    openSuggestionPanel: (entryId: number, entryText: string) => set((state) => ({
        suggestionPanel: {
            open: true,
            entryId,
            entryText,
        },
        // Close other panels when opening this one
        ragChatPanel: { open: false },
    })),

    closeSuggestionPanel: () => set((state) => ({
        suggestionPanel: {
            ...state.suggestionPanel,
            open: false,
            entryId: null,
            entryText: '',
        },
    })),

    openRagChatPanel: () => set((state) => ({
        ragChatPanel: { open: true },
        // Close other panels when opening this one
        suggestionPanel: { ...state.suggestionPanel, open: false },
    })),

    closeRagChatPanel: () => set((state) => ({
        ragChatPanel: { open: false },
    })),

    setEditingEntry: (id: number | null, content: string = '') => set({
        editingEntry: { id, content },
    }),

    clearEditingEntry: () => set({
        editingEntry: { id: null, content: '' },
    }),

    closeAllPanels: () => set({
        suggestionPanel: { open: false, entryId: null, entryText: '' },
        ragChatPanel: { open: false },
    }),
}))
