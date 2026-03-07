import { Link, useNavigate } from "react-router-dom";
import { ProLayout } from "@/components/layouts/ProLayout";
import { ProAgentTable } from "@/components/pro/ProAgentTable";
import { ProStatsCards } from "@/components/pro/ProStatsCards";

import {
	MOCK_MCP_SKILLS,
	MOCK_PRO_AGENTS,
	MOCK_PRO_DASHBOARD_STATS,
} from "@/data/mock-pro";
import type { ProAgent } from "@/types/pro";

export default function ProDashboardPage() {
	const navigate = useNavigate();

	const handleAgentClick = (agent: ProAgent) => {
		navigate(`/pro/mcp/${agent.id}`);
	};

	const handleEdit = (agent: ProAgent) => {
		navigate(`/pro/mcp/${agent.id}`);
	};

	return (
		<ProLayout>
			<div className="p-6 space-y-6">
				<ProStatsCards stats={MOCK_PRO_DASHBOARD_STATS} />

				<section>
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold">Recent Dynamic MCPs</h2>
						<Link
							to="/pro/mcp"
							className="text-sm text-primary hover:underline"
						>
							View All
						</Link>
					</div>
					<ProAgentTable
						agents={MOCK_PRO_AGENTS}
						skills={MOCK_MCP_SKILLS}
						onAgentClick={handleAgentClick}
						onEdit={handleEdit}
					/>
				</section>
			</div>
		</ProLayout>
	);
}
