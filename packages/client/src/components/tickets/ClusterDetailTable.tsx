import { ChevronDown, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
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
import { formatDate } from "@/lib/date-utils";
import { renderSortIcon } from "@/lib/table-utils";
import type {
	ClusterTicketsQueryParams,
	SortDirection,
	TicketSortOption,
} from "@/types/cluster";

interface ClusterDetailTableProps {
	clusterId?: string;
	totalCount?: number;
	openCount?: number;
}

const getTicketSource = (metadata: Record<string, unknown>): string => {
	const source = metadata?.source;
	return typeof source === "string" ? source : "";
};

const getSourceIcon = (source: string): string =>
	`/connections/icon_${source.toLowerCase()}.svg`;

const capitalize = (value: string): string =>
	value.charAt(0).toUpperCase() + value.slice(1);

const PAGE_SIZE = 10;

const SORT_HEADER_MAP = {
	subject: "table.headers.subject",
	external_id: "table.headers.externalId",
	created_at: "table.headers.created",
} as const;

function TabButton({
	value,
	label,
	count,
	active,
	onClick,
}: {
	value: string;
	label: string;
	count: number;
	active: boolean;
	onClick: (value: string) => void;
}) {
	return (
		<button
			type="button"
			onClick={() => onClick(value)}
			className={`pb-2 text-sm font-medium transition-colors ${
				active
					? "border-b-2 border-foreground text-foreground"
					: "text-muted-foreground hover:text-foreground"
			}`}
		>
			{label} ({count})
		</button>
	);
}

function FilterDropdown({
	value,
	options,
	label,
	allLabel,
	onChange,
}: {
	value: string | undefined;
	options: string[];
	label: string;
	allLabel: string;
	onChange: (v: string | undefined) => void;
}) {
	if (options.length === 0) return null;
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm">
					{value ? capitalize(value) : label}
					<ChevronDown className="ml-1 h-3.5 w-3.5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem onClick={() => onChange(undefined)}>
					{allLabel}
				</DropdownMenuItem>
				{options.map((opt) => (
					<DropdownMenuItem key={opt} onClick={() => onChange(opt)}>
						{capitalize(opt)}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function SortableHeader({
	field,
	sortField,
	sortDir,
	onSort,
	label,
	className,
}: {
	field: TicketSortOption;
	sortField: TicketSortOption;
	sortDir: SortDirection;
	onSort: (field: TicketSortOption) => void;
	label: string;
	className?: string;
}) {
	return (
		<TableHead className={className}>
			<Button
				variant="ghost"
				className={`h-auto p-0 flex items-center gap-2${className?.includes("text-right") ? " ml-auto" : ""}`}
				onClick={() => onSort(field)}
			>
				{label}
				{renderSortIcon(sortField, field, sortDir)}
			</Button>
		</TableHead>
	);
}

export function ClusterDetailTable({
	clusterId,
	totalCount,
	openCount,
}: ClusterDetailTableProps) {
	const { t } = useTranslation("tickets");
	const [searchParams, setSearchParams] = useSearchParams();

	const activeTab = (searchParams.get("tab") as "open" | "all") || "open";
	const page = Number(searchParams.get("page") || "0");
	const sortField =
		(searchParams.get("sort") as TicketSortOption) || "created_at";
	const sortDir = (searchParams.get("sort_dir") as SortDirection) || "desc";

	const [searchQuery, setSearchQuery] = useState(
		searchParams.get("search") || "",
	);
	const [priorityFilter, setPriorityFilter] = useState<string | undefined>();
	const [statusFilter, setStatusFilter] = useState<string | undefined>();

	const debouncedSearch = useDebounce(searchQuery, 300);

	const updateParams = useCallback(
		(updates: Record<string, string | undefined>) => {
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					for (const [key, value] of Object.entries(updates)) {
						if (value !== undefined && value !== "") {
							next.set(key, value);
						} else {
							next.delete(key);
						}
					}
					return next;
				},
				{ replace: true },
			);
		},
		[setSearchParams],
	);

	const prevDebouncedSearch = useRef(debouncedSearch);

	useEffect(() => {
		if (prevDebouncedSearch.current === debouncedSearch) return;
		prevDebouncedSearch.current = debouncedSearch;
		updateParams({ search: debouncedSearch || undefined, page: "0" });
	}, [debouncedSearch, updateParams]);

	const buildTicketUrl = (ticketId: string, rowIndex: number) => {
		const globalIdx = page * PAGE_SIZE + rowIndex;
		const params = new URLSearchParams(searchParams);
		params.set("idx", String(globalIdx));
		return `/tickets/${clusterId}/${ticketId}?${params.toString()}`;
	};

	const queryParams: ClusterTicketsQueryParams = {
		offset: page * PAGE_SIZE,
		limit: PAGE_SIZE,
		search: debouncedSearch || undefined,
		sort: sortField,
		sort_dir: sortDir,
		external_status: activeTab === "open" ? "Open" : statusFilter,
		priority: priorityFilter,
	};

	const { data, isLoading, isFetching, error } = useClusterTickets(
		clusterId,
		queryParams,
		{ keepPrevious: true },
	);
	const tickets = data?.data ?? [];
	const pagination = data?.pagination;

	const priorityOptions = useMemo(
		() =>
			[...new Set(tickets.map((t) => t.priority).filter(Boolean))] as string[],
		[tickets],
	);
	const statusOptions = useMemo(
		() =>
			[
				...new Set(tickets.map((t) => t.external_status).filter(Boolean)),
			] as string[],
		[tickets],
	);

	const handleTabChange = (value: string) => {
		updateParams({ tab: value, page: "0", search: undefined });
		setSearchQuery("");
		setPriorityFilter(undefined);
		setStatusFilter(undefined);
	};

	const handleFilterChange = (
		setter: (v: string | undefined) => void,
		value: string | undefined,
	) => {
		setter(value);
		updateParams({ page: "0" });
	};

	const handleSort = (field: TicketSortOption) => {
		const newDir =
			sortField === field
				? sortDir === "asc"
					? "desc"
					: "asc"
				: field === "created_at"
					? "desc"
					: "asc";
		updateParams({ sort: field, sort_dir: newDir, page: "0" });
	};

	if (isLoading && !data) {
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

	const allLabel = t("table.tabs.all");

	return (
		<div className="flex flex-col gap-3">
			{/* Tabs */}
			<div className="flex gap-4 border-b">
				<TabButton
					value="open"
					label={t("table.tabs.open")}
					count={openCount ?? 0}
					active={activeTab === "open"}
					onClick={handleTabChange}
				/>
				<TabButton
					value="all"
					label={allLabel}
					count={totalCount ?? 0}
					active={activeTab === "all"}
					onClick={handleTabChange}
				/>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-2">
				<div className="relative min-w-[200px] max-w-sm flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder={t("table.searchPlaceholder")}
						className="pl-10"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>

				<FilterDropdown
					value={priorityFilter}
					options={priorityOptions}
					label={t("table.headers.priority")}
					allLabel={allLabel}
					onChange={(v) => handleFilterChange(setPriorityFilter, v)}
				/>

				{activeTab === "all" && (
					<FilterDropdown
						value={statusFilter}
						options={statusOptions}
						label={t("table.headers.status")}
						allLabel={allLabel}
						onChange={(v) => handleFilterChange(setStatusFilter, v)}
					/>
				)}
			</div>

			{/* Table */}
			<div className={`rounded-md border${isFetching ? " opacity-60" : ""}`}>
				<Table>
					<TableHeader>
						<TableRow>
							<SortableHeader
								field="subject"
								sortField={sortField}
								sortDir={sortDir}
								onSort={handleSort}
								label={t(SORT_HEADER_MAP.subject)}
							/>
							<SortableHeader
								field="external_id"
								sortField={sortField}
								sortDir={sortDir}
								onSort={handleSort}
								label={t(SORT_HEADER_MAP.external_id)}
							/>
							<TableHead>{t("table.headers.priority")}</TableHead>
							<TableHead>{t("table.headers.status")}</TableHead>
							<TableHead>{t("table.headers.assignmentGroup")}</TableHead>
							<TableHead>{t("table.headers.source")}</TableHead>
							<SortableHeader
								field="created_at"
								sortField={sortField}
								sortDir={sortDir}
								onSort={handleSort}
								label={t(SORT_HEADER_MAP.created_at)}
								className="text-right"
							/>
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
							tickets.map((row, rowIndex) => (
								<TableRow key={row.id}>
									<TableCell className="font-medium">
										<Link
											to={buildTicketUrl(row.id, rowIndex)}
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

			{/* Pagination */}
			<div className="flex items-center justify-between py-4">
				<p className="text-sm text-muted-foreground">
					{pagination
						? t("table.pagination.showing", {
								from: pagination.offset + 1,
								to: Math.min(
									pagination.offset + pagination.limit,
									pagination.total,
								),
								total: pagination.total,
							})
						: t("table.pagination.ticketsCount", { count: tickets.length })}
				</p>
				<div className="flex gap-2">
					<Button
						variant="outline"
						disabled={page === 0}
						onClick={() => updateParams({ page: "0" })}
					>
						{t("table.pagination.first")}
					</Button>
					<Button
						variant="outline"
						disabled={page === 0}
						onClick={() => updateParams({ page: String(page - 1) })}
					>
						{t("table.pagination.previous")}
					</Button>
					<Button
						variant="outline"
						disabled={!pagination?.has_more}
						onClick={() => updateParams({ page: String(page + 1) })}
					>
						{t("table.pagination.next")}
					</Button>
				</div>
			</div>
		</div>
	);
}
