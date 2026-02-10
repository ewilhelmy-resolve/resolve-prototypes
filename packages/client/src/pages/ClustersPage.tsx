import { ChevronDown, Settings } from "lucide-react";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import RitaLayout from "@/components/layouts/RitaLayout";
import { MainHeader } from "@/components/MainHeader";
import { StatCard } from "@/components/StatCard";
import { StatGroup } from "@/components/StatGroup";
import TicketGroups from "@/components/tickets/TicketGroups";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveModel } from "@/hooks/useActiveModel";
import { useClusters } from "@/hooks/useClusters";
import { useIsIngesting } from "@/hooks/useIsIngesting";
import type { PeriodFilter } from "@/types/cluster";
import { TRAINING_STATES } from "@/types/mlModel";

export default function ClustersPage() {
	const { t } = useTranslation("tickets");
	const [period, setPeriod] = useState<PeriodFilter>("last90");

	// Get training state from active model
	const { data: activeModel, isLoading: isModelLoading } = useActiveModel();
	const trainingState = activeModel?.metadata?.training_state;

	// Check if any ITSM source is actively importing tickets
	const { isIngesting } = useIsIngesting();

	// Determine loading states
	const hasNoModel = !isModelLoading && activeModel === null;
	const isTraining = trainingState === TRAINING_STATES.IN_PROGRESS;
	const canShowData = trainingState === TRAINING_STATES.COMPLETE;

	// Show skeletons for first-time import (no completed model yet)
	// Re-imports keep existing clusters visible with just a banner
	const isFirstImport = isIngesting && !canShowData;
	const showSkeletons = isModelLoading || isTraining || isFirstImport;

	// Period display labels
	const periodLabels: Record<PeriodFilter, string> = {
		last30: t("groups.periods.last30Days"),
		last90: t("groups.periods.last90Days"),
		last6months: t("groups.periods.last6Months"),
		lastyear: t("groups.periods.lastYear"),
	};

	// Only fetch clusters when training is complete
	const { data: clustersResponse } = useClusters({
		enabled: canShowData,
		period,
	});

	const totals = clustersResponse?.totals;
	const totalTickets = totals?.total_tickets ?? 0;

	// Header description: skeleton when loading/training, empty string when no model, real data otherwise
	const headerDescription = showSkeletons ? (
		<Skeleton className="h-4 w-64" />
	) : hasNoModel ? (
		"" // Empty - TicketGroups will show the connect source message
	) : (
		<Trans
			i18nKey="header.description"
			ns="tickets"
			values={{
				ticketCount: totalTickets.toLocaleString(),
				period: periodLabels[period].toLowerCase(),
			}}
			components={{ strong: <span className="font-semibold" /> }}
		/>
	);

	return (
		<RitaLayout activePage="tickets">
			<MainHeader
				title="Tickets"
				description={headerDescription}
				action={
					<div className="flex items-center gap-2">
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
						<Button variant="outline" size="icon">
							<Settings className="h-4 w-4" />
						</Button>
					</div>
				}
				stats={
					<StatGroup>
						<StatCard
							value={totalTickets.toLocaleString()}
							label={t("header.stats.totalTickets")}
							loading={showSkeletons}
						/>
						<StatCard
							value="0"
							label={t("header.stats.totalTicketsAutomated")}
							loading={showSkeletons}
						/>
						<StatCard
							value="0%"
							label={t("header.stats.automationPercentage")}
							loading={showSkeletons}
						/>
						<StatCard
							value="$0"
							label={t("header.stats.moneySaved")}
							loading={showSkeletons}
						/>
						<StatCard
							value="0hr"
							label={t("header.stats.timeSaved")}
							loading={showSkeletons}
						/>
					</StatGroup>
				}
			/>
			<TicketGroups period={period} />
		</RitaLayout>
	);
}
