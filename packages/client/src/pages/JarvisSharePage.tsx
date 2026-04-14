import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ChatV2MessageRenderer } from "@/components/chat-v2/ChatV2MessageRenderer";
import { groupMessages } from "@/lib/messageGrouping";
import type { ChatMessage, Message } from "@/stores/conversationStore";

interface ShareResponse {
	conversation: {
		id: string;
		title: string;
		created_at: string;
	};
	messages: Array<{
		id: string;
		role: "user" | "assistant";
		message: string;
		metadata: any;
		response_group_id: string | null;
		created_at: string;
	}>;
}

export default function JarvisSharePage() {
	const { shareId } = useParams<{ shareId: string }>();
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
	const [conversationIdState, setConversationIdState] = useState<string>("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!shareId) return;

		setLoading(true);
		setError(null);
		setChatMessages([]);

		const apiBase = import.meta.env.VITE_API_URL || "";

		fetch(`${apiBase}/api/share/${shareId}`)
			.then((res) => {
				if (!res.ok) {
					if (res.status === 404)
						throw new Error("Shared conversation not found");
					throw new Error("Failed to load");
				}
				return res.json() as Promise<ShareResponse>;
			})
			.then((data) => {
				setConversationIdState(data.conversation.id);
				// Metadata is already parsed (comes from JSONB column via Postgres)
				const messages: Message[] = data.messages.map((msg) => ({
					id: msg.id,
					role: msg.role,
					message: msg.message || "",
					metadata: msg.metadata,
					response_group_id: msg.response_group_id ?? undefined,
					timestamp: new Date(msg.created_at),
					conversation_id: data.conversation.id,
					status: "completed" as const,
				}));

				setChatMessages(groupMessages(messages));
			})
			.catch((err) => setError(err.message))
			.finally(() => setLoading(false));
	}, [shareId]);

	if (loading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<p className="text-muted-foreground">Loading conversation...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex h-screen items-center justify-center">
				<p className="text-destructive">{error}</p>
			</div>
		);
	}

	return (
		<div
			className="flex h-screen flex-col"
			data-conversation-id={conversationIdState}
		>
			<header className="border-b px-6 py-4">
				<h1 className="text-lg font-semibold">Jarvis</h1>
				<p className="text-sm text-muted-foreground">Shared conversation</p>
			</header>

			<main className="flex-1 overflow-y-auto px-6 py-4">
				<ChatV2MessageRenderer chatMessages={chatMessages} readOnly />
			</main>

			<footer className="border-t px-6 py-3 text-center text-xs text-muted-foreground">
				Powered by Rita
			</footer>
		</div>
	);
}
