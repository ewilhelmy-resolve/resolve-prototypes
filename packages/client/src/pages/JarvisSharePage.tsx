import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
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
	const { conversationId } = useParams<{ conversationId: string }>();
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!conversationId) return;

		const apiBase = import.meta.env.VITE_API_URL || "";
		const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";

		fetch(`${apiBase}/api/share/${conversationId}${tokenParam}`)
			.then((res) => {
				if (!res.ok) {
					if (res.status === 404) throw new Error("Conversation not found");
					if (res.status === 403) throw new Error("Access denied");
					throw new Error("Failed to load");
				}
				return res.json() as Promise<ShareResponse>;
			})
			.then((data) => {
				const messages: Message[] = data.messages.map((msg) => ({
					id: msg.id,
					role: msg.role,
					message: msg.message || "",
					metadata:
						typeof msg.metadata === "string"
							? JSON.parse(msg.metadata)
							: msg.metadata,
					response_group_id: msg.response_group_id ?? undefined,
					timestamp: new Date(msg.created_at),
					conversation_id: conversationId,
					status: "completed" as const,
				}));

				setChatMessages(groupMessages(messages));
			})
			.catch((err) => setError(err.message))
			.finally(() => setLoading(false));
	}, [conversationId, token]);

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
		<div className="flex h-screen flex-col">
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
