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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ModalDefinition, UIComponent } from "@/types/uiSchema";
import { evaluateCondition } from "@/types/uiSchema";

interface InlineFormRequestProps {
	requestId: string;
	uiSchema: {
		version?: "1";
		modals: Record<string, ModalDefinition>;
	};
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

	// Get the first modal from the schema
	const modalEntries = Object.entries(uiSchema.modals || {});
	if (modalEntries.length === 0) {
		return null;
	}

	const [, modal] = modalEntries[0];
	const isCompleted = status === "completed";

	const handleInputChange = (name: string, value: string) => {
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async () => {
		if (!modal.submitAction || isCompleted) return;

		setIsSubmitting(true);
		setError(undefined);
		try {
			await onSubmit(requestId, modal.submitAction, formData);
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
		} catch (err) {
			// Ignore cancel errors
			setIsSubmitting(false);
		}
	};

	// Render a component from the modal's children
	const renderComponent = (
		component: UIComponent,
		index: number,
	): React.ReactNode => {
		const displayData = isCompleted ? existingFormData || formData : formData;

		if (!evaluateCondition(component.if, displayData)) {
			return null;
		}

		const key = component.id || `${component.type}-${index}`;

		switch (component.type) {
			case "text":
				return <TextRenderer key={key} component={component} />;

			case "input":
				return (
					<InputRenderer
						key={key}
						component={component}
						value={displayData[component.name] || component.defaultValue || ""}
						onChange={(value) => handleInputChange(component.name, value)}
						disabled={isCompleted || isSubmitting}
					/>
				);

			case "select":
				return (
					<SelectRenderer
						key={key}
						component={component}
						value={displayData[component.name] || component.defaultValue || ""}
						onChange={(value) => handleInputChange(component.name, value)}
						disabled={isCompleted || isSubmitting}
					/>
				);

			case "row":
				return (
					<div
						key={key}
						className={`flex flex-wrap items-start gap-3 ${component.className || ""}`}
					>
						{(component.children ?? []).map((child, i) => renderComponent(child, i))}
					</div>
				);

			case "column":
				return (
					<div
						key={key}
						className={`flex flex-col gap-3 ${component.className || ""}`}
					>
						{(component.children ?? []).map((child, i) => renderComponent(child, i))}
					</div>
				);

			default:
				return null;
		}
	};

	return (
		<Card className="w-full max-w-lg">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div>
						<CardTitle className="text-base">{modal.title}</CardTitle>
						{modal.description && (
							<CardDescription className="mt-1">
								{modal.description}
							</CardDescription>
						)}
					</div>
					{isCompleted && (
						<CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
					)}
				</div>
			</CardHeader>

			<CardContent className="space-y-3 pb-3">
				{(modal.children ?? (modal as any).fields ?? []).map((child: UIComponent, index: number) =>
					renderComponent(child, index),
				)}
				{error && <div className="text-sm text-destructive">{error}</div>}
			</CardContent>

			{!isCompleted && modal.submitAction && (
				<CardFooter className="flex justify-end gap-2 pt-0">
					{onCancel && (
						<Button
							variant="outline"
							size="sm"
							onClick={handleCancel}
							disabled={isSubmitting}
						>
							{modal.cancelLabel || "Cancel"}
						</Button>
					)}
					<Button
						variant={modal.submitVariant || "default"}
						size="sm"
						onClick={handleSubmit}
						disabled={isSubmitting}
					>
						{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{modal.submitLabel || "Submit"}
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

// Simple component renderers (same as UIFormRequestModal)

function TextRenderer({
	component,
}: {
	component: { content: string; variant?: string; className?: string };
}) {
	const variants: Record<string, string> = {
		default: "text-sm",
		muted: "text-sm text-muted-foreground",
		heading: "text-base font-semibold",
		subheading: "text-sm font-medium",
	};
	return (
		<p
			className={`${variants[component.variant || "default"]} ${component.className || ""}`}
		>
			{component.content}
		</p>
	);
}

function InputRenderer({
	component,
	value,
	onChange,
	disabled,
}: {
	component: {
		name: string;
		label?: string;
		placeholder?: string;
		inputType?: string;
		required?: boolean;
		className?: string;
	};
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
}) {
	const InputEl = component.inputType === "textarea" ? Textarea : Input;
	return (
		<div className={`space-y-1 ${component.className || ""}`}>
			{component.label && (
				<Label htmlFor={component.name} className="text-sm">
					{component.label}
					{component.required && (
						<span className="text-destructive ml-1">*</span>
					)}
				</Label>
			)}
			<InputEl
				id={component.name}
				name={component.name}
				type={component.inputType || "text"}
				placeholder={component.placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				required={component.required}
				disabled={disabled}
				className="text-sm"
			/>
		</div>
	);
}

function SelectRenderer({
	component,
	value,
	onChange,
	disabled,
}: {
	component: {
		name: string;
		label?: string;
		placeholder?: string;
		options: Array<{ label: string; value: string }>;
		required?: boolean;
		className?: string;
	};
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
}) {
	return (
		<div className={`space-y-1 ${component.className || ""}`}>
			{component.label && (
				<Label className="text-sm">
					{component.label}
					{component.required && (
						<span className="text-destructive ml-1">*</span>
					)}
				</Label>
			)}
			<Select value={value} onValueChange={onChange} disabled={disabled}>
				<SelectTrigger className="text-sm">
					<SelectValue placeholder={component.placeholder || "Select..."} />
				</SelectTrigger>
				<SelectContent>
					{component.options.map((opt) => (
						<SelectItem key={opt.value} value={opt.value}>
							{opt.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

export default InlineFormRequest;
