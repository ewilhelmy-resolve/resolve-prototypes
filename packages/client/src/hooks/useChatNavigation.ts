/**
 * useChatNavigation - Handle chat navigation and routing logic
 *
 * Separates navigation concerns from UI components, providing clean
 * navigation actions and URL synchronization for the chat interface.
 */

import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useConversationStore } from '@/stores/conversationStore'

export interface ChatNavigationState {
  currentConversationId: string | null
  handleNewChat: () => void
  handleConversationClick: (conversationId: string) => void
}

/**
 * Custom hook for handling chat navigation and URL synchronization
 */
export const useChatNavigation = (): ChatNavigationState => {
  const navigate = useNavigate()
  const { conversationId } = useParams<{ conversationId?: string }>()
  const { currentConversationId, clearCurrentConversation, setCurrentConversation } = useConversationStore()

  // Sync URL parameter with conversation store
  useEffect(() => {
    if (conversationId && conversationId !== currentConversationId) {
      setCurrentConversation(conversationId)
    } else if (!conversationId && currentConversationId) {
      setCurrentConversation(null)
    }
  }, [conversationId, currentConversationId, setCurrentConversation])

  const handleNewChat = () => {
    clearCurrentConversation()
    navigate('/chat')
  }

  const handleConversationClick = (conversationId: string) => {
    navigate(`/chat/${conversationId}`)
  }

  // Return URL param as source of truth (falls back to store if no URL param)
  return {
    currentConversationId: conversationId || currentConversationId,
    handleNewChat,
    handleConversationClick,
  }
}