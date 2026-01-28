/**
 * ChatInput - Reusable chat input component
 *
 * Provides a modern chat input interface with file attachments support,
 * accessibility features, and configurable behavior for knowledge base requirements.
 */

"use client";

import type { ChatStatus } from "ai";
import { useTranslation } from "react-i18next";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
	PromptInput,
	PromptInputAttachment,
	PromptInputAttachments,
	PromptInputBody,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputToolbar,
	PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";

export interface ChatInputProps {
	/** Current input value */
	value: string;

	/** Placeholder text for the input */
	placeholder?: string;

	/** Chat status (ready, streaming, submitted, error) */
	chatStatus: ChatStatus;

	/** Whether the input is disabled */
	disabled?: boolean;

	/** Whether to show the "no knowledge" warning */
	showNoKnowledgeWarning?: boolean;

	/** Whether the user is an admin (for warning message) */
	isAdmin?: boolean;

	/** Custom warning message for non-admin users */
	noKnowledgeMessage?: {
		admin: string;
		user: string;
	};

	/** Callback when input value changes */
	onChange: (value: string) => void;

	/** Callback when form is submitted */
	onSubmit: (message: PromptInputMessage) => void | Promise<void>;

	/** Additional CSS classes */
	className?: string;

	/** File upload configuration */
	fileUpload?: {
		accept?: string;
		multiple?: boolean;
		maxFiles?: number;
		maxFileSize?: number;
	};

	/** Custom content for left side of toolbar (next to send button) */
	leftToolbarContent?: React.ReactNode;
}

export function ChatInput({
	value,
	placeholder,
	chatStatus,
	disabled = false,
	showNoKnowledgeWarning = false,
	isAdmin = false,
	noKnowledgeMessage,
	onChange,
	onSubmit,
	className,
	fileUpload,
	leftToolbarContent,
}: ChatInputProps) {
	const { t } = useTranslation("chat");

	// Use translated defaults if no custom messages provided
	const resolvedPlaceholder = placeholder ?? t("input.placeholder");
	const resolvedNoKnowledgeMessage = noKnowledgeMessage ?? {
		admin: t("input.noKnowledgeAdmin"),
		user: t("input.noKnowledgeUser"),
	};
	const isSubmitDisabled =
		!value.trim() || chatStatus === "streaming" || chatStatus === "submitted";

	return (
		<div className={cn("px-6 py-4 border-gray-200 bg-white", className)}>
			<div className="max-w-4xl mx-auto">
				<PromptInput
					className={cn(showNoKnowledgeWarning && "rounded-b-none")}
					onSubmit={onSubmit}
					globalDrop={false}
					multiple={fileUpload?.multiple ?? false}
					accept={fileUpload?.accept}
					maxFiles={fileUpload?.maxFiles}
					maxFileSize={fileUpload?.maxFileSize}
				>
					<PromptInputBody>
						<PromptInputAttachments>
							{(attachment) => <PromptInputAttachment data={attachment} />}
						</PromptInputAttachments>
						<PromptInputTextarea
							onChange={(e) => onChange(e.target.value)}
							value={value}
							placeholder={resolvedPlaceholder}
							disabled={disabled}
						/>
					</PromptInputBody>
					<PromptInputToolbar>
						<PromptInputTools>
							{leftToolbarContent}
							{/* TODO: Re-enable attachment button when backend support is ready */}
						</PromptInputTools>
						<PromptInputSubmit
							disabled={isSubmitDisabled}
							status={chatStatus}
						/>
					</PromptInputToolbar>
				</PromptInput>

				{/* Footer message when no processed or uploaded files */}
				{showNoKnowledgeWarning && (
					<div className="mt-0 flex items-center rounded-b-[12px] border border-t-0 border-border bg-muted px-3 py-2">
						<p className="text-xs text-muted-foreground">
							{isAdmin
								? resolvedNoKnowledgeMessage.admin
								: resolvedNoKnowledgeMessage.user}
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
