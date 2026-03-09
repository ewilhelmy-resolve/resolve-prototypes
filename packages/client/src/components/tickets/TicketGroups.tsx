import { Filter, LayoutGrid, List, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
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
import { Spinner } from "@/components/ui/spinner";
import { StatusAlert } from "@/components/ui/status-alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveModel } from "@/hooks/useActiveModel";
import { useClusterActions, useInfiniteClusters } from "@/hooks/useClusters";
import { useDebounce } from "@/hooks/useDebounce";
import { useIsIngesting } from "@/hooks/useIsIngesting";
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

type GapFilterKey = "knowledge_gap" | "automation_gap";
type TopViewMode = "cards" | "list";
type SortOption = "volume" | RoiSortKey;

const SORT_OPTIONS: { key: SortOption; i18nKey: string }[] = [
	{ key: "volume", i18nKey: "groups.sortOptions.volume" },
	{ key: "costImpact", i18nKey: "groups.sortOptions.cost" },
	{ key: "mttr", i18nKey: "groups.sortOptions.mttr" },
	{ key: "timeTaken", i18nKey: "groups.sortOptions.time" },
];

const GAP_FILTER_OPTIONS: { key: GapFilterKey; i18nKey: string }[] = [
	{ key: "knowledge_gap", i18nKey: "groups.filterOptions.knowledgeGap" },
	{ key: "automation_gap", i18nKey: "groups.filterOptions.automationGap" },
];

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

	// Ticket settings for ROI computation
	const { costPerTicket, avgTimePerTicket } = useTicketSettingsStore();

	// Fetch active model to check training state
	const { data: activeModel, isLoading: isModelLoading } = useActiveModel();
	const trainingState = activeModel?.metadata?.training_state;
	const hasNoModel = !isModelLoading && activeModel === null;
	const isTraining = trainingState === TRAINING_STATES.IN_PROGRESS;
	const isFailed = trainingState === TRAINING_STATES.FAILED;
	const canShowClusters = trainingState === TRAINING_STATES.COMPLETE;

	// Fetch cluster actions map (Resolve Action workflows)
	const { data: actionsMap } = useClusterActions();

	// Check if ITSM source is actively importing tickets
	const { isIngesting, latestRun } = useIsIngesting();
	const isFirstImport = isIngesting && !canShowClusters;

	// Knowledge gap uses server-side kb_status filter; automation gap is client-side
	const hasKnowledgeGapFilter = activeGapFilters.has("knowledge_gap");
	const hasAutomationGapFilter = activeGapFilters.has("automation_gap");
	const kbStatusParam = hasKnowledgeGapFilter ? "GAP" : undefined;
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
		kb_status: kbStatusParam,
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
		if (hasKnowledgeGapFilter) {
			filtered = filtered.filter((c) => c.kb_status === "GAP");
		}
		if (hasAutomationGapFilter) {
			filtered = filtered.filter((c) => actionsMap?.[c.id] === false);
		}
		return filtered;
	}, [
		infiniteData,
		debouncedSearch,
		hasKnowledgeGapFilter,
		hasAutomationGapFilter,
		actionsMap,
	]);
	const _totals = infiniteData?.pages[0]?.totals;
	const isDataLoading = isInfiniteLoading;
	const hasData = !!infiniteData;

	// Compute ROI data (needed for card metrics + list view)
	const roiRanked = useMemo(() => {
		if (clusters.length === 0) return [];
		return rankClustersByRoi(
			clusters,
			costPerTicket,
			avgTimePerTicket,
			activePreset ?? "costImpact",
			"desc",
		);
	}, [clusters, costPerTicket, avgTimePerTicket, activePreset]);

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
		automation_gap: t("groups.filterOptions.automationGap"),
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

	// Build display title from name + subcluster_name
	const getDisplayTitle = (name: string, subclusterName: string | null) => {
		if (subclusterName) {
			return `${name} - ${subclusterName}`;
		}
		return name;
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
									<DropdownMenuCheckboxItem
										key={key}
										checked={activeGapFilters.has(key)}
										onCheckedChange={() => toggleGapFilter(key)}
									>
										{t(i18nKey)}
									</DropdownMenuCheckboxItem>
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
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
							{[...Array(6)].map((_, i) => (
								<TicketGroupSkeleton key={i} />
							))}
						</div>
					</div>
				) : isTraining ? (
					<div className="flex flex-col gap-6">
						<StatusAlert variant="info" title={t("groups.trainingInProgress")}>
							<p>{t("groups.trainingDescription")}</p>
						</StatusAlert>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
							{[...Array(6)].map((_, i) => (
								<TicketGroupSkeleton key={i} />
							))}
						</div>
					</div>
				) : clusters.length > 0 ? (
					<>
						{/* Re-import banner */}
						{isIngesting && (
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
						)}

						{isCards && (
							<div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
								{sortedClusters.map((cluster) => {
									const roi = roiMap.get(cluster.id);
									return (
										<TicketGroupStat
											key={cluster.id}
											id={cluster.id}
											title={getDisplayTitle(
												cluster.name,
												cluster.subcluster_name,
											)}
											count={cluster.ticket_count}
											openCount={cluster.needs_response_count}
											knowledgeStatus={cluster.kb_status}
											hasAction={actionsMap?.[cluster.id] ?? false}
											costImpact={roi?.costImpact}
											mttr={roi?.mttr}
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
								actionsMap={actionsMap}
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
