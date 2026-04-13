/**
 * AgentBuilderV1Page - Single-page agent builder form
 *
 * Flat form layout matching V2's configure panel sections:
 * Name, Description, Skills, Instructions, Conversation Starters,
 * Guardrails, Knowledge (web search + workspace toggles only).
 *
 * Publish flow: "Create Agent" triggers useAgentBuildStore background
 * build and navigates to /agents.
 */

import {
	ArrowLeft,
	Award,
	BookOpen,
	Bot,
	Briefcase,
	Calendar,
	ChevronDown,
	ClipboardList,
	Clock,
	Coffee,
	Database,
	Folder,
	Globe,
	GraduationCap,
	Headphones,
	Heart,
	Home,
	Key,
	Landmark,
	Layers,
	LineChart,
	Loader2,
	Lock,
	Mail,
	Map as MapIcon,
	MessageSquare,
	Package,
	Phone,
	Plus,
	Rocket,
	Search,
	Settings,
	ShieldCheck,
	ShoppingCart,
	Squirrel,
	Star,
	Target,
	ThumbsUp,
	Trash2,
	TrendingUp,
	Truck,
	Users,
	Workflow,
	Wrench,
	X,
	Zap,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useAgentBuildStore } from "@/stores/agentBuildStore";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const ICON_COLORS = [
	{ id: "slate", bg: "bg-slate-800", text: "text-white" },
	{ id: "blue", bg: "bg-blue-600", text: "text-white" },
	{ id: "emerald", bg: "bg-emerald-600", text: "text-white" },
	{ id: "violet", bg: "bg-violet-200", text: "text-foreground" },
	{ id: "purple", bg: "bg-purple-600", text: "text-white" },
	{ id: "orange", bg: "bg-orange-500", text: "text-white" },
	{ id: "rose", bg: "bg-rose-500", text: "text-white" },
];

const AVAILABLE_ICONS = [
	{ id: "bot", icon: Bot, keywords: ["ai", "assistant", "robot"] },
	{
		id: "message-square",
		icon: MessageSquare,
		keywords: ["chat", "conversation"],
	},
	{
		id: "headphones",
		icon: Headphones,
		keywords: ["support", "help", "audio"],
	},
	{
		id: "graduation-cap",
		icon: GraduationCap,
		keywords: ["education", "learning", "training"],
	},
	{
		id: "shield-check",
		icon: ShieldCheck,
		keywords: ["security", "compliance", "protection"],
	},
	{
		id: "clipboard-list",
		icon: ClipboardList,
		keywords: ["tasks", "checklist", "todo"],
	},
	{ id: "users", icon: Users, keywords: ["team", "people", "hr"] },
	{ id: "briefcase", icon: Briefcase, keywords: ["work", "business", "job"] },
	{
		id: "book-open",
		icon: BookOpen,
		keywords: ["knowledge", "documentation", "reading"],
	},
	{ id: "zap", icon: Zap, keywords: ["automation", "fast", "power"] },
	{ id: "target", icon: Target, keywords: ["goals", "focus", "aim"] },
	{ id: "globe", icon: Globe, keywords: ["web", "international", "world"] },
	{ id: "lock", icon: Lock, keywords: ["security", "password", "private"] },
	{ id: "mail", icon: Mail, keywords: ["email", "message", "communication"] },
	{ id: "phone", icon: Phone, keywords: ["call", "contact", "support"] },
	{ id: "calendar", icon: Calendar, keywords: ["schedule", "date", "time"] },
	{ id: "database", icon: Database, keywords: ["data", "storage", "info"] },
	{ id: "folder", icon: Folder, keywords: ["files", "documents", "organize"] },
	{
		id: "settings",
		icon: Settings,
		keywords: ["config", "preferences", "options"],
	},
	{ id: "wrench", icon: Wrench, keywords: ["tools", "fix", "repair"] },
	{ id: "heart", icon: Heart, keywords: ["health", "wellness", "care"] },
	{ id: "star", icon: Star, keywords: ["favorite", "rating", "important"] },
	{
		id: "award",
		icon: Award,
		keywords: ["achievement", "recognition", "badge"],
	},
	{ id: "rocket", icon: Rocket, keywords: ["launch", "startup", "fast"] },
	{ id: "coffee", icon: Coffee, keywords: ["break", "cafe", "drink"] },
	{ id: "home", icon: Home, keywords: ["house", "main", "dashboard"] },
	{ id: "key", icon: Key, keywords: ["access", "password", "unlock"] },
	{ id: "layers", icon: Layers, keywords: ["stack", "design", "levels"] },
	{
		id: "map",
		icon: MapIcon,
		keywords: ["location", "navigation", "directions"],
	},
	{ id: "package", icon: Package, keywords: ["shipping", "delivery", "box"] },
	{
		id: "shopping-cart",
		icon: ShoppingCart,
		keywords: ["ecommerce", "buy", "cart"],
	},
	{ id: "thumbs-up", icon: ThumbsUp, keywords: ["like", "approve", "good"] },
	{
		id: "trending-up",
		icon: TrendingUp,
		keywords: ["growth", "analytics", "increase"],
	},
	{
		id: "line-chart",
		icon: LineChart,
		keywords: ["analytics", "data", "metrics"],
	},
	{
		id: "landmark",
		icon: Landmark,
		keywords: ["bank", "finance", "government"],
	},
	{ id: "truck", icon: Truck, keywords: ["delivery", "shipping", "logistics"] },
	{ id: "squirrel", icon: Squirrel, keywords: ["animal", "nature", "cute"] },
];

