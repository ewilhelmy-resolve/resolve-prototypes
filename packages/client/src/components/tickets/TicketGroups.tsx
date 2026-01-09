import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClusters } from "@/hooks/useClusters";
import { ChevronDown, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TicketGroupStat } from "./TicketGroupStat";

interface TicketGroupsProps {
	period?: string;
}

export default function TicketGroups({ period }: TicketGroupsProps) {
	const { t } = useTranslation("tickets");
	const { data: clusters, isLoading, error } = useClusters();
	const effectivePeriod = period ?? t("groups.periods.last90Days");

	// Build display title from name + subcluster_name
	const getDisplayTitle = (name: string, subclusterName: string | null) => {
		if (subclusterName) {
			return `${name} - ${subclusterName}`;
		}
		return name;
	};

	if (isLoading) {
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

	const totalCount = clusters?.length ?? 0;

	return (
		<div className="flex min-h-screen w-full flex-col items-center">
			<div className="flex w-full items-start justify-center py-6">
				<div className="flex w-full flex-col gap-6 px-6">
					<div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
						<div className="flex flex-col gap-1.5">
							<div className="flex items-center gap-1.5">
								<h1 className="text-base font-bold text-card-foreground">{t("page.title")}</h1>
								<Badge variant="outline">{totalCount}</Badge>
							</div>
							<p className="text-sm text-muted-foreground">{t("page.subtitle")}</p>
						</div>
						<div className="flex gap-2">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										{effectivePeriod}
										<ChevronDown />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<DropdownMenuItem>{t("groups.periods.last30Days")}</DropdownMenuItem>
									<DropdownMenuItem>{t("groups.periods.last90Days")}</DropdownMenuItem>
									<DropdownMenuItem>{t("groups.periods.last6Months")}</DropdownMenuItem>
									<DropdownMenuItem>{t("groups.periods.lastYear")}</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										{t("groups.filterBy")}
										<ChevronDown />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<DropdownMenuItem>{t("groups.filterOptions.all")}</DropdownMenuItem>
									<DropdownMenuItem>{t("groups.filterOptions.knowledgeFound")}</DropdownMenuItem>
									<DropdownMenuItem>{t("groups.filterOptions.knowledgeGap")}</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>

					{clusters && clusters.length > 0 ? (
						<div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
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
