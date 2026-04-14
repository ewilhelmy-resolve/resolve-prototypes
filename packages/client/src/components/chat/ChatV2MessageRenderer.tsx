import { CheckIcon, CopyIcon } from "lucide-react";
import {
	Fragment,
	memo,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { Action, Actions } from "@/components/ai-elements/actions";
import { CompletionCard } from "@/components/ai-elements/completion-card";
import { Message, MessageContent } from "@/components/ai-elements/message";
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
import { formatAbsoluteTime } from "@/lib/date-utils";
import {
	getGroupedContent,
	hasGroupedCopyableContent,
	hasSimpleCopyableContent,
	isReasoningOnlyMessage,
} from "@/lib/messageGrouping";
import type {
	ChatMessage,
	GroupedChatMessage,
	SimpleChatMessage,
} from "@/stores/conversationStore";
import type { UIActionPayload } from "@/types/uiSchema";
import { SchemaRenderer } from "../schema-renderer";
import { InlineFormRequest } from "../ui-form-request/InlineFormRequest";
import { InterruptFormDialog } from "./InterruptFormDialog";
import { ResponseWithInlineCitations } from "./ResponseWithInlineCitations";

export interface ChatV2InteractiveCallbacks {
	onSchemaAction?: (payload: UIActionPayload) => void;
	onFormSubmit?: (
		requestId: string,
		action: string,
		data: Record<string, string>,
	) => Promise<void>;
	onFormCancel?: (requestId: string) => Promise<void>;
	postToParent?: (message: Record<string, unknown>) => void;
	isInIframe?: boolean;
}

export interface ChatV2MessageRendererProps {
	chatMessages: ChatMessage[];
	isStreaming?: boolean;
	readOnly?: boolean;
	onCopy?: (text: string, messageId: string) => void;
	conversationId?: string | null;
	interactive?: ChatV2InteractiveCallbacks;
}

function CopyButton({ onClick }: { onClick: () => void }) {
	const [isCopied, setIsCopied] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout>>();

	useEffect(() => {
		return () => clearTimeout(timerRef.current);
	}, []);

	const handleClick = useCallback(() => {
		onClick();
		setIsCopied(true);
		clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => setIsCopied(false), 2000);
	}, [onClick]);

	return (
		<Actions>
			<Action onClick={handleClick} tooltip="Copy message">
				{isCopied ? (
					<CheckIcon className="size-3" />
				) : (
					<CopyIcon className="size-3" />
				)}
			</Action>
		</Actions>
	);
}

