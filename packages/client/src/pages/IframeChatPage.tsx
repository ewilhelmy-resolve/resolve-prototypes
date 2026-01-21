/**
 * IframeChatPage - Chat page for iframe embedding
 *
 * Stripped-down chat for embedding in iframe:
 * - No sidebar, no header navigation
 * - Uses Valkey IDs from host app (Jarvis) - not Rita's user system
 * - sessionKey param provides user identity + tenant context via Valkey
 *
 * Flow:
 * 1. On mount, call /api/iframe/validate-instantiation with sessionKey
 * 2. Backend fetches Valkey payload (userId, tenantId, credentials)
 * 3. Backend creates session with Valkey IDs, returns cookie + conversationId
 * 4. Call /api/iframe/execute to trigger workflow
 * 5. Render chat with SSE (session cookie enables SSE routing)
 *
 * Debug mode: Add ?debug=true to URL to see debug panel
 */

import { Bug, ChevronDown, ChevronUp, Download } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader } from "../components/ai-elements/loader";
import ChatV1Content from "../components/chat/ChatV1Content";
import IframeChatLayout from "../components/layouts/IframeChatLayout";
import { SSEProvider, useSSEContext } from "../contexts/SSEContext";
import { useFeatureFlag } from "../hooks/useFeatureFlags";
import {
	type HostMessageMetadata,
	useIframeMessaging,
} from "../hooks/useIframeMessaging";
import { useRitaChat } from "../hooks/useRitaChat";
import { iframeApi } from "../services/iframeApi";
import { useConversationStore } from "../stores/conversationStore";

// Debug log entry
interface DebugLogEntry {
	timestamp: string;
	level: "info" | "error" | "warn";
	message: string;
	data?: Record<string, unknown>;
}

// Valkey config for dev tools export
interface ValkeyConfig {
	tenantId?: string;
	chatSessionId?: string;
	tabInstanceId?: string;
	tenantName?: string;
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
		sessionKey: string | null;
		apiUrl: string;
	};
}

// Floating toolbar header (shows when feature flag enabled)
// Extensible for future features: logout, theme select, etc.
function IframeToolbar({
	onDownloadConversation,
	onDownloadMetadata,
}: {
	onDownloadConversation: () => void;
	onDownloadMetadata: () => void;
}) {
	const devToolsEnabled = useFeatureFlag("ENABLE_IFRAME_DEV_TOOLS");

	if (!devToolsEnabled) return null;

	return (
		<div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-3 py-2 bg-gray-900/90 backdrop-blur-sm border-b border-gray-700">
			<span className="text-xs text-gray-400 font-medium">Dev Tools</span>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onDownloadConversation}
					className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white text-xs transition-colors"
					title="Download conversation ID and transcript"
				>
					<Download className="w-3.5 h-3.5" />
					Conversation
				</button>
				<button
					type="button"
					onClick={onDownloadMetadata}
					className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs transition-colors"
					title="Download full metadata and message objects"
				>
					<Download className="w-3.5 h-3.5" />
					Metadata
				</button>
			</div>
		</div>
	);
}

