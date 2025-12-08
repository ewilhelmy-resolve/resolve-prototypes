import { useState, useEffect } from "react";
import { CompletionView } from "./CompletionView";
import { ReviewView } from "./ReviewView";
import type { AIResponseData } from "./AIResponseSection";

/**
 * Ticket priority level
 */
export type TicketPriority = "low" | "medium" | "high" | "critical";

// Re-export types from AIResponseSection for backwards compatibility
export type { KBArticle, AIResponseData as AIResponse } from "./AIResponseSection";

/**
 * Ticket details for review
 */
export interface ReviewTicket {
	id: string;
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
	tickets: ReviewTicket[];
	currentIndex: number;
	onNavigate: (index: number) => void;
	onApprove: (ticketId: string) => void;
	onReject: (ticketId: string) => void;
	/** Called when user clicks "Enable Auto-Respond" on completion screen */
	onEnableAutoRespond?: (stats: ReviewStats) => void;
	/** Called when user clicks "Keep reviewing" on completion screen */
	onKeepReviewing?: () => void;
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
 * @component
 */
export default function ReviewAIResponseSheet({
	open,
	onOpenChange,
	tickets,
	currentIndex,
	onNavigate,
	onApprove,
	onReject,
	onEnableAutoRespond,
	onKeepReviewing,
}: ReviewAIResponseSheetProps) {
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

	// Calculate review stats for completion screen
	// Calculate confidence improvement based on trusted percentage
	const totalReviewed = isCompleted ? tickets.length : trustedCount + rejectedCount;
	const confidencePercentage = totalReviewed > 0 
		? Math.round((trustedCount / totalReviewed) * 100)
		: 0;

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
				onEnableAutoRespond={onEnableAutoRespond}
				onKeepReviewing={onKeepReviewing}
			/>
		);
	}

	// Mock AI response - replace with actual data
	const aiResponse: AIResponseData = {
		content: `Hi {name},

Thank you for reaching out about your email signature. I'd be happy to help you update it to reflect your new role.

Here are the steps to update your email signature:

• Open Outlook and navigate to File > Options > Mail
• Click on "Signatures" button
• Select your existing signature or create a new one
• Update your information (name, contact details)
• Click OK to save and apply to new messages

Please let me know if these steps resolve your issue. If you need any additional assistance with formatting or have questions, I'm here to help!`,
		kbArticles: [
			{ id: "KB0004", title: "Email Signature Configuration Guide" },
			{ id: "KB0012", title: "Outlook Profile Settings" },
			{ id: "KB0023", title: "Corporate Branding Guidelines" },
			{ id: "KB0034", title: "Email Template Best Practices" },
			{ id: "KB0045", title: "Troubleshooting Email Display" },
		],
		confidenceScore: 92,
	};

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
