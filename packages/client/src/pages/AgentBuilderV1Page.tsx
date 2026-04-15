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

import confetti from "canvas-confetti";
import {
	AlertCircle,
	ArrowLeft,
	Award,
	BookOpen,
	Bot,
	Briefcase,
	Calendar,
	CheckCircle2,
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
	HelpCircle,
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
	Play,
	Plus,
	Rocket,
	Search,
	Settings,
	ShieldCheck,
	ShoppingCart,
	Sparkles,
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
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FieldHelpPopover } from "@/components/agents/FieldHelpPopover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	mockGenerateStarters,
	mockImproveInstructions,
} from "@/lib/mockAgentLlm";
import {
	addSkillToInstructions,
	removeSkillFromInstructions,
} from "@/lib/skillInstructionSync";
import { computeSideBySideRows } from "@/lib/textDiff";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { MOCK_SAVED_AGENTS } from "./AgentBuilderPage";

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
	const { id: agentId } = useParams<{ id: string }>();
	const locationState = location.state as {
		agentName?: string;
		agentConfig?: AgentConfig;
	} | null;
	const initialName = locationState?.agentName || "Untitled Agent";

	// Edit mode: prefill from saved agent if id present
	const isEditing = !!agentId;
	const savedAgent = agentId ? MOCK_SAVED_AGENTS[agentId] : null;

	const [isCreating, setIsCreating] = useState(false);
	const [config, setConfig] = useState<AgentConfig>(() => {
		if (locationState?.agentConfig) {
			return locationState.agentConfig;
		}
		if (savedAgent) {
			return {
				name: savedAgent.name,
				description: savedAgent.description,
				instructions:
					savedAgent.instructions ||
					"## Role\n\n## Backstory\n\n## Goal\n\n## Task",
				iconId: savedAgent.iconId,
				iconColorId: savedAgent.iconColorId,
				workflows: savedAgent.workflows || [],
				conversationStarters: (savedAgent.conversationStarters || []).slice(
					0,
					4,
				),
				guardrails: savedAgent.guardrails || [],
				capabilities: {
					webSearch: savedAgent.capabilities?.webSearch ?? true,
					useAllWorkspaceContent:
						savedAgent.capabilities?.useAllWorkspaceContent ?? false,
				},
			};
		}
		return {
			name: initialName,
			description: "",
			instructions: "## Role\n\n## Backstory\n\n## Goal\n\n## Task",
			iconId: "squirrel",
			iconColorId: "slate",
			workflows: [],
			conversationStarters: [],
			guardrails: [],
			capabilities: {
				webSearch: true,
				useAllWorkspaceContent: false,
			},
		};
	});

	// AI feature loading states
	const [isImprovingInstructions, setIsImprovingInstructions] = useState(false);
	const [improvePreview, setImprovePreview] = useState<{
		original: string;
		improved: string;
	} | null>(null);
	const [isGeneratingStarters, setIsGeneratingStarters] = useState(false);

	// UI toggles
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [iconSearchQuery, setIconSearchQuery] = useState("");
	const [showDescription, setShowDescription] = useState(false);
	const [showAddSkillModal, setShowAddSkillModal] = useState(false);
	const [skillSearchQuery, setSkillSearchQuery] = useState("");
	const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
	const [skillsTab, setSkillsTab] = useState<"available" | "all">("available");
	const [showInstructionsModal, setShowInstructionsModal] = useState(false);
	const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);

	const [viewState, setViewState] = useState<
		"form" | "building" | "success" | "error"
	>("form");
	const [buildSteps, setBuildSteps] = useState<
		Array<{
			label: string;
			description: string;
			status: "pending" | "active" | "complete" | "error";
		}>
	>([]);
	const [buildError, setBuildError] = useState<string | null>(null);
	const buildTimersRef = useRef<NodeJS.Timeout[]>([]);

	const simulateFailure =
		new URLSearchParams(location.search).get("fail") === "true";

	const BUILD_STEP_SEQUENCE = [
		{ label: "Analyzing", description: "Analyzing your requirements..." },
		{ label: "Starting", description: "Initializing agent builder..." },
		{ label: "Analyzing", description: "Analyzing your requirements..." },
		{ label: "Building", description: "Creating agent and tasks..." },
		{ label: "Requirements", description: "Requirements analysis complete" },
		{ label: "Building", description: "Creating agent and tasks..." },
		{ label: "Requirements", description: "Requirements analysis complete" },
	];

	const clearBuildTimers = useCallback(() => {
		for (const t of buildTimersRef.current) clearTimeout(t);
		buildTimersRef.current = [];
	}, []);

	useEffect(() => {
		return () => clearBuildTimers();
	}, [clearBuildTimers]);

	// -----------------------------------------------------------------------
	// Publish handler (preserved from original V1)
	// -----------------------------------------------------------------------
	const handleCreateAgent = () => {
		setIsCreating(true);
		if (isEditing) {
			toast.success("Changes saved");
			navigate("/agents");
			return;
		}
		const id = `v1-${Date.now()}`;
		setCreatedAgentId(id);
		setViewState("building");
		setBuildSteps([]);
		setBuildError(null);
		clearBuildTimers();

		const stepDelay = 1000;
		const failAtStep = simulateFailure ? 4 : -1;
		const stepsToRun =
			failAtStep >= 0
				? BUILD_STEP_SEQUENCE.slice(0, failAtStep + 1)
				: BUILD_STEP_SEQUENCE;

		stepsToRun.forEach((step, index) => {
			const t = setTimeout(
				() => {
					setBuildSteps((prev) => {
						const updated = prev.map((s) => ({
							...s,
							status: "complete" as const,
						}));
						return [
							...updated,
							{
								...step,
								status:
									index === failAtStep
										? ("error" as const)
										: ("active" as const),
							},
						];
					});
				},
				(index + 1) * stepDelay,
			);
			buildTimersRef.current.push(t);
		});

		if (failAtStep >= 0) {
			const errorT = setTimeout(
				() => {
					setBuildError(
						"Failed to create agent tasks. The knowledge source connection timed out. Please check your configuration and try again.",
					);
					setViewState("error");
				},
				(failAtStep + 2) * stepDelay,
			);
			buildTimersRef.current.push(errorT);
		} else {
			const finishT = setTimeout(
				() => {
					setBuildSteps((prev) =>
						prev.map((s) => ({ ...s, status: "complete" as const })),
					);
					const successT = setTimeout(() => {
						setViewState("success");
						confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
					}, 500);
					buildTimersRef.current.push(successT);
				},
				(BUILD_STEP_SEQUENCE.length + 1) * stepDelay,
			);
			buildTimersRef.current.push(finishT);
		}
	};

	// -----------------------------------------------------------------------
	// Render
	// -----------------------------------------------------------------------

	if (viewState === "building") {
		return (
			<div className="h-full min-h-screen flex flex-col bg-muted/40">
				<div className="flex-1 flex items-center justify-center">
					<div className="max-w-md w-full px-6">
						<div className="text-center mb-10">
							<h1 className="text-2xl font-semibold text-foreground">
								Creating your agent...
							</h1>
							<p className="text-muted-foreground mt-2">
								AI is building your agent configuration
							</p>
						</div>

						<div className="space-y-1">
							{buildSteps.map((step, index) => (
								<div
									key={index}
									className="flex items-start gap-3 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
								>
									{step.status === "complete" ? (
										<CheckCircle2 className="size-5 text-emerald-500 mt-0.5 flex-shrink-0" />
									) : step.status === "error" ? (
										<AlertCircle className="size-5 text-red-500 mt-0.5 flex-shrink-0" />
									) : (
										<div className="size-5 mt-0.5 flex-shrink-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
									)}
									<div>
										<p className="text-sm font-semibold text-foreground">
											{step.label}
										</p>
										<p className="text-sm text-muted-foreground">
											{step.description}
										</p>
									</div>
								</div>
							))}
						</div>

						<div className="text-center mt-10">
							<Button
								variant="outline"
								onClick={() => {
									clearBuildTimers();
									setViewState("form");
									setIsCreating(false);
									setBuildSteps([]);
								}}
							>
								Cancel
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (viewState === "success") {
		return (
			<div className="h-full min-h-screen flex flex-col bg-muted/40">
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center">
						<div className="mx-auto mb-6 size-16 rounded-full border-4 border-emerald-500 flex items-center justify-center">
							<CheckCircle2 className="size-10 text-emerald-500" />
						</div>
						<h1 className="text-2xl font-semibold text-foreground">
							Agent created successfully!
						</h1>
						<p className="text-muted-foreground mt-2">
							Your agent "{config.name}" is ready
						</p>
						<div className="flex items-center justify-center gap-3 mt-8">
							<Button
								variant="outline"
								className="gap-2"
								onClick={() =>
									navigate(`/agents/${createdAgentId}`, {
										state: { agentConfig: config },
									})
								}
							>
								<Wrench className="size-4" />
								Edit agent
							</Button>
							<Button
								className="gap-2 bg-blue-600 hover:bg-blue-700"
								onClick={() =>
									navigate(`/agents/${createdAgentId}/test`, {
										state: { agentConfig: config },
									})
								}
							>
								<Play className="size-4" />
								Test agent
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (viewState === "error") {
		return (
			<div className="h-full min-h-screen flex flex-col bg-muted/40">
				<div className="flex-1 flex items-center justify-center">
					<div className="max-w-md w-full px-6">
						<div className="text-center mb-8">
							<div className="mx-auto mb-6 size-16 rounded-full border-4 border-red-500 flex items-center justify-center">
								<AlertCircle className="size-10 text-red-500" />
							</div>
							<h1 className="text-2xl font-semibold text-foreground">
								Agent creation failed
							</h1>
							<p className="text-muted-foreground mt-2">
								Something went wrong while building your agent
							</p>
						</div>

						{buildError && (
							<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
								<p className="text-sm text-red-800">{buildError}</p>
							</div>
						)}

						<div className="space-y-1 mb-8">
							{buildSteps.map((step, index) => (
								<div key={index} className="flex items-start gap-3 py-2">
									{step.status === "complete" ? (
										<CheckCircle2 className="size-5 text-emerald-500 mt-0.5 flex-shrink-0" />
									) : step.status === "error" ? (
										<AlertCircle className="size-5 text-red-500 mt-0.5 flex-shrink-0" />
									) : (
										<div className="size-5 mt-0.5 flex-shrink-0 rounded-full border-2 border-muted-foreground/30" />
									)}
									<div>
										<p
											className={cn(
												"text-sm font-semibold",
												step.status === "error"
													? "text-red-600"
													: "text-foreground",
											)}
										>
											{step.label}
										</p>
										<p
											className={cn(
												"text-sm",
												step.status === "error"
													? "text-red-500"
													: "text-muted-foreground",
											)}
										>
											{step.status === "error" ? "Failed" : step.description}
										</p>
									</div>
								</div>
							))}
						</div>

						<div className="flex items-center justify-center gap-3">
							<Button
								variant="outline"
								onClick={() => {
									clearBuildTimers();
									setViewState("form");
									setIsCreating(false);
									setBuildSteps([]);
									setBuildError(null);
								}}
							>
								Back to form
							</Button>
							<Button
								onClick={() => {
									setIsCreating(false);
									handleCreateAgent();
								}}
								className="gap-2"
							>
								Try again
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

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
						{isEditing ? "Editing" : "Draft"}
					</Badge>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" className="gap-2">
						<HelpCircle className="size-4" />
						How agent builder works
					</Button>
					{isEditing && (
						<Button
							variant="outline"
							className="gap-2"
							onClick={() =>
								navigate(`/agents/${agentId}/test`, {
									state: { agentConfig: config },
								})
							}
							disabled={
								!config.name ||
								(!config.description &&
									!config.instructions &&
									!config.conversationStarters.some((s) => s.trim()))
							}
						>
							<Play className="size-4" />
							Test
						</Button>
					)}
					{isEditing ? (
						<Button
							onClick={handleCreateAgent}
							disabled={!config.name || isCreating}
							className="gap-2"
						>
							{isCreating && <Loader2 className="size-4 animate-spin" />}
							Save changes
						</Button>
					) : (
						<Button
							onClick={handleCreateAgent}
							disabled={
								!config.name.trim() ||
								!config.instructions.trim() ||
								config.workflows.length === 0 ||
								isCreating
							}
							className="gap-2"
						>
							{isCreating && <Loader2 className="size-4 animate-spin" />}
							Create
						</Button>
					)}
				</div>
			</header>

			{/* Main content */}
			<div className="flex flex-1 overflow-hidden p-4 justify-center">
				<div className="flex flex-col flex-1 max-w-3xl bg-white rounded-xl">
					<div className="flex-1 overflow-y-auto p-6">
						<div className="max-w-2xl mx-auto space-y-8">
							{/* ====== 1. Name of agent + icon picker ====== */}
							<div>
								<div className="flex items-center gap-1.5">
									<Label htmlFor="agent-name" className="text-sm font-medium">
										Name of agent
									</Label>
									<FieldHelpPopover
										description="Pick a clear, action-oriented name your users will recognize."
										examples={["HR Onboarding Buddy", "IT HelpDesk Agent"]}
										ariaLabel="Name field help"
									/>
								</div>
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
									<div className="flex items-center gap-1.5">
										<Label
											htmlFor="agent-description"
											className="text-sm font-medium"
										>
											Description
										</Label>
										<FieldHelpPopover
											description="A short summary of the agent's purpose. Shown in the agent list."
											examples={[
												"Helps new hires complete onboarding paperwork.",
												"Resets passwords and unlocks accounts for IT requests.",
											]}
											ariaLabel="Description field help"
										/>
									</div>
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
										<div className="flex items-center gap-1.5">
											<Label className="text-sm font-medium">Skills</Label>
											<FieldHelpPopover
												description="Capabilities the agent can perform. Add skills from your library or create new ones."
												examples={["Reset password", "Lookup PTO balance"]}
												ariaLabel="Skills field help"
											/>
										</div>
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
																const removed = workflow;
																const updated = config.workflows.filter(
																	(_, i) => i !== index,
																);
																setConfig((prev) => ({
																	...prev,
																	workflows: updated,
																	instructions: removeSkillFromInstructions(
																		prev.instructions,
																		removed,
																	),
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
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-1.5">
											<Label
												htmlFor="instructions"
												className="text-sm font-medium"
											>
												Instructions
											</Label>
											<FieldHelpPopover
												description="Tell the agent who it is, how it should behave, and when its job is done. Use ## headings to structure (Role, Backstory, Goal, Task)."
												examples={[
													"## Role\nYou are an HR onboarding assistant\u2026",
													"## Goal\nThe user has submitted their I-9 and reviewed the handbook.",
												]}
												ariaLabel="Instructions field help"
											/>
										</div>
										<Button
											variant="ghost"
											size="sm"
											className="gap-1 h-7 text-xs"
											disabled={
												isImprovingInstructions ||
												!!improvePreview ||
												!config.instructions.trim()
											}
											onClick={async () => {
												setIsImprovingInstructions(true);
												try {
													const result = await mockImproveInstructions(
														config.instructions,
														config.name,
													);
													setImprovePreview({
														original: config.instructions,
														improved: result,
													});
												} finally {
													setIsImprovingInstructions(false);
												}
											}}
										>
											{isImprovingInstructions ? (
												<Loader2 className="size-3.5 animate-spin" />
											) : (
												<Sparkles className="size-3.5" />
											)}
											Improve
										</Button>
									</div>
									<p className="text-sm text-muted-foreground mt-1">
										Control your agent's behavior by adding instructions.
									</p>
								</div>
								<div className="border rounded-lg overflow-hidden relative">
									<Textarea
										id="instructions"
										value={config.instructions}
										onChange={(e) =>
											setConfig((prev) => ({
												...prev,
												instructions: e.target.value,
											}))
										}
										placeholder={
											"## Role\n\n## Backstory\n\n## Goal\n\n## Task"
										}
										className="min-h-[80px] max-h-[120px] resize-none text-sm border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
									/>
									<button
										className="absolute top-2 right-2 p-2 text-muted-foreground hover:text-foreground"
										aria-label="Expand instructions"
										onClick={() => setShowInstructionsModal(true)}
									>
										<svg
											width="16"
											height="16"
											viewBox="0 0 16 16"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												d="M10 2H14V6M6 14H2V10M14 2L9 7M2 14L7 9"
												stroke="currentColor"
												strokeWidth="1.5"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									</button>
								</div>
								<p className="text-xs text-muted-foreground">
									Update instructions as needed
								</p>
							</div>

							{/* ====== 5. Conversation Starters ====== */}
							<div className="space-y-2">
								<div className="flex items-start justify-between">
									<div>
										<div className="flex items-center gap-1.5">
											<p className="text-sm font-medium text-foreground">
												Conversation starters
											</p>
											<FieldHelpPopover
												description="Suggested prompts shown to users when they open this agent."
												examples={[
													"How do I request PTO?",
													"Reset my password",
												]}
												ariaLabel="Conversation starters field help"
											/>
										</div>
										<p className="text-sm text-muted-foreground mt-0.5">
											Suggested prompts shown to users when starting a
											conversation
										</p>
									</div>
									{config.conversationStarters.length > 0 && (
										<Button
											variant="outline"
											size="sm"
											className="h-8 gap-1.5"
											disabled={isGeneratingStarters}
											onClick={async () => {
												setIsGeneratingStarters(true);
												try {
													const generated = await mockGenerateStarters({
														name: config.name,
														description: config.description,
														instructions: config.instructions,
														existingStarters: [],
													});
													setConfig((prev) => ({
														...prev,
														conversationStarters: generated.slice(0, 4),
													}));
												} finally {
													setIsGeneratingStarters(false);
												}
											}}
										>
											{isGeneratingStarters ? (
												<Loader2 className="size-3.5 animate-spin" />
											) : (
												<Sparkles className="size-3.5" />
											)}
											Regenerate
										</Button>
									)}
								</div>
								{config.conversationStarters.length === 0 ? (
									<Button
										variant="outline"
										size="sm"
										className="gap-1.5"
										disabled={isGeneratingStarters}
										onClick={async () => {
											setIsGeneratingStarters(true);
											try {
												const generated = await mockGenerateStarters({
													name: config.name,
													description: config.description,
													instructions: config.instructions,
													existingStarters: [],
												});
												setConfig((prev) => ({
													...prev,
													conversationStarters: generated.slice(0, 4),
												}));
											} finally {
												setIsGeneratingStarters(false);
											}
										}}
									>
										{isGeneratingStarters ? (
											<Loader2 className="size-3.5 animate-spin" />
										) : (
											<Plus className="size-3.5" />
										)}
										Generate conversation starters
									</Button>
								) : (
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
									</div>
								)}
							</div>

							{/* ====== 6. Guardrails ====== */}
							<div className="space-y-2">
								<div>
									<div className="flex items-center gap-1.5">
										<p className="text-sm font-medium text-foreground">
											Guardrails
										</p>
										<FieldHelpPopover
											description="Topics or actions the agent must NOT handle. Be specific."
											examples={[
												"Do not give legal advice",
												"Never share salary information",
											]}
											ariaLabel="Guardrails field help"
										/>
									</div>
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
												const slots = 4 - existing.length;
												const final = toAdd.slice(0, slots);

												return {
													...prev,
													workflows: [...prev.workflows, ...selectedSkills],
													instructions: selectedSkills.reduce(
														(inst, skill) =>
															addSkillToInstructions(inst, skill),
														prev.instructions,
													),
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

			{/* Improve Instructions Preview Modal */}
			{(() => {
				const rows = improvePreview
					? computeSideBySideRows(
							improvePreview.original,
							improvePreview.improved,
						)
					: [];
				return (
					<Dialog
						open={!!improvePreview}
						onOpenChange={(open) => {
							if (!open) setImprovePreview(null);
						}}
					>
						<DialogContent className="!max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
							<DialogHeader>
								<DialogTitle>Improve instructions</DialogTitle>
								<p className="text-sm text-muted-foreground">
									Review the suggested changes before accepting.
								</p>
							</DialogHeader>
							<div className="overflow-y-auto rounded-lg max-h-[60vh]">
								{/* Column headers */}
								<div className="grid grid-cols-2 gap-4 sticky top-0 z-10 bg-background pb-2">
									<p className="text-sm font-medium text-muted-foreground">
										Current
									</p>
									<p className="text-sm font-medium text-muted-foreground">
										Improved
									</p>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div className="rounded-lg overflow-hidden border">
										{rows.map((row, i) => (
											<div
												key={i}
												className={cn(
													"px-4 py-0.5 text-sm min-h-[26px]",
													row.left.type === "removed" &&
														"bg-red-50 text-red-900",
													row.left.type === "unchanged" && "text-foreground",
													row.left.type === "empty" && "bg-muted/10",
												)}
											>
												{row.left.type !== "empty"
													? row.left.text || "\u00A0"
													: "\u00A0"}
											</div>
										))}
									</div>
									<div className="rounded-lg overflow-hidden border">
										{rows.map((row, i) => (
											<div
												key={i}
												className={cn(
													"px-4 py-0.5 text-sm min-h-[26px]",
													row.right.type === "added" &&
														"bg-green-50 text-green-900",
													row.right.type === "unchanged" && "text-foreground",
													row.right.type === "empty" && "bg-muted/10",
												)}
											>
												{row.right.type !== "empty"
													? row.right.text || "\u00A0"
													: "\u00A0"}
											</div>
										))}
									</div>
								</div>
							</div>
							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => setImprovePreview(null)}
								>
									Discard
								</Button>
								<Button
									onClick={() => {
										setConfig((prev) => ({
											...prev,
											instructions:
												improvePreview?.improved ?? prev.instructions,
										}));
										setImprovePreview(null);
										toast.success("Instructions improved");
									}}
								>
									Accept
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				);
			})()}

			{/* Instructions Expanded Modal */}
			{showInstructionsModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<button
						type="button"
						className="absolute inset-0 bg-black/50"
						onClick={() => setShowInstructionsModal(false)}
						aria-label="Close instructions modal"
					/>
					<div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
						<button
							onClick={() => setShowInstructionsModal(false)}
							className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10"
						>
							<X className="size-5" />
						</button>
						<div className="flex-1 overflow-y-auto p-6">
							<Textarea
								value={config.instructions}
								onChange={(e) =>
									setConfig((prev) => ({
										...prev,
										instructions: e.target.value,
									}))
								}
								placeholder={"## Role\n\n## Backstory\n\n## Goal\n\n## Task"}
								className="min-h-[400px] resize-none text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
							/>
						</div>
						<div className="px-6 py-4 border-t">
							<p className="text-xs text-muted-foreground">
								Update instructions as needed
							</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
