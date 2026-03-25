import { ChevronDown, Settings } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

import { MainHeader } from "@/components/MainHeader";
import { StatCard } from "@/components/StatCard";
import { StatGroup } from "@/components/StatGroup";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
	calculateEstMoneySaved,
	calculateEstTimeSavedMinutes,
	formatMoneySaved,
	formatTimeSaved,
	STAT_NOT_AVAILABLE,
} from "@/lib/format-utils";
import { useTicketSettingsStore } from "@/stores/ticketSettingsStore";
import type { PeriodFilter } from "@/types/cluster";

interface ClustersPageHeaderProps {
	period: PeriodFilter;
	onPeriodChange: (period: PeriodFilter) => void;
	totalTickets: number;
	showSkeletons: boolean;
	hasNoModel: boolean;
	onSettingsClick: () => void;
	lastSynced?: string;
}

export function ClustersPageHeader({
	period,
	onPeriodChange,
	totalTickets,
	showSkeletons,
	hasNoModel,
	onSettingsClick,
	lastSynced,
}: ClustersPageHeaderProps) {
	const { t } = useTranslation("tickets");
	const { blendedRatePerHour, avgMinutesPerTicket } = useTicketSettingsStore();

	const moneySaved = calculateEstMoneySaved(
		blendedRatePerHour,
		avgMinutesPerTicket,
		totalTickets,
	);
	const timeSavedMinutes = calculateEstTimeSavedMinutes(
		avgMinutesPerTicket,
		totalTickets,
	);

	const periodLabels: Record<PeriodFilter, string> = {
		last30: t("groups.periods.last30Days"),
		last90: t("groups.periods.last90Days"),
		last6months: t("groups.periods.last6Months"),
		lastyear: t("groups.periods.lastYear"),
	};

	const headerDescription = showSkeletons ? (
		<Skeleton className="h-4 w-64" />
	) : hasNoModel ? (
		""
	) : (
		<span className="flex items-center gap-2">
			<Trans
				i18nKey="header.description"
				ns="tickets"
				values={{
					ticketCount: totalTickets.toLocaleString(),
					period: periodLabels[period].toLowerCase(),
				}}
				components={{ strong: <span className="font-semibold" /> }}
			/>
			{lastSynced && (
				<>
					<span className="text-muted-foreground">·</span>
					<span className="text-muted-foreground text-xs">
						{t("header.lastSynced", { time: lastSynced })}
					</span>
				</>
			)}
		</span>
	);

	return (
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
								<DropdownMenuItem key={p} onClick={() => onPeriodChange(p)}>
									{periodLabels[p]}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
					<Button
						variant="outline"
						size="icon"
						onClick={onSettingsClick}
						aria-label={t("ticketSettings.title")}
					>
						<Settings className="h-4 w-4" />
					</Button>
				</div>
			}
			stats={
				<StatGroup columns={5}>
					<StatCard
						value={totalTickets.toLocaleString()}
						label={t("header.stats.totalTickets")}
						loading={showSkeletons}
					/>
					<StatCard
						value={formatMoneySaved(moneySaved)}
						label={t("header.stats.estMoneySaved")}
						loading={showSkeletons}
					/>
					<StatCard
						value={formatTimeSaved(timeSavedMinutes)}
						label={t("header.stats.estTimeSaved")}
						loading={showSkeletons}
					/>
					<StatCard value={STAT_NOT_AVAILABLE} label={t("header.stats.mttr")} />
					<StatCard
						value={STAT_NOT_AVAILABLE}
						label={t("header.stats.avgReassignmentRate")}
					/>
				</StatGroup>
			}
		/>
	);
}
