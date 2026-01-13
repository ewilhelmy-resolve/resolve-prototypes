import { useTranslation, Trans } from "react-i18next";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusAlert } from "@/components/ui/status-alert";
import { AIResponseSection, type AIResponseData } from "./AIResponseSection";
import { AI_RESPONSE_TYPE } from "@/lib/tickets/utils";

interface EnableAutoRespondModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Ticket group name (e.g., "Email Signatures") */
	ticketGroupName: string;
	/** Number of currently open tickets that will receive automated responses */
	openTicketsCount: number;
	/** AI response preview data */
	aiResponse: AIResponseData;
	/** Called when user confirms enabling auto-respond */
	onEnable?: () => void;
	/** Called after auto-respond is enabled with context for banner */
	onAutoRespondEnabled?: (ticketGroupName: string, automatedPercentage: number) => void;
}

/**
 * Modal for confirming Auto-Respond enablement
 *
 * Displays:
 * - Confirmation header with ticket group name
 * - AI response preview using AIResponseSection
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
		console.log("Auto-Respond enabled for:", ticketGroupName);
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
			<DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
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
				<div className="flex-1 overflow-y-auto space-y-4 py-2">
					{/* AI Response Preview */}
					<AIResponseSection
						type={AI_RESPONSE_TYPE.AUTO_RESPOND}
						response={aiResponse}
						maxVisibleArticles={1}
						className="flex-none"
					/>

					{/* Info Alert */}
					<StatusAlert variant="info">
						<p className="font-semibold mb-1">{t("autoRespond.whenEnabled")}</p>
						<ul className="list-disc list-inside space-y-1 text-sm">
							<li>{t("autoRespond.sendToOpen", { count: openTicketsCount })}</li>
							<li>{t("autoRespond.respondToFuture")}</li>
							<li>{t("autoRespond.useTrainedResponses")}</li>
						</ul>
					</StatusAlert>
				</div>

				<DialogFooter className="flex-none">
					<Button variant="outline" onClick={handleCancel}>
						{t("common:actions.cancel")}
					</Button>
					<Button onClick={handleEnable}>{t("autoRespond.enableButton")}</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default EnableAutoRespondModal;
