/**
 * IframeChatPage - Minimal chat page for iframe embedding
 *
 * Stripped-down version of ChatV1Page for embedding in iframe:
 * - No sidebar, no header navigation
 * - Parses intent-eid from URL params
 * - Passes intent-eid to conversation creation
 * - Standalone operation (no parent communication)
 *
 * AUTHENTICATION STATUS:
 * Currently uses Keycloak auth (same-domain only). For cross-domain iframe
 * embedding, token-based auth must be implemented. See packages/client/IFRAME.md
 *
 * TODO - Token-Based Authentication:
 * 1. Add OTC (One-Time Code) parameter handling: ?otc=xxx
 * 2. Exchange OTC for session on mount
 * 3. Redirect to clean URL after auth (remove token from URL)
 * 4. Handle auth errors (expired OTC, invalid token)
 * 5. Backend: Implement /api/auth/exchange-otc endpoint
 * 6. Backend: Implement /api/auth/generate-otc endpoint
 * 7. Backend: Redis storage for OTCs (5min TTL)
 */

import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ChatV1Content from "../components/chat/ChatV1Content";
import IframeChatLayout from "../components/layouts/IframeChatLayout";
import { useSSEContext } from "../contexts/SSEContext";
import { useRitaChat } from "../hooks/useRitaChat";
import { useConversationStore } from "../stores/conversationStore";

export default function IframeChatPage() {
	const { conversationId } = useParams<{ conversationId?: string }>();
	const [searchParams] = useSearchParams();
	const intentEid = searchParams.get("intent-eid");

	const { latestUpdate } = useSSEContext();
	const { updateMessage, setCurrentConversation } = useConversationStore();
	const ritaChatState = useRitaChat();

	// Log intent-eid for debugging
	useEffect(() => {
		if (intentEid) {
			console.log("[IframeChatPage] Initialized with intent-eid:", intentEid);
			// TODO: Store intent-eid in conversation metadata
			// This will require updating:
			// - useCreateConversation hook to accept metadata param
			// - conversationApi.createConversation to send metadata in request body
			// - Backend API to store intent_eid in conversations.metadata column
			// - Backend: Add migration for metadata column if needed
		}
	}, [intentEid]);

	// Sync URL parameter with conversation store
	useEffect(() => {
		if (
			conversationId &&
			conversationId !== ritaChatState.currentConversationId
		) {
			setCurrentConversation(conversationId);
		} else if (!conversationId && ritaChatState.currentConversationId) {
			setCurrentConversation(null);
		}
	}, [
		conversationId,
		ritaChatState.currentConversationId,
		setCurrentConversation,
	]);

	// Handle SSE message updates
	useEffect(() => {
		if (latestUpdate) {
			updateMessage(latestUpdate.messageId, {
				status: latestUpdate.status,
				error_message: latestUpdate.errorMessage,
			});
		}
	}, [latestUpdate, updateMessage]);

	return (
		<IframeChatLayout>
			<ChatV1Content {...ritaChatState} requireKnowledgeBase={false} />
		</IframeChatLayout>
	);
}
