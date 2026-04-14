import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { createContext, useCallback, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import i18n from "@/i18n";
import { errorI18nKey } from "../components/connection-sources/utils";
import { ritaToast } from "../components/custom/rita-toast";
import { agentKeys } from "../hooks/api/useAgents";
import { type FileDocument, fileKeys } from "../hooks/api/useFiles";
import { memberKeys } from "../hooks/api/useMembers";
import { profileKeys } from "../hooks/api/useProfile";
import { mlModelKeys } from "../hooks/useActiveModel";
import { clusterKeys } from "../hooks/useClusters";
import { dataSourceKeys, ingestionRunKeys } from "../hooks/useDataSources";
import { useSSE } from "../hooks/useSSE";
import type { SSEEvent } from "../services/EventSourceSSEClient";
import { useAgentCreationStore } from "../stores/agentCreationStore";
import type { Message } from "../stores/conversationStore";
import { useConversationStore } from "../stores/conversationStore";
import { useFeatureFlagsStore } from "../stores/feature-flags-store";
import { useKnowledgeGenerationStore } from "../stores/knowledgeGenerationStore";
import {
	DEFAULT_MINIMUM_TICKETS,
	type IngestionRun,
} from "../types/dataSource";

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
			// Log all SSE events clearly to console for debugging
			console.log(
				`%c[SSE] ⬇️ ${event.type}`,
				"color: #10b981; font-weight: bold",
				{
					type: event.type,
					...event.data,
					// Highlight routing fields
					_routing: {
						conversationId: event.data.conversationId,
						userId: event.data.userId,
						messageId: event.data.messageId,
					},
				},
			);

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
					console.warn(
						"[SSE] Received new_message event without conversationId",
						{
							messageId: event.data.messageId,
						},
					);
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
					status:
						event.data.metadata?.type === "ui_form_request"
							? "pending"
							: "completed",
				};

				addMessage(newMessage);

				// Interrupt form modals (interrupt=true) are triggered by
				// InterruptFormDialog on render via triggerHostModal().
				// That handles all tiers: same-origin injection, cross-origin ACK, and
				// in-iframe Dialog fallback.
			} else if (event.type === "data_source_update") {
				// Handle data source connection updates (verification, sync status changes)
				// Determine update type based on which fields are present
				const updateType = event.data.last_verification_at
					? "verification"
					: event.data.last_sync_status
						? "sync"
						: "unknown";

				// Invalidate TanStack Query cache to trigger automatic refetch
				queryClient.invalidateQueries({ queryKey: dataSourceKeys.list() });
				queryClient.invalidateQueries({
					queryKey: dataSourceKeys.detail(event.data.connection_id),
				});

				// Show toast notification for verification failures
				if (
					updateType === "verification" &&
					event.data.last_verification_error
				) {
					const connectionType = event.data.connection_type || "Data source";
					const verifyError = event.data.last_verification_error;
					const verifyI18nKey = verifyError ? errorI18nKey(verifyError) : null;
					ritaToast.error({
						title: i18n.t("error.verificationFailed", {
							type: connectionType,
							ns: "toast",
						}),
						description: verifyI18nKey
							? i18n.t(verifyI18nKey, { ns: "connections" })
							: verifyError || "Failed to verify connection",
						action: {
							label: "View",
							onClick: () => navigate("/settings/connections"),
						},
					});
				}

				// Show toast notification for sync events
				if (updateType === "sync" && event.data.last_sync_status) {
					const connectionType = event.data.connection_type || "Data source";
					const syncStatus = event.data.last_sync_status;

					if (syncStatus === "completed") {
						ritaToast.success({
							title: i18n.t("success.syncComplete", {
								type: connectionType,
								ns: "toast",
							}),
							action: {
								label: "View",
								onClick: () => navigate("/settings/connections"),
							},
						});
					} else if (syncStatus === "failed") {
						const syncError = event.data.last_sync_error;
						const credI18nKey = syncError ? errorI18nKey(syncError) : null;
						const description = credI18nKey
							? i18n.t(credI18nKey, { ns: "connections" })
							: syncError || "An error occurred";

						ritaToast.error({
							title: `${i18n.t("error.syncFailed", { ns: "toast" })}: ${connectionType}`,
							description,
							action: {
								label: "View",
								onClick: () => navigate("/settings/connections"),
							},
						});
					}
				}
			} else if (event.type === "document_update") {
				// Handle document processing status updates
				const processingKey = "rita-processing-files";
				const stored = sessionStorage.getItem(processingKey);
				const isBatchUpload = !!stored;

				// Update document status in cache (no refetch)
				queryClient.setQueriesData<{
					documents: FileDocument[];
					total: number;
					limit: number;
					offset: number;
				}>({ queryKey: fileKeys.lists() }, (oldData) => {
					if (!oldData) return oldData;
					return {
						...oldData,
						documents: oldData.documents.map((doc) =>
							doc.filename === event.data.filename
								? { ...doc, status: event.data.status }
								: doc,
						),
					};
				});

				// If not a batch upload, refetch immediately for single file updates
				if (!isBatchUpload) {
					queryClient.invalidateQueries({
						queryKey: fileKeys.lists(),
						refetchType: "active",
					});
				}

				// Track processing results in sessionStorage for summary toast
				try {
					if (stored) {
						const data = JSON.parse(stored);
						const status = event.data.status;

						// Update counts based on status
						if (status === "processed") {
							data.processed = (data.processed || 0) + 1;
						} else if (status === "failed") {
							data.failed = (data.failed || 0) + 1;
						}
						// Ignore other statuses (processing, pending, etc.)

						// Save updated counts
						sessionStorage.setItem(processingKey, JSON.stringify(data));

						// Check if all files processed AND uploads are complete
						const total = data.total || 0;
						const allProcessed =
							total > 0 && data.processed + data.failed >= total;

						if (allProcessed && !data.uploading) {
							const processed = data.processed || 0;
							const failed = data.failed || 0;
							const duplicates = data.duplicates || 0;

							// Final refetch to sync with server after batch completes
							queryClient.invalidateQueries({
								queryKey: fileKeys.lists(),
								refetchType: "active",
							});

							// Build description with duplicates if any
							const duplicateMsg =
								duplicates > 0
									? `, ${duplicates} duplicate${duplicates > 1 ? "s" : ""} skipped`
									: "";

							// Show appropriate toast based on results
							if (processed > 0 && failed === 0 && duplicates === 0) {
								ritaToast.success({
									title: i18n.t("success.processingComplete", { ns: "toast" }),
									description:
										processed === 1
											? i18n.t("descriptions.fileProcessed", { ns: "toast" })
											: i18n.t("descriptions.allFilesProcessed", {
													ns: "toast",
												}),
								});
							} else if (processed > 0 && failed === 0 && duplicates > 0) {
								ritaToast.success({
									title: i18n.t("success.processingComplete", { ns: "toast" }),
									description: i18n.t("descriptions.filesProcessedDuplicates", {
										count: processed,
										duplicates,
										ns: "toast",
									}),
								});
							} else if (processed === 0 && failed > 0) {
								ritaToast.error({
									title: i18n.t("error.processingFailed", { ns: "toast" }),
									description:
										failed === 1
											? `${i18n.t("descriptions.fileFailed", { ns: "toast" })}${duplicateMsg}`
											: `${i18n.t("descriptions.allFilesFailed", { ns: "toast" })}${duplicateMsg}`,
								});
							} else if (processed > 0 && failed > 0) {
								ritaToast.warning({
									title: i18n.t("warning.processingPartial", { ns: "toast" }),
									description: `${i18n.t("descriptions.processingPartial", { processed, failed, ns: "toast" })}${duplicateMsg}`,
								});
							}

							sessionStorage.removeItem(processingKey);
						}
					}
				} catch (e) {
					console.error("[SSE] Error processing document_update:", e);
				}
			} else if (event.type === "organization_update") {
				// Invalidate profile cache to refetch with updated data
				queryClient.invalidateQueries({ queryKey: profileKeys.detail() });

				// Show toast notification based on update type
				if (event.data.updateType === "name") {
					ritaToast.success({
						title: i18n.t("success.organizationUpdated", { ns: "toast" }),
					});
				} else if (event.data.updateType === "role") {
					ritaToast.info({
						title: i18n.t("info.roleUpdated", { ns: "toast" }),
						description: i18n.t("descriptions.permissionsChanged", {
							ns: "toast",
						}),
					});
				} else if (event.data.updateType === "settings") {
					ritaToast.success({
						title: i18n.t("success.settingsUpdated", { ns: "toast" }),
					});
				}
			} else if (event.type === "member_role_updated") {
				// Invalidate member lists to refetch
				queryClient.invalidateQueries({ queryKey: memberKeys.lists() });

				// Check if the update affects the current user
				const profile = queryClient.getQueryData(profileKeys.detail()) as any;
				if (profile?.user?.id === event.data.userId) {
					// Current user's role was changed
					queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
					ritaToast.info({
						title: i18n.t("info.roleUpdated", { ns: "toast" }),
						description: i18n.t("descriptions.roleUpdatedDesc", {
							role: event.data.newRole,
							ns: "toast",
						}),
					});
				} else {
					// Another member's role was changed
					ritaToast.success({
						title: i18n.t("success.memberRoleUpdated", { ns: "toast" }),
						description: i18n.t("descriptions.memberRoleUpdatedDesc", {
							email: event.data.userEmail,
							role: event.data.newRole,
							ns: "toast",
						}),
					});
				}
			} else if (event.type === "member_status_updated") {
				// Invalidate member lists to refetch
				queryClient.invalidateQueries({ queryKey: memberKeys.lists() });

				// Check if the update affects the current user
				const profile = queryClient.getQueryData(profileKeys.detail()) as any;
				if (profile?.user?.id === event.data.userId) {
					// Current user was deactivated/activated
					queryClient.invalidateQueries({ queryKey: profileKeys.detail() });

					if (!event.data.isActive) {
						// User was deactivated - force logout
						ritaToast.error({
							title: i18n.t("error.accountDeactivated", { ns: "toast" }),
							description: i18n.t("descriptions.contactAdmin", { ns: "toast" }),
						});
						setTimeout(() => {
							window.location.href = "/logout";
						}, 2000);
					} else {
						ritaToast.success({
							title: i18n.t("success.accountActivated", { ns: "toast" }),
						});
					}
				} else {
					// Another member's status was changed
					const status = event.data.isActive ? "activated" : "deactivated";
					ritaToast.info({
						title: i18n.t("info.memberStatusChanged", { status, ns: "toast" }),
						description: i18n.t("descriptions.memberStatus", {
							email: event.data.userEmail,
							status,
							ns: "toast",
						}),
					});
				}
			} else if (event.type === "member_removed") {
				// Invalidate member lists to refetch
				queryClient.invalidateQueries({ queryKey: memberKeys.lists() });

				// Check if the removed member is the current user
				const profile = queryClient.getQueryData(profileKeys.detail()) as any;
				if (profile?.user?.id === event.data.userId) {
					// Current user was removed - force logout
					ritaToast.error({
						title: i18n.t("error.removedFromOrg", { ns: "toast" }),
					});
					setTimeout(() => {
						window.location.href = "/logout";
					}, 2000);
				} else {
					// Another member was removed
					ritaToast.info({
						title: i18n.t("info.memberRemoved", { ns: "toast" }),
						description: i18n.t("descriptions.memberRemovedDesc", {
							email: event.data.userEmail,
							ns: "toast",
						}),
					});
				}
			} else if (event.type === "ingestion_run_update") {
				// Handle ITSM Autopilot ticket sync updates
				if (event.data.status === "running") {
					// Optimistic cache update for progress
					queryClient.setQueryData<IngestionRun | null>(
						ingestionRunKeys.latest(event.data.connection_id),
						(old) => {
							if (!old) return old;
							return {
								...old,
								records_processed:
									event.data.records_processed ?? old.records_processed,
								records_failed: event.data.records_failed ?? old.records_failed,
								metadata: {
									...old.metadata,
									progress: event.data.total_estimated
										? { total_estimated: event.data.total_estimated }
										: old.metadata?.progress,
								},
							};
						},
					);
				} else {
					// Final status - invalidate to refetch
					queryClient.invalidateQueries({
						queryKey: ingestionRunKeys.latest(event.data.connection_id),
					});

					if (event.data.status === "completed") {
						// Refresh ticket dashboard data (clusters, totals, counts)
						queryClient.invalidateQueries({
							queryKey: clusterKeys.all,
						});
						// New tickets may trigger model retraining
						queryClient.invalidateQueries({
							queryKey: mlModelKeys.active(),
						});

						const isOnTicketsPage =
							window.location.pathname.startsWith("/tickets");

						ritaToast.success({
							title: i18n.t("success.ticketSyncComplete", { ns: "toast" }),
							description: i18n.t("descriptions.ticketsProcessed", {
								count: event.data.records_processed ?? 0,
								ns: "toast",
							}),
							...(!isOnTicketsPage && {
								action: {
									label: i18n.t("actions.viewTickets", { ns: "toast" }),
									onClick: () => navigate("/tickets"),
								},
							}),
						});
					} else if (event.data.status === "failed") {
						if (event.data.error_message === "tickets_below_threshold") {
							ritaToast.error({
								title: i18n.t("error.ticketsBelowThreshold", {
									ns: "toast",
								}),
								description: i18n.t("descriptions.ticketsBelowThreshold", {
									count: event.data.error_detail?.current_total_tickets ?? 0,
									minimum:
										event.data.error_detail?.needed_total_tickets ??
										DEFAULT_MINIMUM_TICKETS,
									ns: "toast",
								}),
							});
						} else if (event.data.error_message) {
							const credKey = errorI18nKey(event.data.error_message);
							if (credKey) {
								ritaToast.error({
									title: i18n.t("syncError.credentialFailedTitle", {
										ns: "connections",
									}),
									description: i18n.t(credKey, {
										ns: "connections",
									}),
								});
							} else {
								ritaToast.error({
									title: i18n.t("error.ticketSyncFailed", {
										ns: "toast",
									}),
									description: event.data.error_message || "An error occurred",
								});
							}
						}
					}
				}
			} else if (event.type === "feature_flag_update") {
				// Handle real-time feature flag updates from relay proxy
				const { platformFlags } = useFeatureFlagsStore.getState();
				const flagName = event.data.flagName;
				const isEnabled = event.data.isEnabled;

				useFeatureFlagsStore.setState({
					platformFlags: {
						...platformFlags,
						[flagName]: isEnabled,
					},
				});

				ritaToast.info({
					title: i18n.t("info.featureFlagUpdated", { ns: "toast" }),
					description: i18n.t("descriptions.featureFlagDesc", {
						flag: flagName,
						status: isEnabled ? "enabled" : "disabled",
						ns: "toast",
					}),
				});
			} else if (event.type === "cluster_knowledge_generated") {
				const store = useKnowledgeGenerationStore.getState();
				if (event.data.generation_id === store.generationId) {
					if (event.data.error || !event.data.content) {
						store.receiveError(
							event.data.error || "Received empty article content",
						);
					} else {
						store.receiveResult({
							content: event.data.content,
							filename: event.data.filename || "knowledge-article.md",
						});
					}
				}
			} else if (event.type === "dynamic_workflow") {
				// Dispatch custom event for WorkflowsPage to handle
				const workflowEvent = new CustomEvent("workflow:event", {
					detail: event.data,
				});
				window.dispatchEvent(workflowEvent);
			} else if (event.type === "agent_creation_progress") {
				const store = useAgentCreationStore.getState();
				if (event.data.creation_id === store.creationId) {
					store.receiveProgress({
						stepType: event.data.step_type,
						stepLabel: event.data.step_label,
						stepDetail: event.data.step_detail,
						stepIndex: event.data.step_index,
						totalSteps: event.data.total_steps,
						timestamp: event.data.timestamp,
					});
				}
			} else if (event.type === "agent_creation_input_required") {
				const store = useAgentCreationStore.getState();
				if (event.data.creation_id === store.creationId) {
					store.receiveInputRequired(
						event.data.message,
						event.data.execution_id,
					);
				}
			} else if (event.type === "agent_creation_completed") {
				const store = useAgentCreationStore.getState();
				if (event.data.creation_id === store.creationId) {
					store.receiveResult({
						agentId: event.data.agent_id,
						agentName: event.data.agent_name,
					});
					queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
				}
			} else if (event.type === "agent_creation_failed") {
				const store = useAgentCreationStore.getState();
				if (event.data.creation_id === store.creationId) {
					store.receiveError(event.data.error || "Agent creation failed");
				}
			}
			// Note: ui_form_request events are now handled via new_message with metadata.type = 'ui_form_request'
			// The form request detection happens in the new_message handler above
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
