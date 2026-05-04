import { BookX, Filter, LayoutGrid, List, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Spinner } from "@/components/custom/spinner";
import { StatusAlert } from "@/components/custom/status-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveModel } from "@/hooks/useActiveModel";
import { useInfiniteClusters } from "@/hooks/useClusters";
import { useDebounce } from "@/hooks/useDebounce";
import { useIsIngesting } from "@/hooks/useIsIngesting";
import { usePhaseGate } from "@/hooks/usePhaseGate";
import { getClusterDisplayTitle } from "@/lib/cluster-utils";
import {
	type RoiSortKey,
	rankClustersByRoi,
} from "@/lib/tickets/prioritization";
import { useTicketSettingsStore } from "@/stores/ticketSettingsStore";
import type { PeriodFilter } from "@/types/cluster";
import { TRAINING_STATES } from "@/types/mlModel";
import { PrioritizationRankedList } from "./PrioritizationRankedList";
import { TicketGroupSkeleton } from "./TicketGroupSkeleton";
import { TicketGroupStat } from "./TicketGroupStat";

type TopViewMode = "cards" | "list";
type SortOption = "volume" | RoiSortKey;

const BASE_SORT_OPTIONS: { key: SortOption; i18nKey: string }[] = [
	{ key: "volume", i18nKey: "groups.sortOptions.volume" },
	{ key: "costImpact", i18nKey: "groups.sortOptions.cost" },
	{ key: "timeTaken", i18nKey: "groups.sortOptions.time" },
];

