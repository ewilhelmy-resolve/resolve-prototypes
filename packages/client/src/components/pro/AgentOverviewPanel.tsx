import { FileSpreadsheet, Plus, ShieldEllipsis, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEMO_KNOWLEDGE = [
	{ id: "k1", name: "Reset password" },
	{ id: "k2", name: "Unlock account" },
];

interface AgentOverviewPanelProps {
	agentName: string;
	selectedSkills: { id: string; name: string }[];
	onClose: () => void;
	onAddKnowledge?: () => void;
	onAddSkills?: () => void;
}

export function AgentOverviewPanel({
	agentName,
	selectedSkills,
	onClose,
	onAddKnowledge,
	onAddSkills,
}: AgentOverviewPanelProps) {
	return (
		<aside
			className="flex w-[467px] flex-col gap-8 border-l border-border bg-white p-5"
			aria-label="Agent overview"
		>
			{/* Header */}
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-medium">Overview</h2>
				<Button
					variant="ghost"
					size="icon"
					onClick={onClose}
					aria-label="Close overview panel"
				>
					<X className="size-4" />
				</Button>
			</div>

			{/* Content sections */}
			<div className="flex flex-col gap-4">
				{/* Knowledge section */}
				<div className="flex flex-col gap-2">
					<span className="text-sm text-muted-foreground">
						{agentName} knowledge
					</span>
					<div className="rounded-md border">
						<ul className="list-none" aria-label="Knowledge items">
							{DEMO_KNOWLEDGE.map((item) => (
								<li
									key={item.id}
									className="flex items-center gap-[10px] px-[15px] py-[10px]"
								>
									<div className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-violet-200">
										<ShieldEllipsis className="size-3" />
									</div>
									<span className="text-base">{item.name}</span>
								</li>
							))}
						</ul>
						<div className="px-[15px] py-[10px]">
							<Button
								variant="ghost"
								size="sm"
								className="h-auto p-0 text-sm"
								onClick={onAddKnowledge}
							>
								<Plus className="mr-1 size-3.5" />
								Add knowledge
							</Button>
						</div>
					</div>
				</div>

				{/* Skills section */}
				<div className="flex flex-col gap-2">
					<span className="text-sm text-muted-foreground">Skills applied</span>
					<div className="rounded-md border">
						<ul className="list-none" aria-label="Applied skills">
							{selectedSkills.map((skill, index) => (
								<li
									key={skill.id}
									className="flex items-center gap-[10px] px-[15px] py-[10px]"
								>
									<div
										className={`flex size-5 shrink-0 items-center justify-center rounded-sm ${
											index % 2 === 0 ? "bg-amber-100" : "bg-blue-100"
										}`}
									>
										<FileSpreadsheet className="size-3" />
									</div>
									<span className="text-base">{skill.name}</span>
								</li>
							))}
						</ul>
						<div className="px-[15px] py-[10px]">
							<Button
								variant="ghost"
								size="sm"
								className="h-auto p-0 text-sm"
								onClick={onAddSkills}
							>
								<Plus className="mr-1 size-3.5" />
								Add skills
							</Button>
						</div>
					</div>
				</div>
			</div>
		</aside>
	);
}
