import { ChevronDown, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import { useClusterTickets } from "@/hooks/useClusters";
import { useDebounce } from "@/hooks/useDebounce";
import { renderSortIcon } from "@/lib/table-utils";
import type {
	ClusterTicketsQueryParams,
	SortDirection,
	TicketSortOption,
} from "@/types/cluster";

interface ClusterDetailTableProps {
	/** Cluster ID for fetching tickets */
	clusterId?: string;
	/** Total ticket count from cluster details */
	totalCount?: number;
	/** Open ticket count from cluster details */
	openCount?: number;
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

// Extract source from source_metadata (Freshservice stores source as a number)
const getTicketSource = (metadata: Record<string, unknown>): string => {
	return (metadata?.source as string) || "";
};

// Get source icon path
const getSourceIcon = (source: string): string => {
	return `/connections/icon_${source.toLowerCase()}.svg`;
};

// Capitalize first letter of a string
const capitalize = (value: string): string => {
	return value.charAt(0).toUpperCase() + value.slice(1);
};

/**
 * ClusterDetailTable - Table displaying tickets with filters and pagination
 */
export function ClusterDetailTable({
	clusterId,
	totalCount,
	openCount: clusterOpenCount,
}: ClusterDetailTableProps) {
	const { t } = useTranslation("tickets");
	const [activeTab, setActiveTab] = useState<"open" | "all">("open");
	const [cursor, setCursor] = useState<string | undefined>(undefined);
	const [searchQuery, setSearchQuery] = useState("");
	const [sortField, setSortField] = useState<TicketSortOption>("created_at");
	const [sortDir, setSortDir] = useState<SortDirection>("desc");
	const [priorityFilter, setPriorityFilter] = useState<string | undefined>();
	const [statusFilter, setStatusFilter] = useState<string | undefined>();

	// Debounce search to avoid excessive API calls
	const debouncedSearch = useDebounce(searchQuery, 300);

	const queryParams: ClusterTicketsQueryParams = {
		cursor,
		limit: 20,
		search: debouncedSearch || undefined,
		sort: sortField,
		sort_dir: sortDir,
	};

	const { data, isLoading, error } = useClusterTickets(clusterId, queryParams);
	const rawTickets = data?.data ?? [];
	const pagination = data?.pagination;

	// Client-side filters for tab, priority and status
	const tickets = useMemo(() => {
		let filtered = rawTickets;
		if (activeTab === "open") {
			filtered = filtered.filter((t) => t.external_status === "Open");
		}
		if (priorityFilter) {
			filtered = filtered.filter((t) => t.priority === priorityFilter);
		}
		if (statusFilter) {
			filtered = filtered.filter((t) => t.external_status === statusFilter);
		}
		return filtered;
	}, [rawTickets, activeTab, priorityFilter, statusFilter]);

	// Derive unique filter options from current data
	const priorityOptions = useMemo(
		() =>
			[
				...new Set(rawTickets.map((t) => t.priority).filter(Boolean)),
			] as string[],
		[rawTickets],
	);
	const statusOptions = useMemo(
		() =>
			[
				...new Set(rawTickets.map((t) => t.external_status).filter(Boolean)),
			] as string[],
		[rawTickets],
	);

	// Handle search input
	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(e.target.value);
		setCursor(undefined);
	};

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

	const openTabCount =
		clusterOpenCount ??
		rawTickets.filter((t) => t.external_status === "Open").length;
	const allTabCount = totalCount ?? rawTickets.length;

	const handleTabChange = (tab: "open" | "all") => {
		setActiveTab(tab);
		setCursor(undefined);
		setStatusFilter(undefined);
	};

	return (
		<div className="flex flex-col gap-3">
			{/* Tabs */}
			<div className="flex gap-4 border-b">
				<button
					type="button"
					onClick={() => handleTabChange("open")}
					className={`pb-2 text-sm font-medium transition-colors ${
						activeTab === "open"
							? "border-b-2 border-foreground text-foreground"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					Open ({openTabCount})
				</button>
				<button
					type="button"
					onClick={() => handleTabChange("all")}
					className={`pb-2 text-sm font-medium transition-colors ${
						activeTab === "all"
							? "border-b-2 border-foreground text-foreground"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					All ({allTabCount})
				</button>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-2">
				<div className="relative flex-1 min-w-[200px] max-w-sm">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder={t("table.searchPlaceholder")}
						className="pl-10"
						value={searchQuery}
						onChange={handleSearchChange}
					/>
				</div>

				{/* Priority filter */}
				{priorityOptions.length > 0 && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm">
								{priorityFilter
									? capitalize(priorityFilter)
									: t("table.headers.priority")}
								<ChevronDown className="ml-1 h-3.5 w-3.5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem onClick={() => setPriorityFilter(undefined)}>
								All
							</DropdownMenuItem>
							{priorityOptions.map((p) => (
								<DropdownMenuItem key={p} onClick={() => setPriorityFilter(p)}>
									{capitalize(p)}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				)}

				{/* Status filter */}
				{statusOptions.length > 0 && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm">
								{statusFilter || t("table.headers.status")}
								<ChevronDown className="ml-1 h-3.5 w-3.5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem onClick={() => setStatusFilter(undefined)}>
								All
							</DropdownMenuItem>
							{statusOptions.map((s) => (
								<DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>
									{s}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
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
							<TableHead>{t("table.headers.priority")}</TableHead>
							<TableHead>{t("table.headers.status")}</TableHead>
							<TableHead>{t("table.headers.assignmentGroup")}</TableHead>
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
						</TableRow>
					</TableHeader>
					<TableBody>
						{tickets.length === 0 ? (
							<TableRow>
								<TableCell colSpan={7} className="h-24 text-center">
									{t("table.noTickets")}
								</TableCell>
							</TableRow>
						) : (
							tickets.map((row) => (
								<TableRow key={row.id}>
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
										{row.priority ? capitalize(row.priority) : "\u2014"}
									</TableCell>
									<TableCell>{row.external_status || "\u2014"}</TableCell>
									<TableCell>{row.assigned_to || "\u2014"}</TableCell>
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
		</div>
	);
}
