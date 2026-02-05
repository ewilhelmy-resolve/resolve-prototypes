import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { StatusAlert } from "@/components/ui/status-alert";
import { AI_RESPONSE_TYPE } from "@/lib/tickets/utils";
import { type AIResponseData, AIResponseSection } from "./AIResponseSection";

interface EnableAutoRespondModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Ticket group name (e.g., "Email Signatures") */
	ticketGroupName: string;
	/** Number of currently open tickets that will receive automated responses */
	openTicketsCount: number;
	/** AI response preview data (optional - shows empty state if not provided) */
	aiResponse?: AIResponseData;
	/** Called when user confirms enabling auto-respond */
	onEnable?: () => void;
	/** Called after auto-respond is enabled with context for banner */
	onAutoRespondEnabled?: (
		ticketGroupName: string,
		automatedPercentage: number,
	) => void;
}

/**
 * Modal for confirming Auto-Respond enablement
 *
 * Displays:
 * - Confirmation header with ticket group name
 * - AI response preview using AIResponseSection (or empty state if no response)
 * - Info alert explaining what happens when enabled
 * - Cancel/Enable actions
 *
 * @component
 */
export function EnableAutoRespondModal({
	open,
	onOpenChange,
	ticketGroupName,
	openTicketsCount,
	aiResponse,
	onEnable,
	onAutoRespondEnabled,
}: EnableAutoRespondModalProps) {
	const { t } = useTranslation(["tickets", "common"]);

	const handleEnable = () => {
		onEnable?.();
		// Pass ticket group name and a mock automated percentage (would come from real data)
		onAutoRespondEnabled?.(ticketGroupName, 12);
		onOpenChange(false);
	};

	const handleCancel = () => {
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90vh] flex-col sm:max-w-xl">
				<DialogHeader className="flex-none">
					<DialogTitle>{t("automation.enableAutoRespond.title")}</DialogTitle>
					<DialogDescription>
						<Trans
							i18nKey="automation.enableAutoRespond.description"
							ns="tickets"
							values={{ ticketGroupName }}
							components={{ 1: <span className="font-semibold" /> }}
						/>
					</DialogDescription>
					<p className="text-sm text-muted-foreground">
						{t("automation.enableAutoRespond.info")}
					</p>
				</DialogHeader>

				{/* Scrollable Content */}
				<div className="flex-1 space-y-4 overflow-y-auto py-2">
					{/* AI Response Preview */}
					{aiResponse ? (
						<AIResponseSection
							type={AI_RESPONSE_TYPE.AUTO_RESPOND}
							response={aiResponse}
							maxVisibleArticles={1}
							className="flex-none"
						/>
					) : (
						<div className="flex items-center justify-center rounded-lg border bg-muted/50 p-8">
							<p className="text-muted-foreground">
								{t("review.noAiResponse")}
							</p>
						</div>
					)}

					{/* Info Alert */}
					<StatusAlert variant="info">
						<p className="mb-1 font-semibold">{t("autoRespond.whenEnabled")}</p>
						<ul className="list-inside list-disc space-y-1 text-sm">
							<li>
								{t("autoRespond.sendToOpen", { count: openTicketsCount })}
							</li>
							<li>{t("autoRespond.respondToFuture")}</li>
							<li>{t("autoRespond.useTrainedResponses")}</li>
						</ul>
					</StatusAlert>
				</div>

				<DialogFooter className="flex-none">
					<Button variant="outline" onClick={handleCancel}>
						{t("common:actions.cancel")}
					</Button>
					<Button onClick={handleEnable} disabled={!aiResponse}>
						{t("autoRespond.enableButton")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default EnableAutoRespondModal;
