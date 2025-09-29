import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// Hybrid Message Schema - Simple flat database structure with rich UI grouping
export interface Message {
  id: string
  role: 'user' | 'assistant'
  message: string  // Keep existing column for text content
  timestamp: Date
  conversation_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'sending'
  error_message?: string

  // NEW: Hybrid approach - metadata for rich types, grouping for UI
  metadata?: {
    // Each property is self-contained with its own content
    reasoning?: {
      content: string     // Reasoning text content
      duration?: number   // How long AI spent thinking
      streaming?: boolean // Real-time streaming state
    }
    sources?: Array<{
      url: string
      title: string
    }>
    tasks?: Array<{
      title: string
      items: string[]
      defaultOpen?: boolean
    }>
    files?: Array<{
      url: string
      filename?: string
      mediaType: string
      size?: number
    }>
  }

  // Grouping for multi-part AI responses
  response_group_id?: string  // Links related messages together
}

// Helper function for type detection
export function getMessageType(message: Message): string {
  if (!message.metadata) return 'text'

  if (message.metadata.reasoning) return 'reasoning'
  if (message.metadata.sources) return 'sources'
  if (message.metadata.tasks) return 'tasks'
  if (message.metadata.files) return 'files'

  return 'text'  // Default fallback
}

// Frontend grouping for UI display
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  timestamp: Date
  isGroup: boolean
}

export interface SimpleChatMessage extends ChatMessage {
  isGroup: false
  message: string
  metadata?: any
}

export interface GroupedChatMessage extends ChatMessage {
  isGroup: true
  parts: Array<{
    id: string
    message: string
    metadata?: any
  }>
}

// Message grouping utility
export function groupMessages(flatMessages: Message[]): ChatMessage[] {
  const grouped: ChatMessage[] = []
  const groups: Map<string, Message[]> = new Map()

  for (const message of flatMessages) {
    if (message.response_group_id) {
      // Add to group
      if (!groups.has(message.response_group_id)) {
        groups.set(message.response_group_id, [])
      }
      groups.get(message.response_group_id)!.push(message)
    } else {
      // Standalone message - check if we have pending groups to flush
      flushCompletedGroups(groups, grouped)
      grouped.push({
        id: message.id,
        role: message.role,
        message: message.message,
        metadata: message.metadata,
        isGroup: false,
        timestamp: message.timestamp
      } as SimpleChatMessage)
    }
  }

  // Flush any remaining groups
  flushCompletedGroups(groups, grouped)
  return grouped
}

function flushCompletedGroups(groups: Map<string, Message[]>, output: ChatMessage[]) {
  for (const [groupId, messages] of groups.entries()) {
    if (messages.length > 0) {
      // Sort messages within group by timestamp to ensure correct order
      const sortedMessages = messages.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )

      output.push({
        id: groupId,
        role: sortedMessages[0].role, // All messages in group have same role
        isGroup: true,
        parts: sortedMessages.map(msg => ({
          id: msg.id,
          message: msg.message,
          metadata: msg.metadata
        })),
        timestamp: sortedMessages[0].timestamp // Use first message timestamp
      } as GroupedChatMessage)
    }
  }
  groups.clear()
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
  messages: Message[]           // Flat messages (matches database)
  chatMessages: ChatMessage[]   // Grouped for UI display

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
  recomputeChatMessages: () => void // Force regrouping
}

export const useConversationStore = create<ConversationState>()(
  devtools(
    (set) => ({
      // Initial state
      currentConversationId: null,
      conversations: [],
      messages: [],
      chatMessages: [],
      isLoading: false,
      isSending: false,

      // Actions
      setCurrentConversation: (conversationId) =>
        set({ currentConversationId: conversationId, messages: [], chatMessages: [] }),

      setConversations: (conversations) =>
        set({ conversations }),

      addConversation: (conversation) =>
        set((state) => ({
          conversations: [conversation, ...state.conversations]
        })),

      setMessages: (messages) => {
        const chatMessages = groupMessages(messages)
        set({ messages, chatMessages })
      },

      addMessage: (message) =>
        set((state) => {
          const newMessages = [...state.messages, message]
          return {
            messages: newMessages,
            chatMessages: groupMessages(newMessages) // Auto-regroup on every add
          }
        }),

      updateMessage: (messageId, updates) =>
        set((state) => {
          const newMessages = state.messages.map((msg) =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          )
          return {
            messages: newMessages,
            chatMessages: groupMessages(newMessages) // Auto-regroup on update
          }
        }),

      setLoading: (loading) =>
        set({ isLoading: loading }),

      setSending: (sending) =>
        set({ isSending: sending }),

      clearCurrentConversation: () =>
        set({
          currentConversationId: null,
          messages: [],
          chatMessages: []
        }),

      reset: () =>
        set({
          currentConversationId: null,
          conversations: [],
          messages: [],
          chatMessages: [],
          isLoading: false,
          isSending: false,
        }),

      recomputeChatMessages: () => {
        set((state) => ({
          chatMessages: groupMessages(state.messages)
        }))
      }
    }),
    { name: 'conversation-store' }
  )
)