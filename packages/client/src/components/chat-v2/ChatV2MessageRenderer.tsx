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

export interface ChatV2MessageRendererProps {
	chatMessages: ChatMessage[];
	isStreaming?: boolean;
	readOnly?: boolean;
	onCopy?: (text: string, messageId: string) => void;
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
}: {
	message: GroupedChatMessage;
	isStreaming: boolean;
	readOnly: boolean;
	onCopy?: (text: string, messageId: string) => void;
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
					{message.parts.map((part) => (
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

							{!part.metadata?.completion &&
								part.message &&
								part.message.trim().length > 0 && (
									<Response>{part.message}</Response>
								)}

							{part.metadata?.sources && part.metadata.sources.length > 0 && (
								<Citations
									sources={part.metadata.sources}
									messageId={part.id}
									variant={part.metadata?.citation_variant}
								/>
							)}

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
}: {
	message: SimpleChatMessage;
	readOnly: boolean;
	onCopy?: (text: string, messageId: string) => void;
}) {
	const [isHovering, setIsHovering] = useState(false);

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
					{message.message && <Response>{message.message}</Response>}
				</MessageContent>

				{!readOnly && message.role === "assistant" && (
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
						/>
					);
				}

				return (
					<SimpleMessageView
						key={msg.id}
						message={msg as SimpleChatMessage}
						readOnly={readOnly}
						onCopy={onCopy}
					/>
				);
			})}
		</>
	);
});
