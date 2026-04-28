import { Box, FileText, Globe } from "lucide-react";
import { useState } from "react";

type VariableSubTab = "workflows" | "global" | "module";

const SUB_TABS: { id: VariableSubTab; label: string; icon: typeof FileText }[] =
	[
		{ id: "workflows", label: "Workflows", icon: FileText },
		{ id: "global", label: "Global", icon: Globe },
		{ id: "module", label: "Module", icon: Box },
	];

export function WorkflowVariablesPanel() {
	const [activeSubTab, setActiveSubTab] = useState<VariableSubTab>("workflows");

	return (
		<div className="flex-1 flex flex-col min-h-0 overflow-hidden">
			{/* Sub-tab bar */}
			<div
				className="flex items-center gap-4 px-3 border-b border-slate-200"
				role="tablist"
				aria-label="Variable categories"
			>
				{SUB_TABS.map((tab) => {
					const isActive = activeSubTab === tab.id;
					return (
						<button
							key={tab.id}
							role="tab"
							aria-selected={isActive}
							onClick={() => setActiveSubTab(tab.id)}
							className={`flex items-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
								isActive
									? "text-blue-600 border-blue-600"
									: "text-slate-500 border-transparent hover:text-slate-700"
							}`}
						>
							<tab.icon className="w-3.5 h-3.5" />
							{tab.label}
						</button>
					);
				})}
			</div>

			{/* Content */}
			<div
				className="flex-1 flex items-center justify-center p-6"
				role="tabpanel"
				aria-label={`${SUB_TABS.find((t) => t.id === activeSubTab)?.label} variables`}
			>
				<p className="text-sm text-slate-400">No workflow variables</p>
			</div>
		</div>
	);
}
