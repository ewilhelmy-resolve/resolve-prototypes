import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface Message {
  id: string
  message: string
  role: 'user' | 'assistant'
  timestamp: Date
  conversation_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'sending'
  error_message?: string
}

export interface Conversation {
  id: string
  title: string
  created_at: Date
  updated_at: Date
}

interface ConversationState {
  // Current conversation
  currentConversationId: string | null
  conversations: Conversation[]
  messages: Message[]

  // UI state
  isLoading: boolean
  isSending: boolean

  // Actions
  setCurrentConversation: (conversationId: string | null) => void
  setConversations: (conversations: Conversation[]) => void
  addConversation: (conversation: Conversation) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (messageId: string, updates: Partial<Message>) => void
  setLoading: (loading: boolean) => void
  setSending: (sending: boolean) => void
  clearCurrentConversation: () => void
  reset: () => void
}

export const useConversationStore = create<ConversationState>()(
  devtools(
    (set) => ({
      // Initial state
      currentConversationId: null,
      conversations: [],
      messages: [],
      isLoading: false,
      isSending: false,

      // Actions
      setCurrentConversation: (conversationId) =>
        set({ currentConversationId: conversationId, messages: [] }),

      setConversations: (conversations) =>
        set({ conversations }),

      addConversation: (conversation) =>
        set((state) => ({
          conversations: [conversation, ...state.conversations]
        })),

      setMessages: (messages) =>
        set({ messages }),

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message]
        })),

      updateMessage: (messageId, updates) =>
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          ),
        })),

      setLoading: (loading) =>
        set({ isLoading: loading }),

      setSending: (sending) =>
        set({ isSending: sending }),

      clearCurrentConversation: () =>
        set({
          currentConversationId: null,
          messages: []
        }),

      reset: () =>
        set({
          currentConversationId: null,
          conversations: [],
          messages: [],
          isLoading: false,
          isSending: false,
        }),
    }),
    { name: 'conversation-store' }
  )
)