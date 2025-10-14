import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { createContext, useCallback, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fileKeys } from "../hooks/api/useFiles";
import { dataSourceKeys } from "../hooks/useDataSources";
import { profileKeys } from "../hooks/api/useProfile";
import { useSSE } from "../hooks/useSSE";
import { toast } from "../lib/toast";
import type { SSEEvent } from "../services/EventSourceSSEClient";
import type { Message } from "../stores/conversationStore";
import { useConversationStore } from "../stores/conversationStore";

interface MessageUpdate {
	messageId: string;
	status: "pending" | "processing" | "completed" | "failed";
	responseContent?: string;
	errorMessage?: string;
	timestamp: Date;
}

interface SSEContextValue {
	isConnected: boolean;
	messageUpdates: MessageUpdate[];
	latestUpdate: MessageUpdate | null;
	connect: () => void;
	disconnect: () => void;
	reconnect: () => void;
	clearUpdates: () => void;
}

const SSEContext = createContext<SSEContextValue | null>(null);

interface SSEProviderProps {
	children: React.ReactNode;
	apiUrl: string;
	enabled?: boolean;
}

export const SSEProvider: React.FC<SSEProviderProps> = ({
	children,
	apiUrl,
	enabled = true,
}) => {
	const [messageUpdates, setMessageUpdates] = useState<MessageUpdate[]>([]);
	const [latestUpdate, setLatestUpdate] = useState<MessageUpdate | null>(null);
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const handleMessage = useCallback(
		(event: SSEEvent) => {
			if (event.type === "message_update") {
				const update: MessageUpdate = {
					messageId: event.data.messageId,
					status: event.data.status,
					responseContent: event.data.responseContent,
					errorMessage: event.data.errorMessage,
					timestamp: new Date(),
				};

				setLatestUpdate(update);
				setMessageUpdates((prev) => {
					// Keep only the last 100 updates to prevent memory issues
					const newUpdates = [update, ...prev].slice(0, 100);
					return newUpdates;
				});
			} else if (event.type === "new_message") {
				// Handle new assistant messages with hybrid data
				const { addMessage, currentConversationId } =
					useConversationStore.getState();

				// Validate that message belongs to the current conversation
				if (!event.data.conversationId) {
					console.warn("[SSE] Received new_message event without conversationId", {
						messageId: event.data.messageId,
					});
					return;
				}

				if (event.data.conversationId !== currentConversationId) {
					console.log("[SSE] Ignoring message from different conversation", {
						messageConversation: event.data.conversationId,
						currentConversation: currentConversationId,
						messageId: event.data.messageId,
					});
					return;
				}

				const newMessage: Message = {
					id: event.data.messageId,
					role: event.data.role || "assistant",
					message: event.data.message || "",
					metadata: event.data.metadata,
					response_group_id: event.data.response_group_id,
					timestamp: new Date(event.data.createdAt),
					conversation_id: event.data.conversationId,
					status: "completed",
				};

				addMessage(newMessage);
			} else if (event.type === "data_source_update") {
				// Handle data source connection updates (verification, sync status changes)
				// Determine update type based on which fields are present
				const updateType = event.data.last_verification_at
					? "verification"
					: event.data.last_sync_status
						? "sync"
						: "unknown";

				console.log("[SSE] Data source update received:", {
					updateType,
					connectionId: event.data.connection_id,
					status: event.data.status,
					last_sync_status: event.data.last_sync_status,
					last_verification_at: event.data.last_verification_at,
					latest_options: event.data.latest_options,
				});

				// Invalidate TanStack Query cache to trigger automatic refetch
				queryClient.invalidateQueries({ queryKey: dataSourceKeys.list() });
				queryClient.invalidateQueries({
					queryKey: dataSourceKeys.detail(event.data.connection_id),
				});

				// Show toast notification for sync events only (not verification)
				if (updateType === "sync" && event.data.last_sync_status) {
					const connectionType = event.data.connection_type || "Data source";
					const syncStatus = event.data.last_sync_status;

					if (syncStatus === "completed") {
						toast.success(`${connectionType} sync complete`, {
							action: {
								label: "View",
								onClick: () => navigate("/settings/connections"),
							},
						});
					} else if (syncStatus === "failed") {
						toast.error(`${connectionType} sync failed`, {
							description: event.data.last_sync_error || "An error occurred",
							action: {
								label: "View",
								onClick: () => navigate("/settings/connections"),
							},
						});
					}
				}
			} else if (event.type === "document_update") {
				// Handle document processing status updates
				console.log("[SSE] Document update received:", {
					blobMetadataId: event.data.blob_metadata_id,
					filename: event.data.filename,
					status: event.data.status,
				});

				// Invalidate TanStack Query cache to trigger automatic refetch
				queryClient.invalidateQueries({ queryKey: fileKeys.lists() });

				// Show toast notification for processing completion/failure
				if (event.data.status === "processed") {
					toast.success(`${event.data.filename} processed successfully`, {
						action: {
							label: "View",
							onClick: () => navigate("/content"),
						},
					});
				} else if (event.data.status === "failed") {
					toast.error(`${event.data.filename} processing failed`, {
						description: event.data.error_message || "An error occurred",
						action: {
							label: "View",
							onClick: () => navigate("/content"),
						},
					});
				}
			} else if (event.type === "organization_update") {
				// Handle organization updates (name changes, role changes, etc.)
				console.log("[SSE] Organization update received:", {
					updateType: event.data.updateType,
					organizationId: event.data.organizationId,
				});

				// Invalidate profile cache to refetch with updated data
				queryClient.invalidateQueries({ queryKey: profileKeys.detail() });

				// Show toast notification based on update type
				if (event.data.updateType === "name") {
					toast.info("Organization name updated");
				} else if (event.data.updateType === "role") {
					toast.info("Your role has been updated", {
						description: "Your permissions may have changed",
					});
				} else if (event.data.updateType === "settings") {
					toast.info("Organization settings updated");
				}
			}
		},
		[navigate, queryClient],
	);

	const handleError = useCallback((error: any) => {
		console.error("SSE connection error:", error);
	}, []);

	const handleOpen = useCallback(() => {
		console.log("SSE connection opened");
	}, []);

	const handleClose = useCallback(() => {
		console.log("SSE connection closed");
	}, []);

	const sseUrl = `${apiUrl}/api/sse/events`;

	const { isConnected, connect, disconnect, reconnect } = useSSE({
		url: sseUrl,
		onMessage: handleMessage,
		onError: handleError,
		onOpen: handleOpen,
		onClose: handleClose,
		enabled,
	});

	const clearUpdates = useCallback(() => {
		setMessageUpdates([]);
		setLatestUpdate(null);
	}, []);

	const contextValue: SSEContextValue = {
		isConnected,
		messageUpdates,
		latestUpdate,
		connect,
		disconnect,
		reconnect,
		clearUpdates,
	};

	return (
		<SSEContext.Provider value={contextValue}>{children}</SSEContext.Provider>
	);
};

export const useSSEContext = (): SSEContextValue => {
	const context = useContext(SSEContext);
	if (!context) {
		throw new Error("useSSEContext must be used within an SSEProvider");
	}
	return context;
};
