import { memo, useCallback } from "react";
import {
	Conversation,
	ConversationContent,
} from "@/components/ai-elements/conversation";
import { useConversationStore } from "@/stores/conversationStore";
import { ChatV2MessageRenderer } from "./ChatV2MessageRenderer";

interface ChatV2ContentProps {
	readOnly?: boolean;
}

export const ChatV2Content = memo(
	({ readOnly = false }: ChatV2ContentProps) => {
		const chatMessages = useConversationStore((s) => s.chatMessages);
		const messages = useConversationStore((s) => s.messages);
		const isStreaming = messages.some(
			(msg) => msg.status === "processing" || msg.status === "pending",
		);

		const handleCopy = useCallback((text: string, _messageId: string) => {
			navigator.clipboard.writeText(text);
		}, []);

		return (
			<Conversation>
				<ConversationContent>
					<ChatV2MessageRenderer
						chatMessages={chatMessages}
						isStreaming={isStreaming}
						readOnly={readOnly}
						onCopy={readOnly ? undefined : handleCopy}
					/>
				</ConversationContent>
			</Conversation>
		);
	},
);

ChatV2Content.displayName = "ChatV2Content";
