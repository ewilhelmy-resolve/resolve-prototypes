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
import { TicketGroupStat } from "./TicketGroupStat";

interface TicketGroupsProps {
	period?: string;
}

export default function TicketGroups({ period = "Last 90 days" }: TicketGroupsProps) {
	const { data: clusters, isLoading, error } = useClusters();

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
				<p className="text-destructive">Failed to load ticket groups</p>
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
								<h1 className="text-base font-bold text-card-foreground">Ticket Groups</h1>
								<Badge variant="outline">{totalCount}</Badge>
							</div>
							<p className="text-sm text-muted-foreground">Based on the last 90 days</p>
						</div>
						<div className="flex gap-2">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										{period}
										<ChevronDown />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<DropdownMenuItem>Last 30 days</DropdownMenuItem>
									<DropdownMenuItem>Last 90 days</DropdownMenuItem>
									<DropdownMenuItem>Last 6 months</DropdownMenuItem>
									<DropdownMenuItem>Last year</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										Filter by
										<ChevronDown />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<DropdownMenuItem>All</DropdownMenuItem>
									<DropdownMenuItem>Knowledge found</DropdownMenuItem>
									<DropdownMenuItem>Knowledge gap</DropdownMenuItem>
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
							<p className="text-muted-foreground">No ticket groups found</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
