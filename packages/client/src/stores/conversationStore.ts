import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// Hybrid Message Schema - Simple flat database structure with rich UI grouping
export interface Message {
  id: string
  role: 'user' | 'assistant'
  message: string  // Keep existing column for text content
  timestamp: Date
  conversation_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'sending' | 'sent'
  error_message?: string

  // NEW: Hybrid approach - metadata for rich types, grouping for UI
  metadata?: {
    // Each property is self-contained with its own content
    reasoning?: {
      content: string     // Reasoning text content
      title?: string      // Optional custom title (e.g., "Research & Analysis", "Planning")
      duration?: number   // How long AI spent thinking
      streaming?: boolean // Real-time streaming state
    }
    sources?: Array<{
      url: string
      title: string
      snippet?: string    // Optional excerpt/preview of source content (200-300 chars recommended)
      blob_id?: string    // Optional reference to uploaded document in blob storage
    }>
    citation_variant?: 'hover-card' | 'modal' | 'right-panel' | 'collapsible-list' | 'inline'  // Controls how citations are displayed
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
    turn_complete?: boolean  // UI hint: true = turn finished, false/undefined = more messages coming
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

      // Check if message has metadata (reasoning, sources, tasks) - treat as single-part group
      const hasMetadata = message.metadata && (
        message.metadata.reasoning ||
        message.metadata.sources ||
        message.metadata.tasks ||
        message.metadata.files
      )

      if (hasMetadata) {
        // Treat as a group with single part to enable GroupedMessage rendering
        grouped.push({
          id: message.id,
          role: message.role,
          isGroup: true,
          parts: [{
            id: message.id,
            message: message.message,
            metadata: message.metadata
          }],
          timestamp: message.timestamp
        } as GroupedChatMessage)
      } else {
        // Simple text-only message
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

  // Pagination state
  hasMoreMessages: boolean      // Are there older messages to load?
  isLoadingMore: boolean        // Currently loading older messages?
  oldestMessageTimestamp: Date | null  // Cursor for pagination

  // Actions
  setCurrentConversation: (conversationId: string | null) => void
  setConversations: (conversations: Conversation[]) => void
  addConversation: (conversation: Conversation) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (messageId: string, updates: Partial<Message>) => void
  prependMessages: (messages: Message[]) => void // Add older messages to beginning
  setLoading: (loading: boolean) => void
  setSending: (sending: boolean) => void
  setHasMoreMessages: (hasMore: boolean) => void
  setLoadingMore: (loading: boolean) => void
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
      hasMoreMessages: false,
      isLoadingMore: false,
      oldestMessageTimestamp: null,

      // Actions
      setCurrentConversation: (conversationId) =>
        set({
          currentConversationId: conversationId,
          messages: [],
          chatMessages: [],
          hasMoreMessages: false,
          oldestMessageTimestamp: null
        }),

      setConversations: (conversations) =>
        set({ conversations }),

      addConversation: (conversation) =>
        set((state) => ({
          conversations: [conversation, ...state.conversations]
        })),

      setMessages: (messages) => {
        const chatMessages = groupMessages(messages)
        // Set oldest message timestamp for pagination cursor
        const oldestTimestamp = messages.length > 0 ? messages[0].timestamp : null
        set({ messages, chatMessages, oldestMessageTimestamp: oldestTimestamp })
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

      prependMessages: (olderMessages) =>
        set((state) => {
          // Add older messages to the beginning
          const newMessages = [...olderMessages, ...state.messages]
          const oldestTimestamp = olderMessages.length > 0 ? olderMessages[0].timestamp : state.oldestMessageTimestamp
          return {
            messages: newMessages,
            chatMessages: groupMessages(newMessages),
            oldestMessageTimestamp: oldestTimestamp
          }
        }),

      setLoading: (loading) =>
        set({ isLoading: loading }),

      setSending: (sending) =>
        set({ isSending: sending }),

      setHasMoreMessages: (hasMore) =>
        set({ hasMoreMessages: hasMore }),

      setLoadingMore: (loading) =>
        set({ isLoadingMore: loading }),

      clearCurrentConversation: () =>
        set({
          currentConversationId: null,
          messages: [],
          chatMessages: [],
          hasMoreMessages: false,
          isLoadingMore: false,
          oldestMessageTimestamp: null
        }),

      reset: () =>
        set({
          currentConversationId: null,
          conversations: [],
          messages: [],
          chatMessages: [],
          isLoading: false,
          isSending: false,
          hasMoreMessages: false,
          isLoadingMore: false,
          oldestMessageTimestamp: null
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