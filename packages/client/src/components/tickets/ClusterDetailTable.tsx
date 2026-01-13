// TODO: Uncomment ChevronDown when source filter data is available
import { /* ChevronDown, */ Loader2, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { BulkActions } from "@/components/BulkActions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClusterTickets } from "@/hooks/useClusters";
import { useDebounce } from "@/hooks/useDebounce";
import { renderSortIcon } from "@/lib/table-utils";
import type {
	ClusterTicketsQueryParams,
	SortDirection,
	Ticket,
	TicketSortOption,
} from "@/types/cluster";
import ReviewAIResponseSheet, {
	type ReviewTicket,
	type ReviewStats,
} from "./ReviewAIResponseSheet";

interface ClusterDetailTableProps {
	/** Cluster ID for fetching tickets */
	clusterId?: string;
	/** Called when AI review is completed with stats */
	onReviewComplete?: (stats: ReviewStats) => void;
}

// Format date for display
const formatDate = (dateString: string): string => {
	const date = new Date(dateString);
	return date.toLocaleDateString("en-US", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

// Extract source from source_metadata or default to servicenow
const getTicketSource = (metadata: Record<string, unknown>): string => {
	return (metadata?.source as string) || "";
};

// Get source icon path
const getSourceIcon = (source: string): string => {
	return `/connections/icon_${source.toLowerCase()}.svg`;
};

/**
 * ClusterDetailTable - Table displaying tickets with filters and pagination
 */
export function ClusterDetailTable({
	clusterId,
	onReviewComplete,
}: ClusterDetailTableProps) {
	const { t } = useTranslation("tickets");
	const [activeTab, setActiveTab] = useState<"needs_response" | "completed">(
		"needs_response",
	);
	const [cursor, setCursor] = useState<string | undefined>(undefined);
	const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [sortField, setSortField] = useState<TicketSortOption>("created_at");
	const [sortDir, setSortDir] = useState<SortDirection>("desc");
	// TODO: Uncomment when source filter data is available (tickets need data_source_connection_id populated)
	// const [sourceFilter, setSourceFilter] = useState<string | undefined>(undefined);

	// Debounce search to avoid excessive API calls
	const debouncedSearch = useDebounce(searchQuery, 300);

	const queryParams: ClusterTicketsQueryParams = {
		tab: activeTab,
		cursor,
		limit: 20,
		search: debouncedSearch || undefined,
		sort: sortField,
		sort_dir: sortDir,
		// TODO: Uncomment when source filter data is available
		// source: sourceFilter,
	};

	const { data, isLoading, error } = useClusterTickets(clusterId, queryParams);
	const tickets = data?.data ?? [];
	const pagination = data?.pagination;

	// Review sheet state
	const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
	const [reviewTickets, setReviewTickets] = useState<ReviewTicket[]>([]);
	const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

	// Handle tab change - reset cursor and search
	const handleTabChange = (value: string) => {
		setActiveTab(value as "needs_response" | "completed");
		setCursor(undefined);
		setSelectedTickets([]);
		setSearchQuery("");
	};

	// Handle search input
	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(e.target.value);
		setCursor(undefined); // Reset pagination when searching
	};

	// TODO: Uncomment when source filter data is available
	// const handleSourceChange = (value: string) => {
	// 	setSourceFilter(value === "all" ? undefined : value);
	// 	setCursor(undefined);
	// };

	// Generic sort handler for columns
	const handleSort = (field: TicketSortOption) => {
		if (sortField === field) {
			setSortDir(sortDir === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDir(field === "created_at" ? "desc" : "asc");
		}
		setCursor(undefined);
	};

	// Selection handlers
	const handleSelectAll = (checked: boolean) => {
		if (checked) {
			setSelectedTickets(tickets.map((t) => t.id));
		} else {
			setSelectedTickets([]);
		}
	};

	const handleSelectTicket = (ticketId: string, checked: boolean) => {
		if (checked) {
			setSelectedTickets([...selectedTickets, ticketId]);
		} else {
			setSelectedTickets(selectedTickets.filter((id) => id !== ticketId));
		}
	};

	// Convert Ticket to ReviewTicket format
	const convertToReviewTicket = (ticket: Ticket): ReviewTicket => ({
		id: ticket.id,
		externalId: ticket.external_id,
		title: ticket.subject,
		description: ticket.cluster_text || "No description provided.",
		priority: "medium",
	});

	// Single ticket review
	const reviewAI = (ticketId: string) => {
		const ticket = tickets.find((t) => t.id === ticketId);
		if (ticket) {
			setReviewTickets([convertToReviewTicket(ticket)]);
			setCurrentReviewIndex(0);
			setReviewSheetOpen(true);
		}
	};

	// Bulk review handler
	const handleBulkReviewAI = async () => {
		const ticketsToReview = tickets
			.filter((t) => selectedTickets.includes(t.id))
			.map(convertToReviewTicket);

		setReviewTickets(ticketsToReview);
		setCurrentReviewIndex(0);
		setReviewSheetOpen(true);
	};

	// Handle approve/reject actions
	const handleApprove = (ticketId: string) => {
		console.log(`Approved AI response for ticket: ${ticketId}`);
		// TODO: Implement API call to approve response
	};

	const handleReject = (ticketId: string) => {
		console.log(`Rejected AI response for ticket: ${ticketId}`);
		// TODO: Implement API call to reject response or open editor
	};

	const handleNavigate = (index: number) => {
		setCurrentReviewIndex(index);
	};

	const handleReviewSheetClose = (open: boolean) => {
		setReviewSheetOpen(open);
		if (!open) {
			setSelectedTickets([]);
		}
	};

	// Pagination handlers
	const handleNextPage = () => {
		if (pagination?.next_cursor) {
			setCursor(pagination.next_cursor);
		}
	};

	if (isLoading) {
		return (
			<div className="flex min-h-[300px] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex min-h-[300px] items-center justify-center">
				<p className="text-destructive">{t("table.failedToLoad")}</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{/* Filters or Bulk Actions */}
			{selectedTickets.length === 0 ? (
				<div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
						<Tabs
							value={activeTab}
							onValueChange={handleTabChange}
							className="w-fit"
						>
							<TabsList>
								<TabsTrigger value="needs_response">{t("table.tabs.needsResponse")}</TabsTrigger>
								<TabsTrigger value="completed">{t("table.tabs.completed")}</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>

					<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
						{/* TODO: Uncomment when source filter data is available (tickets need data_source_connection_id populated)
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" className="w-fit">
									{sourceFilter
										? sourceFilter.charAt(0).toUpperCase() +
											sourceFilter.slice(1)
										: "All Sources"}
									<ChevronDown className="ml-2 h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuItem onClick={() => handleSourceChange("all")}>
									All Sources
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => handleSourceChange("servicenow")}
								>
									ServiceNow
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						*/}

						<Input
							placeholder={t("table.searchPlaceholder")}
							className="md:w-64 w-full"
							value={searchQuery}
							onChange={handleSearchChange}
						/>
					</div>
				</div>
			) : (
				<BulkActions
					selectedItems={selectedTickets.map(String)}
					actions={[
						{
							key: "review",
							label: t("table.actions.reviewAIResponses"),
							variant: "default",
							onClick: handleBulkReviewAI,
						},
					]}
					onClose={() => setSelectedTickets([])}
					itemLabel="tickets"
				/>
			)}

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-8">
								<Checkbox
									checked={
										tickets.length > 0 &&
										selectedTickets.length === tickets.length
									}
									onCheckedChange={(checked) =>
										handleSelectAll(checked as boolean)
									}
								/>
							</TableHead>
							<TableHead>
								<Button
									variant="ghost"
									className="h-auto p-0 flex items-center gap-2"
									onClick={() => handleSort("subject")}
								>
									{t("table.headers.subject")}
									{renderSortIcon(sortField, "subject", sortDir)}
								</Button>
							</TableHead>
							<TableHead>
								<Button
									variant="ghost"
									className="h-auto p-0 flex items-center gap-2"
									onClick={() => handleSort("external_id")}
								>
									{t("table.headers.externalId")}
									{renderSortIcon(sortField, "external_id", sortDir)}
								</Button>
							</TableHead>
							<TableHead>{t("table.headers.source")}</TableHead>
							<TableHead className="text-right">
								<Button
									variant="ghost"
									className="h-auto p-0 flex items-center gap-2 ml-auto"
									onClick={() => handleSort("created_at")}
								>
									{t("table.headers.created")}
									{renderSortIcon(sortField, "created_at", sortDir)}
								</Button>
							</TableHead>
							<TableHead className="w-16" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{tickets.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} className="h-24 text-center">
									{t("table.noTickets")}
								</TableCell>
							</TableRow>
						) : (
							tickets.map((row) => (
								<TableRow key={row.id}>
									<TableCell>
										<Checkbox
											checked={selectedTickets.includes(row.id)}
											onCheckedChange={(checked) =>
												handleSelectTicket(row.id, checked as boolean)
											}
										/>
									</TableCell>
									<TableCell className="font-medium">
										<Link
											to={`/tickets/${clusterId}/${row.id}`}
											className="text-primary hover:underline"
										>
											{row.subject}
										</Link>
									</TableCell>
									<TableCell>{row.external_id}</TableCell>
									<TableCell>
										{getTicketSource(row.source_metadata) && (
											<img
												src={getSourceIcon(
													getTicketSource(row.source_metadata),
												)}
												alt={getTicketSource(row.source_metadata)}
												className="h-5 w-5"
											/>
										)}
									</TableCell>
									<TableCell className="text-right text-sm">
										{formatDate(row.created_at)}
									</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon">
													<MoreHorizontal />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={() => reviewAI(row.id)}>
													{t("table.actions.reviewAI")}
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Table Footer - Pagination */}
			<div className="flex items-center justify-between py-4">
				<p className="text-sm text-muted-foreground">
					{t("table.pagination.ticketsCount", { count: tickets.length })}
				</p>
				<div className="flex gap-2">
					<Button
						variant="outline"
						disabled={!cursor}
						onClick={() => setCursor(undefined)}
					>
						{t("table.pagination.first")}
					</Button>
					<Button
						variant="outline"
						disabled={!pagination?.has_more}
						onClick={handleNextPage}
					>
						{t("table.pagination.next")}
					</Button>
				</div>
			</div>

			{/* Review AI Response Sheet */}
			<ReviewAIResponseSheet
				open={reviewSheetOpen}
				onOpenChange={handleReviewSheetClose}
				ticketGroupId={clusterId}
				tickets={reviewTickets}
				currentIndex={currentReviewIndex}
				onNavigate={handleNavigate}
				onApprove={handleApprove}
				onReject={handleReject}
				onReviewComplete={onReviewComplete}
			/>
		</div>
	);
}