function GroupedMessageView({
	message,
	isStreaming,
	readOnly,
	onCopy,
	conversationId,
	interactive,
}: {
	message: GroupedChatMessage;
	isStreaming: boolean;
	readOnly: boolean;
	onCopy?: (text: string, messageId: string) => void;
	conversationId?: string | null;
	interactive?: ChatV2InteractiveCallbacks;
}) {
	const [isHovering, setIsHovering] = useState(false);
	const reasoningOnly = isReasoningOnlyMessage(message);

	return (
		<Message from={message.role} className={reasoningOnly ? "py-1" : ""}>
			{/* biome-ignore lint/a11y/useSemanticElements: fieldset breaks flex layout */}
			<div
				role="group"
				className="flex flex-col w-full"
				onMouseEnter={readOnly ? undefined : () => setIsHovering(true)}
				onMouseLeave={readOnly ? undefined : () => setIsHovering(false)}
			>
				<MessageContent variant="flat" className={reasoningOnly ? "p-0" : ""}>
					{message.parts.map((part, index) => (
						<Fragment key={part.id}>
							{part.metadata?.reasoning && (
								<Reasoning
									isStreaming={isStreaming}
									className={reasoningOnly ? "mb-0" : ""}
								>
									<ReasoningTrigger title={part.metadata.reasoning.title} />
									<ReasoningContent>
										{part.metadata.reasoning.content}
									</ReasoningContent>
								</Reasoning>
							)}

							{part.metadata?.completion && (
								<CompletionCard
									status={part.metadata.completion.status}
									title={part.metadata.completion.title}
									details={part.metadata.completion.details}
								/>
							)}

							{/* Text content with look-ahead for inline citations */}
							{(() => {
								if (part.metadata?.completion) return null;
								const nextPart = message.parts[index + 1];
								const nextHasSources =
									nextPart?.metadata?.sources &&
									nextPart.metadata.sources.length > 0;
								if (part.message && part.message.trim().length > 0) {
									if (
										!readOnly &&
										nextHasSources &&
										part.message.includes("[")
									) {
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

							{/* Sources with look-behind to skip if already rendered inline */}
							{(() => {
								const prevPart = message.parts[index - 1];
								const prevHasMarkers =
									prevPart &&
									!prevPart.metadata?.sources &&
									prevPart.message &&
									prevPart.message.includes("[");
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

							{/* Dynamic UI schema rendering */}
							{!readOnly &&
								part.metadata?.ui_schema &&
								conversationId &&
								interactive?.onSchemaAction && (
									<div className="mt-4 w-full">
										<SchemaRenderer
											schema={part.metadata.ui_schema}
											messageId={part.id}
											conversationId={conversationId}
											onAction={interactive.onSchemaAction}
											postToParent={interactive.postToParent}
											isInIframe={interactive.isInIframe}
										/>
									</div>
								)}
						</Fragment>
					))}
				</MessageContent>

				{!readOnly && message.role === "assistant" && !reasoningOnly && (
					<div className="flex items-center justify-between gap-2">
						{hasGroupedCopyableContent(message) && onCopy ? (
							<CopyButton
								onClick={() => onCopy(getGroupedContent(message), message.id)}
							/>
						) : (
							<div />
						)}
						<div
							className={`text-xs text-gray-500 transition-opacity ${
								isHovering ? "opacity-100" : "opacity-0"
							}`}
						>
							{formatAbsoluteTime(message.timestamp)}
						</div>
					</div>
				)}

				{!readOnly && message.role === "user" && (
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

function SimpleMessageView({
	message,
	readOnly,
	onCopy,
	conversationId,
	interactive,
}: {
	message: SimpleChatMessage;
	readOnly: boolean;
	onCopy?: (text: string, messageId: string) => void;
	conversationId?: string | null;
	interactive?: ChatV2InteractiveCallbacks;
}) {
	const [isHovering, setIsHovering] = useState(false);

	// Hide dev/mock test commands
	const isDevTestCommand =
		message.role === "user" && message.message.startsWith("testcustom:");
	if (isDevTestCommand && !readOnly) return null;

	// Form request state
	const isFormRequest = message.metadata?.type === "ui_form_request";
	const isInterruptForm = isFormRequest && message.metadata?.interrupt;

	return (
		<Message from={message.role}>
			{/* biome-ignore lint/a11y/useSemanticElements: fieldset breaks flex layout */}
			<div
				role="group"
				className="flex flex-col"
				onMouseEnter={readOnly ? undefined : () => setIsHovering(true)}
				onMouseLeave={readOnly ? undefined : () => setIsHovering(false)}
			>
				<MessageContent
					variant={message.role === "assistant" ? "flat" : "contained"}
				>
					{/* Non-interrupt inline form */}
					{isFormRequest &&
						!isInterruptForm &&
						message.metadata?.ui_schema &&
						interactive?.onFormSubmit && (
							<InlineFormRequest
								requestId={message.metadata.request_id}
								uiSchema={message.metadata.ui_schema}
								status={message.metadata.status || "pending"}
								formData={message.metadata.form_data}
								submittedAt={message.metadata.submitted_at}
								onSubmit={interactive.onFormSubmit}
								onCancel={interactive.onFormCancel}
							/>
						)}

					{/* Interrupt form: card + fallback dialog */}
					{isFormRequest && isInterruptForm && interactive?.onFormSubmit && (
						<InterruptFormDialog
							message={message}
							onFormSubmit={interactive.onFormSubmit}
							onFormCancel={interactive.onFormCancel}
						/>
					)}

					{/* Regular message content (hide for form requests) */}
					{!isFormRequest && message.message && (
						<Response>{message.message}</Response>
					)}

					{/* Dynamic UI schema for non-form messages */}
					{!readOnly &&
						!isFormRequest &&
						message.metadata?.ui_schema &&
						conversationId &&
						interactive?.onSchemaAction && (
							<div className="mt-4 w-full">
								<SchemaRenderer
									schema={message.metadata.ui_schema}
									messageId={message.id}
									conversationId={conversationId}
									onAction={interactive.onSchemaAction}
									postToParent={interactive.postToParent}
									isInIframe={interactive.isInIframe}
								/>
							</div>
						)}
				</MessageContent>

				{/* Actions + timestamp for non-form assistant messages */}
				{!readOnly && message.role === "assistant" && !isFormRequest && (
					<div className="flex items-center justify-between gap-2">
						{hasSimpleCopyableContent(message) && onCopy ? (
							<CopyButton onClick={() => onCopy(message.message, message.id)} />
						) : (
							<div />
						)}
						<div
							className={`text-xs text-gray-500 transition-opacity ${
								isHovering ? "opacity-100" : "opacity-0"
							}`}
						>
							{formatAbsoluteTime(message.timestamp)}
						</div>
					</div>
				)}

				{/* Timestamp only for form request assistant messages */}
				{!readOnly && message.role === "assistant" && isFormRequest && (
					<div
						className={`text-xs text-gray-500 mt-1 transition-opacity ${
							isHovering ? "opacity-100" : "opacity-0"
						}`}
					>
						{formatAbsoluteTime(message.timestamp)}
					</div>
				)}

				{!readOnly && message.role === "user" && (
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

export const ChatV2MessageRenderer = memo(function ChatV2MessageRenderer({
	chatMessages,
	isStreaming = false,
	readOnly = false,
	onCopy,
	conversationId,
	interactive,
}: ChatV2MessageRendererProps) {
	return (
		<>
			{chatMessages.map((msg, index) => {
				const isLastAssistant =
					isStreaming &&
					msg.role === "assistant" &&
					index === chatMessages.length - 1;

				if (msg.isGroup) {
					return (
						<GroupedMessageView
							key={msg.id}
							message={msg as GroupedChatMessage}
							isStreaming={isLastAssistant}
							readOnly={readOnly}
							onCopy={onCopy}
							conversationId={conversationId}
							interactive={interactive}
						/>
					);
				}

				return (
					<SimpleMessageView
						key={msg.id}
						message={msg as SimpleChatMessage}
						readOnly={readOnly}
						onCopy={onCopy}
						conversationId={conversationId}
						interactive={interactive}
					/>
				);
			})}
		</>
	);
});
