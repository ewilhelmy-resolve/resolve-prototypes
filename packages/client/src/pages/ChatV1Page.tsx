/**
 * ChatV1Page - Modern chat page using shared RitaV1Layout and ai-elements
 *
 * This is the next-generation RITA chat interface using the new shared layout structure
 * with the ai-elements chat components for enhanced UX, markdown support, and modern
 * chat features including file attachments, action buttons, and professional styling.
 */

import { useEffect } from "react";
import { useParams } from "react-router-dom";
import ChatV1Content from "../components/chat/ChatV1Content";
import RitaLayout from "../components/layouts/RitaLayout";
import { useSSEContext } from "../contexts/SSEContext";
import { useRitaChat } from "../hooks/useRitaChat";
import { useConversationStore } from "../stores/conversationStore";

export default function ChatV1Page() {
	const { conversationId } = useParams<{ conversationId?: string }>();
	const { latestUpdate } = useSSEContext();
	const { updateMessage, setCurrentConversation } = useConversationStore();
	const ritaChatState = useRitaChat();

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
		<RitaLayout activePage="chat">
			<ChatV1Content {...ritaChatState} />
		</RitaLayout>
	);
}
