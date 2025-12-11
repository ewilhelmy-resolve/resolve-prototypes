/**
 * useMessageHandler - Handle message sending, receiving, and display logic
 *
 * Encapsulates all message-related business logic including sending messages,
 * managing message state, auto-scrolling, and keyboard interactions.
 */

import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCreateConversation, useSendMessage } from '@/hooks/api/useConversations'
import { useConversationStore } from '@/stores/conversationStore'

export interface MessageHandlerState {
  // biome-ignore lint/suspicious/noExplicitAny: ok
  messages: any[]
  loading: boolean
  isSending: boolean
  messageValue: string
  handleSendMessage: () => Promise<void>
  handleMessageChange: (value: string) => void
  handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  // Programmatic message sending (for iframe host communication)
  sendMessageWithContent: (content: string, metadata?: Record<string, string>) => Promise<void>
}

/**
 * Custom hook for handling all message-related functionality
 */
export const useMessageHandler = (messagesEndRef: React.RefObject<HTMLDivElement>): MessageHandlerState => {
  const [messageValue, setMessageValue] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  // Check if we're on an iframe route (public access)
  const isIframeRoute = location.pathname.startsWith('/iframe/')

  const { currentConversationId, messages, isSending, isLoadingMore } = useConversationStore()
  const createConversationMutation = useCreateConversation()
  const sendMessageMutation = useSendMessage()

  // Note: Message loading is now handled by useInfiniteConversationMessages in useChatPagination
  // The isLoadingMore state from the store tracks pagination loading

  // Auto-scroll to bottom when messages change
  // biome-ignore lint/correctness/useExhaustiveDependencies: needed for scroll
    useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, messagesEndRef])

  const handleSendMessage = async () => {
    if (!messageValue.trim() || isSending) return

    const messageContent = messageValue
    const tempId = `msg_${Date.now()}`

    setMessageValue('')

    try {
      let conversationId = currentConversationId

      // Create conversation if we don't have one
      if (!conversationId) {
        const conversation = await createConversationMutation.mutateAsync({
          title: messageContent.substring(0, 50) + (messageContent.length > 50 ? '...' : '')
        })
        conversationId = conversation.id
        // Navigate to the new conversation URL (use iframe path for public access)
        const basePath = isIframeRoute ? '/iframe/chat' : '/chat'
        navigate(`${basePath}/${conversationId}`)
      }

      // Send message
      await sendMessageMutation.mutateAsync({
        conversationId,
        content: messageContent,
        tempId,
      })
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleMessageChange = (value: string) => {
    setMessageValue(value)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Programmatic message sending with content and optional metadata
  // Used by iframe host communication (postMessage API)
  const sendMessageWithContent = async (content: string, metadata?: Record<string, string>) => {
    if (!content.trim() || isSending) return

    const tempId = `msg_${Date.now()}`

    try {
      let conversationId = currentConversationId

      // Create conversation if we don't have one
      if (!conversationId) {
        const conversation = await createConversationMutation.mutateAsync({
          title: content.substring(0, 50) + (content.length > 50 ? '...' : '')
        })
        conversationId = conversation.id
        // Navigate to the new conversation URL (use iframe path for public access)
        const basePath = isIframeRoute ? '/iframe/chat' : '/chat'
        navigate(`${basePath}/${conversationId}`)
      }

      // Send message with metadata
      await sendMessageMutation.mutateAsync({
        conversationId,
        content,
        tempId,
        metadata,
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error // Re-throw so caller can handle
    }
  }

  return {
    messages,
    loading: isLoadingMore, // Use pagination loading state instead of old query
    isSending,
    messageValue,
    handleSendMessage,
    handleMessageChange,
    handleKeyPress,
    sendMessageWithContent,
  }
}