import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProLayout } from "@/components/layouts/ProLayout";
import { ProAgentTable } from "@/components/pro/ProAgentTable";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { MOCK_MCP_SKILLS, MOCK_PRO_AGENTS } from "@/data/mock-pro";
import type { ProAgent, ProAgentStatus } from "@/types/pro";

type StatusFilter = ProAgentStatus | "all";

export default function ProAgentsPage() {
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

	const filteredAgents = useMemo(() => {
		return MOCK_PRO_AGENTS.filter((agent) => {
			const matchesSearch =
				searchQuery === "" ||
				agent.name.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesStatus =
				statusFilter === "all" || agent.status === statusFilter;
			return matchesSearch && matchesStatus;
		});
	}, [searchQuery, statusFilter]);

	const handleAgentClick = (agent: ProAgent) => {
		navigate(`/pro/mcp/${agent.id}`);
	};

	const handleEdit = (agent: ProAgent) => {
		navigate(`/pro/mcp/${agent.id}`);
	};

	const handleDelete = (agent: ProAgent) => {
		console.log("Delete agent:", agent.id, agent.name);
	};

	return (
		<ProLayout>
			<div className="p-6 space-y-4">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Dynamic MCPs</h1>
					<Button onClick={() => navigate("/pro/mcp/create")}>
						<Plus className="size-4" />
						New Dynamic MCP
					</Button>
				</div>

				<div className="flex items-center gap-3">
					<div className="relative flex-1 max-w-sm">
						<Search
							className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
							aria-hidden="true"
						/>
						<Input
							placeholder="Search dynamic MCPs..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9"
							aria-label="Search dynamic MCPs"
						/>
					</div>
					<Select
						value={statusFilter}
						onValueChange={(val) => setStatusFilter(val as StatusFilter)}
					>
						<SelectTrigger className="w-36" aria-label="Filter by status">
							<SelectValue placeholder="All" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All</SelectItem>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="draft">Draft</SelectItem>
							<SelectItem value="disabled">Disabled</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<ProAgentTable
					agents={filteredAgents}
					skills={MOCK_MCP_SKILLS}
					onAgentClick={handleAgentClick}
					onEdit={handleEdit}
					onDelete={handleDelete}
				/>
			</div>
		</ProLayout>
	);
}
