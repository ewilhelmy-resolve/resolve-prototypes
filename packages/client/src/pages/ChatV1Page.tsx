/**
 * ChatV1Page - Modern chat page using shared RitaV1Layout
 *
 * This is the next-generation Rita chat interface using the new shared layout structure
 * with the chat content component for clean separation of concerns.
 */

import RitaV1Layout from '../components/layouts/RitaV1Layout'
import ChatV1Content from '../components/chat/ChatV1Content'
import { useRitaChat } from '../hooks/useRitaChat'

export default function ChatV1Page() {
  const ritaChatState = useRitaChat()

  return (
    <RitaV1Layout activePage="chat">
      <ChatV1Content {...ritaChatState} />
    </RitaV1Layout>
  )
}