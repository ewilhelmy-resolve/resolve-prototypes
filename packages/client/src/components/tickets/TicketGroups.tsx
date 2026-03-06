import { ChevronDown, Search } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { StatusAlert } from "@/components/ui/status-alert";
import { useActiveModel } from "@/hooks/useActiveModel";
import { useClusters } from "@/hooks/useClusters";
import { useDebounce } from "@/hooks/useDebounce";
import { useIsIngesting } from "@/hooks/useIsIngesting";
import {
	KB_FILTER_ALL,
	KB_STATUSES,
	type KBStatus,
	type PeriodFilter,
} from "@/types/cluster";
import { DEFAULT_MINIMUM_TICKETS } from "@/types/dataSource";
import { TRAINING_STATES } from "@/types/mlModel";
import { TicketGroupSkeleton } from "./TicketGroupSkeleton";
import { TicketGroupStat } from "./TicketGroupStat";

type KBFilterOption = KBStatus | typeof KB_FILTER_ALL;

const PAGE_SIZE = 20;

interface TicketGroupsProps {
	period: PeriodFilter;
}

export default function TicketGroups({ period }: TicketGroupsProps) {
	const { t } = useTranslation("tickets");
	const [kbFilter, setKbFilter] = useState<KBFilterOption>(KB_FILTER_ALL);

	// Search state with debounce
	const [searchInput, setSearchInput] = useState("");
	const debouncedSearch = useDebounce(searchInput, 500);

	// Offset pagination state
	const [page, setPage] = useState(0);

	// Reset page when filters change (including search)
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset on filter changes
	useEffect(() => {
		setPage(0);
	}, [period, kbFilter, debouncedSearch]);

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
		<div className="flex w-full flex-col">
			<div className="flex w-full flex-col gap-6 px-6 py-6">
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
								period: t(
									`groups.periods.${({ last30: "last30Days", last90: "last90Days", last6months: "last6Months", lastyear: "lastYear" } as const)[period]}`,
								).toLowerCase(),
							})}
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						{/* Search input with icon */}
						<div className="relative">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder={t("groups.searchPlaceholder")}
								className="max-w-sm pl-10"
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								disabled={
									hasNoModel || isTraining || isFirstImport || isBelowThreshold
								}
							/>
						</div>

						{/* KB Status dropdown */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm">
									{t("groups.filterBy")}
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

				{isBelowThreshold ? (
					// Not enough tickets: show error banner + empty state
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
					// First-time import: show banner + progress + skeleton grid
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
					// Training in progress: show banner + skeleton grid
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
				) : hasNoModel ? (
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
				) : clusters.length > 0 ? (
					<>
						{/* Re-import banner: show above existing clusters */}
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
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
							{clusters.map((cluster) => (
								<TicketGroupStat
									key={cluster.id}
									id={cluster.id}
									title={getDisplayTitle(cluster.name, cluster.subcluster_name)}
									count={cluster.ticket_count}
									knowledgeStatus={cluster.kb_status}
								/>
							))}
						</div>

						{/* Pagination */}
						{(hasPrevPage || hasNextPage) && (
							<div className="flex items-center justify-between py-4">
								<p className="text-sm text-muted-foreground">
									{t("groups.pagination.showing", {
										from: page * PAGE_SIZE + 1,
										to: Math.min(
											(page + 1) * PAGE_SIZE,
											pagination?.total ?? 0,
										),
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
