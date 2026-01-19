/**
 * useIframeMessaging - Handle postMessage communication with host page
 *
 * Enables host page (Jarvis) to send commands to RITA Go iframe.
 * Used only in IframeChatPage for embedded chat scenarios.
 *
 * Protocol:
 * - Host → Iframe: SEND_MESSAGE, GET_STATUS, CLEAR_CHAT
 * - Iframe → Host: READY, ACK, STATUS
 *
 * Note: Workflow execution is handled via hashkey URL param, not postMessage.
 * Host stores payload in Valkey, passes hashkey in URL, backend fetches & executes.
 */

import { useCallback, useEffect, useRef } from "react";

// Message types from host page
export interface IframeInboundMessage {
	type: "SEND_MESSAGE" | "GET_STATUS" | "CLEAR_CHAT";
	payload?: {
		// For SEND_MESSAGE
		content?: string;
		chatSessionId?: string; // Jarvis workflow tab ID
		tabInstanceId?: string; // Jarvis user connection ID
	};
	requestId?: string; // For ACK tracking
}

// Message types to host page
export interface IframeOutboundMessage {
	type: "READY" | "ACK" | "STATUS";
	requestId?: string;
	success?: boolean;
	error?: string;
	data?: Record<string, unknown>;
}

// Metadata extracted from host message
export interface HostMessageMetadata {
	chatSessionId?: string;
	tabInstanceId?: string;
}

interface UseIframeMessagingOptions {
	enabled?: boolean;
	allowedOrigins?: string[]; // Empty = same-origin only
	onSendMessage?: (
		content: string,
		metadata: HostMessageMetadata
	) => Promise<void>;
	onGetStatus?: () => Record<string, unknown>;
	onClearChat?: () => void;
}

/**
 * Post message to parent window (host page)
 * Uses '*' in dev mode for cross-port testing, same-origin in production
 */
function postToParent(message: IframeOutboundMessage): void {
	if (window.parent && window.parent !== window) {
		// In dev mode, allow cross-origin for testing (different ports)
		// In production, same-domain deployment means same origin
		const targetOrigin = import.meta.env.DEV ? "*" : window.location.origin;
		window.parent.postMessage(message, targetOrigin);
	}
}

/**
 * Check if origin is allowed
 */
function isAllowedOrigin(origin: string, allowedOrigins: string[]): boolean {
	// In dev mode, allow any origin for cross-port testing
	if (import.meta.env.DEV) {
		return true;
	}
	// If no origins specified, allow same-origin only
	if (allowedOrigins.length === 0) {
		return origin === window.location.origin;
	}
	// Check against allowed list
	return allowedOrigins.includes(origin) || allowedOrigins.includes("*");
}

/**
 * Hook to handle postMessage communication with host page
 */
export function useIframeMessaging({
	enabled = true,
	allowedOrigins = [],
	onSendMessage,
	onGetStatus,
	onClearChat,
}: UseIframeMessagingOptions = {}): {
	postToParent: (message: IframeOutboundMessage) => void;
	isInIframe: boolean;
} {
	const isInIframe = window.parent !== window;
	const readySentRef = useRef(false);

	const handleMessage = useCallback(
		async (event: MessageEvent<IframeInboundMessage>) => {
			// Validate origin
			if (!isAllowedOrigin(event.origin, allowedOrigins)) {
				console.warn("[IframeMessaging] Blocked message from:", event.origin);
				return;
			}

			// Validate message structure
			const { type, payload, requestId } = event.data || {};
			if (!type) return;

			console.log("[IframeMessaging] Received:", type, payload);

			switch (type) {
				case "SEND_MESSAGE":
					if (onSendMessage && payload?.content) {
						try {
							await onSendMessage(payload.content, {
								chatSessionId: payload.chatSessionId,
								tabInstanceId: payload.tabInstanceId,
							});
							postToParent({ type: "ACK", requestId, success: true });
						} catch (error) {
							const errorMessage =
								error instanceof Error ? error.message : "Unknown error";
							postToParent({
								type: "ACK",
								requestId,
								success: false,
								error: errorMessage,
							});
						}
					} else {
						postToParent({
							type: "ACK",
							requestId,
							success: false,
							error: "No content or handler",
						});
					}
					break;

				case "GET_STATUS":
					if (onGetStatus) {
						const status = onGetStatus();
						postToParent({ type: "STATUS", requestId, data: status });
					}
					break;

				case "CLEAR_CHAT":
					if (onClearChat) {
						onClearChat();
						postToParent({ type: "ACK", requestId, success: true });
					}
					break;

				default:
					console.warn("[IframeMessaging] Unknown message type:", type);
			}
		},
		[allowedOrigins, onSendMessage, onGetStatus, onClearChat]
	);

	useEffect(() => {
		if (!enabled || !isInIframe) return;

		window.addEventListener("message", handleMessage);

		// Send READY signal once
		if (!readySentRef.current) {
			readySentRef.current = true;
			postToParent({ type: "READY" });
			console.log("[IframeMessaging] Sent READY to host");
		}

		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, [enabled, isInIframe, handleMessage]);

	return {
		postToParent,
		isInIframe,
	};
}
