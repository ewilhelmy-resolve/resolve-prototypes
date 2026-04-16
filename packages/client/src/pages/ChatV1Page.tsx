/**
 * ChatV1Page - Modern chat page using shared RitaLayout and ai-elements
 *
 * Absorbs all page-level concerns from ChatV1Content:
 * - Knowledge base, permissions, feature flags
 * - Drag-and-drop, file upload
 * - Pagination (infinite scroll)
 * - Timeout override for incomplete turns
 * - Chat status mapping
 * - ChatInput + hidden file inputs
 * - Empty state (AskRitaEmptyState)
 * - Delegates message rendering to ChatV2Content
 */

import type { ChatStatus } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "../components/ai-elements/conversation";
import { Loader } from "../components/ai-elements/loader";
import type { PromptInputMessage } from "../components/ai-elements/prompt-input";
import { AskRitaEmptyState } from "../components/chat/AskRitaEmptyState";
import { ChatInput } from "../components/chat/ChatInput";
import { ChatV2Content } from "../components/chat/ChatV2Content";
import { ritaToast } from "../components/custom/rita-toast";
import RitaLayout from "../components/layouts/RitaLayout";
import { useSSEContext } from "../contexts/SSEContext";
import { useUploadFile } from "../hooks/api/useFiles";
import { useProfilePermissions } from "../hooks/api/useProfile";
import { useChatPagination } from "../hooks/useChatPagination";
import { useDragAndDrop } from "../hooks/useDragAndDrop";
import { useKnowledgeBase } from "../hooks/useKnowledgeBase";
import { useRitaChat } from "../hooks/useRitaChat";
import {
	SUPPORTED_DOCUMENT_TYPES,
	validateFileForUpload,
} from "../lib/constants";
import type { Message as RitaMessage } from "../stores/conversationStore";
import { useConversationStore } from "../stores/conversationStore";

/**
 * Map RITA's message status to ai-elements ChatStatus
 */
const mapRitaStatusToChatStatus = (
	isSending: boolean,
	isUploading: boolean,
	messages: RitaMessage[],
): ChatStatus => {
	if (isUploading || isSending) {
		return "submitted";
	}

	// Check if any message is in processing state
	const hasProcessingMessage = messages.some(
		(msg) => msg.status === "processing" || msg.status === "pending",
	);

	if (hasProcessingMessage) {
		return "streaming";
	}

	// Check if we're waiting for AI response after user sent a message
	const lastMessage = messages[messages.length - 1];
	if (lastMessage && lastMessage.role === "user") {
		const hasAssistantResponseAfter = messages.some(
			(msg) =>
				msg.role === "assistant" && msg.timestamp > lastMessage.timestamp,
		);

		if (!hasAssistantResponseAfter && lastMessage.status === "sent") {
			return "streaming";
		}
	}

	// Check if last assistant message indicates turn is not complete
	if (lastMessage && lastMessage.role === "assistant") {
		const turnComplete = lastMessage.metadata?.turn_complete;
		if (turnComplete === false) {
			return "streaming";
		}
	}

	// Check if last message failed
	if (lastMessage && lastMessage.status === "failed") {
		return "error";
	}

	return "ready";
};

