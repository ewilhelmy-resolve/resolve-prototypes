/**
 * AgentChatPage - View/Use mode for agents
 *
 * Features:
 * - Agent selector dropdown (switch agents, browse more, create new)
 * - Full chat interface (same as test preview)
 * - Right panel with Overview (knowledge sources + skills)
 * - Edit button → navigates to builder/configure
 */

import {
	AlertCircle,
	Award,
	BookOpen,
	Bot,
	Briefcase,
	Calendar,
	Check,
	ChevronDown,
	ClipboardList,
	Coffee,
	Database,
	FileSpreadsheet,
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
	Map,
	Package,
	PanelRightOpen,
	Phone,
	FilePen,
	Plus,
	Rocket,
	Search,
	SendHorizontal,
	Settings,
	ShieldCheck,
	ShieldEllipsis,
	ShoppingCart,
	Squirrel,
	Star,
	Target,
	ThumbsUp,
	TrendingUp,
	Truck,
	Users,
	Wrench,
	X,
	Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Icon mapping - extended
const ICON_MAP: Record<string, React.ElementType> = {
	squirrel: Squirrel,
	bot: Bot,
	headphones: Headphones,
	"shield-check": ShieldCheck,
	key: Key,
	"book-open": BookOpen,
	"trending-up": TrendingUp,
	"clipboard-list": ClipboardList,
	"line-chart": LineChart,
	briefcase: Briefcase,
	users: Users,
	landmark: Landmark,
	truck: Truck,
	award: Award,
	settings: Settings,
	"alert-circle": AlertCircle,
	rocket: Rocket,
	"graduation-cap": GraduationCap,
	heart: Heart,
	zap: Zap,
	globe: Globe,
	lock: Lock,
	mail: Mail,
	phone: Phone,
	star: Star,
	target: Target,
	"thumbs-up": ThumbsUp,
	wrench: Wrench,
	calendar: Calendar,
	coffee: Coffee,
	database: Database,
	folder: Folder,
	home: Home,
	layers: Layers,
	map: Map,
	package: Package,
	"shopping-cart": ShoppingCart,
};

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
	slate: { bg: "bg-slate-800", text: "text-white" },
	blue: { bg: "bg-blue-600", text: "text-white" },
	emerald: { bg: "bg-emerald-600", text: "text-white" },
	purple: { bg: "bg-purple-600", text: "text-white" },
	orange: { bg: "bg-orange-500", text: "text-white" },
	rose: { bg: "bg-rose-500", text: "text-white" },
};

// Mock agents data
const MOCK_AGENTS: Record<string, AgentConfig> = {
	"1": {
		id: "1",
		name: "HelpDesk Advisor",
		description: "Answers IT support questions",
		instructions:
			"Help users with IT-related questions. Be patient and thorough.",
		iconId: "headphones",
		iconColorId: "blue",
		agentType: "answer",
		status: "published",
		conversationStarters: [
			"I need to reset my password",
			"My VPN isn't connecting",
			"How do I request software?",
		],
		knowledgeSources: [
			{ id: "1", name: "IT Knowledge Base", type: "document" },
			{ id: "2", name: "Software Catalog", type: "document" },
			{ id: "3", name: "VPN Setup Guide", type: "document" },
		],
		skills: ["Reset password", "Unlock account", "Request system access"],
	},
	"2": {
		id: "2",
		name: "Onboarding Compliance Checker",
		description: "Answers from compliance docs",
		instructions:
			"Only answer from approved compliance documents. Be accurate.",
		iconId: "shield-check",
		iconColorId: "emerald",
		agentType: "knowledge",
		status: "published",
		conversationStarters: [
			"Is my I-9 complete?",
			"What background checks are required?",
			"Where do I submit tax forms?",
		],
		knowledgeSources: [
			{ id: "4", name: "Compliance Handbook", type: "document" },
			{ id: "5", name: "HR Policies", type: "document" },
		],
		skills: ["Verify I-9 forms", "Check background status", "Review tax docs"],
	},
	"3": {
		id: "3",
		name: "Password Reset Bot",
		description: "Automates password resets",
		instructions: "Guide users through password reset workflow.",
		iconId: "key",
		iconColorId: "purple",
		agentType: "workflow",
		status: "draft",
		conversationStarters: [
			"I forgot my password",
			"Reset my AD password",
			"I'm locked out",
		],
		knowledgeSources: [],
		skills: ["Password Reset"],
	},
	"4": {
		id: "4",
		name: "PTO Balance Checker",
		description: "Checks employee time off balances",
		instructions:
			"Help employees check their PTO balances and request time off. Be helpful and accurate with dates.",
		iconId: "calendar",
		iconColorId: "indigo",
		agentType: "answer",
		status: "published",
		conversationStarters: [
			"How much PTO do I have?",
			"I want to request time off",
			"What are the PTO policies?",
		],
		knowledgeSources: [
			{ id: "6", name: "HR Time Off Policies", type: "document" },
			{ id: "7", name: "Holiday Calendar 2025", type: "document" },
		],
		skills: ["Check PTO balance", "Request time off"],
	},
	"5": {
		id: "5",
		name: "Employee Directory Bot",
		description: "Looks up employee information",
		instructions:
			"Help users find employee contact information and organizational details. Respect privacy guidelines.",
		iconId: "users",
		iconColorId: "emerald",
		agentType: "knowledge",
		status: "published",
		conversationStarters: [
			"Find John Smith's email",
			"Who is the head of Engineering?",
			"What's Sarah's phone number?",
		],
		knowledgeSources: [
			{ id: "8", name: "Employee Directory", type: "connection" },
			{ id: "9", name: "Org Chart", type: "document" },
		],
		skills: ["Lookup employee", "Find department", "Get contact info"],
	},
};

