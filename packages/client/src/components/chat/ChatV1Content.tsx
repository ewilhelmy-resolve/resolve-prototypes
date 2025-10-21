/**
 * ChatV1ContentAI - Chat content component using ai-elements library
 *
 * This is a modern replacement for ChatV1Content.tsx that uses the ai-elements
 * component library for a more sophisticated chat experience with markdown
 * support, better accessibility, and advanced features.
 */

"use client";

import type { ChatStatus } from "ai";
import { CheckIcon, CopyIcon /* , PaperclipIcon */ } from "lucide-react";
import { Fragment, useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Action, Actions } from "@/components/ai-elements/actions";
import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
	PromptInput,
	PromptInputAttachment,
	PromptInputAttachments,
	PromptInputBody,
	// PromptInputButton, // TODO: Uncomment when re-enabling attachment button
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputToolbar,
	PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Response } from "@/components/ai-elements/response";
import {
	Task,
	TaskContent,
	TaskItem,
	TaskTrigger,
} from "@/components/ai-elements/task";
import { Citations } from "@/components/citations";
import { useChatPagination } from "@/hooks/useChatPagination";
import type { RitaChatState } from "@/hooks/useRitaChat";
import type {
	GroupedChatMessage,
	Message as RitaMessage,
	SimpleChatMessage,
} from "@/stores/conversationStore";
import { useConversationStore } from "@/stores/conversationStore";
import { ResponseWithInlineCitations } from "./ResponseWithInlineCitations";
// import { DragDropOverlay } from "./DragDropOverlay"; // TODO: Re-enable when backend support is ready
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useUploadFile } from "@/hooks/api/useFiles";
// import { useProfilePermissions } from "@/hooks/api/useProfile"; // TODO: Re-enable when backend support is ready
import { SUPPORTED_DOCUMENT_TYPES } from "@/lib/constants";

export interface ChatV1ContentProps {
	// Message state
	messages: RitaChatState["messages"];
	messagesLoading: RitaChatState["messagesLoading"];
	isSending: RitaChatState["isSending"];
	currentConversationId: RitaChatState["currentConversationId"];

	// UI state
	messageValue: RitaChatState["messageValue"];

	// Actions
	handleSendMessage: RitaChatState["handleSendMessage"];
	handleMessageChange: RitaChatState["handleMessageChange"];

	// File upload (for chat messages)
	handleFileUpload: RitaChatState["handleFileUpload"];
	uploadStatus: RitaChatState["uploadStatus"];

	// Refs
	fileInputRef: RitaChatState["fileInputRef"];
}

