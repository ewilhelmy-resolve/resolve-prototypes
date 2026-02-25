import { ChevronDown, Settings } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

import { MainHeader } from "@/components/MainHeader";
import { StatCard } from "@/components/StatCard";
import { StatGroup } from "@/components/StatGroup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
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

	const moneySaved = automatedTickets * costPerTicket;

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

	const comingSoonBadge = (
		<Badge variant="secondary" className="text-[10px] px-1.5 py-0">
			{t("header.stats.comingSoon")}
		</Badge>
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
				<StatGroup columns={4}>
					<StatCard
						value={totalTickets.toLocaleString()}
						label={t("header.stats.totalTickets")}
						loading={showSkeletons}
					/>
					<Tooltip>
						<TooltipTrigger asChild>
							<div>
								<StatCard
									value="--"
									label={t("header.stats.mttr")}
									badge={comingSoonBadge}
								/>
							</div>
						</TooltipTrigger>
						<TooltipContent>{t("header.stats.mttrTooltip")}</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<div>
								<StatCard
									value="--"
									label={t("header.stats.avgReassignmentRate")}
									badge={comingSoonBadge}
								/>
							</div>
						</TooltipTrigger>
						<TooltipContent>
							{t("header.stats.reassignmentTooltip")}
						</TooltipContent>
					</Tooltip>
					<StatCard
						value={formatMoneySaved(moneySaved)}
						label={t("header.stats.moneySaved")}
						loading={showSkeletons}
					/>
				</StatGroup>
			}
		/>
	);
}
