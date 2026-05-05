import { Bot, ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import type { MockAgent } from "@/data/mock-v4-agents";
import {
	AI_RESPONSE_TYPE,
	type AIResponseType,
	formatPriority,
	getPriorityColor,
} from "@/lib/tickets/utils";
import { cn } from "@/lib/utils";
import { type AIResponseData, AIResponseSection } from "./AIResponseSection";
import { AgentLiveRun } from "./AgentLiveRun";
import { FeedbackSection } from "./FeedbackSection";
import type { ReviewTicket } from "./ReviewAIResponseSheet";

interface ReviewViewProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	ticket: ReviewTicket;
	aiResponse: AIResponseData;
	/** AI response type for badge display (default: "auto-respond") */
	aiResponseType?: AIResponseType;
	currentIndex: number;
	totalTickets: number;
	showFeedback: boolean;
	onApprove: () => void;
	onReject: () => void;
	onSubmitFeedback: (reasons: string[], feedback: string) => void;
	onCancelFeedback: () => void;
	/** v4: When provided, renders agent response side-by-side and enables Trust Agent action */
	agent?: MockAgent | null;
	onTrustAgent?: () => void;
}

/**
 * Main review interface for a single ticket
 *
 * Features:
 * - Progress indicator
 * - Ticket details display
 * - AI response preview
 * - Approve/Reject actions
 * - Feedback collection
 *
 * @component
 */
export function ReviewView({
	open,
	onOpenChange,
	ticket,
	aiResponse,
	aiResponseType = AI_RESPONSE_TYPE.AUTO_RESPOND,
	currentIndex,
	totalTickets,
	showFeedback,
	onApprove,
	onReject,
	onSubmitFeedback,
	onCancelFeedback,
	agent,
	onTrustAgent,
}: ReviewViewProps) {
	const { t } = useTranslation("tickets");
	const progressValue = ((currentIndex + 1) / totalTickets) * 100;
	const isCompare = !!(agent && onTrustAgent);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				className={cn(
					"flex flex-col gap-6 w-full p-8",
					isCompare ? "sm:max-w-5xl" : "sm:max-w-2xl",
				)}
			>
				<SheetHeader className="p-0">
					<SheetTitle className="text-lg font-semibold">
						{t("review.title")}
					</SheetTitle>
					<SheetDescription className="text-sm text-muted-foreground">
						{t("review.sheetDescription")}
					</SheetDescription>
				</SheetHeader>

				{/* Progress Indicator */}
				<div className="flex items-center gap-3 w-full">
					<div className="flex items-center gap-1.5 shrink-0">
						<p className="text-base text-accent-foreground">
							{t("details.ticketsCount")}
						</p>
						<p className="text-base font-bold text-accent-foreground">
							{currentIndex + 1} of {totalTickets}
						</p>
					</div>
					<Progress value={progressValue} className="flex-1 h-2" />
				</div>

				{/* Content Area */}
				<div className="flex-1 flex flex-col gap-2 overflow-hidden">
					<div className="flex-1 flex flex-col gap-6 overflow-y-auto">
						{/* Ticket Details Section */}
						<div className="flex flex-col gap-2">
							<p className="text-sm text-foreground">
								{t("review.ticketDetails")}
							</p>
							<div className="border rounded-lg p-4 flex flex-col gap-2.5">
								<div className="flex items-center gap-2 w-full">
									<p className="text-base flex-1">{ticket.externalId}</p>
									<Badge
										className={cn(
											"px-2 py-0.5 border font-semibold",
											getPriorityColor(ticket.priority),
										)}
									>
										{formatPriority(ticket.priority)}
									</Badge>
								</div>

								<p className="text-base">{ticket.title}</p>

								<Separator className="h-[1px]" />

								<div className="flex flex-col gap-2">
									<p className="text-sm text-muted-foreground">
										{t("details.description")}
									</p>
									<p className="text-base">{ticket.description}</p>
								</div>
							</div>
						</div>

						{/* Response Section(s) */}
						{isCompare && agent ? (
							<div className="flex flex-col lg:flex-row gap-4">
								<AIResponseSection
									response={aiResponse}
									type={aiResponseType}
								/>
								<AgentLiveRun
									agent={agent}
									ticketKey={ticket.id}
									ticketLabel={ticket.externalId}
									confidence={Math.max(
										75,
										Math.min(96, aiResponse.confidenceScore + 4),
									)}
								/>
							</div>
						) : (
							<AIResponseSection response={aiResponse} type={aiResponseType} />
						)}
					</div>
				</div>

				{/* Feedback Section - Floating overlay over footer */}
				<FeedbackSection
					show={showFeedback}
					onSubmit={onSubmitFeedback}
					onCancel={onCancelFeedback}
				/>

				{/* Footer Actions */}
				<SheetFooter className="flex-row justify-center gap-2">
					<Button
						variant="outline"
						className="flex-1 gap-2 border-destructive text-foreground"
						onClick={onReject}
						disabled={showFeedback}
					>
						<ThumbsDown className="size-4 text-destructive" />
						{t("review.teachTheBot")}
					</Button>
					<Button
						variant="outline"
						className="flex-1 gap-2 border-primary text-foreground"
						onClick={onApprove}
						disabled={showFeedback}
					>
						<ThumbsUp className="size-4 text-primary" />
						{isCompare ? "Trust AI" : t("review.trustTheBot")}
					</Button>
					{isCompare && onTrustAgent && (
						<Button
							className="flex-1 gap-2"
							onClick={onTrustAgent}
							disabled={showFeedback}
						>
							<Bot className="size-4" />
							Trust Agent
						</Button>
					)}
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
