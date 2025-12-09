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
}: EnableAutoRespondModalProps) {
	const handleEnable = () => {
		console.log("Auto-Respond enabled for:", ticketGroupName);
		onEnable?.();
		onOpenChange(false);
	};

	const handleCancel = () => {
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Enable Auto-Respond?</DialogTitle>
					<DialogDescription>
						You're about to enable automated responses for all tickets in{" "}
						<span className="font-semibold">{ticketGroupName}</span>.
					</DialogDescription>
					<p className="text-sm text-muted-foreground">
						You can adjust or disable Auto-Respond anytime per ticket group.
					</p>
				</DialogHeader>

				{/* AI Response Preview */}
				<AIResponseSection
					type={AI_RESPONSE_TYPE.AUTO_RESPOND}
					response={aiResponse}
					maxVisibleArticles={1}
					className="flex-none"
				/>

				{/* Info Alert */}
				<StatusAlert variant="info">
					<p className="font-semibold mb-1">When You Enable Auto-Respond</p>
					<ul className="list-disc list-inside space-y-1 text-sm">
						<li>Send automated responses to {openTicketsCount} currently open tickets</li>
						<li>Automatically respond to all future tickets in this group</li>
						<li>Use the responses you've trained Rita with</li>
					</ul>
				</StatusAlert>

				<DialogFooter>
					<Button variant="outline" onClick={handleCancel}>
						Cancel
					</Button>
					<Button onClick={handleEnable}>Enable Auto-Respond</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default EnableAutoRespondModal;
