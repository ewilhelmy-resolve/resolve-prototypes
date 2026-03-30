import { BookX, Filter, LayoutGrid, List, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { StatusAlert } from "@/components/ui/status-alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveModel } from "@/hooks/useActiveModel";
import { useClusters } from "@/hooks/useClusters";
import { useDebounce } from "@/hooks/useDebounce";
import { useIsIngesting } from "@/hooks/useIsIngesting";
import { getClusterDisplayTitle } from "@/lib/cluster-utils";
import {
	type RoiSortKey,
	rankClustersByRoi,
} from "@/lib/tickets/prioritization";
import { useTicketSettingsStore } from "@/stores/ticketSettingsStore";
import type { PeriodFilter } from "@/types/cluster";
import { DEFAULT_MINIMUM_TICKETS } from "@/types/dataSource";
import { TRAINING_STATES } from "@/types/mlModel";
import { PrioritizationRankedList } from "./PrioritizationRankedList";
import { TicketGroupSkeleton } from "./TicketGroupSkeleton";
import { TicketGroupStat } from "./TicketGroupStat";

type GapFilterKey = "knowledge_gap";
type TopViewMode = "cards" | "list";
type SortOption = "volume" | RoiSortKey;

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
	{
		key: "volume" as SortOption,
		i18nKey: "groups.sortOptions.volume" as const,
	},
	{
		key: "costImpact" as SortOption,
		i18nKey: "groups.sortOptions.cost" as const,
	},
	{ key: "mttr" as SortOption, i18nKey: "groups.sortOptions.mttr" as const },
	{
		key: "timeTaken" as SortOption,
		i18nKey: "groups.sortOptions.time" as const,
	},
];

const GAP_FILTER_OPTIONS = [
	{
		key: "knowledge_gap" as GapFilterKey,
		i18nKey: "groups.filterOptions.knowledgeGap" as const,
	},
];

function ImportProgressBanner({
	latestRun,
}: {
	latestRun: ReturnType<typeof useIsIngesting>["latestRun"];
}) {
	const { t } = useTranslation("tickets");
	return (
		<StatusAlert variant="info" title={t("groups.importingTickets")}>
			<p>{t("groups.importingDescription")}</p>
			{latestRun?.metadata?.progress?.total_estimated && (
				<div className="w-full">
					<Progress
						value={
							(latestRun.records_processed /
								latestRun.metadata.progress.total_estimated) *
							100
						}
						className="bg-white"
					/>
					<span className="text-sm text-muted-foreground whitespace-nowrap">
						{t("groups.importingProgress", {
							processed: latestRun.records_processed,
							total: latestRun.metadata.progress.total_estimated,
						})}
					</span>
				</div>
			)}
		</StatusAlert>
	);
}

interface TicketGroupsProps {
	period: PeriodFilter;
}

