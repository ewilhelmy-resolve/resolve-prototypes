import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ritaToast } from "@/components/custom/rita-toast";
import { iframeApi } from "@/services/iframeApi";
import { useConversationStore } from "@/stores/conversationStore";
import type { UIActionPayload } from "@/types/uiSchema";
import { isInIframe, safePostToParent } from "@/utils/hostModal";
import type { ChatV2InteractiveCallbacks } from "./ChatV2MessageRenderer";
import { ChatV2MessageRenderer } from "./ChatV2MessageRenderer";

export interface ChatV2ContentProps {
	readOnly?: boolean;
	/** Override conversationId from store (used by iframe) */
	conversationId?: string | null;
	/** External form submit handler (iframe context) */
	onFormSubmit?: (
		requestId: string,
		action: string,
		data: Record<string, string>,
	) => Promise<void>;
	/** External form cancel handler (iframe context) */
	onFormCancel?: (requestId: string) => Promise<void>;
}

export const ChatV2Content = memo(
	({
		readOnly = false,
		conversationId: conversationIdProp,
		onFormSubmit: propsFormSubmit,
		onFormCancel: propsFormCancel,
	}: ChatV2ContentProps) => {
		const { t } = useTranslation(["toast"]);
		const chatMessages = useConversationStore((s) => s.chatMessages);
		const messages = useConversationStore((s) => s.messages);
		const storeConversationId = useConversationStore(
			(s) => s.currentConversationId,
		);
		const isStreaming = messages.some(
			(msg) => msg.status === "processing" || msg.status === "pending",
		);

		// Resolve conversationId: prop overrides store
		const conversationId = conversationIdProp ?? storeConversationId;

		// Copy with toast feedback
		const handleCopy = useCallback(
			async (text: string, _messageId: string) => {
				try {
					await navigator.clipboard.writeText(text);
					ritaToast.success({ title: t("toast:success.messageCopied") });
				} catch (_error) {
					ritaToast.error({ title: t("toast:error.copyFailed") });
				}
			},
			[t],
		);

		// Handle UI schema action callbacks (from dynamic UI components)
		const handleSchemaAction = useCallback(async (payload: UIActionPayload) => {
			console.log("[SchemaAction] Received action:", payload);

			// Check if we're in dev mode (mock, dev-*, demo-* session keys)
			const searchParams = new URLSearchParams(window.location.search);
			const sessionKey = searchParams.get("sessionKey") || "";
			const isMockMode = searchParams.get("mock") === "true";
			const isDevMode =
				isMockMode ||
				sessionKey.startsWith("dev-") ||
				sessionKey.startsWith("demo-");

			// Dispatch event for debug panel in dev mode
			if (isDevMode) {
				window.dispatchEvent(
					new CustomEvent("rita:ui-action", { detail: payload }),
				);
			}

			if (isMockMode) {
				// In mock mode, just log and show success - no backend call
				console.log("[SchemaAction] Mock mode - action payload:", payload);

				ritaToast.success({
					title: `Action: ${payload.action}`,
					description:
						payload.data && Object.keys(payload.data).length > 0
							? JSON.stringify(payload.data)
							: `messageId: ${payload.messageId}`,
					action: {
						label: "View Log",
						onClick: () =>
							window.dispatchEvent(new CustomEvent("rita:open-activity-log")),
					},
				});
				return;
			}

			try {
				// Send action to platform via backend API
				const response = await iframeApi.sendUIAction(payload);

				if (response.success) {
					ritaToast.success({
						title: "Action sent",
						description: payload.action,
						action: {
							label: "View Log",
							onClick: () =>
								window.dispatchEvent(new CustomEvent("rita:open-activity-log")),
						},
					});
				} else {
					ritaToast.error({
						title: "Action failed",
						description: response.error || "Unknown error",
					});
				}
			} catch (error) {
				console.error("[SchemaAction] Failed to send action:", error);
				ritaToast.error({
					title: "Action failed",
					description: error instanceof Error ? error.message : "Network error",
				});
			}
		}, []);

		// Mark a form request message as completed in the local store
		const markFormCompleted = useCallback(
			(requestId: string, action: string, data: Record<string, string>) => {
				const { messages: storeMessages, updateMessage } =
					useConversationStore.getState();
				const msg = storeMessages.find(
					(m) => m.metadata?.request_id === requestId,
				);
				if (msg) {
					updateMessage(msg.id, {
						metadata: {
							...msg.metadata,
							status: "completed",
							form_data: data,
							form_action: action,
							submitted_at: new Date().toISOString(),
						},
					});
				}
			},
			[],
		);

		// Handle form submission from inline UI form request
		const handleFormSubmit = useCallback(
			async (
				requestId: string,
				action: string,
				data: Record<string, string>,
			): Promise<void> => {
				console.log("[FormSubmit] Submitting form:", {
					requestId,
					action,
					data,
				});

				// Use props handler if provided (iframe context)
				if (propsFormSubmit) {
					await propsFormSubmit(requestId, action, data);
					markFormCompleted(requestId, action, data);
					return;
				}

				// Fallback: Send via iframeApi using form response endpoint
				try {
					const response = await iframeApi.submitUIFormResponse({
						requestId,
						action,
						status: "submitted",
						data,
					});

					if (response.success) {
						markFormCompleted(requestId, action, data);
						ritaToast.success({
							title: "Form submitted",
							description: action,
						});
					} else {
						throw new Error(response.error || "Unknown error");
					}
				} catch (error) {
					console.error("[FormSubmit] Failed:", error);
					ritaToast.error({
						title: "Form submission failed",
						description:
							error instanceof Error ? error.message : "Network error",
					});
					throw error;
				}
			},
			[propsFormSubmit, markFormCompleted],
		);

		// Handle form cancellation — dismiss only, don't mark as answered
		const handleFormCancel = useCallback(
			async (requestId: string): Promise<void> => {
				console.log("[FormCancel] Dismissing form:", requestId);

				// Use props handler if provided (iframe context)
				if (propsFormCancel) {
					await propsFormCancel(requestId);
				}
			},
			[propsFormCancel],
		);

		// Build interactive callbacks (only for non-readOnly mode)
		const interactive: ChatV2InteractiveCallbacks | undefined = readOnly
			? undefined
			: {
					onSchemaAction: handleSchemaAction,
					onFormSubmit: handleFormSubmit,
					onFormCancel: handleFormCancel,
					postToParent: safePostToParent,
					isInIframe: isInIframe(),
				};

		return (
			<ChatV2MessageRenderer
				chatMessages={chatMessages}
				isStreaming={isStreaming}
				readOnly={readOnly}
				onCopy={readOnly ? undefined : handleCopy}
				conversationId={conversationId}
				interactive={interactive}
			/>
		);
	},
);

ChatV2Content.displayName = "ChatV2Content";