/**
 * Map Rita's message status to ai-elements ChatStatus
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
		// Find if there are any assistant messages after this user message
		const hasAssistantResponseAfter = messages.some(
			(msg) =>
				msg.role === "assistant" && msg.timestamp > lastMessage.timestamp,
		);

		// If no assistant response yet and user message is sent, keep loader
		if (!hasAssistantResponseAfter && lastMessage.status === "sent") {
			return "streaming"; // Show loader while waiting for AI response
		}
	}

	// Check if last assistant message indicates turn is not complete
	if (lastMessage && lastMessage.role === "assistant") {
		const turnComplete = lastMessage.metadata?.turn_complete;
		// If turn_complete is explicitly false, show loader (more messages coming)
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

// Helper function to get grouped content for copying
const getGroupedContent = (message: GroupedChatMessage): string => {
	return message.parts.map((part) => part.message).join("\n\n");
};

// Helper function to check if a grouped message has copyable content
const hasGroupedCopyableContent = (message: GroupedChatMessage): boolean => {
	return message.parts.some(
		(part) => part.message && part.message.trim().length > 0,
	);
};

// Helper function to check if a simple message has copyable content
const hasSimpleCopyableContent = (message: SimpleChatMessage): boolean => {
	return Boolean(message.message && message.message.trim().length > 0);
};

// Component for rendering grouped messages
function GroupedMessage({
	message,
	onCopy,
	isCopied,
	chatStatus,
	isLastMessage,
}: {
	message: GroupedChatMessage;
	onCopy: (text: string, messageId: string) => void;
	isCopied: boolean;
	chatStatus: ChatStatus;
	isLastMessage: boolean;
}) {
	// Only the last message can be actively streaming
	const isThisMessageStreaming =
		isLastMessage &&
		(chatStatus === "streaming" || chatStatus === "submitted");

	return (
		<Message from={message.role}>
			<div className="flex flex-col w-full">
				<MessageContent variant="flat">
					{message.parts.map((part, index) => (
						<Fragment key={part.id}>
							{/* Render reasoning if present */}
							{part.metadata?.reasoning && (
								<Reasoning
									isStreaming={isThisMessageStreaming}
								>
									<ReasoningTrigger title={part.metadata.reasoning.title} />
									<ReasoningContent>
										{part.metadata.reasoning.content}
									</ReasoningContent>
								</Reasoning>
							)}

							{/* Render text content if present */}
							{(() => {
								// Check if the NEXT part is sources (for potential inline citations)
								const nextPart = message.parts[index + 1];
								const nextHasSources =
									nextPart?.metadata?.sources &&
									nextPart.metadata.sources.length > 0;

								// Use inline citations if next part has sources and this text contains markers
								if (part.message && part.message.trim().length > 0) {
									if (nextHasSources && part.message.includes("[")) {
										return (
											<ResponseWithInlineCitations
												sources={nextPart.metadata?.sources || []}
												messageId={part.id}
											>
												{part.message}
											</ResponseWithInlineCitations>
										);
									}
									return <Response>{part.message}</Response>;
								}
								return null;
							})()}

							{/* Render sources if present */}
							{(() => {
								// Check if the PREVIOUS part was text with inline citation markers
								const prevPart = message.parts[index - 1];
								const prevHasMarkers =
									prevPart &&
									!prevPart.metadata?.sources &&
									prevPart.message &&
									prevPart.message.includes("[");

								// Skip rendering sources separately if they were already rendered inline
								if (part.metadata?.sources && !prevHasMarkers) {
									return (
										<Citations
											sources={part.metadata.sources}
											messageId={part.id}
											variant={part.metadata?.citation_variant}
										/>
									);
								}
								return null;
							})()}

							{/* Render tasks if present */}
							{part.metadata?.tasks && (
								<div className="mt-4 space-y-2">
									{part.metadata.tasks.map((task: any, i: number) => (
										<Task key={i} defaultOpen={task.defaultOpen || i === 0}>
											<TaskTrigger title={task.title} />
											<TaskContent>
												{task.items.map((item: string, j: number) => (
													<TaskItem key={j}>{item}</TaskItem>
												))}
											</TaskContent>
										</Task>
									))}
								</div>
							)}
						</Fragment>
					))}
				</MessageContent>

				{/* Show copy action only if there's text content to copy */}
				{hasGroupedCopyableContent(message) && (
					<Actions className="mt-2">
						<Action
							onClick={() => onCopy(getGroupedContent(message), message.id)}
							tooltip="Copy message"
						>
							{isCopied ? (
								<CheckIcon className="size-3" />
							) : (
								<CopyIcon className="size-3" />
							)}
						</Action>
					</Actions>
				)}
			</div>
		</Message>
	);
}

// Component for simple standalone messages
function SimpleMessage({
	message,
	onCopy,
	isCopied,
}: {
	message: SimpleChatMessage;
	onCopy: (text: string, messageId: string) => void;
	isCopied: boolean;
}) {
	return (
		<Message from={message.role}>
			<div className="flex flex-col">
				<MessageContent
					variant={message.role === "assistant" ? "flat" : "contained"}
				>
					<Response>{message.message}</Response>
				</MessageContent>

				{/* Show copy action only for assistant messages with text content */}
				{message.role === "assistant" && hasSimpleCopyableContent(message) && (
					<Actions className="mt-2">
						<Action
							onClick={() => onCopy(message.message, message.id)}
							tooltip="Copy message"
						>
							{isCopied ? (
								<CheckIcon className="size-3" />
							) : (
								<CopyIcon className="size-3" />
							)}
						</Action>
					</Actions>
				)}
			</div>
		</Message>
	);
}

