import { ChevronDown } from "lucide-react";
import { useState } from "react";
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
import { InfiniteScrollContainer } from "@/components/ui/infinite-scroll-container";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { StatusAlert } from "@/components/ui/status-alert";
import { useActiveModel } from "@/hooks/useActiveModel";
import { useInfiniteClusters } from "@/hooks/useClusters";
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

export default function TicketGroups() {
	const { t } = useTranslation("tickets");

	// Filter state
	const [period, setPeriod] = useState<PeriodFilter>("last90");
	const [kbFilter, setKbFilter] = useState<KBFilterOption>(KB_FILTER_ALL);

	// Search state with debounce
	const [searchInput, setSearchInput] = useState("");
	const debouncedSearch = useDebounce(searchInput, 500);

	// Fetch active model to check training state
	const { data: activeModel, isLoading: isModelLoading } = useActiveModel();
	const trainingState = activeModel?.metadata?.training_state;
	const hasNoModel = !isModelLoading && activeModel === null;
	const isTraining = trainingState === TRAINING_STATES.IN_PROGRESS;
	const isFailed = trainingState === TRAINING_STATES.FAILED;
	const canShowClusters = trainingState === TRAINING_STATES.COMPLETE;

	// kb_status now goes to server (not client filtering)
	const kbStatusParam = kbFilter === KB_FILTER_ALL ? undefined : kbFilter;

	// Fetch clusters with infinite scroll pagination
	const {
		data,
		isLoading: isClustersLoading,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
		error,
	} = useInfiniteClusters({
		period,
		limit: PAGE_SIZE,
		kb_status: kbStatusParam,
		search: debouncedSearch || undefined,
		enabled: canShowClusters,
	});

	// Flatten pages into single array
	const clusters = data?.pages.flatMap((page) => page.data) ?? [];

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
	const isInitialLoading = canShowClusters && isClustersLoading && !data;
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

	const totalCount = clusters.length;

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
								<Badge variant="outline">{totalCount}</Badge>
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
										<DropdownMenuItem key={p} onClick={() => setPeriod(p)}>
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
						<InfiniteScrollContainer
							hasMore={hasNextPage ?? false}
							isLoading={isFetchingNextPage}
							onLoadMore={fetchNextPage}
						>
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
						</InfiniteScrollContainer>
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
