/**
 * AddSkillModal - Modal for adding skills to an agent
 *
 * Features:
 * - Search skills by name or author
 * - Tabs: Available (unlinked) vs All
 * - Toggle selection with switch
 * - Shows linked agent info for already-assigned skills
 */

import { Search, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Skill {
	id: string;
	name: string;
	author: string;
	icon: React.ElementType;
	starters: string[];
	linkedAgent: string | null;
	skillInstructions: string;
}

interface AddSkillModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	availableSkills: Skill[];
	currentWorkflows: string[];
	onAdd: (skillNames: string[], starters: string[]) => void;
}

export function AddSkillModal({
	open,
	onOpenChange,
	availableSkills,
	currentWorkflows,
	onAdd,
}: AddSkillModalProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
	const [activeTab, setActiveTab] = useState<"available" | "all">("available");

	const handleClose = () => {
		onOpenChange(false);
		setSearchQuery("");
		setSelectedSkills([]);
		setActiveTab("available");
	};

	const filterBySearch = (skill: Skill) =>
		!searchQuery ||
		skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		skill.author.toLowerCase().includes(searchQuery.toLowerCase());

	const unlinkedSkills = availableSkills
		.filter((s) => s.linkedAgent === null && !currentWorkflows.includes(s.name))
		.filter(filterBySearch);

	const allFiltered = availableSkills.filter(filterBySearch);

	const displayedSkills =
		activeTab === "available" ? unlinkedSkills : allFiltered;

	const getIconBg = (author: string) =>
		/IT|System|Compliance/i.test(author) ? "bg-violet-200" : "bg-amber-100";

	const handleAdd = () => {
		const newStarters: string[] = [];
		for (const skillName of selectedSkills) {
			const skill = availableSkills.find((s) => s.name === skillName);
			if (skill?.starters) {
				for (const starter of skill.starters.slice(0, 1)) {
					if (!newStarters.includes(starter)) {
						newStarters.push(starter);
					}
				}
			}
		}
		onAdd(selectedSkills, newStarters);
		handleClose();
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent
				showCloseButton={false}
				className="sm:max-w-lg h-[600px] overflow-hidden flex flex-col p-0 gap-0"
			>
				{/* Close */}
				<button
					type="button"
					onClick={handleClose}
					className="absolute right-4 top-4 text-muted-foreground/70 hover:text-foreground z-10"
					aria-label="Close"
				>
					<X className="size-4" />
				</button>

				{/* Header + Search + Tabs */}
				<div className="px-6 pt-6 flex flex-col gap-4">
					<div>
						<h2 className="text-lg font-semibold">Add skills</h2>
						<p className="text-sm text-muted-foreground mt-1.5">
							Help users understand what this agent can help them with by adding
							skills
						</p>
					</div>
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
						<Input
							placeholder="Search skills..."
							className="pl-9 rounded-lg"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
					<Tabs
						value={activeTab}
						onValueChange={(v) => setActiveTab(v as "available" | "all")}
					>
						<TabsList className="w-full">
							<TabsTrigger value="available" className="flex-1">
								Available
								<Badge
									variant="secondary"
									className="ml-1.5 text-xs px-1.5 py-0"
								>
									{unlinkedSkills.length}
								</Badge>
							</TabsTrigger>
							<TabsTrigger value="all" className="flex-1">
								All
								<Badge
									variant="secondary"
									className="ml-1.5 text-xs px-1.5 py-0"
								>
									{allFiltered.length}
								</Badge>
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>

				{/* Skills list */}
				<div className="flex-1 overflow-y-auto max-h-[400px] mt-5">
					{displayedSkills.map((skill) => {
						const isAlreadyAdded = currentWorkflows.includes(skill.name);
						const isLinkedToOther =
							skill.linkedAgent !== null && !isAlreadyAdded;
						const isSelected = selectedSkills.includes(skill.name);
						const SkillIcon = skill.icon;

						return (
							<div
								key={skill.id}
								className={cn(
									"flex items-start gap-[10px] px-6 py-[10px] border-b",
									isLinkedToOther && "opacity-60",
								)}
							>
								<div
									className={cn(
										"size-5 rounded-sm flex items-center justify-center flex-shrink-0 mt-0.5",
										getIconBg(skill.author),
									)}
								>
									<SkillIcon className="size-3" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium leading-none">
										{skill.name}
									</p>
									<p className="text-sm text-muted-foreground leading-5">
										{skill.author}
									</p>
								</div>
								<div className="flex-shrink-0">
									{isAlreadyAdded ? (
										<span className="text-xs text-muted-foreground">Added</span>
									) : isLinkedToOther ? (
										<div className="text-right">
											<p className="text-xs text-primary">
												Duplicate in Actions
											</p>
											<p className="text-xs text-muted-foreground">
												used in {skill.linkedAgent}
											</p>
										</div>
									) : (
										<Switch
											checked={isSelected}
											onCheckedChange={(checked) => {
												setSelectedSkills((prev) =>
													checked
														? [...prev, skill.name]
														: prev.filter((s) => s !== skill.name),
												);
											}}
										/>
									)}
								</div>
							</div>
						);
					})}
					{displayedSkills.length === 0 && (
						<div className="py-8 text-center text-sm text-muted-foreground">
							No skills found matching &quot;{searchQuery}&quot;
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="px-6 py-3 flex justify-end gap-2">
					<Button variant="outline" size="sm" onClick={handleClose}>
						Cancel
					</Button>
					<Button
						size="sm"
						disabled={selectedSkills.length === 0}
						onClick={handleAdd}
					>
						Add {selectedSkills.length > 0 ? `(${selectedSkills.length})` : ""}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