type FilterKey = "knowledge_gap";

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
	const phaseV2 = usePhaseGate("tickets", "v2");
	const phaseV3 = usePhaseGate("tickets", "v3");
	const phaseV4 = usePhaseGate("tickets", "v4");
	const [viewMode, setViewMode] = useState<TopViewMode>("cards");
	const [activeSort, setActiveSort] = useState<SortOption>("volume");
	const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());

	// Build sort options based on phase
	const sortOptions = useMemo(() => {
		const opts = [...BASE_SORT_OPTIONS];
		if (phaseV3) {
			opts.push({
				key: "mttr" as SortOption,
				i18nKey: "groups.sortOptions.mttr",
			});
		}
		return opts;
	}, [phaseV3]);

	const toggleFilter = (key: FilterKey) => {
		setActiveFilters((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	// Search state with debounce
	const [searchInput, setSearchInput] = useState("");
	const debouncedSearch = useDebounce(searchInput, 500);

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
	const { isIngesting, latestRun } = useIsIngesting();
	const isFirstImport = isIngesting && !canShowClusters;

	const isCards = viewMode === "cards";
	const isList = viewMode === "list";
	const activePreset: RoiSortKey | null =
		activeSort === "volume" ? null : activeSort;

	// Fetch ALL clusters via infinite query (both views use all data)
	const {
		data: infiniteData,
		isLoading: isInfiniteLoading,
		error,
		fetchNextPage,
		hasNextPage: hasMorePages,
		isFetchingNextPage,
	} = useInfiniteClusters({
		period,
		limit: 100,
		search: debouncedSearch || undefined,
		enabled: canShowClusters,
		sort: "volume",
	});

	// Auto-fetch remaining pages
	useEffect(() => {
		if (hasMorePages && !isFetchingNextPage) {
			fetchNextPage();
		}
	}, [hasMorePages, isFetchingNextPage, fetchNextPage]);

	// Flatten infinite pages + apply client-side filters (search, gaps)
	const clusters = useMemo(() => {
		let filtered = infiniteData?.pages.flatMap((page) => page.data) ?? [];
		if (debouncedSearch) {
			const q = debouncedSearch.toLowerCase();
			filtered = filtered.filter(
				(c) =>
					c.name.toLowerCase().includes(q) ||
					c.subcluster_name?.toLowerCase().includes(q),
			);
		}
		if (activeFilters.has("knowledge_gap")) {
			filtered = filtered.filter((c) => c.kb_status === "GAP");
		}
		return filtered;
	}, [infiniteData, debouncedSearch, activeFilters]);
	const isDataLoading = isInfiniteLoading;
	const hasData = !!infiniteData;

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
			roiRanked.map((r) => [r.cluster.id, { costImpact: r.costImpact }]),
		);
	}, [roiRanked]);

	// Sort: default = volume (ticket count desc), preset = ROI ranked
	const sortedClusters = useMemo(() => {
		if (activePreset) return roiRanked.map((r) => r.cluster);
		return [...clusters].sort((a, b) => b.ticket_count - a.ticket_count);
	}, [clusters, activePreset, roiRanked]);

	// Show spinner while checking model state initially
	if (isModelLoading) {
		return (
			<div className="flex min-h-[400px] w-full items-center justify-center">
				<Spinner className="size-8 text-muted-foreground" />
			</div>
		);
	}

	// Show spinner only on initial load (no cached data)
	const isInitialLoading = canShowClusters && isDataLoading && !hasData;
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

	return (
		<div className="flex w-full flex-col">
			<div className="flex w-full flex-col gap-4 px-6 py-6">
				{/* Row 1: Title + count | search + sort + filter + view toggle */}
				<div className="flex items-center gap-3">
					<h1 className="text-base font-bold text-card-foreground whitespace-nowrap">
						{t("page.title")}
					</h1>
					<Badge variant="outline">{clusters.length}</Badge>

					<div className="ml-auto flex items-center gap-2">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder={t("groups.searchPlaceholder")}
								className="w-[220px] pl-10"
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								disabled={hasNoModel || isTraining || isFirstImport}
							/>
						</div>

						{phaseV2 && (
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
									{sortOptions.map(({ key, i18nKey }) => (
										<SelectItem key={key} value={key}>
											{t(i18nKey as never)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}

						{phaseV3 && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm" className="gap-1.5">
										<Filter className="size-3.5" />
										Filter
										{activeFilters.size > 0 && (
											<Badge
												variant="secondary"
												className="ml-1 px-1.5 py-0 text-xs"
											>
												{activeFilters.size}
											</Badge>
										)}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<DropdownMenuCheckboxItem
										checked={activeFilters.has("knowledge_gap")}
										onCheckedChange={() => toggleFilter("knowledge_gap")}
									>
										<BookX className="size-3.5 mr-2" />
										Knowledge Gap
									</DropdownMenuCheckboxItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}

						{phaseV2 && (
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
						)}
					</div>
				</div>

				{/* Active filter chips */}
				{phaseV3 && activeFilters.size > 0 && (
					<div className="flex items-center gap-2">
						{activeFilters.has("knowledge_gap") && (
							<Badge variant="secondary" className="gap-1 pl-2 pr-1">
								<BookX className="size-3" />
								Knowledge Gap
								<button
									type="button"
									onClick={() => toggleFilter("knowledge_gap")}
									className="ml-1 rounded-full hover:bg-muted p-0.5"
									aria-label="Remove knowledge gap filter"
								>
									<X className="size-3" />
								</button>
							</Badge>
						)}
					</div>
				)}

				{hasNoModel ? (
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
											openCount={cluster.needs_response_count}
											showCostImpact={phaseV2}
											costImpact={roi?.costImpact}
											updatedAt={cluster.updated_at}
											newTicketCount={
												Math.floor(cluster.needs_response_count * 0.3) > 0
													? Math.floor(cluster.needs_response_count * 0.3)
													: undefined
											}
											knowledgeStatus={
												phaseV3 && !phaseV4 ? cluster.kb_status : undefined
											}
											mttr={phaseV3 ? "3.2hr" : undefined}
										/>
									);
								})}
							</div>
						)}

						{isList && (
							<PrioritizationRankedList
								clusters={clusters}
								activePreset={activePreset}
								onPresetChange={(key) => setActiveSort(key)}
							/>
						)}
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
