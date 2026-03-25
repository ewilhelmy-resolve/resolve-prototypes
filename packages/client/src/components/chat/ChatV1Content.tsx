/**
 * ChatV1ContentAI - Chat content component using ai-elements library
 *
 * This is a modern replacement for ChatV1Content.tsx that uses the ai-elements
 * component library for a more sophisticated chat experience with markdown
 * support, better accessibility, and advanced features.
 */

"use client";

import type { ChatStatus } from "ai";
import {
	CheckCircle2,
	CheckIcon,
	CopyIcon,
	PenLine,
	Upload /* , PaperclipIcon */,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Action, Actions } from "@/components/ai-elements/actions";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import { Message, MessageContent } from "@/components/ai-elements/message";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
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
import { ChatInput } from "@/components/chat/ChatInput";
import { Citations } from "@/components/citations";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ritaToast } from "@/components/ui/rita-toast";
import { SOURCE_METADATA, SOURCES } from "@/constants/connectionSources";
import { useUploadFile } from "@/hooks/api/useFiles";
import { useProfilePermissions } from "@/hooks/api/useProfile.ts";
import { useChatPagination } from "@/hooks/useChatPagination";
// import { DragDropOverlay } from "./DragDropOverlay"; // TODO: Re-enable when backend support is ready
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
// import { useProfilePermissions } from "@/hooks/api/useProfile"; // TODO: Re-enable when backend support is ready
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import type { RitaChatState } from "@/hooks/useRitaChat";
import {
	MAX_FILE_SIZE_MB,
	SUPPORTED_DOCUMENT_EXTENSIONS,
	SUPPORTED_DOCUMENT_TYPES,
	validateFileForUpload,
} from "@/lib/constants";
import { formatAbsoluteTime } from "@/lib/date-utils";
import { iframeApi } from "@/services/iframeApi";
import type {
	GroupedChatMessage,
	Message as RitaMessage,
	SimpleChatMessage,
} from "@/stores/conversationStore";
import { useConversationStore } from "@/stores/conversationStore";
import type { UIActionPayload } from "@/types/uiSchema";
import { parseSchema } from "@/types/uiSchema";
import {
	canAccessParentDocument,
	extractFormFields,
	openFormModal as hostOpenFormModal,
	isInIframe,
} from "@/utils/hostModal";
import { SchemaRenderer } from "../schema-renderer";
import { InlineFormRequest } from "../ui-form-request/InlineFormRequest";
import { ResponseWithInlineCitations } from "./ResponseWithInlineCitations";

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

	// Config options
	requireKnowledgeBase?: boolean;
	uploadStatus: RitaChatState["uploadStatus"];

	// Refs
	fileInputRef: RitaChatState["fileInputRef"];

	// Custom UI text (from Valkey for iframe, undefined for RITA)
	/** Custom title text (e.g., "Ask Workflow Designer" instead of "Ask RITA") */
	titleText?: string;
	/** Custom placeholder for input (e.g., "Describe your workflow...") */
	placeholderText?: string;
	/** Custom welcome/intro text (e.g., "I can help you build workflow automations.") */
	welcomeText?: string;
	/** Custom content for left side of input toolbar */
	leftToolbarContent?: React.ReactNode;
	/** Handler for inline form submission */
	onFormSubmit?: (
		requestId: string,
		action: string,
		data: Record<string, string>,
	) => Promise<void>;
	/** Handler for inline form cancellation */
	onFormCancel?: (requestId: string) => Promise<void>;
}

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

