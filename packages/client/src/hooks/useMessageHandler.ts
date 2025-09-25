/**
 * useMessageHandler - Handle message sending, receiving, and display logic
 *
 * Encapsulates all message-related business logic including sending messages,
 * managing message state, auto-scrolling, and keyboard interactions.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConversationStore } from '@/stores/conversationStore'
import { useCreateConversation, useSendMessage, useConversationMessages } from '@/hooks/api/useConversations'

export interface MessageHandlerState {
  messages: any[]
  loading: boolean
  isSending: boolean
  messageValue: string
  handleSendMessage: () => Promise<void>
  handleMessageChange: (value: string) => void
  handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

/**
 * Custom hook for handling all message-related functionality
 */
export const useMessageHandler = (messagesEndRef: React.RefObject<HTMLDivElement>): MessageHandlerState => {
  const [messageValue, setMessageValue] = useState('')
  const navigate = useNavigate()

  const { currentConversationId, messages, isSending } = useConversationStore()
  const { isLoading: messagesLoading } = useConversationMessages(currentConversationId)
  const createConversationMutation = useCreateConversation()
  const sendMessageMutation = useSendMessage()

  // Auto-scroll to bottom when messages change
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
        // Navigate to the new conversation URL
        navigate(`/v1/${conversationId}`)
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

  return {
    messages,
    loading: messagesLoading,
    isSending,
    messageValue,
    handleSendMessage,
    handleMessageChange,
    handleKeyPress,
  }
}