const AVAILABLE_SKILLS = [
	{
		id: "lookup-birthday",
		name: "Lookup employee birthday",
		author: "System",
		icon: Calendar,
		starters: ["When is my coworker's birthday?", "Look up a birthday"],
		linkedAgent: null,
	},
	{
		id: "reset-password",
		name: "Reset password",
		author: "IT Team",
		icon: Key,
		starters: [
			"I forgot my password",
			"Reset my password",
			"I need a new password",
		],
		linkedAgent: "HelpDesk Advisor",
	},
	{
		id: "check-pto",
		name: "Check PTO balance",
		author: "HR Team",
		icon: Clock,
		starters: [
			"How much PTO do I have?",
			"Check my time off balance",
			"How many vacation days left?",
		],
		linkedAgent: "PTO Balance Checker",
	},
	{
		id: "verify-i9",
		name: "Verify I-9 forms",
		author: "Compliance",
		icon: ShieldCheck,
		starters: ["Check my I-9 status", "Is my I-9 complete?"],
		linkedAgent: "Compliance Checker",
	},
	{
		id: "check-background",
		name: "Check background status",
		author: "HR Team",
		icon: Users,
		starters: [
			"What's my background check status?",
			"Is my background check done?",
		],
		linkedAgent: null,
	},
	{
		id: "unlock-account",
		name: "Unlock account",
		author: "IT Team",
		icon: Lock,
		starters: ["My account is locked", "Unlock my account", "I can't log in"],
		linkedAgent: "HelpDesk Advisor",
	},
	{
		id: "submit-expense",
		name: "Submit expense report",
		author: "Finance",
		icon: Briefcase,
		starters: [
			"Submit an expense",
			"I need to file an expense report",
			"How do I get reimbursed?",
		],
		linkedAgent: null,
	},
	{
		id: "request-access",
		name: "Request system access",
		author: "IT Team",
		icon: Key,
		starters: [
			"Request access to a system",
			"I need access to...",
			"How do I get permissions?",
		],
		linkedAgent: "HelpDesk Advisor",
	},
	{
		id: "provision-account",
		name: "Provision account",
		author: "IT Team",
		icon: Users,
		starters: [
			"Set up a new account",
			"Provision a new employee",
			"Create user account",
		],
		linkedAgent: null,
	},
	{
		id: "customer-engagement",
		name: "Customer engagement",
		author: "CX Team",
		icon: MessageSquare,
		starters: ["Follow up with a customer", "Send a customer update"],
		linkedAgent: null,
	},
];

