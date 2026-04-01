/**
 * AgentTemplateModal - Agent Library modal for browsing templates
 *
 * Features:
 * - Search templates
 * - Collapsible category sidebar (System, Domain, Type)
 * - Template cards with icon, title, description, skills
 */

import { Bot, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AGENT_TEMPLATES } from "@/constants/agentMocks";
import { AGENT_ICON_MAP } from "@/constants/agents";
import { cn } from "@/lib/utils";
import type { AgentTemplate } from "@/types/agent";

// Category structure
interface CategoryItem {
	id: string;
	name: string;
	count?: number;
	children?: CategoryItem[];
}

const CATEGORIES: CategoryItem[] = [
	{ id: "all", name: "All agents", count: AGENT_TEMPLATES.length },
	{ id: "system", name: "System" },
	{
		id: "domain",
		name: "Domain",
		children: [
			{ id: "access-management", name: "Access Management" },
			{ id: "approvals", name: "Approvals" },
			{ id: "customer-success", name: "Customer Success" },
			{ id: "general", name: "General" },
			{ id: "human-resources", name: "Human Resources" },
		],
	},
	{ id: "type", name: "Type" },
];

interface AgentTemplateModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelectTemplate: (template: AgentTemplate) => void;
}

export function AgentTemplateModal({
	open,
	onOpenChange,
	onSelectTemplate,
}: AgentTemplateModalProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [expandedCategories, setExpandedCategories] = useState<string[]>([
		"domain",
	]);
	const [selectedCategory, setSelectedCategory] = useState<string>("all");
	const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(
		"access-management",
	);
	const [selectedTemplate, setSelectedTemplate] =
		useState<AgentTemplate | null>(null);

	// Reset state when modal opens
	useEffect(() => {
		if (open) {
			setSelectedTemplate(null);
			setSearchQuery("");
		}
	}, [open]);

	// Toggle category expansion
	const toggleCategory = (categoryId: string) => {
		setExpandedCategories((prev) =>
			prev.includes(categoryId)
				? prev.filter((id) => id !== categoryId)
				: [...prev, categoryId],
		);
	};

	// Filter templates
	const filteredTemplates = AGENT_TEMPLATES.filter((template) => {
		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			if (
				!template.name.toLowerCase().includes(query) &&
				!template.description.toLowerCase().includes(query) &&
				!template.skills.some((s) => s.toLowerCase().includes(query))
			) {
				return false;
			}
		}

		// Category filter - derive domain name from CATEGORIES structure
		if (selectedSubCategory) {
			const domainCategory = CATEGORIES.find((c) => c.children)?.children;
			const domainName = domainCategory?.find(
				(c) => c.id === selectedSubCategory,
			)?.name;
			if (domainName && template.domain !== domainName) {
				return false;
			}
		}

		return true;
	});

	const handleSelectTemplate = (template: AgentTemplate) => {
		setSelectedTemplate(template);
	};

	const handleUseTemplate = () => {
		if (selectedTemplate) {
			onSelectTemplate(selectedTemplate);
			onOpenChange(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="sm:max-w-6xl w-[90vw] h-[80vh] max-h-[800px] flex flex-col p-0 gap-0"
			>
				{/* Header */}
				<div className="flex items-center justify-between px-8 pt-8 pb-6">
					<h2 className="text-lg font-semibold">Agent Library</h2>
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						aria-label="Close"
						className="p-1 rounded hover:bg-muted transition-colors opacity-70 hover:opacity-100"
					>
						<X className="size-4" />
					</button>
				</div>

				{/* Search */}
				<div className="px-8 pb-6">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
						<Input
							placeholder="Search templates"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10 h-9"
						/>
					</div>
				</div>

				{/* Content area */}
				<div className="flex-1 flex gap-6 px-8 pb-8 overflow-hidden">
					{/* Left sidebar */}
					<div className="w-[316px] flex-shrink-0 overflow-y-auto">
						<div className="space-y-1">
							{CATEGORIES.map((category) => (
								<div key={category.id}>
									{/* Category button */}
									{category.children ? (
										<button
											onClick={() => toggleCategory(category.id)}
											className={cn(
												"w-full flex items-center justify-between px-2 py-2 rounded-md text-sm text-left transition-colors",
												"hover:bg-muted",
											)}
										>
											<span>{category.name}</span>
											{expandedCategories.includes(category.id) ? (
												<ChevronDown className="size-4" />
											) : (
												<ChevronRight className="size-4" />
											)}
										</button>
									) : (
										<button
											onClick={() => {
												setSelectedCategory(category.id);
												setSelectedSubCategory(null);
											}}
											className={cn(
												"w-full flex items-center justify-between px-2 py-2 rounded-md text-sm text-left transition-colors",
												selectedCategory === category.id && !selectedSubCategory
													? "bg-muted font-medium"
													: "hover:bg-muted",
											)}
										>
											<span>
												{category.name}
												{category.count && ` (${category.count})`}
											</span>
											{category.id !== "all" && (
												<ChevronRight className="size-4" />
											)}
										</button>
									)}

									{/* Subcategories */}
									{category.children &&
										expandedCategories.includes(category.id) && (
											<div className="ml-6 pl-4 border-l space-y-0.5 py-0.5">
												{category.children.map((sub) => (
													<button
														key={sub.id}
														onClick={() => {
															setSelectedCategory(category.id);
															setSelectedSubCategory(sub.id);
														}}
														className={cn(
															"w-full px-2 py-1.5 rounded-md text-sm text-left transition-colors",
															selectedSubCategory === sub.id
																? "bg-muted font-medium"
																: "hover:bg-muted",
														)}
													>
														{sub.name}
													</button>
												))}
											</div>
										)}
								</div>
							))}
						</div>
					</div>

					{/* Middle content - agent cards */}
					<div className="flex-1 overflow-y-auto min-h-0">
						<p className="text-sm text-muted-foreground mb-2">Agents</p>
						<div className="space-y-3">
							{filteredTemplates.map((template) => {
								const Icon = AGENT_ICON_MAP[template.iconId] || Bot;
								const isSelected = selectedTemplate?.id === template.id;
								return (
									<button
										key={template.id}
										onClick={() => handleSelectTemplate(template)}
										className={cn(
											"w-full text-left border rounded-lg p-4 transition-colors",
											isSelected
												? "border-primary bg-primary/5"
												: "hover:border-muted-foreground/30 hover:bg-accent/30",
										)}
									>
										<div className="flex gap-3 items-center">
											{/* Icon */}
											<div
												className={cn(
													"w-[56px] h-[56px] rounded-lg flex items-center justify-center flex-shrink-0",
													template.iconBg,
												)}
											>
												<Icon
													className={cn(
														"size-6",
														template.iconColor || "text-foreground",
													)}
												/>
											</div>

											{/* Content */}
											<div className="flex-1 min-w-0">
												<h3 className="text-base font-semibold tracking-tight truncate">
													{template.name}
												</h3>
												<p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
													{template.description}
												</p>
											</div>
										</div>
									</button>
								);
							})}

							{filteredTemplates.length === 0 && (
								<div className="text-center py-12 text-muted-foreground">
									<Bot className="size-12 mx-auto mb-4 opacity-50" />
									<p>No templates found</p>
									<p className="text-sm">
										Try adjusting your search or filters
									</p>
								</div>
							)}
						</div>
					</div>

					{/* Right preview panel */}
					<div
						className={cn(
							"w-[320px] flex-shrink-0 border-l pl-6 transition-all",
							selectedTemplate ? "opacity-100" : "opacity-50",
						)}
					>
						{selectedTemplate ? (
							<div className="h-full flex flex-col">
								{/* Preview header */}
								<div className="flex items-start gap-3 mb-4">
									{(() => {
										const Icon = AGENT_ICON_MAP[selectedTemplate.iconId] || Bot;
										return (
											<div
												className={cn(
													"w-[64px] h-[64px] rounded-lg flex items-center justify-center flex-shrink-0",
													selectedTemplate.iconBg,
												)}
											>
												<Icon
													className={cn(
														"size-7",
														selectedTemplate.iconColor || "text-foreground",
													)}
												/>
											</div>
										);
									})()}
									<div className="flex-1 min-w-0">
										<h3 className="text-lg font-semibold tracking-tight">
											{selectedTemplate.name}
										</h3>
										<p className="text-xs text-muted-foreground mt-1">
											by {selectedTemplate.creator}
										</p>
									</div>
								</div>

								{/* Description */}
								<div className="mb-4">
									<p className="text-sm text-muted-foreground">
										{selectedTemplate.description}
									</p>
								</div>

								{/* Skills */}
								<div className="mb-4">
									<p className="text-xs font-medium text-muted-foreground mb-2">
										Skills included
									</p>
									<div className="flex flex-wrap gap-1.5">
										{selectedTemplate.skills.map((skill, idx) => (
											<span
												key={idx}
												className="px-2 py-1 text-xs bg-muted rounded-md"
											>
												{skill}
											</span>
										))}
									</div>
								</div>

								{/* Domain */}
								<div className="mb-6">
									<p className="text-xs font-medium text-muted-foreground mb-2">
										Domain
									</p>
									<span className="px-2 py-1 text-xs bg-muted rounded-md">
										{selectedTemplate.domain}
									</span>
								</div>

								{/* Spacer */}
								<div className="flex-1" />

								{/* Action button */}
								<button
									onClick={handleUseTemplate}
									className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
									type="button"
								>
									Use this template
								</button>
							</div>
						) : (
							<div className="h-full flex items-center justify-center text-center">
								<div>
									<Bot className="size-10 mx-auto mb-3 text-muted-foreground/50" />
									<p className="text-sm text-muted-foreground">
										Select an agent to preview
									</p>
								</div>
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
