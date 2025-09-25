/**
 * ChatV1Page - Modern chat page using RitaLayoutView v1 architecture
 *
 * This is the next-generation Rita chat interface using the new RitaLayoutView structure
 * with enhanced components, professional message bubbles, and modern React patterns.
 */

import RitaLayoutView from '../components/RitaLayoutView'
import { useRitaChat } from '../hooks/useRitaChat'

export default function ChatV1Page() {
  const ritaChatState = useRitaChat()

  return <RitaLayoutView {...ritaChatState} />
}