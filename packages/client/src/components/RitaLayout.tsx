/**
 * RitaLayout Component
 *
 * Main layout component for Rita chat interface featuring:
 * - Responsive design with collapsible sidebar
 * - Real-time conversation management
 * - Message sending/receiving functionality
 * - File upload support
 * - Search and filtering capabilities
 */

import { useRitaChat } from '@/hooks/useRitaChat'
import RitaLayoutView from './RitaLayoutView'

export default function RitaLayout() {
  const chatState = useRitaChat()
  return <RitaLayoutView {...chatState} />
}