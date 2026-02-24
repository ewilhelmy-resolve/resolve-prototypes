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
import { useAutopilotSettings } from "@/hooks/api/useAutopilotSettings";
import type { PeriodFilter } from "@/types/cluster";

interface ClustersPageHeaderProps {
	period: PeriodFilter;
	onPeriodChange: (period: PeriodFilter) => void;
	totalTickets: number;
	automatedTickets?: number;
	showSkeletons: boolean;
	hasNoModel: boolean;
	onSettingsClick: () => void;
}

/**
 * Format minutes into human-readable time string.
 * e.g. 90 → "1.5hr", 30 → "30min", 0 → "0min"
 */
function formatTimeSaved(totalMinutes: number): string {
	if (totalMinutes >= 60) {
		const hours = totalMinutes / 60;
		return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}hr`;
	}
	return `${Math.round(totalMinutes)}min`;
}

/**
 * Format dollar amount for display.
 * e.g. 1500 → "$1.5k", 500 → "$500", 0 → "$0"
 */
function formatMoneySaved(amount: number): string {
	if (amount >= 1000) {
		return `$${(amount / 1000).toFixed(1)}k`;
	}
	return `$${Math.round(amount)}`;
}

export function ClustersPageHeader({
	period,
	onPeriodChange,
	totalTickets,
	automatedTickets = 0,
	showSkeletons,
	hasNoModel,
	onSettingsClick,
}: ClustersPageHeaderProps) {
	const { t } = useTranslation("tickets");
	const { data: settings } = useAutopilotSettings();

	const costPerTicket = settings?.cost_per_ticket ?? 30;
	const avgTimeMinutes = settings?.avg_time_per_ticket_minutes ?? 12;

	const automationPct =
		totalTickets > 0 ? Math.round((automatedTickets / totalTickets) * 100) : 0;
	const moneySaved = automatedTickets * costPerTicket;
	const timeSavedMinutes = automatedTickets * avgTimeMinutes;

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
						value={automatedTickets.toLocaleString()}
						label={t("header.stats.totalTicketsAutomated")}
						loading={showSkeletons}
					/>
					<StatCard
						value={`${automationPct}%`}
						label={t("header.stats.automationPercentage")}
						loading={showSkeletons}
					/>
					<StatCard
						value={formatMoneySaved(moneySaved)}
						label={t("header.stats.moneySaved")}
						loading={showSkeletons}
					/>
					<StatCard
						value={formatTimeSaved(timeSavedMinutes)}
						label={t("header.stats.timeSaved")}
						loading={showSkeletons}
					/>
				</StatGroup>
			}
		/>
	);
}
