/**
 * useConversationManager - Handle conversation fetching and management
 *
 * Encapsulates conversation-related business logic including fetching,
 * loading states, and conversation selection management.
 */

import { useConversationStore } from '@/stores/conversationStore'
import { useConversations } from '@/hooks/api/useConversations'

export interface ConversationManagerState {
  conversations: any[]
  currentConversationId: string | null
  loading: boolean
}

/**
 * Custom hook for managing conversation data and state
 */
export const useConversationManager = (): ConversationManagerState => {
  const { conversations, currentConversationId } = useConversationStore()
  const { data: fetchedConversations, isLoading: conversationsLoading } = useConversations()

  // Use fetched conversations if available, fallback to store
  const conversationList = fetchedConversations || conversations

  return {
    conversations: conversationList,
    currentConversationId,
    loading: conversationsLoading,
  }
}