export default function TicketGroups({ period }: TicketGroupsProps) {
	const { t } = useTranslation("tickets");
	const [viewMode, setViewMode] = useState<TopViewMode>("cards");
	const [activeGapFilters, setActiveGapFilters] = useState<Set<GapFilterKey>>(
		new Set(),
	);
	const [activeSort, setActiveSort] = useState<SortOption>("volume");

	// Search state with debounce
	const [searchInput, setSearchInput] = useState("");
	const debouncedSearch = useDebounce(searchInput, 500);

	// Offset pagination state
	const [page, setPage] = useState(0);

	// Reset page when filters change
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset on filter changes
	useEffect(() => {
		setPage(0);
	}, [period, debouncedSearch, activeGapFilters]);

	// Ticket settings for ROI computation
	const { blendedRatePerHour, avgMinutesPerTicket } = useTicketSettingsStore();

	// Fetch active model to check training state
	const { data: activeModel, isLoading: isModelLoading } = useActiveModel();
	const trainingState = activeModel?.metadata?.training_state;
	const hasNoModel = !isModelLoading && activeModel === null;
	const isTraining = trainingState === TRAINING_STATES.IN_PROGRESS;
	const isFailed = trainingState === TRAINING_STATES.FAILED;
	const canShowClusters = trainingState === TRAINING_STATES.COMPLETE;

	// Check if ITSM source is actively importing tickets
	const { isIngesting, latestRun, isBelowThreshold } = useIsIngesting();
	const isFirstImport = isIngesting && !canShowClusters;

	// Knowledge gap uses server-side kb_status filter
	const hasKnowledgeGapFilter = activeGapFilters.has("knowledge_gap");
	const kbStatusParam = hasKnowledgeGapFilter ? "GAP" : undefined;
	const isCards = viewMode === "cards";
	const isList = viewMode === "list";
	const activePreset: RoiSortKey | null =
		activeSort === "volume" ? null : activeSort;

	// Fetch clusters with server-side filters and pagination
	const {
		data: clustersResponse,
		isLoading,
		error,
	} = useClusters({
		period,
		limit: PAGE_SIZE,
		offset: page * PAGE_SIZE,
		kb_status: kbStatusParam,
		search: debouncedSearch || undefined,
		enabled: canShowClusters,
		sort: "volume",
	});

	const clusters = clustersResponse?.data ?? [];
	const pagination = clustersResponse?.pagination;
	const totals = clustersResponse?.totals;
	const hasNextPage = pagination?.has_more ?? false;
	const hasPrevPage = page > 0;

	// Navigation handlers
	const handleNextPage = () => setPage((p) => p + 1);
	const handlePrevPage = () => setPage((p) => Math.max(0, p - 1));

	// Compute ROI data (needed for card metrics + list view)
	const roiRanked = useMemo(() => {
		if (clusters.length === 0) return [];
		return rankClustersByRoi(
			clusters,
			blendedRatePerHour,
			avgMinutesPerTicket,
			activePreset ?? "costImpact",
			"desc",
		);
	}, [clusters, blendedRatePerHour, avgMinutesPerTicket, activePreset]);

	// ROI lookup for card view metrics
	const roiMap = useMemo(() => {
		return new Map(
			roiRanked.map((r) => [
				r.cluster.id,
				{ costImpact: r.costImpact, mttr: r.mttr },
			]),
		);
	}, [roiRanked]);

	// Sort: default = volume (ticket count desc), preset = ROI ranked
	const sortedClusters = useMemo(() => {
		if (activePreset) return roiRanked.map((r) => r.cluster);
		return [...clusters].sort((a, b) => b.ticket_count - a.ticket_count);
	}, [clusters, activePreset, roiRanked]);

	const gapFilterLabels: Record<GapFilterKey, string> = {
		knowledge_gap: t("groups.filterOptions.knowledgeGap"),
	};

	const toggleGapFilter = (key: GapFilterKey) => {
		setActiveGapFilters((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	const removeGapFilter = (key: GapFilterKey) => {
		setActiveGapFilters((prev) => {
			const next = new Set(prev);
			next.delete(key);
			return next;
		});
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
	const isInitialLoading = canShowClusters && isLoading && !clustersResponse;
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

	const skeletonGrid = (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
			{[...Array(6)].map((_, i) => (
				<TicketGroupSkeleton key={i} />
			))}
		</div>
	);

	const paginationControls = (hasPrevPage || hasNextPage) && (
		<div className="flex items-center justify-between py-4">
			<p className="text-sm text-muted-foreground">
				{t("groups.pagination.showing", {
					from: page * PAGE_SIZE + 1,
					to: Math.min((page + 1) * PAGE_SIZE, pagination?.total ?? 0),
					total: pagination?.total ?? 0,
				})}
			</p>
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
	);

	return (
		<div className="flex w-full flex-col">
			<div className="flex w-full flex-col gap-4 px-6 py-6">
				{/* Row 1: Title + count | search + sort + filter + view toggle */}
				<div className="flex items-center gap-3">
					<h1 className="text-base font-bold text-card-foreground whitespace-nowrap">
						{t("page.title")}
					</h1>
					<Badge variant="outline">{totals?.total_clusters ?? 0}</Badge>

					<div className="ml-auto flex items-center gap-2">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder={t("groups.searchPlaceholder")}
								className="w-[220px] pl-10"
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								disabled={
									hasNoModel || isTraining || isFirstImport || isBelowThreshold
								}
							/>
						</div>

						<Select
							value={activeSort}
							onValueChange={(v) => setActiveSort(v as SortOption)}
						>
							<SelectTrigger className="w-auto h-8 text-sm">
								<span className="text-muted-foreground mr-1">
									{t("groups.sortBy")}:
								</span>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SORT_OPTIONS.map(({ key, i18nKey }) => (
									<SelectItem key={key} value={key}>
										{t(i18nKey)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm">
									<Filter className="size-3.5" />
									{t("groups.filter")}
									{activeGapFilters.size > 0 && (
										<Badge
											variant="secondary"
											className="ml-1 h-5 min-w-[20px] px-1.5 text-xs"
										>
											{activeGapFilters.size}
										</Badge>
									)}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{GAP_FILTER_OPTIONS.map(({ key, i18nKey }) => (
									<DropdownMenuItem
										key={key}
										onClick={() => toggleGapFilter(key)}
										className={activeGapFilters.has(key) ? "bg-accent" : ""}
									>
										<span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100">
											<BookX className="h-3 w-3 text-yellow-600" />
										</span>
										{t(i18nKey)}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>

						<Tabs
							value={viewMode}
							onValueChange={(v) => setViewMode(v as TopViewMode)}
						>
							<TabsList>
								<TabsTrigger value="cards">
									<LayoutGrid className="size-3.5" />
								</TabsTrigger>
								<TabsTrigger value="list">
									<List className="size-3.5" />
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>
				</div>

				{/* Row 2: Active filter chips (only when filters applied) */}
				{activeGapFilters.size > 0 && (
					<div className="flex items-center gap-2">
						{[...activeGapFilters].map((key) => (
							<div
								key={key}
								className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-sm"
							>
								<span className="font-medium">{gapFilterLabels[key]}</span>
								<button
									type="button"
									onClick={() => removeGapFilter(key)}
									className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted"
								>
									<X className="size-3" />
								</button>
							</div>
						))}
						<button
							type="button"
							onClick={() => setActiveGapFilters(new Set())}
							className="text-sm text-muted-foreground hover:text-foreground"
						>
							{t("groups.clearFilters")}
						</button>
					</div>
				)}

				{isBelowThreshold ? (
					<div className="flex flex-col gap-6">
						<StatusAlert
							variant="error"
							title={t("groups.ticketsBelowThreshold")}
						>
							<p className="mb-3">
								{t("groups.ticketsBelowThresholdDescription", {
									count:
										latestRun?.metadata?.error_detail?.current_total_tickets ??
										0,
									minimum:
										latestRun?.metadata?.error_detail?.needed_total_tickets ??
										DEFAULT_MINIMUM_TICKETS,
								})}
							</p>
							<Link
								to="/settings/connections/itsm"
								className={buttonVariants({ variant: "outline", size: "sm" })}
							>
								{t("groups.goToItsmConnections")}
							</Link>
						</StatusAlert>
						<div className="flex min-h-[200px] items-center justify-center">
							<p className="text-muted-foreground">{t("groups.noGroups")}</p>
						</div>
					</div>
				) : isFirstImport ? (
					<div className="flex flex-col gap-6">
						<ImportProgressBanner latestRun={latestRun} />
						{skeletonGrid}
					</div>
				) : isTraining ? (
					<div className="flex flex-col gap-6">
						<StatusAlert variant="info" title={t("groups.trainingInProgress")}>
							<p>{t("groups.trainingDescription")}</p>
						</StatusAlert>
						{skeletonGrid}
					</div>
				) : hasNoModel ? (
					<div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
						<p className="text-muted-foreground">
							{t("groups.noSourceConnected")}
						</p>
						<Link
							to="/settings/connections/itsm"
							className={buttonVariants({ variant: "outline", size: "sm" })}
						>
							{t("groups.connectSource")}
						</Link>
					</div>
				) : isFailed ? (
					<div className="flex flex-col gap-6">
						<StatusAlert variant="error" title={t("groups.trainingFailed")}>
							<p className="mb-3">{t("groups.trainingFailedDescription")}</p>
							<Link
								to="/settings/connections/itsm"
								className={buttonVariants({ variant: "outline", size: "sm" })}
							>
								{t("groups.goToItsmConnections")}
							</Link>
						</StatusAlert>
						<div className="flex min-h-[200px] items-center justify-center">
							<p className="text-muted-foreground">{t("groups.noGroups")}</p>
						</div>
					</div>
				) : clusters.length > 0 ? (
					<>
						{/* Re-import banner: show above existing clusters */}
						{isIngesting && <ImportProgressBanner latestRun={latestRun} />}

						{isCards && (
							<div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
								{sortedClusters.map((cluster) => {
									const roi = roiMap.get(cluster.id);
									return (
										<TicketGroupStat
											key={cluster.id}
											id={cluster.id}
											title={getClusterDisplayTitle(
												cluster.name,
												cluster.subcluster_name,
											)}
											count={cluster.ticket_count}
											knowledgeStatus={cluster.kb_status}
											costImpact={roi?.costImpact}
											mttr={roi?.mttr}
											updatedAt={cluster.updated_at}
										/>
									);
								})}
							</div>
						)}

						{isList && (
							<PrioritizationRankedList
								roiRanked={roiRanked}
								activePreset={activePreset}
								onPresetChange={(key) => setActiveSort(key)}
							/>
						)}

						{/* Pagination */}
						{paginationControls}
					</>
				) : (
					<div className="flex min-h-[200px] items-center justify-center">
						<p className="text-muted-foreground">{t("groups.noGroups")}</p>
					</div>
				)}
			</div>
		</div>
	);
}
