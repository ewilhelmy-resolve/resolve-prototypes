/**
 * ChatTestPage - Test page for new v0.app layout
 *
 * This page uses the RitaV0Layout (adapted from v0.app Dashboard) with the existing
 * ChatV1Content component for the chat interface. It serves as a testing ground for
 * the new layout before replacing the main chat page.
 *
 * To view: Navigate to /chat-test after logging in
 */

import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { SSEProvider, useSSEContext } from '../contexts/SSEContext'
import { useAuth } from '../hooks/useAuth'
import { useConversationStore } from '../stores/conversationStore'
import RitaV0Layout from '../components/layouts/RitaV0Layout'
import ChatV1Content from '../components/chat/ChatV1Content.tsx'
import { useRitaChat } from '../hooks/useRitaChat'

const ChatTestDemo: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>()
  const { latestUpdate } = useSSEContext()
  const { updateMessage, setCurrentConversation } = useConversationStore()
  const ritaChatState = useRitaChat()

  // Sync URL parameter with conversation store
  useEffect(() => {
    if (conversationId && conversationId !== ritaChatState.currentConversationId) {
      setCurrentConversation(conversationId)
    } else if (!conversationId && ritaChatState.currentConversationId) {
      setCurrentConversation(null)
    }
  }, [conversationId, ritaChatState.currentConversationId, setCurrentConversation])

  // Handle SSE message updates
  useEffect(() => {
    if (latestUpdate) {
      console.log('Applying SSE update to store:', latestUpdate)
      updateMessage(latestUpdate.messageId, {
        status: latestUpdate.status,
        error_message: latestUpdate.errorMessage,
      })
    }
  }, [latestUpdate, updateMessage])

  return (
    <RitaV0Layout activePage="chat">
      <ChatV1Content {...ritaChatState} />
    </RitaV0Layout>
  )
}

export default function ChatTestPage() {
  const { authenticated, loading, sessionReady } = useAuth()

  return (
    <SSEProvider
      apiUrl=""
      enabled={authenticated && !loading && sessionReady}
    >
      <ChatTestDemo />
    </SSEProvider>
  )
}
