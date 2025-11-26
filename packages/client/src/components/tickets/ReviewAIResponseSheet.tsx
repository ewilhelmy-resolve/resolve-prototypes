import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThumbsDown, ThumbsUp, Sparkles, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Ticket priority level
 */
export type TicketPriority = "low" | "medium" | "high" | "critical";

/**
 * Knowledge base article reference
 */
export interface KBArticle {
	id: string;
	title: string;
}

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
 * AI-generated response for a ticket
 */
export interface AIResponse {
	content: string;
	kbArticles: KBArticle[];
	confidenceScore: number; // 0-100
}

interface ReviewAIResponseSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	tickets: ReviewTicket[];
	currentIndex: number;
	onNavigate: (index: number) => void;
	onApprove: (ticketId: string) => void;
	onReject: (ticketId: string) => void;
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
}: ReviewAIResponseSheetProps) {
	const currentTicket = tickets[currentIndex];
	const progressValue = ((currentIndex + 1) / tickets.length) * 100;

	// Don't render if no tickets or invalid index
	if (!currentTicket || tickets.length === 0) {
		return null;
	}

	// Mock AI response - replace with actual data
	const aiResponse: AIResponse = {
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
		onApprove(currentTicket.id);
		// Navigate to next ticket if available
		if (currentIndex < tickets.length - 1) {
			onNavigate(currentIndex + 1);
		} else {
			onOpenChange(false);
		}
	};

	const handleReject = () => {
		onReject(currentTicket.id);
		// Navigate to next ticket if available
		if (currentIndex < tickets.length - 1) {
			onNavigate(currentIndex + 1);
		} else {
			onOpenChange(false);
		}
	};

	const getPriorityColor = (priority: TicketPriority) => {
		switch (priority) {
			case "critical":
				return "bg-red-50 text-red-800 border-red-400";
			case "high":
				return "bg-orange-50 text-orange-800 border-orange-400";
			case "medium":
				return "bg-yellow-50 text-yellow-800 border-yellow-400";
			case "low":
				return "bg-blue-50 text-blue-800 border-blue-400";
		}
	};

	const getConfidenceColor = (score: number) => {
		if (score >= 90) return "bg-teal-500";
		if (score >= 75) return "bg-green-500";
		if (score >= 60) return "bg-yellow-500";
		return "bg-orange-500";
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="flex flex-col gap-6 sm:max-w-2xl w-full p-8">
				<SheetHeader className="p-0">
					<SheetTitle className="text-lg font-semibold">
						Review AI response
					</SheetTitle>
					<SheetDescription className="text-sm text-muted-foreground">
						Rita analyzed your KB and similar tickets to draft this response.
					</SheetDescription>
				</SheetHeader>

				{/* Progress Indicator */}
				<div className="flex items-center gap-3 w-full">
					<div className="flex items-center gap-1.5 shrink-0">
						<p className="text-base text-accent-foreground">Tickets:</p>
						<p className="text-base font-bold text-accent-foreground">
							{currentIndex + 1} of {tickets.length}
						</p>
					</div>
					<Progress value={progressValue} className="flex-1 h-2" />
				</div>

				{/* Content Area */}
				<div className="flex-1 flex flex-col gap-2 overflow-hidden">
					<div className="flex-1 flex flex-col gap-6 overflow-y-auto">
						{/* Ticket Details Section */}
						<div className="flex flex-col gap-2">
							<p className="text-sm text-foreground">Ticket Details</p>
							<div className="border rounded-lg p-4 flex flex-col gap-2.5">
								<div className="flex items-center gap-2 w-full">
									<p className="text-base flex-1">{currentTicket.id}</p>
									<Badge
										className={cn(
											"px-2 py-0.5 border font-semibold",
											getPriorityColor(currentTicket.priority)
										)}
									>
										{currentTicket.priority.charAt(0).toUpperCase() +
											currentTicket.priority.slice(1)}
									</Badge>
								</div>

								<p className="text-base">{currentTicket.title}</p>

								<Separator className="h-[1px]" />

								<div className="flex flex-col gap-2">
									<p className="text-sm text-muted-foreground">Description</p>
									<p className="text-base">{currentTicket.description}</p>
								</div>
							</div>
						</div>

						{/* AI Response Section */}
						<div className="flex-1 flex flex-col gap-2 min-h-0">
							<div className="flex items-center gap-2">
								<p className="text-sm text-foreground">AI-Response</p>
								<Badge className="px-2 py-0.5 border border-purple-500 bg-purple-50 text-purple-500 font-semibold gap-1">
									<Sparkles className="size-3" />
									Auto-Respond
								</Badge>
							</div>

							<div className="flex-1 flex flex-col gap-4 min-h-0">
								<div className="flex-1 bg-gray-50 border rounded-lg p-4 overflow-y-auto">
									<div className="flex flex-col gap-2">
										<p className="font-mono text-base whitespace-pre-wrap">
											{aiResponse.content}
										</p>

										{/* KB Articles & Confidence */}
										<div className="flex items-center gap-2 flex-wrap">
											<div className="flex items-center gap-2">
												{aiResponse.kbArticles.slice(0, 1).map((article) => (
													<div
														key={article.id}
														className="flex items-center gap-1 px-2.5 py-1 bg-white border rounded-md h-7"
													>
														<FileText className="size-3 text-muted-foreground" />
														<p className="text-sm">
															{article.id} - {article.title}
														</p>
													</div>
												))}
												{aiResponse.kbArticles.length > 1 && (
													<div className="flex items-center px-2.5 py-1 bg-white border rounded-md h-7">
														<p className="text-sm">
															+{aiResponse.kbArticles.length - 1}
														</p>
													</div>
												)}
											</div>
											<Badge
												className={cn(
													"px-2 py-0.5 border border-transparent text-primary-foreground font-semibold",
													getConfidenceColor(aiResponse.confidenceScore)
												)}
											>
												{aiResponse.confidenceScore}% strong
											</Badge>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Footer Actions */}
				<SheetFooter className="flex-row justify-center gap-2">
					<Button
						variant="outline"
						className="flex-1 gap-2 border-destructive text-foreground"
						onClick={handleReject}
					>
						<ThumbsDown className="size-4 text-destructive" />
						Teach the Bot
					</Button>
					<Button
						variant="outline"
						className="flex-1 gap-2 border-primary text-foreground"
						onClick={handleApprove}
					>
						<ThumbsUp className="size-4 text-primary" />
						Trust the Bot
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
