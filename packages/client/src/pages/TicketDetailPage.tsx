import { ChevronLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router-dom";
import RitaLayout from "@/components/layouts/RitaLayout";
import ReviewAIResponseSheet from "@/components/tickets/ReviewAIResponseSheet";
import { TicketDetailHeader } from "@/components/tickets/TicketDetailHeader";
import TicketDetailsCard from "@/components/tickets/TicketDetailsCard";
import { buttonVariants } from "@/components/ui/button";
import { useClusterTickets, useTicket } from "@/hooks/useClusters";
import type {
	ClusterTicketsQueryParams,
	SortDirection,
	TicketSortOption,
} from "@/types/cluster";

export default function TicketDetailPage() {
	const { t } = useTranslation("tickets");
	const { clusterId, ticketId } = useParams<{
		clusterId: string;
		ticketId: string;
	}>();
	const [searchParams] = useSearchParams();
	const { data: ticket, isLoading, error } = useTicket(ticketId);
	const [reviewSheetOpen, setReviewSheetOpen] = useState(false);

	// Read navigation context from URL search params (set by ClusterDetailTable)
	const idxParam = searchParams.get("idx");
	const idx = idxParam !== null ? Number(idxParam) : undefined;
	const hasNavContext = idx !== undefined && !Number.isNaN(idx);

	// Build neighbor query params (only when nav context exists)
	const neighborParams: ClusterTicketsQueryParams | undefined = hasNavContext
		? {
				offset: Math.max(0, idx - 1),
				limit: 3,
				...(searchParams.get("sort") && {
					sort: searchParams.get("sort") as TicketSortOption,
				}),
				...(searchParams.get("sort_dir") && {
					sort_dir: searchParams.get("sort_dir") as SortDirection,
				}),
				...(() => {
					const tab = searchParams.get("tab");
					if (tab === "open") return { external_status: "Open" };
					if (tab === "needs_response" || tab === "completed") return { tab };
					return {};
				})(),
				...(searchParams.get("search") && {
					search: searchParams.get("search") ?? undefined,
				}),
			}
		: undefined;

	const { data: neighborsData } = useClusterTickets(
		hasNavContext ? clusterId : undefined,
		neighborParams,
		{ keepPrevious: true },
	);

	// Derive prev/next ticket IDs from the 3-ticket neighbor window
	const results = neighborsData?.data ?? [];
	const offset = hasNavContext ? Math.max(0, idx - 1) : 0;
	const currentPosInResults = hasNavContext ? idx - offset : -1;

	const prevTicketId =
		hasNavContext && currentPosInResults > 0
			? (results[currentPosInResults - 1]?.id ?? null)
			: null;

	const nextTicketId =
		hasNavContext && currentPosInResults < results.length - 1
			? (results[currentPosInResults + 1]?.id ?? null)
			: null;

	const totalTickets = neighborsData?.pagination?.total;

	// Build search params string for header navigation (without idx — header adds it)
	const headerSearchParams = hasNavContext
		? (() => {
				const params = new URLSearchParams(searchParams);
				params.delete("idx");
				return params.toString();
			})()
		: undefined;

	if (isLoading) {
		return (
			<RitaLayout activePage="tickets">
				<div className="flex min-h-screen items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			</RitaLayout>
		);
	}

	if (error || !ticket) {
		return (
			<RitaLayout activePage="tickets">
				<div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
					<p className="text-muted-foreground">{t("page.notFound")}</p>
					<Link
						to={clusterId ? `/tickets/${clusterId}` : "/tickets"}
						className={buttonVariants({ variant: "outline" })}
					>
						<ChevronLeft className="mr-2 h-4 w-4" />
						{t("navigation.backToCluster")}
					</Link>
				</div>
			</RitaLayout>
		);
	}

	// Map API ticket to card format
	const ticketForCard = {
		id: ticket.external_id,
		title: ticket.subject,
		description: ticket.description || "No description available.",
		priority:
			(ticket.priority as "low" | "medium" | "high" | "critical") ?? null,
		requester: ticket.requester,
		status: ticket.external_status,
		assignedTo: ticket.assigned_to,
		createdAt: ticket.created_at,
	};

	const handleApprove = (id: string) => {
		console.log(`Approved AI response for ticket: ${id}`);
		// TODO: Implement API call
	};

	const handleReject = (id: string) => {
		console.log(`Rejected AI response for ticket: ${id}`);
		// TODO: Implement API call
	};

	return (
		<RitaLayout activePage="tickets">
			<div className="flex flex-col">
				{/* Full-width Header */}
				<TicketDetailHeader
					ticketId={ticket.id}
					externalId={ticket.external_id}
					clusterId={clusterId}
					prevTicketId={prevTicketId}
					nextTicketId={nextTicketId}
					currentPosition={hasNavContext ? idx : undefined}
					totalTickets={totalTickets}
					searchParams={headerSearchParams}
					onReviewAIResponse={() => setReviewSheetOpen(true)}
				/>

				{/* Content */}
				<div className="flex flex-col gap-4 p-4 w-full max-w-3xl mx-auto">
					{/* Page Header */}
					<h1 className="heading-lg text-xl font-medium">{ticket.subject}</h1>

					{/* Ticket Details Card */}
					<TicketDetailsCard ticket={ticketForCard} />
				</div>

				{/* Review AI Response Sheet */}
				<ReviewAIResponseSheet
					open={reviewSheetOpen}
					onOpenChange={setReviewSheetOpen}
					ticketGroupId={clusterId}
					tickets={[
						{
							id: ticket.id,
							externalId: ticket.external_id,
							title: ticket.subject,
							description: ticket.description || "No description available.",
							priority: ticketForCard.priority,
						},
					]}
					currentIndex={0}
					onNavigate={() => {}}
					onApprove={handleApprove}
					onReject={handleReject}
				/>
			</div>
		</RitaLayout>
	);
}
