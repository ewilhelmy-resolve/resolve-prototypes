import { MoreHorizontal } from "lucide-react";
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
import type { MCPSkill, ProAgent, ProAgentStatus } from "@/types/pro";

interface ProAgentTableProps {
	agents: ProAgent[];
	skills: MCPSkill[];
	onAgentClick?: (agent: ProAgent) => void;
	onEdit?: (agent: ProAgent) => void;
	onDelete?: (agent: ProAgent) => void;
}

const statusVariant: Record<
	ProAgentStatus,
	"default" | "outline" | "secondary"
> = {
	active: "default",
	draft: "outline",
	disabled: "secondary",
};

function getSkillCount(agent: ProAgent, skills: MCPSkill[]): number {
	return skills.filter((s) => agent.skillIds.includes(s.id)).length;
}

export function ProAgentTable({
	agents,
	skills,
	onAgentClick,
	onEdit,
	onDelete,
}: ProAgentTableProps) {
	return (
		<div className="rounded-md border overflow-hidden">
			<Table>
				<TableHeader>
					<TableRow className="hover:bg-transparent">
						<TableHead className="min-w-[200px] pl-4">Name</TableHead>
						<TableHead className="min-w-[280px]">Endpoint</TableHead>
						<TableHead className="w-[100px]">Skills</TableHead>
						<TableHead className="w-[120px]">Status</TableHead>
						<TableHead className="w-16">
							<span className="sr-only">Actions</span>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{agents.map((agent) => (
						<TableRow
							key={agent.id}
							className="h-[64px] cursor-pointer"
							onClick={() => onAgentClick?.(agent)}
						>
							<TableCell className="pl-4">
								<div className="flex flex-col">
									<span className="text-primary font-medium truncate">
										{agent.name}
									</span>
									<span className="text-muted-foreground text-sm truncate">
										{agent.description}
									</span>
								</div>
							</TableCell>
							<TableCell>
								<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
									/api/v1/mcp/{agent.endpointSlug}/run
								</code>
							</TableCell>
							<TableCell>
								<span className="text-sm">{getSkillCount(agent, skills)}</span>
							</TableCell>
							<TableCell>
								<Badge variant={statusVariant[agent.status]}>
									{agent.status}
								</Badge>
							</TableCell>
							<TableCell onClick={(e) => e.stopPropagation()}>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="size-8"
											aria-label={`Actions for ${agent.name}`}
										>
											<MoreHorizontal className="size-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem onClick={() => onEdit?.(agent)}>
											Edit
										</DropdownMenuItem>
										<DropdownMenuItem
											variant="destructive"
											onClick={() => onDelete?.(agent)}
										>
											Delete
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
