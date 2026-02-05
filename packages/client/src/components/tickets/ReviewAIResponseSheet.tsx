import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { AI_RESPONSE_TYPE, type AIResponseType } from "@/lib/tickets/utils";
import type { AIResponseData } from "./AIResponseSection";
import { CompletionView } from "./CompletionView";
import { ReviewView } from "./ReviewView";

/**
 * Ticket priority level
 */
export type TicketPriority = "low" | "medium" | "high" | "critical";

// Re-export types from AIResponseSection for backwards compatibility
export type {
	AIResponseData as AIResponse,
	KBArticle,
} from "./AIResponseSection";

/**
 * Ticket details for review
 */
export interface ReviewTicket {
	id: string;
	externalId: string;
	title: string;
	description: string;
	priority: TicketPriority;
}

/**
 * Review result statistics
 */
export interface ReviewStats {
	totalReviewed: number;
	trusted: number;
	needsImprovement: number;
	confidenceImprovement: number; // percentage
}

interface ReviewAIResponseSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Ticket group ID (for future API integration) */
	ticketGroupId?: string;
	/** AI response data to review */
	aiResponse?: AIResponseData;
	tickets: ReviewTicket[];
	currentIndex: number;
	/** AI response type being reviewed (default: AI_RESPONSE_TYPE.AUTO_RESPOND) */
	aiResponseType?: AIResponseType;
	onNavigate: (index: number) => void;
	onApprove: (ticketId: string) => void;
	onReject: (ticketId: string) => void;
	/** Called when user clicks "Enable Auto-Respond" on completion screen */
	onEnableAutoRespond?: (stats: ReviewStats) => void;
	/** Called when user clicks "Keep reviewing" on completion screen */
	onKeepReviewing?: () => void;
	/** Called when review is completed (all tickets reviewed) with final stats */
	onReviewComplete?: (stats: ReviewStats) => void;
}

/**
 * Sheet component for reviewing AI-generated ticket responses
 *
 * Features:
 * - Multi-ticket navigation with progress indicator
 * - Ticket details display with priority badge
 * - AI response with confidence score
 * - Knowledge base article references
 * - Approve/reject actions
 *
 * When no AI response is available, displays an empty state message.
 *
 * @component
 */
export default function ReviewAIResponseSheet({
	open,
	onOpenChange,
	ticketGroupId: _ticketGroupId,
	aiResponse,
	tickets,
	currentIndex,
	aiResponseType = AI_RESPONSE_TYPE.AUTO_RESPOND,
	onNavigate,
	onApprove,
	onReject,
	onEnableAutoRespond: _onEnableAutoRespond,
	onKeepReviewing,
	onReviewComplete: _onReviewComplete,
}: ReviewAIResponseSheetProps) {
	const { t } = useTranslation("tickets");
	const [showFeedback, setShowFeedback] = useState(false);
	const [isCompleted, setIsCompleted] = useState(false);
	const [trustedCount, setTrustedCount] = useState(0);
	const [rejectedCount, setRejectedCount] = useState(0);

	const currentTicket = tickets[currentIndex];

	// Reset state when sheet opens
	useEffect(() => {
		if (open) {
			setIsCompleted(false);
			setTrustedCount(0);
			setRejectedCount(0);
			setShowFeedback(false);
		}
	}, [open]);

	// Don't render if no tickets
	if (tickets.length === 0) {
		return null;
	}

	// Show empty state if no AI response available
	if (!aiResponse) {
		return (
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent
					className="flex w-full flex-col p-8 sm:max-w-lg"
					side="right"
				>
					<SheetHeader className="pl-0">
						<SheetTitle>{t("review.title")}</SheetTitle>
						<SheetDescription>{t("review.sheetDescription")}</SheetDescription>
					</SheetHeader>
					<div className="flex flex-1 items-center justify-center">
						<p className="text-muted-foreground">{t("review.noAiResponse")}</p>
					</div>
				</SheetContent>
			</Sheet>
		);
	}

	// Calculate review stats for completion screen
	// Calculate confidence improvement based on trusted percentage
	const totalReviewed = isCompleted
		? tickets.length
		: trustedCount + rejectedCount;
	const confidencePercentage =
		totalReviewed > 0 ? Math.round((trustedCount / totalReviewed) * 100) : 0;

	const reviewStats: ReviewStats = {
		totalReviewed,
		trusted: trustedCount,
		needsImprovement: rejectedCount,
		confidenceImprovement: confidencePercentage,
	};

	// Show completion view when all tickets reviewed
	if (isCompleted) {
		return (
			<CompletionView
				open={open}
				onOpenChange={onOpenChange}
				stats={reviewStats}
				onKeepReviewing={onKeepReviewing}
			/>
		);
	}

	const handleApprove = () => {
		const newTrustedCount = trustedCount + 1;
		setTrustedCount(newTrustedCount);

		// Check if this is the last ticket BEFORE calling parent callback
		const isLastTicket = currentIndex >= tickets.length - 1;

		// Call parent callback
		onApprove(currentTicket.id);

		// Navigate to next ticket if available, otherwise show completion
		if (!isLastTicket) {
			onNavigate(currentIndex + 1);
		} else {
			setIsCompleted(true);
		}
	};

	const handleReject = () => {
		setShowFeedback(true);
	};

	const handleSubmitFeedback = (_reasons: string[], _feedback: string) => {
		const newRejectedCount = rejectedCount + 1;
		setRejectedCount(newRejectedCount);

		// Check if this is the last ticket BEFORE calling parent callback
		const isLastTicket = currentIndex >= tickets.length - 1;

		// Submit feedback logic here (reasons is optional, can be empty array)
		onReject(currentTicket.id);

		// TODO: Send feedback to backend with reasons and feedback

		// Hide feedback section
		setShowFeedback(false);

		// Navigate to next ticket if available, otherwise show completion
		if (!isLastTicket) {
			onNavigate(currentIndex + 1);
		} else {
			setIsCompleted(true);
		}
	};

	const handleCancelFeedback = () => {
		setShowFeedback(false);
	};

	// Review View
	return (
		<ReviewView
			open={open}
			onOpenChange={onOpenChange}
			ticket={currentTicket}
			aiResponse={aiResponse}
			aiResponseType={aiResponseType}
			currentIndex={currentIndex}
			totalTickets={tickets.length}
			showFeedback={showFeedback}
			onApprove={handleApprove}
			onReject={handleReject}
			onSubmitFeedback={handleSubmitFeedback}
			onCancelFeedback={handleCancelFeedback}
		/>
	);
}
