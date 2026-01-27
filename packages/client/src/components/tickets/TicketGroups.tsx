import { ChevronDown, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusAlert } from "@/components/ui/status-alert";
import { useActiveModel } from "@/hooks/useActiveModel";
import { useClusters } from "@/hooks/useClusters";
import type { KBStatus, PeriodFilter } from "@/types/cluster";
import { TicketGroupSkeleton } from "./TicketGroupSkeleton";
import { TicketGroupStat } from "./TicketGroupStat";

type KBFilterOption = KBStatus | "all";

export default function TicketGroups() {
	const { t } = useTranslation("tickets");

	// Filter state
	const [period, setPeriod] = useState<PeriodFilter>("last90");
	const [kbFilter, setKbFilter] = useState<KBFilterOption>("all");

	// Fetch active model to check training state
	const { data: activeModel, isLoading: isModelLoading } = useActiveModel();
	const trainingState = activeModel?.metadata?.training_state;
	const isTraining = trainingState === "in_progress";
	const canShowClusters = trainingState === "complete";

	// Fetch clusters only when model training is complete
	const {
		data: clusters,
		isLoading: isClustersLoading,
		error,
	} = useClusters({ period, enabled: canShowClusters });

	// Client-side kb_status filtering
	const filteredClusters = useMemo(() => {
		if (!clusters) return [];
		if (kbFilter === "all") return clusters;
		return clusters.filter((c) => c.kb_status === kbFilter);
	}, [clusters, kbFilter]);

	// Period display labels
	const periodLabels: Record<PeriodFilter, string> = {
		last30: t("groups.periods.last30Days"),
		last90: t("groups.periods.last90Days"),
		last6months: t("groups.periods.last6Months"),
		lastyear: t("groups.periods.lastYear"),
	};

	// KB filter display labels
	const kbFilterLabels: Record<KBFilterOption, string> = {
		all: t("groups.filterOptions.all"),
		FOUND: t("groups.filterOptions.knowledgeFound"),
		GAP: t("groups.filterOptions.knowledgeGap"),
		PENDING: t("groups.filterOptions.pending"),
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
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	// Show spinner while loading clusters (model training complete)
	if (canShowClusters && isClustersLoading) {
		return (
			<div className="flex min-h-[400px] w-full items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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

	const totalCount = filteredClusters.length;

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
						<div className="flex gap-2">
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
									{(["all", "FOUND", "GAP", "PENDING"] as KBFilterOption[]).map(
										(k) => (
											<DropdownMenuItem key={k} onClick={() => setKbFilter(k)}>
												{kbFilterLabels[k]}
											</DropdownMenuItem>
										),
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>

					{isTraining ? (
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
					) : filteredClusters.length > 0 ? (
						<div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
							{filteredClusters.map((cluster) => (
								<TicketGroupStat
									key={cluster.id}
									id={cluster.id}
									title={getDisplayTitle(cluster.name, cluster.subcluster_name)}
									count={cluster.ticket_count}
									knowledgeStatus={cluster.kb_status}
								/>
							))}
						</div>
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
