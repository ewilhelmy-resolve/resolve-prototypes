/**
 * InterruptFormDialog
 *
 * Renders an interrupt-mode form request as a Card with "Open form" button.
 * Implements 3-tier fallback for modal rendering:
 *   Tier 0: same-origin — inject form modal into host DOM
 *   Tier 1: cross-origin + embed script — host renders modal via postMessage ACK
 *   Tier 2: cross-origin, no embed script — in-iframe Dialog fallback
 *
 * Ported from ChatV1Content SimpleMessage interrupt logic.
 */

import { CheckCircle2, PenLine } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
import type { SimpleChatMessage } from "@/stores/conversationStore";
import { parseSchema } from "@/types/uiSchema";
import {
	canAccessParentDocument,
	extractFormFields,
	openFormModal as hostOpenFormModal,
	isInIframe,
	safePostToParent,
} from "@/utils/hostModal";
import { InlineFormRequest } from "../ui-form-request/InlineFormRequest";

export interface InterruptFormDialogProps {
	message: SimpleChatMessage;
	onFormSubmit: (
		requestId: string,
		action: string,
		data: Record<string, string>,
	) => Promise<void>;
	onFormCancel?: (requestId: string) => Promise<void>;
}

export function InterruptFormDialog({
	message,
	onFormSubmit,
	onFormCancel,
}: InterruptFormDialogProps) {
	const [showFallbackDialog, setShowFallbackDialog] = useState(false);

	// Parse schema once for card display
	const parsed = parseSchema(message.metadata?.ui_schema);
	const rootEl = parsed ? parsed.elements[parsed.root] : null;
	const title = (rootEl?.props?.title as string) || "Form request";
	const description = rootEl?.props?.description as string | undefined;
	const isCompleted = message.metadata?.status === "completed";

	// Trigger form modal with tiered fallback
	const triggerHostModal = useCallback(() => {
		if (!message.metadata?.ui_schema) return;
		const uiSchema = message.metadata.ui_schema;

		const innerParsed = parseSchema(uiSchema);
		if (!innerParsed) return;

		const innerRootEl = innerParsed.elements[innerParsed.root];
		if (!innerRootEl) return;

		const modalTitle = (innerRootEl.props?.title as string) || "Form";
		const modalDescription = innerRootEl.props?.description as
			| string
			| undefined;
		const size = ((innerRootEl.props?.size as string) || "md") as
			| "sm"
			| "md"
			| "lg"
			| "xl"
			| "full";
		const submitAction =
			(innerRootEl.props?.submitAction as string) || "submit";
		const submitLabel = innerRootEl.props?.submitLabel as string | undefined;
		const cancelLabel = innerRootEl.props?.cancelLabel as string | undefined;
		const submitVariant = innerRootEl.props?.submitVariant as
			| string
			| undefined;
		const fields = extractFormFields(innerParsed.elements, innerParsed.root);

		// Tier 0: same-origin — inject form modal into host DOM
		if (isInIframe() && canAccessParentDocument()) {
			hostOpenFormModal({
				title: modalTitle,
				description: modalDescription,
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
				title: modalTitle,
				description: modalDescription,
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

			if (!safePostToParent({ type: "RITA_FORM_MODAL", payload })) {
				window.removeEventListener("message", onAck);
				setShowFallbackDialog(true);
				return;
			}

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

	// Auto-trigger host modal once for pending interrupt forms
	const modalTriggered = useRef(false);
	useEffect(() => {
		if (modalTriggered.current || isCompleted) return;
		modalTriggered.current = true;
		triggerHostModal();
	}, [isCompleted, triggerHostModal]);

	return (
		<>
			{/* Card showing form title/description with action button or status */}
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
								? new Date(message.metadata.submitted_at).toLocaleString()
								: ""}
						</span>
					) : (
						<Button variant="outline" size="sm" onClick={triggerHostModal}>
							<PenLine className="mr-2 h-4 w-4" />
							Open form
						</Button>
					)}
				</CardContent>
			</Card>

			{/* Tier 2 fallback: in-iframe Dialog for interrupt forms */}
			{message.metadata?.ui_schema && (
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
											? (_p.elements[_p.root]?.props?.description as string)
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
		</>
	);
}
