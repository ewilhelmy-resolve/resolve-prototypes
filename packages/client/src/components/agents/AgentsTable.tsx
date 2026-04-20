/**
 * AgentsTable - Data table for displaying agents list
 *
 * Features:
 * - Sortable columns (status, updated by, owner, last updated)
 * - Avatar display for updated by / owner
 * - Status badges
 * - Action menu
 */

import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { AgentTableRow } from "@/types/agent";

export type { AgentTableRow as Agent };

interface AgentsTableProps {
	agents: AgentTableRow[];
	onAgentClick?: (agent: AgentTableRow) => void;
	onEdit?: (agent: AgentTableRow) => void;
	onDelete?: (agent: AgentTableRow) => void;
	/**
	 * When provided, rows whose `updatedBy` matches this email render "Me"
	 * instead of the email in the Updated by column.
	 */
	currentUserEmail?: string;
}

type SortField = "state" | "updatedBy" | "lastUpdated";
type SortDirection = "asc" | "desc";

function SortableHeader({
	field,
	children,
	align = "left",
	onSort,
}: {
	field: SortField;
	children: React.ReactNode;
	align?: "left" | "center" | "right";
	onSort: (field: SortField) => void;
}) {
	return (
		<Button
			variant="ghost"
			className={cn(
				"h-9 px-4 gap-2 font-normal text-muted-foreground hover:text-foreground",
				align === "right" && "ml-auto",
				align === "center" && "mx-auto",
			)}
			onClick={() => onSort(field)}
		>
			{children}
			<ArrowUpDown className="size-4" />
		</Button>
	);
}

export function AgentsTable({
	agents,
	onAgentClick,
	onEdit,
	onDelete,
	currentUserEmail,
}: AgentsTableProps) {
	const { t } = useTranslation("agents");
	const [sortField, setSortField] = useState<SortField | null>(null);
	const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDirection("asc");
		}
	};

	const sortedAgents = [...agents].sort((a, b) => {
		if (!sortField) return 0;

		let comparison = 0;
		switch (sortField) {
			case "state":
				comparison = a.state.localeCompare(b.state);
				break;
			case "updatedBy":
				comparison = (a.updatedBy || "").localeCompare(b.updatedBy || "");
				break;
			case "lastUpdated":
				comparison =
					new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
				break;
		}

		return sortDirection === "asc" ? comparison : -comparison;
	});

	return (
		<div className="rounded-md border overflow-hidden">
			<Table aria-label={t("table.ariaLabel")}>
				<TableHeader>
					<TableRow className="hover:bg-transparent">
						<TableHead className="min-w-[250px] pl-4">
							{t("table.columns.name")}
						</TableHead>
						<TableHead className="w-[200px]">
							{t("table.columns.skills")}
						</TableHead>
						<TableHead className="w-[127px]">
							<SortableHeader field="state" onSort={handleSort}>
								{t("table.columns.state")}
							</SortableHeader>
						</TableHead>
						<TableHead className="w-[136px]">
							<SortableHeader field="updatedBy" onSort={handleSort}>
								{t("table.columns.updatedBy")}
							</SortableHeader>
						</TableHead>
						<TableHead className="w-[162px]">
							<SortableHeader
								field="lastUpdated"
								align="right"
								onSort={handleSort}
							>
								{t("table.columns.lastUpdated")}
							</SortableHeader>
						</TableHead>
						<TableHead className="w-16" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{sortedAgents.map((agent) => (
						<TableRow
							key={agent.id}
							className="h-[84px] cursor-pointer"
							onClick={() => onAgentClick?.(agent)}
						>
							<TableCell className="pl-4 max-w-[300px]">
								<div className="flex flex-col min-w-0">
									<span className="text-primary font-medium truncate">
										{agent.name}
									</span>
									<span
										className="text-muted-foreground text-sm truncate"
										title={agent.description}
									>
										{agent.description}
									</span>
								</div>
							</TableCell>
							<TableCell>
								{agent.skills && agent.skills.length > 0 ? (
									<div
										className="flex items-center gap-1 max-w-[200px]"
										title={agent.skills.join(", ")}
									>
										<span className="text-sm text-muted-foreground truncate">
											{agent.skills.slice(0, 2).join(", ")}
										</span>
										{agent.skills.length > 2 && (
											<span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
												+{agent.skills.length - 2}
											</span>
										)}
									</div>
								) : (
									<span className="text-muted-foreground text-sm">--</span>
								)}
							</TableCell>
							<TableCell>
								<Badge
									variant={agent.state === "PUBLISHED" ? "default" : "outline"}
								>
									{agent.state === "PUBLISHED"
										? t("table.statePublished")
										: agent.state === "RETIRED"
											? t("table.stateRetired")
											: agent.state === "TESTING"
												? t("table.stateTesting")
												: t("table.stateDraft")}
								</Badge>
							</TableCell>
							<TableCell>
								<span className="text-sm text-muted-foreground truncate">
									{agent.updatedBy
										? currentUserEmail && agent.updatedBy === currentUserEmail
											? t("table.updatedByMe")
											: agent.updatedBy
										: "--"}
								</span>
							</TableCell>
							<TableCell className="text-right text-sm">
								{agent.lastUpdated}
							</TableCell>
							<TableCell onClick={(e) => e.stopPropagation()}>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="size-8"
											aria-label={t("table.actions.ariaLabel")}
										>
											<MoreHorizontal className="size-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem onClick={() => onEdit?.(agent)}>
											{t("table.actions.edit")}
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => onDelete?.(agent)}
											className="text-destructive focus:text-destructive"
										>
											{t("table.actions.delete")}
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
