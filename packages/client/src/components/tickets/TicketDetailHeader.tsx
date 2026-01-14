import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TicketDetailHeaderProps {
	/** Current ticket ID for navigation */
	ticketId: string;
	/** External ticket ID to display (e.g., INC-1001) */
	externalId: string;
	/** Cluster ID for back navigation */
	clusterId?: string;
	/** List of all ticket IDs for navigation */
	ticketIds: string[];
	/** Callback when Review AI response button is clicked */
	onReviewAIResponse: () => void;
	/** Optional callback for back navigation - overrides default */
	onBack?: () => void;
	/** Optional callback for previous ticket - overrides default */
	onPrevious?: () => void;
	/** Optional callback for next ticket - overrides default */
	onNext?: () => void;
}

/**
 * TicketDetailHeader - Full-width header for ticket detail page
 *
 * Features:
 * - Back arrow to return to cluster
 * - Current ticket ID display
 * - Up/Down navigation between tickets
 * - Review AI response button
 */
export function TicketDetailHeader({
	ticketId,
	externalId,
	clusterId,
	ticketIds,
	onReviewAIResponse,
	onBack,
	onPrevious,
	onNext,
}: TicketDetailHeaderProps) {
	const { t } = useTranslation("tickets");
	const navigate = useNavigate();

	const currentIndex = ticketIds.indexOf(ticketId);
	const hasPrevious = currentIndex > 0;
	const hasNext = currentIndex < ticketIds.length - 1;

	const handleBack = () => {
		if (onBack) {
			onBack();
		} else {
			navigate(clusterId ? `/tickets/${clusterId}` : "/tickets");
		}
	};

	const handlePrevious = () => {
		if (hasPrevious) {
			if (onPrevious) {
				onPrevious();
			} else {
				const prevTicketId = ticketIds[currentIndex - 1];
				navigate(`/tickets/${clusterId}/${prevTicketId}`);
			}
		}
	};

	const handleNext = () => {
		if (hasNext) {
			if (onNext) {
				onNext();
			} else {
				const nextTicketId = ticketIds[currentIndex + 1];
				navigate(`/tickets/${clusterId}/${nextTicketId}`);
			}
		}
	};

	return (
		<div className="flex flex-col md:flex-row items-center justify-between w-full border-b bg-background px-4 py-2 space-y-4 md:space-y-0">
			{/* Left side - Back button, Ticket ID, Navigation */}
			<div className="flex items-center gap-2">
				<Button
					variant="ghost"
					size="icon"
					onClick={handleBack}
					aria-label={t("navigation.backToCluster")}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>

				<div className="flex items-center gap-2">
					<span className="text-base">{externalId}</span>

					<Button
						variant="outline"
						size="icon"
						onClick={handleNext}
						disabled={!hasNext}
						aria-label={t("navigation.nextTicket")}
					>
						<ChevronDown className="h-4 w-4" />
					</Button>

					<Button
						variant="outline"
						size="icon"
						onClick={handlePrevious}
						disabled={!hasPrevious}
						aria-label={t("navigation.previousTicket")}
					>
						<ChevronUp className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{/* Right side - Review AI response button */}
			<Button onClick={onReviewAIResponse}>
				{t("review.title")}
			</Button>
		</div>
	);
}
