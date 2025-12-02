/**
 * IframeChatPage - Public chat page for iframe embedding
 *
 * Stripped-down chat for embedding in iframe:
 * - No sidebar, no header navigation
 * - Uses public-guest-user (no Keycloak auth)
 * - Parses intent-eid from URL params for tracking
 *
 * Flow:
 * 1. On mount, call /api/iframe/validate-instantiation
 * 2. Backend creates session for public-guest-user (cookie set)
 * 3. Backend creates conversation, returns conversationId
 * 4. Render chat with SSE (session cookie enables SSE)
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ChatV1Content from "../components/chat/ChatV1Content";
import IframeChatLayout from "../components/layouts/IframeChatLayout";
import { SSEProvider } from "../contexts/SSEContext";
import { useSSEContext } from "../contexts/SSEContext";
import { useRitaChat } from "../hooks/useRitaChat";
import { useConversationStore } from "../stores/conversationStore";
import { iframeApi } from "../services/iframeApi";
import { Loader } from "../components/ai-elements/loader";

// Inner component that uses SSE (must be inside SSEProvider)
function IframeChatContent({
	conversationId,
}: {
	conversationId: string;
}) {
	const { latestUpdate } = useSSEContext();
	const { updateMessage } = useConversationStore();
	const ritaChatState = useRitaChat();

	// Handle SSE message updates
	useEffect(() => {
		if (latestUpdate) {
			updateMessage(latestUpdate.messageId, {
				status: latestUpdate.status,
				error_message: latestUpdate.errorMessage,
			});
		}
	}, [latestUpdate, updateMessage]);

	// Override currentConversationId from props (ensures it's set before first message)
	return (
		<ChatV1Content
			{...ritaChatState}
			currentConversationId={conversationId}
			requireKnowledgeBase={false}
		/>
	);
}

export default function IframeChatPage() {
	const { conversationId: urlConversationId } = useParams<{ conversationId?: string }>();
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const intentEid = searchParams.get("intent-eid");

	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [conversationId, setConversationId] = useState<string | null>(
		urlConversationId || null
	);
	const [sessionReady, setSessionReady] = useState(false);

	const apiUrl = import.meta.env.VITE_API_URL || "";
	const { setCurrentConversation } = useConversationStore();
	const initRef = useRef(false);

	// Initialize public session on mount (always required for auth)
	useEffect(() => {
		// Guard against StrictMode double-mount
		if (initRef.current) return;
		initRef.current = true;

		async function initializeIframe() {
			// Token is required
			if (!token) {
				setError("Missing token parameter");
				setIsLoading(false);
				return;
			}

			try {
				console.log("[IframeChatPage] Initializing public session...", {
					token: token.substring(0, 8) + "...",
					intentEid,
					existingConversationId: urlConversationId,
				});

				// Always call validate-instantiation to get session cookie
				// Pass existing conversationId to skip creating a new one
				const response = await iframeApi.validateInstantiation({
					token,
					intentEid: intentEid || undefined,
					existingConversationId: urlConversationId,
				});

				if (response.valid && response.conversationId) {
					console.log("[IframeChatPage] Session initialized", {
						conversationId: response.conversationId,
						publicUserId: response.publicUserId,
					});
					setConversationId(response.conversationId);
					setCurrentConversation(response.conversationId);
					setSessionReady(true);
				} else {
					setError(response.error || "Failed to initialize session");
				}
			} catch (err) {
				console.error("[IframeChatPage] Initialization error:", err);
				setError("Failed to connect to server");
			} finally {
				setIsLoading(false);
			}
		}

		initializeIframe();
	}, [urlConversationId, token, intentEid, setCurrentConversation]);

	// Loading state
	if (isLoading) {
		return (
			<IframeChatLayout>
				<div className="flex items-center justify-center h-full">
					<Loader size={32} />
				</div>
			</IframeChatLayout>
		);
	}

	// Error state
	if (error) {
		return (
			<IframeChatLayout>
				<div className="flex items-center justify-center h-full">
					<div className="text-center max-w-md px-4">
						<h2 className="text-xl font-semibold text-gray-900 mb-2">
							Setup Failed
						</h2>
						<p className="text-sm text-gray-600">{error}</p>
					</div>
				</div>
			</IframeChatLayout>
		);
	}

	// Not ready state (shouldn't happen, but safety check)
	if (!sessionReady || !conversationId) {
		return (
			<IframeChatLayout>
				<div className="flex items-center justify-center h-full">
					<div className="text-sm text-gray-500">Initializing...</div>
				</div>
			</IframeChatLayout>
		);
	}

	// Render chat with SSE provider (session cookie enables SSE auth)
	return (
		<IframeChatLayout>
			<SSEProvider apiUrl={apiUrl} enabled={sessionReady}>
				<IframeChatContent conversationId={conversationId} />
			</SSEProvider>
		</IframeChatLayout>
	);
}