// Helper function to check if message only contains reasoning (no text/sources/tasks)
const isReasoningOnlyMessage = (message: GroupedChatMessage): boolean => {
	return message.parts.every(
		(part) =>
			part.metadata?.reasoning &&
			!part.message?.trim() &&
			!part.metadata?.sources?.length &&
			!part.metadata?.tasks?.length,
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
	conversationId,
	onSchemaAction,
}: {
	message: GroupedChatMessage;
	onCopy: (text: string, messageId: string) => void;
	isCopied: boolean;
	chatStatus: ChatStatus;
	isLastMessage: boolean;
	conversationId: string | null;
	onSchemaAction?: (payload: any) => void;
}) {
	// Only the last message can be actively streaming
	const isThisMessageStreaming =
		isLastMessage && (chatStatus === "streaming" || chatStatus === "submitted");

	// Hover state for timestamp visibility
	const [isHovering, setIsHovering] = useState(false);

	// Check if this is a reasoning-only message for compact styling
	const reasoningOnly = isReasoningOnlyMessage(message);

	return (
		<Message from={message.role} className={reasoningOnly ? "py-1" : ""}>
			{/* biome-ignore lint/a11y/useSemanticElements: fieldset breaks flex layout */}
			<div
				role="group"
				className="flex flex-col w-full"
				onMouseEnter={() => setIsHovering(true)}
				onMouseLeave={() => setIsHovering(false)}
			>
				<MessageContent variant="flat" className={reasoningOnly ? "p-0" : ""}>
					{message.parts.map((part, index) => (
						<Fragment key={part.id}>
							{/* Render reasoning if present */}
							{part.metadata?.reasoning && (
								<Reasoning
									isStreaming={isThisMessageStreaming}
									className={reasoningOnly ? "mb-0" : ""}
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

							{/* Render dynamic UI schema if present */}
							{part.metadata?.ui_schema && conversationId && (
								<div className="mt-4 w-full">
									<SchemaRenderer
										schema={part.metadata.ui_schema}
										messageId={part.id}
										conversationId={conversationId}
										onAction={onSchemaAction}
									/>
								</div>
							)}
						</Fragment>
					))}
				</MessageContent>

				{/* Actions and timestamp row - hide for reasoning-only messages */}
				{message.role === "assistant" && !reasoningOnly && (
					<div className="flex items-center justify-between gap-2">
						{/* Copy action - only show if there's text content */}
						{hasGroupedCopyableContent(message) ? (
							<Actions>
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
						) : (
							<div />
						)}

						{/* Timestamp - show on hover only */}
						<div
							className={`text-xs text-gray-500 transition-opacity ${
								isHovering ? "opacity-100" : "opacity-0"
							}`}
						>
							{formatAbsoluteTime(message.timestamp)}
						</div>
					</div>
				)}

				{/* User message timestamp only */}
				{message.role === "user" && (
					<div
						className={`text-xs text-gray-500 mt-1 transition-opacity ${
							isHovering ? "opacity-100" : "opacity-0"
						}`}
					>
						{formatAbsoluteTime(message.timestamp)}
					</div>
				)}
			</div>
		</Message>
	);
}

/** Dev/mock test commands sent via iframe dev controls (not user-visible) */
const isDevTestCommand = (msg: SimpleChatMessage) =>
	msg.role === "user" && msg.message.startsWith("testcustom:");

// Component for simple standalone messages
function SimpleMessage({
	message,
	onCopy,
	isCopied,
	conversationId,
	onSchemaAction,
	onFormSubmit,
	onFormCancel,
}: {
	message: SimpleChatMessage;
	onCopy: (text: string, messageId: string) => void;
	isCopied: boolean;
	conversationId: string | null;
	onSchemaAction?: (payload: any) => void;
	onFormSubmit?: (
		requestId: string,
		action: string,
		data: Record<string, string>,
	) => Promise<void>;
	onFormCancel?: (requestId: string) => Promise<void>;
}) {
	// Hover state for timestamp visibility
	const [isHovering, setIsHovering] = useState(false);
	// Fallback dialog state for cross-origin hosts without embed script
	const [showFallbackDialog, setShowFallbackDialog] = useState(false);

	// Check if this is a UI form request message
	const isFormRequest = message.metadata?.type === "ui_form_request";
	const isInterruptForm = isFormRequest && message.metadata?.interrupt;

	// Trigger form modal with tiered fallback:
	// Tier 0: same-origin → inject into host DOM
	// Tier 1: cross-origin + embed script → host renders modal, sends ACK
	// Tier 2: cross-origin, no embed script → in-iframe Dialog fallback
	const triggerHostModal = useCallback(() => {
		if (!message.metadata?.ui_schema) return;
		const uiSchema = message.metadata.ui_schema;

		const parsed = parseSchema(uiSchema);
		if (!parsed) return;

		const rootEl = parsed.elements[parsed.root];
		if (!rootEl) return;

		const title = (rootEl.props?.title as string) || "Form";
		const description = rootEl.props?.description as string | undefined;
		const size = ((rootEl.props?.size as string) || "md") as
			| "sm"
			| "md"
			| "lg"
			| "xl"
			| "full";
		const submitAction = (rootEl.props?.submitAction as string) || "submit";
		const submitLabel = rootEl.props?.submitLabel as string | undefined;
		const cancelLabel = rootEl.props?.cancelLabel as string | undefined;
		const submitVariant = rootEl.props?.submitVariant as string | undefined;
		const fields = extractFormFields(parsed.elements, parsed.root);

		// Tier 0: same-origin — inject form modal into host DOM
		if (isInIframe() && canAccessParentDocument()) {
			hostOpenFormModal({
				title,
				description,
				size,
				fields,
				submitLabel,
				cancelLabel,
				submitVariant:
					submitVariant === "destructive" ? "destructive" : "default",
				onSubmit: (data) => {
					onFormSubmit?.(message.metadata?.request_id, submitAction, data);
				},
				onCancel: () => {
					// Just close — don't cancel the request so user can reopen
				},
			});
			return;
		}

		// Cross-origin: send postMessage + wait for ACK
		if (isInIframe()) {
			const payload = {
				requestId: message.metadata.request_id,
				messageId: message.id,
				title,
				description,
				size,
				fields,
				submitAction,
				submitLabel,
				cancelLabel,
				submitVariant,
			};

			let ackReceived = false;
			const onAck = (evt: MessageEvent) => {
				if (evt.data?.type === "RITA_FORM_MODAL_ACK") {
					ackReceived = true;
					window.removeEventListener("message", onAck);
				}
			};
			window.addEventListener("message", onAck);

			window.parent.postMessage({ type: "RITA_FORM_MODAL", payload }, "*");

			// Tier 2 fallback: if no ACK in 300ms, open in-iframe dialog
			setTimeout(() => {
				window.removeEventListener("message", onAck);
				if (!ackReceived) {
					setShowFallbackDialog(true);
				}
			}, 300);
			return;
		}

		// Not in iframe — open fallback dialog directly
		setShowFallbackDialog(true);
	}, [message.metadata, message.id, onFormSubmit]);

	// Auto-trigger host modal once for pending interrupt forms loaded from history
	const modalTriggered = useRef(false);
	const isFormAnswered = message.metadata?.status === "completed";
	useEffect(() => {
		if (modalTriggered.current || !isInterruptForm || isFormAnswered) return;
		modalTriggered.current = true;
		triggerHostModal();
	}, [isInterruptForm, isFormAnswered, triggerHostModal]);

	if (isDevTestCommand(message)) return null;

	return (
		<Message from={message.role}>
			{/* biome-ignore lint/a11y/useSemanticElements: fieldset breaks flex layout */}
			<div
				role="group"
				className="flex flex-col"
				onMouseEnter={() => setIsHovering(true)}
				onMouseLeave={() => setIsHovering(false)}
			>
				<MessageContent
					variant={message.role === "assistant" ? "flat" : "contained"}
				>
					{/* Render UI form request inline (if not interrupt mode) */}
					{isFormRequest &&
						!isInterruptForm &&
						message.metadata?.ui_schema &&
						onFormSubmit && (
							<InlineFormRequest
								requestId={message.metadata.request_id}
								uiSchema={message.metadata.ui_schema}
								status={message.metadata.status || "pending"}
								formData={message.metadata.form_data}
								submittedAt={message.metadata.submitted_at}
								onSubmit={onFormSubmit}
								onCancel={onFormCancel}
							/>
						)}

					{/* For interrupt form requests, show card with open/submitted state */}
					{isFormRequest &&
						isInterruptForm &&
						(() => {
							const _parsed = parseSchema(message.metadata?.ui_schema);
							const _rootEl = _parsed ? _parsed.elements[_parsed.root] : null;
							const title = (_rootEl?.props?.title as string) || "Form request";
							const description = _rootEl?.props?.description as
								| string
								| undefined;
							const isCompleted = message.metadata?.status === "completed";

							return (
								<Card className="w-full max-w-lg">
									<CardHeader className="pb-2">
										<div className="flex items-start justify-between">
											<div>
												<CardTitle className="text-base">{title}</CardTitle>
												{description && (
													<CardDescription className="mt-1">
														{description}
													</CardDescription>
												)}
											</div>
											{isCompleted && (
												<CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
											)}
										</div>
									</CardHeader>
									<CardContent className="pt-0">
										{isCompleted ? (
											<span className="text-xs text-muted-foreground">
												Submitted{" "}
												{message.metadata?.submitted_at
													? new Date(
															message.metadata.submitted_at,
														).toLocaleString()
													: ""}
											</span>
										) : (
											<Button
												variant="outline"
												size="sm"
												onClick={triggerHostModal}
											>
												<PenLine className="mr-2 h-4 w-4" />
												Open form
											</Button>
										)}
									</CardContent>
								</Card>
							);
						})()}

					{/* Tier 2 fallback: in-iframe Dialog for interrupt forms */}
					{isFormRequest &&
						isInterruptForm &&
						message.metadata?.ui_schema &&
						onFormSubmit && (
							<Dialog
								open={showFallbackDialog}
								onOpenChange={(open) => {
									if (!open) {
										setShowFallbackDialog(false);
									}
								}}
							>
								<DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
									<DialogHeader>
										<DialogTitle>
											{(() => {
												const _p = parseSchema(message.metadata?.ui_schema);
												return (
													(_p
														? (_p.elements[_p.root]?.props?.title as string)
														: null) || "Form"
												);
											})()}
										</DialogTitle>
										<DialogDescription>
											{(() => {
												const _p = parseSchema(message.metadata?.ui_schema);
												return (
													(_p
														? (_p.elements[_p.root]?.props
																?.description as string)
														: null) || ""
												);
											})()}
										</DialogDescription>
									</DialogHeader>
									<div className="flex-1 overflow-y-auto min-h-0">
										<InlineFormRequest
											requestId={message.metadata.request_id}
											uiSchema={message.metadata.ui_schema}
											status={message.metadata.status || "pending"}
											formData={message.metadata.form_data}
											submittedAt={message.metadata.submitted_at}
											onSubmit={async (reqId, action, data) => {
												setShowFallbackDialog(false);
												await onFormSubmit(reqId, action, data);
											}}
											onCancel={async (reqId) => {
												setShowFallbackDialog(false);
												await onFormCancel?.(reqId);
											}}
										/>
									</div>
								</DialogContent>
							</Dialog>
						)}

					{/* Regular message content (hide raw JSON for legacy form requests) */}
					{!isFormRequest && message.message && (
						<Response>{message.message}</Response>
					)}

					{/* Render dynamic UI schema if present (not form request) */}
					{!isFormRequest && message.metadata?.ui_schema && conversationId && (
						<div className="mt-4 w-full">
							<SchemaRenderer
								schema={message.metadata.ui_schema}
								messageId={message.id}
								conversationId={conversationId}
								onAction={onSchemaAction}
							/>
						</div>
					)}
				</MessageContent>

				{/* Actions and timestamp row - always show for assistant messages */}
				{message.role === "assistant" && !isFormRequest && (
					<div className="flex items-center justify-between gap-2">
						{/* Copy action - only show if there's text content */}
						{hasSimpleCopyableContent(message) ? (
							<Actions>
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
						) : (
							<div />
						)}

						{/* Timestamp - show on hover only */}
						<div
							className={`text-xs text-gray-500 transition-opacity ${
								isHovering ? "opacity-100" : "opacity-0"
							}`}
						>
							{formatAbsoluteTime(message.timestamp)}
						</div>
					</div>
				)}

				{/* Timestamp for form requests */}
				{message.role === "assistant" && isFormRequest && (
					<div
						className={`text-xs text-gray-500 mt-1 transition-opacity ${
							isHovering ? "opacity-100" : "opacity-0"
						}`}
					>
						{formatAbsoluteTime(message.timestamp)}
					</div>
				)}

				{/* User message timestamp only */}
				{message.role === "user" && (
					<div
						className={`text-xs text-gray-500 mt-1 transition-opacity ${
							isHovering ? "opacity-100" : "opacity-0"
						}`}
					>
						{formatAbsoluteTime(message.timestamp)}
					</div>
				)}
			</div>
		</Message>
	);
}

// Custom empty state component for Ask RITA
function AskRitaEmptyState({
	hasKnowledge,
	onUpload,
	onConnections,
}: {
	hasKnowledge: boolean;
	onUpload: () => void;
	onConnections: () => void;
}) {
	const { t } = useTranslation("chat");
	const { isOwnerOrAdmin } = useProfilePermissions();
	// Connection source icons to display
	const connectionSources = [
		{
			type: SOURCES.CONFLUENCE,
			icon: `/connections/icon_${SOURCES.CONFLUENCE}.svg`,
		},
		{
			type: SOURCES.SHAREPOINT,
			icon: `/connections/icon_${SOURCES.SHAREPOINT}.svg`,
		},
		{
			type: SOURCES.SERVICENOW,
			icon: `/connections/icon_${SOURCES.SERVICENOW}.svg`,
		},
	];

	return (
		<div className="flex flex-col items-center justify-center gap-8 py-12">
			<div className="text-center space-y-2">
				<h2 className="text-3xl font-semibold text-foreground">
					{t("emptyState.title")}
				</h2>
				<p className="text-base text-muted-foreground">
					{hasKnowledge
						? t("emptyState.descriptionWithKnowledge")
						: t("emptyState.descriptionNoKnowledge")}
				</p>
			</div>

			{!hasKnowledge && isOwnerOrAdmin() && (
				<>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
						{/* Upload a file card */}
						<Card className="cursor-pointer" onClick={onUpload}>
							<CardHeader>
								<div className="flex items-start justify-between">
									<CardTitle className="text-lg font-medium">
										{t("emptyState.uploadTitle")}
									</CardTitle>
									<Upload className="h-5 w-5 text-muted-foreground" />
								</div>
								<CardDescription className="text-base">
									{t("emptyState.uploadDescription")}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">
									{t("emptyState.fileConstraints", {
										extensions: SUPPORTED_DOCUMENT_EXTENSIONS.join(", "),
										size: MAX_FILE_SIZE_MB,
									})}
								</p>
							</CardContent>
						</Card>

						{/* Add a connection card */}
						<Card className="cursor-pointer" onClick={onConnections}>
							<CardHeader>
								<CardTitle className="text-lg font-medium">
									{t("emptyState.connectionTitle")}
								</CardTitle>
								<CardDescription className="text-base">
									{t("emptyState.connectionDescription")}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex gap-3">
									{connectionSources.map((source) => (
										<div
											key={source.type}
											className="w-8 h-8 flex items-center justify-center"
										>
											<img
												src={source.icon}
												alt={SOURCE_METADATA[source.type]?.title || source.type}
												className="w-6 h-6"
											/>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</div>

					<p className="text-xs text-muted-foreground text-center max-w-md">
						{t("emptyState.privacyInfo")}
					</p>
				</>
			)}
		</div>
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
	requireKnowledgeBase = true,
	titleText,
	placeholderText,
	welcomeText,
	leftToolbarContent,
	onFormSubmit: propsFormSubmit,
	onFormCancel: propsFormCancel,
}: ChatV1ContentProps) {
	const { t } = useTranslation(["chat", "toast", "kbs"]);
	// Copy state tracking for icon feedback
	const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

	// Timeout override state for incomplete turns
	const [timeoutOverride, setTimeoutOverride] = useState(false);

	// Track which conversation has been checked for incomplete turns
	const lastCheckedConvRef = useRef<string | null>(null);

	// Navigation for connections
	const navigate = useNavigate();

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

	// Feature flags
	const enableMultiFileUpload = useFeatureFlag("ENABLE_MULTI_FILE_UPLOAD");

	// Get grouped messages from store instead of flat messages
	const { chatMessages } = useConversationStore();

	// File upload mutation for drag-and-drop
	const uploadFileMutation = useUploadFile();

	// Handle drag-and-drop file upload
	const handleDragDropUpload = useCallback(
		(files: FileList) => {
			if (files.length === 0) return;

			// Upload each file to knowledge base
			Array.from(files).forEach((file) => {
				// Validate file before upload
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

	// 30-second timeout for incomplete turns
	useEffect(() => {
		// Reset override when status changes
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
		if (!currentConversationId || !messages.length) return;

		// Only check once per conversation
		if (lastCheckedConvRef.current === currentConversationId) return;
		lastCheckedConvRef.current = currentConversationId;

		const lastMsg = messages[messages.length - 1];
		const isIncomplete =
			lastMsg.role === "user" ||
			(lastMsg.role === "assistant" &&
				lastMsg.metadata?.turn_complete === false);

		if (isIncomplete) {
			setTimeoutOverride(true);
		}
	}, [currentConversationId, messages]);

	// Determine if input should be disabled (turn-based conversation or no knowledge)
	const isInputDisabled =
		!timeoutOverride &&
		(chatStatus === "streaming" ||
			chatStatus === "submitted" ||
			(requireKnowledgeBase && !hasProcessedOrUploadedFiles));

	// Handle form submission from PromptInput
	const handlePromptSubmit = useCallback(
		async (message: PromptInputMessage) => {
			const hasText = Boolean(message.text);
			const hasAttachments = Boolean(message.files?.length);

			if (!(hasText || hasAttachments)) {
				return;
			}

			// If we have text, update RITA's message value
			if (message.text) {
				handleMessageChange(message.text);
			}

			// Handle file uploads if present
			if (message.files && message.files.length > 0) {
				// Convert FileUIPart back to File for RITA's handler
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
	const handleCopy = useCallback(
		async (text: string, messageId: string) => {
			try {
				await navigator.clipboard.writeText(text);
				setCopiedMessageId(messageId);
				ritaToast.success({ title: t("toast:success.messageCopied") });
				// Reset copied state after 2 seconds (same as ai-elements pattern)
				setTimeout(() => setCopiedMessageId(null), 2000);
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
				title: `🚀 Action: ${payload.action}`,
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
			const { messages, updateMessage } = useConversationStore.getState();
			const msg = messages.find((m) => m.metadata?.request_id === requestId);
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
	// Use props handler if provided (iframe context), otherwise use internal handler
	const handleFormSubmit = useCallback(
		async (
			requestId: string,
			action: string,
			data: Record<string, string>,
		): Promise<void> => {
			console.log("[FormSubmit] Submitting form:", { requestId, action, data });

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
					description: error instanceof Error ? error.message : "Network error",
				});
				throw error;
			}
		},
		[propsFormSubmit, markFormCompleted],
	);

	// Mark a form request message as cancelled in the local store
	// Handle form cancellation — dismiss only, don't mark as answered
	// User can reopen the form later
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
								{requireKnowledgeBase ? (
									<AskRitaEmptyState
										hasKnowledge={hasProcessedOrUploadedFiles}
										onUpload={openDocumentSelector}
										onConnections={() => navigate("/settings/connections")}
									/>
								) : (
									<div className="text-center max-w-md px-4">
										<h2 className="text-2xl font-semibold text-gray-900 mb-2">
											{titleText ?? t("emptyState.title")}
										</h2>
										<p className="text-sm text-gray-600">
											{welcomeText ?? t("emptyState.guestDescription")}
										</p>
									</div>
								)}
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
											{t("messages.loadingOlder")}
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
												{t("messages.beginningOfConversation")}
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
													conversationId={currentConversationId}
													onSchemaAction={handleSchemaAction}
												/>
											) : (
												<SimpleMessage
													message={chatMessage as SimpleChatMessage}
													onCopy={handleCopy}
													isCopied={copiedMessageId === chatMessage.id}
													conversationId={currentConversationId}
													onSchemaAction={handleSchemaAction}
													onFormSubmit={handleFormSubmit}
													onFormCancel={handleFormCancel}
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

			{/* Modern input using ChatInput */}
			<ChatInput
				value={messageValue}
				placeholder={placeholderText ?? t("input.placeholder")}
				chatStatus={chatStatus}
				disabled={isInputDisabled}
				showNoKnowledgeWarning={
					requireKnowledgeBase && !hasProcessedOrUploadedFiles
				}
				isAdmin={isAdmin}
				onChange={handleMessageChange}
				onSubmit={handlePromptSubmit}
				fileUpload={{
					accept: undefined,
					multiple: false,
					maxFiles: undefined,
					maxFileSize: undefined,
				}}
				leftToolbarContent={leftToolbarContent}
			/>

			{/* Hidden file input for chat message attachments (currently disabled) */}
			<input
				ref={fileInputRef}
				type="file"
				className="hidden"
				onChange={handleFileUpload}
				accept={SUPPORTED_DOCUMENT_TYPES}
				disabled={uploadStatus.isUploading}
				multiple={enableMultiFileUpload}
			/>

			{/* Hidden file input for knowledge base uploads (empty state & navbar) */}
			<input
				ref={documentInputRef}
				type="file"
				className="hidden"
				onChange={handleDocumentUpload}
				accept={SUPPORTED_DOCUMENT_TYPES}
				multiple={enableMultiFileUpload}
				disabled={uploadingFiles.size > 0}
			/>
		</div>
	);
}
