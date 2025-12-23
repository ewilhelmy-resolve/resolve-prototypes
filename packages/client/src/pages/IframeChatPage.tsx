/**
 * IframeChatPage - Public chat page for iframe embedding
 *
 * Stripped-down chat for embedding in iframe:
 * - No sidebar, no header navigation
 * - Uses public-guest-user (no Keycloak auth)
 * - Supports hashkey param for workflow execution via Valkey
 *
 * Flow:
 * 1. On mount, call /api/iframe/validate-instantiation
 * 2. Backend creates session for public-guest-user (cookie set)
 * 3. Backend creates conversation, returns conversationId
 * 4. If hashkey present, call /api/iframe/execute to trigger workflow
 * 5. Render chat with SSE (session cookie enables SSE)
 *
 * Debug mode: Add ?debug=true to URL to see debug panel
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ChatV1Content from "../components/chat/ChatV1Content";
import IframeChatLayout from "../components/layouts/IframeChatLayout";
import { SSEProvider } from "../contexts/SSEContext";
import { useSSEContext } from "../contexts/SSEContext";
import { useRitaChat } from "../hooks/useRitaChat";
import { useIframeMessaging, type HostMessageMetadata } from "../hooks/useIframeMessaging";
import { useConversationStore } from "../stores/conversationStore";
import { iframeApi } from "../services/iframeApi";
import { Loader } from "../components/ai-elements/loader";
import { Bug, ChevronDown, ChevronUp } from "lucide-react";

// Debug log entry
interface DebugLogEntry {
	timestamp: string;
	level: "info" | "error" | "warn";
	message: string;
	data?: Record<string, unknown>;
}

// Debug panel props
interface DebugPanelProps {
	debug: boolean;
	showDebug: boolean;
	setShowDebug: (show: boolean) => void;
	debugLogs: DebugLogEntry[];
	state: {
		isLoading: boolean;
		sessionReady: boolean;
		error: string | null;
		conversationId: string | null;
		token: string | null;
		hashkey: string | null;
		apiUrl: string;
	};
}

// Debug panel component (moved outside to avoid nested component definition)
function DebugPanel({ debug, showDebug, setShowDebug, debugLogs, state }: DebugPanelProps) {
	if (!debug && !showDebug) return null;

	return (
		<div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white text-xs z-50 max-h-64 overflow-hidden flex flex-col">
			<button
				type="button"
				onClick={() => setShowDebug(!showDebug)}
				className="flex items-center justify-between px-3 py-2 bg-gray-800 hover:bg-gray-700 cursor-pointer"
			>
				<span className="flex items-center gap-2">
					<Bug className="w-4 h-4" />
					Debug Panel ({debugLogs.length} logs)
				</span>
				{showDebug ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
			</button>
			{showDebug && (
				<div className="flex-1 overflow-auto p-2 space-y-2">
					{/* Current State */}
					<div className="bg-gray-800 rounded p-2">
						<div className="font-semibold mb-1">State:</div>
						<pre className="text-[10px] overflow-x-auto">
							{JSON.stringify({
								isLoading: state.isLoading,
								sessionReady: state.sessionReady,
								error: state.error,
								conversationId: state.conversationId,
								token: state.token ? state.token.substring(0, 12) + "..." : null,
								hashkey: state.hashkey ? state.hashkey.substring(0, 12) + "..." : null,
								apiUrl: state.apiUrl,
							}, null, 2)}
						</pre>
					</div>
					{/* Logs */}
					<div className="bg-gray-800 rounded p-2">
						<div className="font-semibold mb-1">Logs:</div>
						<div className="space-y-1 max-h-32 overflow-auto">
							{debugLogs.map((log, i) => (
								<div
									key={`${log.timestamp}-${i}`}
									className={`text-[10px] ${
										log.level === "error" ? "text-red-400" :
										log.level === "warn" ? "text-yellow-400" : "text-green-400"
									}`}
								>
									<span className="text-gray-500">{log.timestamp.split("T")[1].split(".")[0]}</span>
									{" "}{log.message}
									{log.data ? (
										<pre className="ml-4 text-gray-400 overflow-x-auto">
											{JSON.stringify(log.data, null, 2)}
										</pre>
									) : null}
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

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

	// Handle postMessage commands from host page (Jarvis)
	const handleHostSendMessage = useCallback(
		async (content: string, metadata: HostMessageMetadata) => {
			// Convert metadata to Record<string, string> for API
			const apiMetadata: Record<string, string> = {};
			if (metadata.chatSessionId) apiMetadata.chatSessionId = metadata.chatSessionId;
			if (metadata.tabInstanceId) apiMetadata.tabInstanceId = metadata.tabInstanceId;

			await ritaChatState.sendMessageWithContent(content, apiMetadata);
		},
		[ritaChatState]
	);

	// Enable postMessage communication with host page
	useIframeMessaging({
		enabled: true,
		allowedOrigins: [], // Same-origin only for security
		onSendMessage: handleHostSendMessage,
		onGetStatus: () => ({
			conversationId,
			isSending: ritaChatState.isSending,
			messageCount: ritaChatState.messages.length,
		}),
	});

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
	// Support both hashkey and sessionKey (portal uses sessionKey)
	const hashkey = searchParams.get("hashkey") || searchParams.get("sessionKey");
	const debug = searchParams.get("debug") === "true";

	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [conversationId, setConversationId] = useState<string | null>(
		urlConversationId || null
	);
	const [sessionReady, setSessionReady] = useState(false);

	// Debug state
	const [showDebug, setShowDebug] = useState(debug);
	const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);

	const apiUrl = import.meta.env.VITE_API_URL || "";
	const { setCurrentConversation } = useConversationStore();
	const initRef = useRef(false);
	const workflowExecutedRef = useRef(false);

	// Debug logging helper
	const addDebugLog = useCallback((level: DebugLogEntry["level"], message: string, data?: Record<string, unknown>) => {
		const entry: DebugLogEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			data,
		};
		setDebugLogs((prev) => [...prev, entry]);
		// Also log to console
		const consoleFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
		consoleFn(`[IframeDebug] ${message}`, data || "");
	}, []);

	// Initialize public session on mount (always required for auth)
	useEffect(() => {
		// Guard against StrictMode double-mount
		if (initRef.current) return;
		initRef.current = true;

		// Capture apiUrl in closure for logging
		const currentApiUrl = apiUrl;

		async function initializeIframe() {
			addDebugLog("info", "Starting initialization", {
				token: token ? token.substring(0, 8) + "..." : "null",
				hashkey: hashkey ? hashkey.substring(0, 8) + "..." : "null",
				existingConversationId: urlConversationId || "null",
				apiUrl: currentApiUrl,
			});

			// Token is required
			if (!token) {
				addDebugLog("error", "Missing token parameter");
				setError("Missing token parameter");
				setIsLoading(false);
				return;
			}

			try {
				addDebugLog("info", "Calling validate-instantiation API...");
				const startTime = Date.now();

				// Always call validate-instantiation to get session cookie
				// Pass existing conversationId to skip creating a new one
				const response = await iframeApi.validateInstantiation({
					token,
					hashkey: hashkey || undefined,
					existingConversationId: urlConversationId,
				});

				const duration = Date.now() - startTime;
				addDebugLog("info", `API response received (${duration}ms)`, { ...response });

				if (response.valid && response.conversationId) {
					addDebugLog("info", "Session initialized successfully", {
						conversationId: response.conversationId,
						publicUserId: response.publicUserId || "unknown",
					});
					setConversationId(response.conversationId);
					setCurrentConversation(response.conversationId);
					setSessionReady(true);
				} else {
					addDebugLog("error", "Validation failed", { ...response });
					setError(response.error || "Failed to initialize session");
				}
			} catch (err) {
				const errorMsg = err instanceof Error ? err.message : String(err);
				const errorStack = err instanceof Error ? err.stack : undefined;
				addDebugLog("error", "Initialization exception", {
					error: errorMsg,
					stack: errorStack || "no stack",
				});
				setError("Failed to connect to server");
			} finally {
				setIsLoading(false);
				addDebugLog("info", "Initialization complete", { isLoading: "false" });
			}
		}

		initializeIframe();
	}, [urlConversationId, token, hashkey, setCurrentConversation, addDebugLog]);

	// Execute workflow once session is ready (if hashkey present)
	// This runs in parent to prevent re-execution on child remounts
	useEffect(() => {
		if (!sessionReady || !hashkey || workflowExecutedRef.current) return;
		workflowExecutedRef.current = true;

		const key = hashkey; // Capture for closure (narrowed type)
		async function executeWorkflow() {
			console.log("[IframeChatPage] Executing workflow from hashkey...");
			try {
				const result = await iframeApi.executeWorkflow(key);
				if (result.success) {
					console.log("[IframeChatPage] Workflow executed, eventId:", result.eventId);
				} else {
					console.error("[IframeChatPage] Workflow execution failed:", result.error);
				}
			} catch (err) {
				console.error("[IframeChatPage] Workflow execution error:", err);
			}
		}

		executeWorkflow();
	}, [sessionReady, hashkey]);

	// Debug panel props
	const debugPanelProps: DebugPanelProps = {
		debug,
		showDebug,
		setShowDebug,
		debugLogs,
		state: { isLoading, sessionReady, error, conversationId, token, hashkey, apiUrl },
	};

	// Loading state
	if (isLoading) {
		return (
			<IframeChatLayout>
				<div className="flex items-center justify-center h-full">
					<Loader size={32} />
				</div>
				<DebugPanel {...debugPanelProps} />
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
				<DebugPanel {...debugPanelProps} />
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
				<DebugPanel {...debugPanelProps} />
			</IframeChatLayout>
		);
	}

	// Render chat with SSE provider (session cookie enables SSE auth)
	return (
		<IframeChatLayout>
			<SSEProvider apiUrl={apiUrl} enabled={sessionReady}>
				<IframeChatContent conversationId={conversationId} />
			</SSEProvider>
			<DebugPanel {...debugPanelProps} />
		</IframeChatLayout>
	);
}
