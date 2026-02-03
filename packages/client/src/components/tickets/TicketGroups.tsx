import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { StatusAlert } from "@/components/ui/status-alert";
import { useActiveModel } from "@/hooks/useActiveModel";
import { useClusters } from "@/hooks/useClusters";
import { useDebounce } from "@/hooks/useDebounce";
import {
	KB_FILTER_ALL,
	KB_STATUSES,
	type KBStatus,
	type PeriodFilter,
} from "@/types/cluster";
import { TRAINING_STATES } from "@/types/mlModel";
import { TicketGroupSkeleton } from "./TicketGroupSkeleton";
import { TicketGroupStat } from "./TicketGroupStat";

type KBFilterOption = KBStatus | typeof KB_FILTER_ALL;

const PAGE_SIZE = 9;

interface TicketGroupsProps {
	period: PeriodFilter;
	onPeriodChange: (period: PeriodFilter) => void;
}

export default function TicketGroups({
	period,
	onPeriodChange,
}: TicketGroupsProps) {
	const { t } = useTranslation("tickets");
	const [kbFilter, setKbFilter] = useState<KBFilterOption>(KB_FILTER_ALL);

	// Search state with debounce
	const [searchInput, setSearchInput] = useState("");
	const debouncedSearch = useDebounce(searchInput, 500);

	// Cursor pagination state
	const [cursorHistory, setCursorHistory] = useState<string[]>([]);
	const [currentCursor, setCurrentCursor] = useState<string | undefined>();

	// Reset cursors when filters change (including search)
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset on filter changes
	useEffect(() => {
		setCursorHistory([]);
		setCurrentCursor(undefined);
	}, [period, kbFilter, debouncedSearch]);

	// Fetch active model to check training state
	const { data: activeModel, isLoading: isModelLoading } = useActiveModel();
	const trainingState = activeModel?.metadata?.training_state;
	const hasNoModel = !isModelLoading && activeModel === null;
	const isTraining = trainingState === TRAINING_STATES.IN_PROGRESS;
	const isFailed = trainingState === TRAINING_STATES.FAILED;
	const canShowClusters = trainingState === TRAINING_STATES.COMPLETE;

	// kb_status now goes to server (not client filtering)
	const kbStatusParam = kbFilter === KB_FILTER_ALL ? undefined : kbFilter;

	// Fetch clusters with server-side filters and pagination
	const {
		data: clustersResponse,
		isLoading: isClustersLoading,
		error,
	} = useClusters({
		period,
		limit: PAGE_SIZE,
		cursor: currentCursor,
		kb_status: kbStatusParam,
		search: debouncedSearch || undefined,
		enabled: canShowClusters,
	});

	const clusters = clustersResponse?.data ?? [];
	const pagination = clustersResponse?.pagination;
	const totals = clustersResponse?.totals;
	const hasNextPage = pagination?.has_more ?? false;
	const hasPrevPage = cursorHistory.length > 0;

	// Period display labels
	const periodLabels: Record<PeriodFilter, string> = {
		last30: t("groups.periods.last30Days"),
		last90: t("groups.periods.last90Days"),
		last6months: t("groups.periods.last6Months"),
		lastyear: t("groups.periods.lastYear"),
	};

	// KB filter display labels
	const kbFilterLabels: Record<KBFilterOption, string> = {
		[KB_FILTER_ALL]: t("groups.filterOptions.all"),
		[KB_STATUSES.FOUND]: t("groups.filterOptions.knowledgeFound"),
		[KB_STATUSES.GAP]: t("groups.filterOptions.knowledgeGap"),
		[KB_STATUSES.PENDING]: t("groups.filterOptions.pending"),
	};

	// Build display title from name + subcluster_name
	const getDisplayTitle = (name: string, subclusterName: string | null) => {
		if (subclusterName) {
			return `${name} - ${subclusterName}`;
		}
		return name;
	};

	// Navigation handlers
	const handleNextPage = () => {
		if (pagination?.next_cursor) {
			setCursorHistory((prev) => [...prev, currentCursor ?? ""]);
			setCurrentCursor(pagination.next_cursor);
		}
	};

	const handlePrevPage = () => {
		const prevCursor = cursorHistory[cursorHistory.length - 1];
		setCursorHistory((prev) => prev.slice(0, -1));
		setCurrentCursor(prevCursor || undefined);
	};

	// Show spinner while checking model state initially
	if (isModelLoading) {
		return (
			<div className="flex min-h-[400px] w-full items-center justify-center">
				<Spinner className="size-8 text-muted-foreground" />
			</div>
		);
	}

	// Show spinner only on initial load (no cached data)
	// Don't show during refetches to avoid losing search input focus
	const isInitialLoading =
		canShowClusters && isClustersLoading && !clustersResponse;
	if (isInitialLoading) {
		return (
			<div className="flex min-h-[400px] w-full items-center justify-center">
				<Spinner className="size-8 text-muted-foreground" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex min-h-[400px] w-full items-center justify-center">
				<p className="text-destructive">{t("groups.failedToLoad")}</p>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen w-full flex-col items-center">
			<div className="flex w-full items-start justify-center py-6">
				<div className="flex w-full flex-col gap-6 px-6">
					<div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
						<div className="flex flex-col gap-1.5">
							<div className="flex items-center gap-1.5">
								<h1 className="text-base font-bold text-card-foreground">
									{t("page.title")}
								</h1>
								<Badge variant="outline">{totals?.total_clusters ?? 0}</Badge>
							</div>
							<p className="text-sm text-muted-foreground">
								{t("page.subtitle", {
									period: periodLabels[period].toLowerCase(),
								})}
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							{/* Period dropdown */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										{periodLabels[period]}
										<ChevronDown />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									{(
										[
											"last30",
											"last90",
											"last6months",
											"lastyear",
										] as PeriodFilter[]
									).map((p) => (
										<DropdownMenuItem key={p} onClick={() => onPeriodChange(p)}>
											{periodLabels[p]}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>

							{/* KB Status dropdown */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										{kbFilterLabels[kbFilter]}
										<ChevronDown />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									{(
										[
											KB_FILTER_ALL,
											KB_STATUSES.FOUND,
											KB_STATUSES.GAP,
											KB_STATUSES.PENDING,
										] as KBFilterOption[]
									).map((k) => (
										<DropdownMenuItem key={k} onClick={() => setKbFilter(k)}>
											{kbFilterLabels[k]}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>

					{/* Search input row */}
					<Input
						placeholder={t("groups.searchPlaceholder")}
						className="max-w-sm"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						disabled={hasNoModel || isTraining}
					/>

					{hasNoModel ? (
						// No model: show connect source empty state
						<div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
							<p className="text-muted-foreground">
								{t("groups.noSourceConnected")}
							</p>
							<Button asChild variant="outline" size="sm">
								<Link to="/settings/connections/itsm">
									{t("groups.connectSource")}
								</Link>
							</Button>
						</div>
					) : isFailed ? (
						// Training failed: show error banner + empty state
						<div className="flex flex-col gap-6">
							<StatusAlert variant="error" title={t("groups.trainingFailed")}>
								<p className="mb-3">{t("groups.trainingFailedDescription")}</p>
								<Button asChild variant="outline" size="sm">
									<Link to="/settings/connections/itsm">
										{t("groups.goToItsmConnections")}
									</Link>
								</Button>
							</StatusAlert>
							<div className="flex min-h-[200px] items-center justify-center">
								<p className="text-muted-foreground">{t("groups.noGroups")}</p>
							</div>
						</div>
					) : isTraining ? (
						// Training in progress: show banner + skeleton grid
						<div className="flex flex-col gap-6">
							<StatusAlert
								variant="info"
								title={t("groups.trainingInProgress")}
							>
								<p>{t("groups.trainingDescription")}</p>
							</StatusAlert>
							<div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
								{[...Array(6)].map((_, i) => (
									<TicketGroupSkeleton key={i} />
								))}
							</div>
						</div>
					) : clusters.length > 0 ? (
						<>
							<div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
								{clusters.map((cluster) => (
									<TicketGroupStat
										key={cluster.id}
										id={cluster.id}
										title={getDisplayTitle(
											cluster.name,
											cluster.subcluster_name,
										)}
										count={cluster.ticket_count}
										knowledgeStatus={cluster.kb_status}
									/>
								))}
							</div>

							{/* Pagination */}
							{(hasPrevPage || hasNextPage) && (
								<div className="flex items-center justify-end py-4">
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={handlePrevPage}
											disabled={!hasPrevPage}
										>
											{t("groups.pagination.previous")}
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={handleNextPage}
											disabled={!hasNextPage}
										>
											{t("groups.pagination.next")}
										</Button>
									</div>
								</div>
							)}
						</>
					) : (
						<div className="flex min-h-[200px] items-center justify-center">
							<p className="text-muted-foreground">{t("groups.noGroups")}</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