interface KnowledgeSource {
	id: string;
	name: string;
	type: "document" | "connection";
}

interface AgentConfig {
	id: string;
	name: string;
	description: string;
	instructions: string;
	iconId: string;
	iconColorId: string;
	agentType: "answer" | "knowledge" | "workflow" | null;
	status: "draft" | "published";
	conversationStarters: string[];
	knowledgeSources: KnowledgeSource[];
	skills: string[];
}

interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
}

export default function AgentChatPage() {
	const navigate = useNavigate();
	const { id: agentId } = useParams<{ id: string }>();

	const config = agentId ? MOCK_AGENTS[agentId] : null;
	const allAgents = Object.values(MOCK_AGENTS);

	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [showOverview, setShowOverview] = useState(true);
	const chatEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Auto-scroll to bottom
	useEffect(() => {
		chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	// Focus input on mount
	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	// Reset messages when agent changes
	useEffect(() => {
		setMessages([]);
	}, [agentId]);

	// Handle no config
	if (!config) {
		return (
			<div className="h-screen flex items-center justify-center bg-background">
				<div className="text-center space-y-4">
					<Bot className="size-12 mx-auto text-muted-foreground" />
					<p className="text-muted-foreground">Agent not found.</p>
					<Button onClick={() => navigate("/agents")}>Browse Agents</Button>
				</div>
			</div>
		);
	}

	const Icon = ICON_MAP[config.iconId] || Bot;
	const color = COLOR_MAP[config.iconColorId] || COLOR_MAP.slate;

	const handleSend = async () => {
		if (!input.trim() || isLoading) return;

		const userMessage: ChatMessage = {
			id: Date.now().toString(),
			role: "user",
			content: input.trim(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setInput("");
		setIsLoading(true);

		// Simulate agent response
		await new Promise((r) => setTimeout(r, 800 + Math.random() * 800));

		const assistantMessage: ChatMessage = {
			id: (Date.now() + 1).toString(),
			role: "assistant",
			content: generateResponse(input.trim(), config),
		};

		setMessages((prev) => [...prev, assistantMessage]);
		setIsLoading(false);
	};

	const handleStarterClick = (starter: string) => {
		setInput(starter);
		inputRef.current?.focus();
	};

	const handleAgentSelect = (agent: AgentConfig) => {
		navigate(`/agents/${agent.id}/chat`);
	};

	return (
		<div className="h-screen flex bg-background">
			{/* Left side - Chat area with its own header */}
			<div className="flex-1 flex flex-col relative">
				{/* Chat header - no border */}
				<header className="flex items-center justify-between px-4 py-3 bg-white">
					{/* Agent selector dropdown */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="gap-2 px-2 h-auto py-1.5">
								<div
									className={cn(
										"size-7 rounded-lg flex items-center justify-center",
										color.bg,
									)}
								>
									<Icon className={cn("size-4", color.text)} />
								</div>
								<span className="font-medium">{config.name}</span>
								<ChevronDown className="size-4 text-muted-foreground" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-64">
							{allAgents
								.filter((a) => a.status === "published")
								.map((agent) => {
									const AgentIcon = ICON_MAP[agent.iconId] || Bot;
									const agentColor =
										COLOR_MAP[agent.iconColorId] || COLOR_MAP.slate;
									const isSelected = agent.id === config.id;

									return (
										<DropdownMenuItem
											key={agent.id}
											onClick={() => handleAgentSelect(agent)}
											className="flex items-center gap-3 py-2"
										>
											<div
												className={cn(
													"size-7 rounded-lg flex items-center justify-center",
													agentColor.bg,
												)}
											>
												<AgentIcon className={cn("size-4", agentColor.text)} />
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<span className="font-medium truncate">
														{agent.name}
													</span>
													{agent.status === "published" && (
														<span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">
															Live
														</span>
													)}
												</div>
											</div>
											{isSelected && <Check className="size-4 text-primary" />}
										</DropdownMenuItem>
									);
								})}
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => navigate("/agents")}
								className="gap-2"
							>
								<Search className="size-4" />
								Browse more
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => navigate("/agents/create")}
								className="gap-2"
							>
								<Plus className="size-4" />
								Create new
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					{/* Edit button - right side of chat header */}
					<Button
						variant="ghost"
						size="sm"
						onClick={() => navigate(`/agents/${config.id}`)}
						className="gap-1.5 text-muted-foreground"
					>
						<FilePen className="size-4" />
						Edit
					</Button>
				</header>

				{/* Chat content — neutral bg with white rounded panel */}
				<div className="flex-1 overflow-y-auto bg-neutral-50 p-4">
					<div className="bg-white rounded-lg border border-neutral-100 h-full flex flex-col items-center px-5">
						<div className="flex flex-1 flex-col items-center justify-between max-w-[640px] w-full">
							<div className="flex flex-1 flex-col items-center justify-between w-full">
								{/* Welcome state or messages */}
								<div className="flex flex-1 flex-col gap-4 items-center justify-center w-full">
									{messages.length === 0 ? (
										<>
											{/* Icon + name side by side */}
											<div className="flex items-center justify-center gap-2 w-full">
												<div className="size-[38px] rounded-lg bg-violet-200 flex items-center justify-center shrink-0">
													<Icon className="size-6 text-violet-700" />
												</div>
												<h2 className="text-xl font-bold">{config.name}</h2>
											</div>

											{/* Description */}
											<p className="text-sm text-muted-foreground text-center w-full">
												{config.description}
											</p>

											{/* Conversation starters — bordered cards in a row */}
											{config.conversationStarters.length > 0 && (
												<div className="flex gap-2 w-full">
													{config.conversationStarters
														.slice(0, 3)
														.map((starter, idx) => (
															<button
																key={idx}
																onClick={() => handleStarterClick(starter)}
																className="flex-1 rounded-md border p-2 text-sm text-center hover:bg-muted/50 transition-colors"
															>
																{starter}
															</button>
														))}
												</div>
											)}
										</>
									) : (
										<div className="w-full py-6 space-y-4">
											{messages.map((msg) => (
												<div
													key={msg.id}
													className={cn(
														"flex gap-3",
														msg.role === "user" ? "justify-end" : "justify-start",
													)}
												>
													{msg.role === "assistant" && (
														<div className="size-8 rounded-lg bg-violet-200 flex items-center justify-center flex-shrink-0">
															<Icon className="size-4 text-violet-700" />
														</div>
													)}
													<div
														className={cn(
															"max-w-[75%] px-4 py-3 rounded-2xl",
															msg.role === "user"
																? "bg-primary text-primary-foreground rounded-br-md"
																: "bg-muted rounded-bl-md",
														)}
													>
														<p className="text-sm whitespace-pre-wrap">{msg.content}</p>
													</div>
												</div>
											))}

											{isLoading && (
												<div className="flex gap-3">
													<div className="size-8 rounded-lg bg-violet-200 flex items-center justify-center flex-shrink-0">
														<Icon className="size-4 text-violet-700" />
													</div>
													<div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
														<Loader2 className="size-4 animate-spin text-muted-foreground" />
													</div>
												</div>
											)}

											<div ref={chatEndRef} />
										</div>
									)}
								</div>

								{/* Input — inside the white panel, pinned to bottom */}
								<div className="w-full pb-4">
									<div className="flex items-center gap-0 rounded-md border p-3">
										<input
											ref={inputRef}
											type="text"
											value={input}
											onChange={(e) => setInput(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter" && !e.shiftKey) {
													e.preventDefault();
													handleSend();
												}
											}}
											placeholder="Ask anything"
											className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
											disabled={isLoading}
										/>
										<Button
											onClick={handleSend}
											disabled={!input.trim() || isLoading}
											size="icon"
											className="size-9 rounded-md shrink-0"
										>
											<SendHorizontal className="size-4" />
										</Button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Toggle button when panel is closed */}
				{!showOverview && (
					<button
						onClick={() => setShowOverview(true)}
						className="absolute top-3 right-3 p-2 rounded-lg hover:bg-muted transition-colors"
						aria-label="Show overview"
					>
						<PanelRightOpen className="size-5 text-muted-foreground" />
					</button>
				)}
			</div>

			{/* Right panel - Overview (full height, matches Figma) */}
			<div
				className={cn(
					"bg-white overflow-hidden transition-all duration-300 ease-in-out flex flex-col border-l",
					showOverview ? "w-[467px]" : "w-0 border-l-0",
				)}
			>
				<div className="flex flex-col gap-8 p-5 min-w-[467px] h-full">
					{/* Panel header */}
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-medium leading-none">Overview</h2>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setShowOverview(false)}
							aria-label="Close overview panel"
						>
							<X className="size-4" />
						</Button>
					</div>

					{/* Panel content */}
					<div className="flex-1 overflow-y-auto flex flex-col gap-4">
						{/* Knowledge section */}
						<p className="text-sm text-muted-foreground">
							{config.name} knowledge
						</p>
						<div className="rounded-md border">
							{config.knowledgeSources.length > 0 ? (
								<ul className="list-none">
									{config.knowledgeSources.map((source) => (
										<li
											key={source.id}
											className="flex items-center gap-[10px] px-[15px] py-[10px]"
										>
											<div className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-violet-200">
												<ShieldEllipsis className="size-3" />
											</div>
											<span className="text-base">{source.name}</span>
										</li>
									))}
								</ul>
							) : (
								<p className="px-[15px] py-[10px] text-sm text-muted-foreground">
									No knowledge sources
								</p>
							)}
							<div className="px-[15px] py-[10px]">
								<Button
									variant="ghost"
									size="sm"
									className="h-auto p-0 text-sm"
								>
									<Plus className="mr-1 size-3.5" />
									Add knowledge
								</Button>
							</div>
						</div>

						{/* Skills section */}
						<p className="text-sm text-muted-foreground">Skills applied</p>
						<div className="rounded-md border">
							{config.skills.length > 0 ? (
								<ul className="list-none">
									{config.skills.map((skill, idx) => (
										<li
											key={idx}
											className="flex items-center gap-[10px] px-[15px] py-[10px]"
										>
											<div
												className={cn(
													"flex size-5 shrink-0 items-center justify-center rounded-sm",
													idx % 2 === 0 ? "bg-amber-100" : "bg-blue-100",
												)}
											>
												<FileSpreadsheet className="size-3" />
											</div>
											<span className="text-base">{skill}</span>
										</li>
									))}
								</ul>
							) : (
								<p className="px-[15px] py-[10px] text-sm text-muted-foreground">
									No skills configured
								</p>
							)}
							<div className="px-[15px] py-[10px]">
								<Button
									variant="ghost"
									size="sm"
									className="h-auto p-0 text-sm"
									onClick={() => navigate(`/agents/${config.id}`)}
								>
									<Plus className="mr-1 size-3.5" />
									Add skills
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

// Generate simulated response based on agent configuration
function generateResponse(input: string, config: AgentConfig): string {
	const lowerInput = input.toLowerCase();

	// Check for skill/workflow matches
	for (const skill of config.skills) {
		const skillLower = skill.toLowerCase();
		if (
			lowerInput.includes(skillLower) ||
			(skillLower.includes("password") && lowerInput.includes("password")) ||
			(skillLower.includes("unlock") && lowerInput.includes("unlock")) ||
			(skillLower.includes("access") && lowerInput.includes("access"))
		) {
			return `I can help you with "${skill}". Let me guide you through the process.\n\n**To proceed, I'll need:**\n• Your employee ID or email\n• Verification of your identity\n\nOnce verified, I'll initiate the ${skill.toLowerCase()} workflow. Would you like to continue?`;
		}
	}

	// Knowledge-based response
	if (config.knowledgeSources.length > 0) {
		return `Based on ${config.knowledgeSources[0].name}, here's what I found regarding your question:\n\nThis information comes from our verified documentation.\n\nWould you like more details on any specific aspect?`;
	}

	// Generic helpful response
	return `Thanks for your question. As ${config.name}, I'm here to help.\n\n${config.description}\n\nCould you provide more details so I can better assist you?`;
}
