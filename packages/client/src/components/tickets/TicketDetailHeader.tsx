import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface TicketDetailHeaderProps {
	/** Current ticket ID */
	ticketId: string;
	/** External ticket ID to display (e.g., INC-1001) */
	externalId: string;
	/** Cluster ID for back navigation */
	clusterId?: string;
	/** ID of the previous ticket in sorted order */
	prevTicketId?: string | null;
	/** ID of the next ticket in sorted order */
	nextTicketId?: string | null;
	/** 0-based position of current ticket in sorted results */
	currentPosition?: number;
	/** Total tickets matching current filter */
	totalTickets?: number;
	/** URL search params string to preserve on navigation */
	searchParams?: string;
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
 * - Current ticket ID display with position indicator
 * - Up/Down navigation between tickets (preserves sort/filter context)
 * - Review AI response button
 */
export function TicketDetailHeader({
	externalId,
	clusterId,
	prevTicketId,
	nextTicketId,
	currentPosition,
	totalTickets,
	searchParams,
	onReviewAIResponse: _onReviewAIResponse,
	onBack,
	onPrevious,
	onNext,
}: TicketDetailHeaderProps) {
	const { t } = useTranslation("tickets");
	const navigate = useNavigate();

	const hasPrevious = !!prevTicketId;
	const hasNext = !!nextTicketId;

	const positionText =
		currentPosition !== undefined && totalTickets
			? t("navigation.positionOf", {
					current: currentPosition + 1,
					total: totalTickets,
				})
			: undefined;

	const buildNavUrl = (targetTicketId: string, targetIdx: number) => {
		const base = `/tickets/${clusterId}/${targetTicketId}`;
		if (!searchParams) return `${base}?idx=${targetIdx}`;
		return `${base}?${searchParams}&idx=${targetIdx}`;
	};

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
				navigate(buildNavUrl(prevTicketId, (currentPosition ?? 1) - 1));
			}
		}
	};

	const handleNext = () => {
		if (hasNext) {
			if (onNext) {
				onNext();
			} else {
				navigate(buildNavUrl(nextTicketId, (currentPosition ?? 0) + 1));
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

					{positionText && (
						<span className="text-sm text-muted-foreground">
							{positionText}
						</span>
					)}

					<Button
						variant="outline"
						size="icon"
						onClick={handlePrevious}
						disabled={!hasPrevious}
						aria-label={t("navigation.previousTicket")}
					>
						<ChevronUp className="h-4 w-4" />
					</Button>

					<Button
						variant="outline"
						size="icon"
						onClick={handleNext}
						disabled={!hasNext}
						aria-label={t("navigation.nextTicket")}
					>
						<ChevronDown className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{/* Right side - Review AI response button (hidden until feature is ready)
			<Button onClick={onReviewAIResponse}>{t("review.title")}</Button>
			*/}
		</div>
	);
}
