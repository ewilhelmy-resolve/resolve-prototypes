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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAutopilotSettings } from "@/hooks/api/useAutopilotSettings";
import { usePhaseGate } from "@/hooks/usePhaseGate";
import { type Phase, usePhaseStore } from "@/stores/phaseStore";
import { useTicketSettingsStore } from "@/stores/ticketSettingsStore";
import type { PeriodFilter } from "@/types/cluster";

interface ClustersPageHeaderProps {
	period: PeriodFilter;
	onPeriodChange: (period: PeriodFilter) => void;
	totalTickets: number;
	automatedTickets?: number;
	showSkeletons: boolean;
	hasNoModel: boolean;
	onSettingsClick: () => void;
	lastSynced?: string;
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
	lastSynced,
}: ClustersPageHeaderProps) {
	const { t } = useTranslation("tickets");
	const { data: settings } = useAutopilotSettings();
	const phaseV2 = usePhaseGate("tickets", "v2");
	const phaseV3 = usePhaseGate("tickets", "v3");
	const ticketsPhase = usePhaseStore((state) => state.phases.tickets);
	const setPhase = usePhaseStore((state) => state.setPhase);
	const { blendedRatePerHour, timeToTake } = useTicketSettingsStore();

	const moneySaved = blendedRatePerHour * (timeToTake / 60) * totalTickets;
	const timeSavedMins = timeToTake * totalTickets;
	const timeSavedHrs = Math.floor(timeSavedMins / 60);

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
					<Select
						value={ticketsPhase}
						onValueChange={(v) => setPhase("tickets", v as Phase)}
					>
						<SelectTrigger className="w-16 h-8 text-xs" aria-label="Tickets phase">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="v1">v1</SelectItem>
							<SelectItem value="v2">v2</SelectItem>
							<SelectItem value="v3">v3</SelectItem>
						</SelectContent>
					</Select>
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
					{phaseV2 && (
						<Button
							variant="outline"
							size="icon"
							onClick={onSettingsClick}
							aria-label={t("ticketSettings.title")}
						>
							<Settings className="h-4 w-4" />
						</Button>
					)}
				</div>
			}
			stats={
				<StatGroup columns={phaseV3 ? 5 : phaseV2 ? 3 : 1}>
					<StatCard
						value={totalTickets.toLocaleString()}
						label={t("header.stats.totalTickets")}
						loading={showSkeletons}
					/>
					{phaseV2 && (
						<StatCard
							value={formatMoneySaved(moneySaved)}
							label={t("header.stats.moneyImpact")}
							loading={showSkeletons}
						/>
					)}
					{phaseV2 && (
						<StatCard
							value={`${timeSavedHrs}hr`}
							label={t("header.stats.timeImpact")}
							loading={showSkeletons}
						/>
					)}
					{phaseV3 && (
						<StatCard
							value="3.8hr"
							label={t("header.stats.mttr")}
							loading={showSkeletons}
						/>
					)}
					{phaseV3 && (
						<StatCard
							value="2.1"
							label={t("header.stats.avgReassignmentRate")}
							loading={showSkeletons}
						/>
					)}
				</StatGroup>
			}
		/>
	);
}