// Debug panel component (moved outside to avoid nested component definition)
function DebugPanel({
	debug,
	showDebug,
	setShowDebug,
	debugLogs,
	state,
}: Omit<DebugPanelProps, "onDownload">) {
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
				{showDebug ? (
					<ChevronDown className="w-4 h-4" />
				) : (
					<ChevronUp className="w-4 h-4" />
				)}
			</button>
			{showDebug && (
				<div className="flex-1 overflow-auto p-2 space-y-2">
					{/* Current State */}
					<div className="bg-gray-800 rounded p-2">
						<div className="font-semibold mb-1">State:</div>
						<pre className="text-[10px] overflow-x-auto">
							{JSON.stringify(
								{
									isLoading: state.isLoading,
									sessionReady: state.sessionReady,
									error: state.error,
									conversationId: state.conversationId,
									sessionKey: state.sessionKey
										? `${state.sessionKey.substring(0, 12)}...`
										: null,
									apiUrl: state.apiUrl,
								},
								null,
								2,
							)}
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
										log.level === "error"
											? "text-red-400"
											: log.level === "warn"
												? "text-yellow-400"
												: "text-green-400"
									}`}
								>
									<span className="text-gray-500">
										{log.timestamp.split("T")[1].split(".")[0]}
									</span>{" "}
									{log.message}
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
	titleText,
	placeholderText,
	welcomeText,
}: {
	conversationId: string;
	/** Custom title from Valkey (e.g., "Ask Workflow Designer") */
	titleText?: string;
	/** Custom placeholder from Valkey (e.g., "Describe your workflow...") */
	placeholderText?: string;
	/** Custom welcome text from Valkey (e.g., "I can help you build workflow automations.") */
	welcomeText?: string;
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
			if (metadata.chatSessionId)
				apiMetadata.chatSessionId = metadata.chatSessionId;
			if (metadata.tabInstanceId)
				apiMetadata.tabInstanceId = metadata.tabInstanceId;

			await ritaChatState.sendMessageWithContent(content, apiMetadata);
		},
		[ritaChatState],
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
			titleText={titleText}
			placeholderText={placeholderText}
			welcomeText={welcomeText}
		/>
	);
}

export default function IframeChatPage() {
	const { t } = useTranslation("chat");
	const { conversationId: urlConversationId } = useParams<{
		conversationId?: string;
	}>();
	const [searchParams] = useSearchParams();
	const sessionKey = searchParams.get("sessionKey");
	const debug = searchParams.get("debug") === "true";

	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [conversationId, setConversationId] = useState<string | null>(
		urlConversationId || null,
	);
	const [sessionReady, setSessionReady] = useState(false);

	// Custom UI text from Valkey (undefined = use i18n defaults)
	const [titleText, setTitleText] = useState<string | undefined>();
	const [placeholderText, setPlaceholderText] = useState<string | undefined>();
	const [welcomeText, setWelcomeText] = useState<string | undefined>();

	// Valkey config for dev tools export (JAR-69)
	const [valkeyConfig, setValkeyConfig] = useState<ValkeyConfig | null>(null);

	// Debug state
	const [showDebug, setShowDebug] = useState(debug);
	const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);

	const navigate = useNavigate();
	const apiUrl = import.meta.env.VITE_API_URL || "";
	const { setCurrentConversation } = useConversationStore();
	const initRef = useRef(false);
	const workflowExecutedRef = useRef(false);

	// Debug logging helper
	const addDebugLog = useCallback(
		(
			level: DebugLogEntry["level"],
			message: string,
			data?: Record<string, unknown>,
		) => {
			const entry: DebugLogEntry = {
				timestamp: new Date().toISOString(),
				level,
				message,
				data,
			};
			setDebugLogs((prev) => [...prev, entry]);
			// Also log to console
			const consoleFn =
				level === "error"
					? console.error
					: level === "warn"
						? console.warn
						: console.log;
			consoleFn(`[IframeDebug] ${message}`, data || "");
		},
		[],
	);

	// Helper to trigger file download
	const triggerDownload = useCallback((data: object, filename: string) => {
		const blob = new Blob([JSON.stringify(data, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}, []);

	// Download simple conversation (JAR-69)
	const downloadConversation = useCallback(() => {
		const messages = useConversationStore.getState().messages;
		const data = {
			conversationId,
			transcript: messages
				.filter(
					(m) =>
						!m.metadata?.sources && !m.metadata?.reasoning && m.message?.trim(),
				)
				.map((m) => `${m.role === "user" ? "User" : "Bot"}: ${m.message}`),
		};
		triggerDownload(data, `conversation-${conversationId}.json`);
	}, [conversationId, triggerDownload]);

	// Download full metadata (JAR-69)
	const downloadMetadata = useCallback(() => {
		const messages = useConversationStore.getState().messages;
		const data = {
			exportedAt: new Date().toISOString(),
			conversationId,
			sessionKey,
			tenantId: valkeyConfig?.tenantId,
			chatSessionId: valkeyConfig?.chatSessionId,
			tabInstanceId: valkeyConfig?.tabInstanceId,
			tenantName: valkeyConfig?.tenantName,
			apiUrl,
			messages: messages.map((m) => ({
				id: m.id,
				role: m.role,
				message: m.message,
				timestamp: m.timestamp,
				status: m.status,
				metadata: m.metadata,
			})),
		};
		triggerDownload(data, `metadata-${conversationId}-${Date.now()}.json`);
	}, [conversationId, sessionKey, valkeyConfig, triggerDownload]);

	// Initialize iframe session on mount (always required for auth)
	useEffect(() => {
		// Guard against StrictMode double-mount
		if (initRef.current) return;
		initRef.current = true;

		// Capture apiUrl in closure for logging
		const currentApiUrl = apiUrl;

		async function initializeIframe() {
			addDebugLog("info", "Starting initialization", {
				sessionKey: sessionKey ? `${sessionKey.substring(0, 8)}...` : "null",
				existingConversationId: urlConversationId || "null",
				apiUrl: currentApiUrl,
			});

			// sessionKey is required
			if (!sessionKey) {
				addDebugLog("error", "Missing sessionKey parameter");
				setError(t("iframe.missingSessionKey"));
				setIsLoading(false);
				return;
			}

			try {
				addDebugLog("info", "Calling validate-instantiation API...");
				const startTime = Date.now();

				// Always call validate-instantiation to get session cookie
				// Pass existing conversationId to skip creating a new one
				const response = await iframeApi.validateInstantiation({
					sessionKey,
					existingConversationId: urlConversationId,
				});

				const duration = Date.now() - startTime;
				addDebugLog("info", `API response received (${duration}ms)`, {
					...response,
				});

				if (response.valid && response.conversationId) {
					addDebugLog("info", "Session initialized successfully", {
						conversationId: response.conversationId,
						webhookConfigLoaded: response.webhookConfigLoaded,
						titleText: response.titleText,
						welcomeText: response.welcomeText,
						placeholderText: response.placeholderText,
					});
					setConversationId(response.conversationId);
					setCurrentConversation(response.conversationId);

					// Store custom UI text from Valkey (undefined = use i18n defaults)
					setTitleText(response.titleText);
					setWelcomeText(response.welcomeText);
					setPlaceholderText(response.placeholderText);

					// Store Valkey config for dev tools export (JAR-69)
					setValkeyConfig({
						tenantId: response.webhookTenantId,
						chatSessionId: response.chatSessionId,
						tabInstanceId: response.tabInstanceId,
						tenantName: response.tenantName,
					});

					// Navigate to URL with conversationId to sync with useChatNavigation
					// This prevents useChatNavigation from clearing the store when URL has no conversationId
					if (!urlConversationId) {
						const params = new URLSearchParams(window.location.search);
						const newUrl = `/iframe/chat/${response.conversationId}${params.toString() ? `?${params}` : ""}`;
						navigate(newUrl, { replace: true });
					}

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
	}, [
		urlConversationId,
		sessionKey,
		setCurrentConversation,
		addDebugLog,
		navigate,
		t,
	]);

	// Execute workflow once session is ready
	// This runs in parent to prevent re-execution on child remounts
	useEffect(() => {
		if (!sessionReady || !sessionKey || workflowExecutedRef.current) return;
		workflowExecutedRef.current = true;

		const key = sessionKey; // Capture for closure (narrowed type)
		async function executeWorkflow() {
			console.log("[IframeChatPage] Executing workflow from sessionKey...");
			try {
				const result = await iframeApi.executeWorkflow(key);
				if (result.success) {
					console.log(
						"[IframeChatPage] Workflow executed, eventId:",
						result.eventId,
					);
				} else {
					console.error(
						"[IframeChatPage] Workflow execution failed:",
						result.error,
					);
				}
			} catch (err) {
				console.error("[IframeChatPage] Workflow execution error:", err);
			}
		}

		executeWorkflow();
	}, [sessionReady, sessionKey]);

	// Debug panel props
	const debugPanelProps: DebugPanelProps = {
		debug,
		showDebug,
		setShowDebug,
		debugLogs,
		state: {
			isLoading,
			sessionReady,
			error,
			conversationId,
			sessionKey,
			apiUrl,
		},
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
							{t("iframe.setupFailed")}
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
					<div className="text-sm text-gray-500">
						{t("iframe.initializing")}
					</div>
				</div>
				<DebugPanel {...debugPanelProps} />
			</IframeChatLayout>
		);
	}

	// Render chat with SSE provider (session cookie enables SSE auth)
	return (
		<IframeChatLayout>
			<SSEProvider apiUrl={apiUrl} enabled={sessionReady}>
				<IframeChatContent
					conversationId={conversationId}
					titleText={titleText}
					placeholderText={placeholderText}
					welcomeText={welcomeText}
				/>
			</SSEProvider>
			<IframeToolbar
				onDownloadConversation={downloadConversation}
				onDownloadMetadata={downloadMetadata}
			/>
			<DebugPanel {...debugPanelProps} />
		</IframeChatLayout>
	);
}