function getPublishedWorkflowSkills() {
	try {
		const raw = localStorage.getItem("publishedWorkflowSkills");
		if (!raw) return [];
		return JSON.parse(raw).map(
			(s: { id: string; name: string; description?: string }) => ({
				id: `wf-${s.id}`,
				name: s.name,
				author: "Workflow",
				icon: Workflow,
				starters: [s.description || `Run ${s.name}`],
				linkedAgent: null,
			}),
		);
	} catch {
		return [];
	}
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentCapabilities {
	webSearch: boolean;
	useAllWorkspaceContent: boolean;
}

interface AgentConfig {
	name: string;
	description: string;
	instructions: string;
	iconId: string;
	iconColorId: string;
	workflows: string[]; // skills
	conversationStarters: string[];
	guardrails: string[];
	capabilities: AgentCapabilities;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AgentBuilderV1Page() {
	const navigate = useNavigate();
	const location = useLocation();
	const startBuild = useAgentBuildStore((state) => state.startBuild);
	const initialName =
		(location.state as { agentName?: string })?.agentName || "Untitled Agent";

	const [isCreating, setIsCreating] = useState(false);
	const [config, setConfig] = useState<AgentConfig>({
		name: initialName,
		description: "",
		instructions: "## Role\n\n## Backstory\n\n## Goal",
		iconId: "squirrel",
		iconColorId: "slate",
		workflows: [],
		conversationStarters: [],
		guardrails: [],
		capabilities: {
			webSearch: true,
			useAllWorkspaceContent: false,
		},
	});

	// UI toggles
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [iconSearchQuery, setIconSearchQuery] = useState("");
	const [showDescription, setShowDescription] = useState(false);
	const [showAddSkillModal, setShowAddSkillModal] = useState(false);
	const [skillSearchQuery, setSkillSearchQuery] = useState("");
	const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
	const [skillsTab, setSkillsTab] = useState<"available" | "all">("available");

	// -----------------------------------------------------------------------
	// Publish handler (preserved from original V1)
	// -----------------------------------------------------------------------
	const handleCreateAgent = () => {
		setIsCreating(true);
		const id = `v1-${Date.now()}`;
		startBuild({ id, name: config.name });
		navigate("/agents", {
			state: {
				buildingAgent: {
					id,
					name: config.name,
					description: config.description,
					skills: config.workflows,
				},
			},
		});
		toast.info("Building your agent", {
			description: "We'll notify you when it's ready.",
		});
	};

	// -----------------------------------------------------------------------
	// Render
	// -----------------------------------------------------------------------
	return (
		<div className="h-full flex flex-col bg-muted/40">
			{/* Header */}
			<header className="flex items-center justify-between px-5 py-3 bg-white border-b">
				<div className="flex items-center gap-3">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => navigate("/agents")}
						aria-label="Back to agents"
					>
						<ArrowLeft className="size-4" />
					</Button>
					<span className="font-medium">{config.name || "Untitled Agent"}</span>
					<Badge variant="secondary" className="text-xs">
						Draft
					</Badge>
				</div>
				<Button
					onClick={handleCreateAgent}
					disabled={!config.name || isCreating}
					className="gap-2"
				>
					{isCreating && <Loader2 className="size-4 animate-spin" />}
					Create Agent
				</Button>
			</header>

			{/* Main content */}
			<div className="flex flex-1 overflow-hidden p-4 justify-center">
				<div className="flex flex-col flex-1 max-w-3xl bg-white rounded-xl">
					<div className="flex-1 overflow-y-auto p-6">
						<div className="max-w-2xl mx-auto space-y-8">
							{/* ====== 1. Name of agent + icon picker ====== */}
							<div>
								<Label htmlFor="agent-name" className="text-sm font-medium">
									Name of agent
								</Label>
								<div className="flex items-center gap-4 mt-2">
									<Input
										id="agent-name"
										value={config.name}
										onChange={(e) =>
											setConfig((prev) => ({
												...prev,
												name: e.target.value,
											}))
										}
										placeholder="Enter agent name"
										className="flex-1"
									/>
									{/* Icon picker trigger */}
									<div className="relative flex items-center">
										<button
											type="button"
											onClick={() => setShowIconPicker(!showIconPicker)}
											className={cn(
												"size-[38px] rounded-lg flex items-center justify-center transition-colors",
												ICON_COLORS.find((c) => c.id === config.iconColorId)
													?.bg || "bg-violet-200",
											)}
											aria-label="Change agent icon"
										>
											{(() => {
												const iconData = AVAILABLE_ICONS.find(
													(i) => i.id === config.iconId,
												);
												const colorData = ICON_COLORS.find(
													(c) => c.id === config.iconColorId,
												);
												const IconComponent = iconData?.icon || Bot;
												return (
													<IconComponent
														className={cn(
															"size-6",
															colorData?.text || "text-white",
														)}
													/>
												);
											})()}
										</button>
										<Button
											variant="ghost"
											size="icon"
											className="size-9"
											onClick={() => setShowIconPicker(!showIconPicker)}
										>
											<ChevronDown className="size-4" />
										</Button>

										{/* Icon Picker Dropdown */}
										{showIconPicker && (
											<div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border z-50 p-4">
												{/* Color selection */}
												<div className="mb-4">
													<p className="text-sm font-medium text-muted-foreground mb-2">
														Color
													</p>
													<div className="flex gap-2">
														{ICON_COLORS.map((color) => (
															<button
																type="button"
																key={color.id}
																onClick={() =>
																	setConfig((prev) => ({
																		...prev,
																		iconColorId: color.id,
																	}))
																}
																className={cn(
																	"size-10 rounded-full transition-all",
																	color.bg,
																	config.iconColorId === color.id
																		? "ring-2 ring-offset-2 ring-primary"
																		: "hover:scale-110",
																)}
																aria-label={`Select ${color.id} color`}
															/>
														))}
													</div>
												</div>

												{/* Icon selection */}
												<div>
													<p className="text-sm font-medium text-muted-foreground mb-2">
														Icon
													</p>
													<div className="relative mb-3">
														<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
														<Input
															placeholder="Find by type, role, or expertise"
															value={iconSearchQuery}
															onChange={(e) =>
																setIconSearchQuery(e.target.value)
															}
															className="pl-9"
														/>
													</div>
													<div className="grid grid-cols-6 gap-1 max-h-[240px] overflow-y-auto">
														{AVAILABLE_ICONS.filter((icon) => {
															if (!iconSearchQuery) return true;
															const query = iconSearchQuery.toLowerCase();
															return (
																icon.id.includes(query) ||
																icon.keywords.some((k) => k.includes(query))
															);
														}).map((iconData) => {
															const IconComponent = iconData.icon;
															return (
																<button
																	type="button"
																	key={iconData.id}
																	onClick={() => {
																		setConfig((prev) => ({
																			...prev,
																			iconId: iconData.id,
																		}));
																		setShowIconPicker(false);
																		setIconSearchQuery("");
																	}}
																	className={cn(
																		"size-10 rounded-lg flex items-center justify-center transition-colors",
																		config.iconId === iconData.id
																			? "bg-primary/10 text-primary"
																			: "hover:bg-muted text-muted-foreground hover:text-foreground",
																	)}
																>
																	<IconComponent className="size-5" />
																</button>
															);
														})}
													</div>
												</div>
											</div>
										)}
									</div>
								</div>
							</div>

							{/* ====== 2. Description (collapsed / revealed) ====== */}
							{!showDescription && !config.description?.trim() ? (
								<button
									type="button"
									onClick={() => setShowDescription(true)}
									className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
								>
									<Plus className="size-4" />
									<span>Add description</span>
								</button>
							) : (
								<div>
									<Label
										htmlFor="agent-description"
										className="text-sm font-medium"
									>
										Description
									</Label>
									<Textarea
										id="agent-description"
										value={config.description}
										onChange={(e) =>
											setConfig((prev) => ({
												...prev,
												description: e.target.value,
											}))
										}
										placeholder="Answers IT support questions and helps employees troubleshoot common technical issues."
										className="mt-2 min-h-[60px] resize-none text-muted-foreground"
										autoFocus={showDescription && !config.description}
									/>
								</div>
							)}

							{/* ====== 3. Skills ====== */}
							<div id="skills-section" className="space-y-2">
								<div className="flex items-start justify-between">
									<div>
										<Label className="text-sm font-medium">Skills</Label>
										<p className="text-sm text-muted-foreground mt-1">
											Help users understand what this agent can help them with
											by adding skills
										</p>
									</div>
									<Button
										variant="outline"
										size="sm"
										className="h-8 gap-1.5"
										onClick={() => setShowAddSkillModal(true)}
									>
										<Plus className="size-4" />
										Add skill
									</Button>
								</div>

								{config.workflows.length === 0 ? (
									<button
										type="button"
										onClick={() => setShowAddSkillModal(true)}
										className="w-full border border-dashed rounded-lg py-6 px-4 text-center hover:border-muted-foreground/50 transition-colors"
									>
										<p className="text-sm font-medium">Add skills</p>
										<p className="text-sm text-muted-foreground mt-1">
											Add existing skills to this agent to improve context
										</p>
									</button>
								) : (
									<div className="border rounded-md px-4 py-2">
										<div className="space-y-1">
											{config.workflows.map((workflow, index) => {
												const allSkillsPool = [
													...AVAILABLE_SKILLS,
													...getPublishedWorkflowSkills(),
												];
												const skillData = allSkillsPool.find(
													(s) => s.name === workflow,
												);
												const SkillIcon = skillData?.icon || Zap;
												return (
													<div
														key={`skill-${workflow}-${index}`}
														className="flex items-center gap-2.5 py-1"
													>
														<div className="size-5 rounded flex items-center justify-center flex-shrink-0 bg-violet-200">
															<SkillIcon className="size-3 text-foreground" />
														</div>
														<span className="text-xs flex-1">{workflow}</span>
														<button
															type="button"
															onClick={() => {
																const updated = config.workflows.filter(
																	(_, i) => i !== index,
																);
																setConfig((prev) => ({
																	...prev,
																	workflows: updated,
																}));
															}}
															className="p-2 text-muted-foreground hover:text-foreground"
														>
															<X className="size-3" />
														</button>
													</div>
												);
											})}
										</div>
									</div>
								)}
							</div>

							{/* ====== 4. Instructions ====== */}
							<div className="space-y-2">
								<div>
									<Label htmlFor="instructions" className="text-sm font-medium">
										Instructions
									</Label>
									<p className="text-sm text-muted-foreground mt-1">
										Control your agent's behavior by adding instructions.
									</p>
								</div>
								<div className="border rounded-lg overflow-hidden">
									<Textarea
										id="instructions"
										value={config.instructions}
										onChange={(e) =>
											setConfig((prev) => ({
												...prev,
												instructions: e.target.value,
											}))
										}
										placeholder={"## Role\n\n## Backstory\n\n## Goal"}
										className="min-h-[80px] max-h-[120px] resize-none text-sm border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
									/>
								</div>
								<p className="text-xs text-muted-foreground">
									Update instructions as needed
								</p>
							</div>

							{/* ====== 5. Conversation Starters ====== */}
							<div className="space-y-2">
								<div>
									<p className="text-sm font-medium text-foreground">
										Conversation starters
									</p>
									<p className="text-sm text-muted-foreground mt-0.5">
										Suggested prompts shown to users when starting a
										conversation
									</p>
								</div>
								<div className="border rounded-md min-h-9 px-3 py-1.5 flex items-center gap-1 flex-wrap">
									{config.conversationStarters.map((starter, index) => (
										<div
											key={`starter-${starter}-${index}`}
											className="flex items-center gap-1 px-2 py-0.5 border border-dashed rounded-md text-xs text-muted-foreground whitespace-nowrap"
										>
											<span>{starter}</span>
											<button
												type="button"
												onClick={() => {
													const updated = config.conversationStarters.filter(
														(_, i) => i !== index,
													);
													setConfig((prev) => ({
														...prev,
														conversationStarters: updated,
													}));
												}}
												className="text-muted-foreground hover:text-destructive"
												aria-label={`Remove ${starter}`}
											>
												<X className="size-3" />
											</button>
										</div>
									))}
									{config.conversationStarters.length < 6 && (
										<input
											type="text"
											placeholder="Type and press Enter to add..."
											className="flex-1 min-w-[150px] text-sm bg-transparent outline-none placeholder:text-muted-foreground"
											onKeyDown={(e) => {
												const input = e.currentTarget;
												if (e.key === "Enter" && input.value.trim()) {
													e.preventDefault();
													const newStarter = input.value.trim();
													setConfig((prev) => ({
														...prev,
														conversationStarters: [
															...prev.conversationStarters,
															newStarter,
														],
													}));
													input.value = "";
												}
											}}
										/>
									)}
								</div>
							</div>

							{/* ====== 6. Guardrails ====== */}
							<div className="space-y-2">
								<div>
									<p className="text-sm font-medium text-foreground">
										Guardrails
									</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										Topics or requests the agent should NOT handle
									</p>
								</div>

								{config.guardrails.length === 0 ? (
									<button
										type="button"
										onClick={() => {
											setConfig((prev) => ({
												...prev,
												guardrails: [...prev.guardrails, ""],
											}));
										}}
										className="w-full border border-dashed rounded-lg py-4 px-4 text-center hover:border-muted-foreground/50 transition-colors"
									>
										<p className="text-sm text-muted-foreground">
											Add a guardrail
										</p>
									</button>
								) : (
									<div className="space-y-2">
										{config.guardrails.map((guardrail, index) => (
											<div
												key={`guard-${index}`}
												className="flex items-center gap-2"
											>
												<Input
													value={guardrail}
													onChange={(e) => {
														const updated = [...config.guardrails];
														updated[index] = e.target.value;
														setConfig((prev) => ({
															...prev,
															guardrails: updated,
														}));
													}}
													placeholder="e.g., HR policy questions"
													className="flex-1"
												/>
												<Button
													variant="ghost"
													size="icon"
													className="size-9 text-muted-foreground hover:text-foreground"
													onClick={() => {
														const updated = config.guardrails.filter(
															(_, i) => i !== index,
														);
														setConfig((prev) => ({
															...prev,
															guardrails: updated,
														}));
													}}
												>
													<Trash2 className="size-4" />
												</Button>
											</div>
										))}
										<Button
											variant="ghost"
											size="sm"
											className="h-8 gap-1.5 text-muted-foreground"
											onClick={() => {
												setConfig((prev) => ({
													...prev,
													guardrails: [...prev.guardrails, ""],
												}));
											}}
										>
											<Plus className="size-4" />
											Add guardrail
										</Button>
									</div>
								)}
							</div>

							{/* ====== 7. Knowledge (checkboxes only) ====== */}
							<div className="space-y-2">
								<div>
									<Label className="text-sm font-medium">Knowledge</Label>
									<p className="text-sm text-muted-foreground mt-1">
										Give your agent general knowledge to answer best
									</p>
								</div>

								<div className="border rounded-lg">
									<div className="px-4">
										<div className="flex items-start gap-3 py-3">
											<Checkbox
												checked={config.capabilities.webSearch}
												onCheckedChange={(checked) =>
													setConfig((prev) => ({
														...prev,
														capabilities: {
															...prev.capabilities,
															webSearch: !!checked,
														},
													}))
												}
												className="mt-0.5"
											/>
											<div className="flex-1">
												<p className="text-sm font-medium">
													Search the web for information
												</p>
												<p className="text-sm text-muted-foreground mt-1">
													Let the agent search and reference information found
													on the websites
												</p>
											</div>
										</div>
										<div className="border-t" />
										<div className="flex items-start gap-3 py-3">
											<Checkbox
												checked={config.capabilities.useAllWorkspaceContent}
												onCheckedChange={(checked) =>
													setConfig((prev) => ({
														...prev,
														capabilities: {
															...prev.capabilities,
															useAllWorkspaceContent: !!checked,
														},
													}))
												}
												className="mt-0.5"
											/>
											<div className="flex-1">
												<p className="text-sm font-medium">
													Enable all workspace knowledge
												</p>
												<p className="text-sm text-muted-foreground mt-1">
													Let the agent use all shared integrations, files, and
													other assets in this workspace
												</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* ====== Add Skill Modal ====== */}
			{showAddSkillModal &&
				(() => {
					const closeModal = () => {
						setShowAddSkillModal(false);
						setSkillSearchQuery("");
						setSelectedSkills([]);
						setSkillsTab("available");
					};

					const filterBySearch = (skill: (typeof AVAILABLE_SKILLS)[number]) =>
						!skillSearchQuery ||
						skill.name.toLowerCase().includes(skillSearchQuery.toLowerCase()) ||
						skill.author.toLowerCase().includes(skillSearchQuery.toLowerCase());

					const allSkillsPool = [
						...AVAILABLE_SKILLS,
						...getPublishedWorkflowSkills(),
					];

					const availableSkills = allSkillsPool
						.filter(
							(s) =>
								s.linkedAgent === null && !config.workflows.includes(s.name),
						)
						.filter(filterBySearch);

					const allSkills = allSkillsPool.filter(filterBySearch);

					const displayedSkills =
						skillsTab === "available" ? availableSkills : allSkills;

					const getIconBg = (author: string) =>
						/IT|System|Compliance/i.test(author)
							? "bg-violet-200"
							: "bg-amber-100";

					return (
						<div className="fixed inset-0 z-50 flex items-center justify-center">
							<button
								type="button"
								className="absolute inset-0 bg-black/50"
								onClick={closeModal}
								aria-label="Close modal"
							/>
							<div className="relative bg-white rounded-xl shadow-lg w-full max-w-lg h-[600px] overflow-hidden flex flex-col">
								<button
									type="button"
									onClick={closeModal}
									className="absolute right-4 top-4 text-muted-foreground/70 hover:text-foreground z-10"
									aria-label="Close modal"
								>
									<X className="size-4" />
								</button>
								<div className="px-6 pt-6 flex flex-col gap-4">
									<div>
										<h2 className="text-lg font-semibold">Add skills</h2>
										<p className="text-sm text-muted-foreground mt-1.5">
											Help users understand what this agent can help them with
											by adding skills
										</p>
									</div>
									<div className="relative">
										<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
										<Input
											placeholder="Search skills..."
											className="pl-9 rounded-lg"
											value={skillSearchQuery}
											onChange={(e) => setSkillSearchQuery(e.target.value)}
										/>
									</div>
									<Tabs
										value={skillsTab}
										onValueChange={(v) =>
											setSkillsTab(v as "available" | "all")
										}
									>
										<TabsList className="w-full">
											<TabsTrigger value="available" className="flex-1">
												Available
												<Badge
													variant="secondary"
													className="ml-1.5 text-xs px-1.5 py-0"
												>
													{availableSkills.length}
												</Badge>
											</TabsTrigger>
											<TabsTrigger value="all" className="flex-1">
												All
												<Badge
													variant="secondary"
													className="ml-1.5 text-xs px-1.5 py-0"
												>
													{allSkills.length}
												</Badge>
											</TabsTrigger>
										</TabsList>
									</Tabs>
								</div>

								<div className="flex-1 overflow-y-auto max-h-[400px] mt-5">
									{displayedSkills.map((skill) => {
										const isAlreadyAdded = config.workflows.includes(
											skill.name,
										);
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
														<span className="text-xs text-muted-foreground">
															Added
														</span>
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
											No skills found matching "{skillSearchQuery}"
										</div>
									)}
								</div>

								<div className="px-6 py-3 flex justify-end gap-2">
									<Button variant="outline" size="sm" onClick={closeModal}>
										Cancel
									</Button>
									<Button
										size="sm"
										disabled={selectedSkills.length === 0}
										onClick={() => {
											const newStarters: string[] = [];
											for (const skillName of selectedSkills) {
												const skill = AVAILABLE_SKILLS.find(
													(s) => s.name === skillName,
												);
												if (skill?.starters?.[0]) {
													const starter = skill.starters[0];
													if (!newStarters.includes(starter)) {
														newStarters.push(starter);
													}
												}
											}

											setConfig((prev) => {
												const existing = prev.conversationStarters;
												const toAdd = newStarters.filter(
													(s) => !existing.includes(s),
												);
												const slots = 6 - existing.length;
												const final = toAdd.slice(0, slots);

												return {
													...prev,
													workflows: [...prev.workflows, ...selectedSkills],
													conversationStarters: [...existing, ...final],
												};
											});
											closeModal();
										}}
									>
										Add{" "}
										{selectedSkills.length > 0
											? `(${selectedSkills.length})`
											: ""}
									</Button>
								</div>
							</div>
						</div>
					);
				})()}
		</div>
	);
}