export default function ChatV1Page() {
	const { conversationId } = useParams<{ conversationId?: string }>();
	const { latestUpdate } = useSSEContext();
	const { updateMessage, setCurrentConversation } = useConversationStore();
	const ritaChatState = useRitaChat();
	const { t } = useTranslation(["chat", "toast", "kbs"]);
	const navigate = useNavigate();

	// Timeout override state for incomplete turns
	const [timeoutOverride, setTimeoutOverride] = useState(false);

	// Track which conversation has been checked for incomplete turns
	const lastCheckedConvRef = useRef<string | null>(null);

	// Sync URL parameter with conversation store
	useEffect(() => {
		if (
			conversationId &&
			conversationId !== ritaChatState.currentConversationId
		) {
			setCurrentConversation(conversationId);
		} else if (!conversationId && ritaChatState.currentConversationId) {
			setCurrentConversation(null);
		}
	}, [
		conversationId,
		ritaChatState.currentConversationId,
		setCurrentConversation,
	]);

	// Handle SSE message updates
	useEffect(() => {
		if (latestUpdate) {
			updateMessage(latestUpdate.messageId, {
				status: latestUpdate.status,
				error_message: latestUpdate.errorMessage,
			});
		}
	}, [latestUpdate, updateMessage]);

	// Knowledge base for file upload
	const {
		openDocumentSelector,
		files,
		documentInputRef,
		handleDocumentUpload,
		uploadingFiles,
	} = useKnowledgeBase();

	// Check if there are any processed or uploaded files
	const hasProcessedOrUploadedFiles = files.some(
		(f) => f.status === "processed" || f.status === "uploaded",
	);

	// Check if user is admin/owner
	const { isOwnerOrAdmin } = useProfilePermissions();
	const isAdmin = isOwnerOrAdmin();

	// Get grouped messages from store
	const { chatMessages } = useConversationStore();

	// File upload mutation for drag-and-drop
	const uploadFileMutation = useUploadFile();

	// Handle drag-and-drop file upload
	const handleDragDropUpload = useCallback(
		(files: FileList) => {
			if (files.length === 0) return;

			Array.from(files).forEach((file) => {
				const validation = validateFileForUpload(file);
				if (!validation.isValid && validation.errorCode) {
					ritaToast.error({
						title: t(
							`kbs:errors.${validation.errorCode}.title`,
							validation.errorParams,
						),
						description: t(
							`kbs:errors.${validation.errorCode}.description`,
							validation.errorParams,
						),
					});
					return;
				}

				uploadFileMutation.mutate(file, {
					onSuccess: () => {
						ritaToast.success({
							title: t("toast:success.uploaded", { name: file.name }),
						});
					},
					onError: (error: any) => {
						ritaToast.error({
							title: t("toast:error.uploadFailed"),
							description: t("toast:descriptions.uploadFailedDesc", {
								name: file.name,
								error: error?.message || "Unknown error",
							}),
						});
					},
				});
			});
		},
		[uploadFileMutation, t],
	);

	// Drag-and-drop with file upload functionality (disabled for all users)
	// TODO: Re-enable when backend support is ready (set enabled to: !uploadStatus.isUploading && isAdmin)
	/* const { isDragging } = */ useDragAndDrop({
		enabled: false,
		accept: SUPPORTED_DOCUMENT_TYPES,
		maxFiles: 5,
		maxFileSize: 10 * 1024 * 1024, // 10MB
		onDrop: handleDragDropUpload,
		onError: (error) =>
			ritaToast.error({
				title: t("toast:error.uploadError"),
				description: error,
			}),
	});

	// Scroll container ref for pagination
	const scrollContainerRef = useRef<HTMLElement | null>(null);

	// Callback to capture scrollRef from StickToBottom's contextRef
	const handleStickToBottomContext = useCallback((context: any) => {
		if (context?.scrollRef?.current) {
			scrollContainerRef.current = context.scrollRef.current;
		}
	}, []);

	// Pagination hook for infinite scroll
	const { sentinelRef, isLoadingMore, hasMore, hasPaginationAttempted } =
		useChatPagination({
			conversationId: ritaChatState.currentConversationId,
			scrollContainerRef,
			enabled: !!ritaChatState.currentConversationId && chatMessages.length > 0,
		});

	// Determine chat status
	const chatStatus = mapRitaStatusToChatStatus(
		ritaChatState.isSending,
		ritaChatState.uploadStatus.isUploading,
		ritaChatState.messages,
	);

	// 30-second timeout for incomplete turns
	useEffect(() => {
		setTimeoutOverride(false);

		if (chatStatus === "streaming") {
			const timeoutId = setTimeout(() => {
				ritaToast.warning({ title: t("toast:warning.responseTimeout") });
				setTimeoutOverride(true);
			}, 30000);

			return () => clearTimeout(timeoutId);
		}
	}, [chatStatus, t]);

	// Check for incomplete conversation on navigation
	useEffect(() => {
		if (!ritaChatState.currentConversationId || !ritaChatState.messages.length)
			return;

		// Only check once per conversation
		if (lastCheckedConvRef.current === ritaChatState.currentConversationId)
			return;
		lastCheckedConvRef.current = ritaChatState.currentConversationId;

		const lastMsg = ritaChatState.messages[ritaChatState.messages.length - 1];
		const isIncomplete =
			lastMsg.role === "user" ||
			(lastMsg.role === "assistant" &&
				lastMsg.metadata?.turn_complete === false);

		if (isIncomplete) {
			setTimeoutOverride(true);
		}
	}, [ritaChatState.currentConversationId, ritaChatState.messages]);

	// Determine if input should be disabled
	const isInputDisabled =
		!timeoutOverride &&
		(chatStatus === "streaming" ||
			chatStatus === "submitted" ||
			!hasProcessedOrUploadedFiles);

	// Handle form submission from PromptInput
	const handlePromptSubmit = useCallback(
		async (message: PromptInputMessage) => {
			const hasText = Boolean(message.text);
			const hasAttachments = Boolean(message.files?.length);

			if (!(hasText || hasAttachments)) {
				return;
			}

			if (message.text) {
				ritaChatState.handleMessageChange(message.text);
			}

			if (message.files && message.files.length > 0) {
				const fileEvent = {
					target: {
						files: message.files as any,
					},
				} as React.ChangeEvent<HTMLInputElement>;

				ritaChatState.handleFileUpload(fileEvent);
			}

			setTimeout(async () => {
				await ritaChatState.handleSendMessage();
			}, 0);
		},
		[ritaChatState],
	);

	return (
		<RitaLayout activePage="chat">
			<div className="h-full flex flex-col relative">
				<Conversation
					className="flex-1"
					contextRef={handleStickToBottomContext}
				>
					<ConversationContent className="px-6 py-6">
						<div className="max-w-4xl mx-auto">
							{ritaChatState.messagesLoading ? (
								<div className="flex items-center justify-center h-full">
									<Loader size={24} />
								</div>
							) : !ritaChatState.currentConversationId ||
								chatMessages.length === 0 ? (
								<div className="min-h-[60vh] flex items-center justify-center">
									<AskRitaEmptyState
										hasKnowledge={hasProcessedOrUploadedFiles}
										onUpload={openDocumentSelector}
										onConnections={() => navigate("/settings/connections")}
									/>
								</div>
							) : (
								<>
									{/* Intersection Observer sentinel for infinite scroll */}
									<div ref={sentinelRef} className="h-1" />

									{/* Loading indicator for pagination */}
									{isLoadingMore && (
										<div className="flex justify-center py-4">
											<Loader size={16} />
											<span className="ml-2 text-sm text-gray-500">
												{t("chat:messages.loadingOlder")}
											</span>
										</div>
									)}

									{/* "Beginning of conversation" indicator */}
									{!hasMore &&
										!isLoadingMore &&
										chatMessages.length > 0 &&
										hasPaginationAttempted && (
											<div className="flex justify-center py-4">
												<span className="text-sm text-gray-400">
													{t("chat:messages.beginningOfConversation")}
												</span>
											</div>
										)}

									{/* Render messages via ChatV2Content */}
									<ChatV2Content
										conversationId={ritaChatState.currentConversationId}
									/>
								</>
							)}
						</div>
					</ConversationContent>
					<ConversationScrollButton />
				</Conversation>

				{/* Modern input using ChatInput */}
				<ChatInput
					value={ritaChatState.messageValue}
					placeholder={t("chat:input.placeholder")}
					chatStatus={chatStatus}
					disabled={isInputDisabled}
					showNoKnowledgeWarning={!hasProcessedOrUploadedFiles}
					isAdmin={isAdmin}
					onChange={ritaChatState.handleMessageChange}
					onSubmit={handlePromptSubmit}
					fileUpload={{
						accept: undefined,
						multiple: false,
						maxFiles: undefined,
						maxFileSize: undefined,
					}}
				/>

				{/* Hidden file input for chat message attachments (currently disabled) */}
				<input
					ref={ritaChatState.fileInputRef}
					type="file"
					className="hidden"
					onChange={ritaChatState.handleFileUpload}
					accept={SUPPORTED_DOCUMENT_TYPES}
					disabled={ritaChatState.uploadStatus.isUploading}
					multiple
				/>

				{/* Hidden file input for knowledge base uploads (empty state & navbar) */}
				<input
					ref={documentInputRef}
					type="file"
					className="hidden"
					onChange={handleDocumentUpload}
					accept={SUPPORTED_DOCUMENT_TYPES}
					multiple
					disabled={uploadingFiles.size > 0}
				/>
			</div>
		</RitaLayout>
	);
}