export default function ChatV1Content({
	messages,
	messagesLoading,
	isSending,
	currentConversationId,
	messageValue,
	handleSendMessage,
	handleMessageChange,
	handleFileUpload,
	uploadStatus,
	fileInputRef,
}: ChatV1ContentProps) {
	// Copy state tracking for icon feedback
	const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

	// Check if user is admin/owner (only admins can upload attachments - currently disabled for all users)
	// TODO: Re-enable when backend support is ready
	// const { isOwnerOrAdmin } = useProfilePermissions();
	// const isAdmin = isOwnerOrAdmin();

	// Get grouped messages from store instead of flat messages
	const { chatMessages } = useConversationStore();

	// File upload mutation for drag-and-drop
	const uploadFileMutation = useUploadFile();

	// Handle drag-and-drop file upload
	const handleDragDropUpload = useCallback((files: FileList) => {
		if (files.length === 0) return;

		// Upload each file to knowledge base
		Array.from(files).forEach(file => {
			uploadFileMutation.mutate(file, {
				onSuccess: () => {
					toast.success(`Uploaded "${file.name}" to knowledge base`);
				},
				onError: (error: any) => {
					toast.error(`Failed to upload "${file.name}": ${error?.message || 'Unknown error'}`);
				}
			});
		});
	}, [uploadFileMutation]);

	// Drag-and-drop with file upload functionality (disabled for all users)
	// TODO: Re-enable when backend support is ready (set enabled to: !uploadStatus.isUploading && isAdmin)
	/* const { isDragging } = */ useDragAndDrop({
		enabled: false,
		accept: SUPPORTED_DOCUMENT_TYPES,
		maxFiles: 5,
		maxFileSize: 10 * 1024 * 1024, // 10MB
		onDrop: handleDragDropUpload,
		onError: (error) => toast.error(error)
	});

	// Scroll container ref for pagination (mutable to allow assignment from contextRef)
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
			conversationId: currentConversationId,
			scrollContainerRef,
			enabled: !!currentConversationId && chatMessages.length > 0,
		});

	// Determine chat status
	const chatStatus = mapRitaStatusToChatStatus(
		isSending,
		uploadStatus.isUploading,
		messages,
	);

	// Determine if input should be disabled (turn-based conversation)
	const isInputDisabled =
		chatStatus === "streaming" || chatStatus === "submitted";

	// Handle form submission from PromptInput
	const handlePromptSubmit = useCallback(
		async (message: PromptInputMessage) => {
			const hasText = Boolean(message.text);
			const hasAttachments = Boolean(message.files?.length);

			if (!(hasText || hasAttachments)) {
				return;
			}

			// If we have text, update Rita's message value
			if (message.text) {
				handleMessageChange(message.text);
			}

			// Handle file uploads if present
			if (message.files && message.files.length > 0) {
				// Convert FileUIPart back to File for Rita's handler
				// Note: This is a simplified approach - in a real implementation,
				// you might need to handle the file conversion differently
				const fileEvent = {
					target: {
						files: message.files as any, // Type assertion for compatibility
					},
				} as React.ChangeEvent<HTMLInputElement>;

				handleFileUpload(fileEvent);
			}

			// Use setTimeout to ensure state is updated before sending
			setTimeout(async () => {
				await handleSendMessage();
			}, 0);
		},
		[handleMessageChange, handleSendMessage, handleFileUpload],
	);

	// Handle copy action with visual feedback
	const handleCopy = useCallback(async (text: string, messageId: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopiedMessageId(messageId);
			toast.success("Message copied to clipboard");
			// Reset copied state after 2 seconds (same as ai-elements pattern)
			setTimeout(() => setCopiedMessageId(null), 2000);
		} catch (_error) {
			toast.error("Failed to copy message");
		}
	}, []);

	// Handle direct attachment button click
	// TODO: Uncomment when re-enabling attachment button
	// const handleAttachmentClick = useCallback(() => {
	// 	fileInputRef.current?.click();
	// }, [fileInputRef]);

	return (
		<div className="h-full flex flex-col relative">
			{/* Drag-and-drop overlay (disabled - TODO: Re-enable when backend support is ready) */}
			{/* {isAdmin && (
				<DragDropOverlay
					isDragging={isDragging}
					accept={SUPPORTED_DOCUMENT_TYPES}
					maxFiles={5}
					maxFileSize={10 * 1024 * 1024}
				/>
			)} */}

			<Conversation className="flex-1" contextRef={handleStickToBottomContext}>
				<ConversationContent className="px-6 py-6">
					<div className="max-w-4xl mx-auto">
						{messagesLoading ? (
							<div className="flex items-center justify-center h-full">
								<Loader size={24} />
							</div>
						) : !currentConversationId || chatMessages.length === 0 ? (
							<div className="min-h-[60vh] flex items-center justify-center">
								<ConversationEmptyState
									title="Ask Rita"
									description="Diagnose and resolve issues, then create automations to speed up future remediation"
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
											Loading older messages...
										</span>
									</div>
								)}

								{/* "Beginning of conversation" indicator - only show after pagination attempted */}
								{!hasMore &&
									!isLoadingMore &&
									chatMessages.length > 0 &&
									hasPaginationAttempted && (
										<div className="flex justify-center py-4">
											<span className="text-sm text-gray-400">
												Beginning of conversation
											</span>
										</div>
									)}

								{/* Render grouped chat messages */}
								{chatMessages.map((chatMessage, index) => {
									const isLastMessage = index === chatMessages.length - 1;
									return (
										<Fragment key={chatMessage.id}>
											{chatMessage.isGroup ? (
												<GroupedMessage
													message={chatMessage as GroupedChatMessage}
													onCopy={handleCopy}
													isCopied={copiedMessageId === chatMessage.id}
													chatStatus={chatStatus}
													isLastMessage={isLastMessage}
												/>
											) : (
												<SimpleMessage
													message={chatMessage as SimpleChatMessage}
													onCopy={handleCopy}
													isCopied={copiedMessageId === chatMessage.id}
												/>
											)}
										</Fragment>
									);
								})}
							</>
						)}
					</div>
				</ConversationContent>
				<ConversationScrollButton />
			</Conversation>

			{/* Modern input using PromptInput */}
			<div className="px-6 py-4 xborder-t border-gray-200 bg-white">
				<div className="max-w-4xl mx-auto">
					<PromptInput
						onSubmit={handlePromptSubmit}
						globalDrop={false}
						multiple={false}
						accept={undefined}
						maxFiles={undefined}
						maxFileSize={undefined}
					>
						<PromptInputBody>
							<PromptInputAttachments>
								{(attachment) => <PromptInputAttachment data={attachment} />}
							</PromptInputAttachments>
							<PromptInputTextarea
								onChange={(e) => handleMessageChange(e.target.value)}
								value={messageValue}
								placeholder="Ask me anything..."
								disabled={isInputDisabled}
							/>
						</PromptInputBody>
						<PromptInputToolbar>
							<PromptInputTools>
								{/* TODO: Re-enable attachment button when backend support is ready */}
							</PromptInputTools>
							<PromptInputSubmit
								disabled={
									!messageValue.trim() ||
									chatStatus === "streaming" ||
									chatStatus === "submitted"
								}
								status={chatStatus}
							/>
						</PromptInputToolbar>
					</PromptInput>
				</div>
			</div>

			{/* Hidden file input for compatibility with existing Rita handlers */}
			<input
				ref={fileInputRef}
				type="file"
				className="hidden"
				onChange={handleFileUpload}
				accept={SUPPORTED_DOCUMENT_TYPES}
				disabled={uploadStatus.isUploading}
				multiple={false}
			/>
		</div>
	);
}
