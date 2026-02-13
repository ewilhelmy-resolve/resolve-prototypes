/**
 * InlineFormRequest
 *
 * Renders a UI form request inline within a chat message bubble.
 * Used when interrupt=false (non-interrupting form requests).
 */

import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { UISchemaV2 } from "@/types/uiSchema";
import { normalizeSchema } from "@/types/uiSchema";
import { SchemaRenderer } from "../schema-renderer";

interface InlineFormRequestProps {
	requestId: string;
	uiSchema: Record<string, unknown>;
	status: "pending" | "completed";
	formData?: Record<string, string>;
	submittedAt?: string;
	onSubmit: (
		requestId: string,
		action: string,
		data: Record<string, string>,
	) => Promise<void>;
	onCancel?: (requestId: string) => Promise<void>;
}

/** Extract title/description/submitAction from normalized schema root */
function extractFormProps(normalized: UISchemaV2) {
	const root = normalized.root;
	return {
		title: (root.props?.title as string) || "Form",
		description: root.props?.description as string | undefined,
		submitAction: root.props?.submitAction as string | undefined,
		submitLabel: (root.props?.submitLabel as string) || "Submit",
		cancelLabel: (root.props?.cancelLabel as string) || "Cancel",
		submitVariant: root.props?.submitVariant as string | undefined,
	};
}

export function InlineFormRequest({
	requestId,
	uiSchema,
	status,
	formData: existingFormData,
	submittedAt,
	onSubmit,
	onCancel,
}: InlineFormRequestProps) {
	const [formData, setFormData] = useState<Record<string, string>>(
		existingFormData || {},
	);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string>();

	const normalized = normalizeSchema(uiSchema);
	if (!normalized) return null;

	const {
		title,
		description,
		submitAction,
		submitLabel,
		cancelLabel,
		submitVariant,
	} = extractFormProps(normalized);
	const isCompleted = status === "completed";

	const handleSubmit = async () => {
		if (!submitAction || isCompleted) return;

		setIsSubmitting(true);
		setError(undefined);
		try {
			await onSubmit(requestId, submitAction, formData);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to submit form");
			setIsSubmitting(false);
		}
	};

	const handleCancel = async () => {
		if (isCompleted || !onCancel) return;

		setIsSubmitting(true);
		try {
			await onCancel(requestId);
		} catch (_err) {
			setIsSubmitting(false);
		}
	};

	// Collect form data from SchemaRenderer actions
	const handleAction = (payload: {
		action: string;
		data?: Record<string, unknown>;
	}) => {
		if (payload.data) {
			setFormData((prev) => ({
				...prev,
				...(payload.data as Record<string, string>),
			}));
		}
	};

	return (
		<Card className="w-full max-w-lg">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div>
						<CardTitle className="text-base">{title}</CardTitle>
						{description && (
							<CardDescription className="mt-1">{description}</CardDescription>
						)}
					</div>
					{isCompleted && (
						<CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
					)}
				</div>
			</CardHeader>

			<CardContent className="space-y-3 pb-3">
				<SchemaRenderer
					schema={uiSchema}
					messageId={requestId}
					conversationId=""
					onAction={handleAction}
					disabled={isCompleted || isSubmitting}
				/>
				{error && <div className="text-sm text-destructive">{error}</div>}
			</CardContent>

			{!isCompleted && submitAction && (
				<CardFooter className="flex justify-end gap-2 pt-0">
					{onCancel && (
						<Button
							variant="outline"
							size="sm"
							onClick={handleCancel}
							disabled={isSubmitting}
						>
							{cancelLabel}
						</Button>
					)}
					<Button
						variant={
							(submitVariant as
								| "default"
								| "destructive"
								| "outline"
								| "secondary"
								| "ghost") || "default"
						}
						size="sm"
						onClick={handleSubmit}
						disabled={isSubmitting}
					>
						{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{submitLabel}
					</Button>
				</CardFooter>
			)}

			{isCompleted && submittedAt && (
				<CardFooter className="pt-0">
					<span className="text-xs text-muted-foreground">
						Submitted {new Date(submittedAt).toLocaleString()}
					</span>
				</CardFooter>
			)}
		</Card>
	);
}

export default InlineFormRequest;
