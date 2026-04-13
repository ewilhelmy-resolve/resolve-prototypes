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
	ArrowLeft,
	Bot,
	Check,
	ChevronDown,
	FilePen,
	FileSpreadsheet,
	Loader2,
	PanelRightOpen,
	Plus,
	Search,
	SendHorizontal,
	ShieldEllipsis,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MOCK_CHAT_AGENTS } from "@/constants/agentMocks";
import { AGENT_COLOR_MAP, AGENT_ICON_MAP } from "@/constants/agents";
import { cn } from "@/lib/utils";
import type { AgentChatConfig, ChatMessage } from "@/types/agent";

export default function AgentChatPage() {
	const { t } = useTranslation("agents");
	const navigate = useNavigate();
	const { id: agentId } = useParams<{ id: string }>();

	// TODO(react-19): Replace with use(fetchAgent(agentId)) when API is available
	const config = agentId ? MOCK_CHAT_AGENTS[agentId] : null;
	const allAgents = Object.values(MOCK_CHAT_AGENTS);

	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [showOverview, setShowOverview] = useState(true);
	const chatEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Auto-scroll to bottom
	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages
	useEffect(() => {
		chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	// Focus input on mount
	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	// Reset messages when agent changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset on agent switch
	useEffect(() => {
		setMessages([]);
	}, [agentId]);

	// Handle no config
	if (!config) {
		return (
			<div className="h-screen flex items-center justify-center bg-background">
				<div className="text-center space-y-4">
					<Bot className="size-12 mx-auto text-muted-foreground" />
					<p className="text-muted-foreground">{t("chat.notFound")}</p>
					<Button onClick={() => navigate("/agents")}>
						{t("chat.browseAgents")}
					</Button>
				</div>
			</div>
		);
	}

	const Icon = AGENT_ICON_MAP[config.iconId] || Bot;
	const color = AGENT_COLOR_MAP[config.iconColorId] || AGENT_COLOR_MAP.slate;

	// TODO(react-19): Use useTransition for non-blocking send
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

	const handleAgentSelect = (agent: AgentChatConfig) => {
		navigate(`/agents/${agent.id}/chat`);
	};

	return (
		<div className="h-screen flex bg-background">
			{/* Left side - Chat area with its own header */}
			<div className="flex-1 flex flex-col relative">
				{/* Chat header - no border */}
				<header className="flex items-center justify-between px-4 py-3 bg-white">
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							className="size-8"
							onClick={() => navigate("/agents")}
						>
							<ArrowLeft className="size-4" />
						</Button>
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
										const AgentIcon = AGENT_ICON_MAP[agent.iconId] || Bot;
										const agentColor =
											AGENT_COLOR_MAP[agent.iconColorId] ||
											AGENT_COLOR_MAP.slate;
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
													<AgentIcon
														className={cn("size-4", agentColor.text)}
													/>
												</div>
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2">
														<span className="font-medium truncate">
															{agent.name}
														</span>
														{agent.status === "published" && (
															<span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">
																{t("chat.live")}
															</span>
														)}
													</div>
												</div>
												{isSelected && (
													<Check className="size-4 text-primary" />
												)}
											</DropdownMenuItem>
										);
									})}
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() => navigate("/agents")}
									className="gap-2"
								>
									<Search className="size-4" />
									{t("chat.browseMore")}
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => navigate("/agents/create")}
									className="gap-2"
								>
									<Plus className="size-4" />
									{t("chat.createNew")}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					{/* Edit button - right side of chat header */}
					<Button
						variant="ghost"
						size="sm"
						onClick={() => navigate(`/agents/${config.id}`)}
						className="gap-1.5 text-muted-foreground"
					>
						<FilePen className="size-4" />
						{t("chat.edit")}
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
												<div
													className={cn(
														"size-[38px] rounded-lg flex items-center justify-center shrink-0",
														color.bg,
													)}
												>
													<Icon className={cn("size-6", color.text)} />
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
														msg.role === "user"
															? "justify-end"
															: "justify-start",
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
														<p className="text-sm whitespace-pre-wrap">
															{msg.content}
														</p>
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
											placeholder={t("chat.askAnything")}
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
						aria-label={t("chat.showOverview")}
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
						<h2 className="text-lg font-medium leading-none">
							{t("chat.overview")}
						</h2>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setShowOverview(false)}
							aria-label={t("chat.closeOverview")}
						>
							<X className="size-4" />
						</Button>
					</div>

					{/* Panel content */}
					<div className="flex-1 overflow-y-auto flex flex-col gap-4">
						{/* Knowledge section */}
						<p className="text-sm text-muted-foreground">
							{t("chat.knowledge", { name: config.name })}
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
									{t("chat.noKnowledgeSources")}
								</p>
							)}
							<div className="px-[15px] py-[10px]">
								<Button
									variant="ghost"
									size="sm"
									className="h-auto p-0 text-sm"
								>
									<Plus className="mr-1 size-3.5" />
									{t("chat.addKnowledge")}
								</Button>
							</div>
						</div>

						{/* Skills section */}
						<p className="text-sm text-muted-foreground">
							{t("chat.skillsApplied")}
						</p>
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
									{t("chat.noSkills")}
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
									{t("chat.addSkills")}
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
function generateResponse(input: string, config: AgentChatConfig): string {
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
