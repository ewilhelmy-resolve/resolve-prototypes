import {
	Bot,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Copy,
	FileText,
	GripVertical,
	Plus,
	Search,
	SendHorizontal,
	Sparkles,
	ThumbsDown,
	ThumbsUp,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TOOLBOX_ITEMS, WORKFLOW_TEMPLATES } from "./workflowDesignerData";
import type { JarvisMessage } from "./workflowDesignerTypes";
import { ACTIVITY_ICON_MAP } from "./workflowDesignerTypes";

interface WorkflowJarvisPanelProps {
	onLoadTemplate: (templateId: string) => void;
	onRenameTab?: (name: string) => void;
	hasWorkflow?: boolean;
}

// Demo conversation phases
type DemoPhase =
	| "idle" // no conversation yet
	| "asked_what" // Jarvis asked "what process?"
	| "building" // Jarvis is building the workflow
	| "built" // workflow loaded on canvas
	| "editing"; // ongoing conversation about the workflow

// Contextual responses when workflow exists
const EDITING_RESPONSES = [
	"I've analyzed your workflow and it looks good. Would you like me to add error handling to the API calls?",
	"I can help optimize this workflow. Consider adding a retry mechanism for the API calls in case of transient failures.",
	"The current flow handles the happy path well. Want me to add a notification step to alert the IT team?",
	"I notice we could add a timeout check after the MFA validation step. Want me to add that?",
	"Good question! The lookup step queries the directory API to find the user. If found, it continues to the next step; otherwise it logs the failure.",
	"I'd recommend adding an audit logging activity at each branch endpoint for compliance. Want me to add that?",
	"We could also add a Slack notification step to alert the help desk when a password reset completes. Should I add it?",
	"The email template can be customized per department. Want me to add a conditional step to select the right template?",
];

function makeMsg(
	role: "user" | "assistant",
	content: string,
	suggestions?: string[],
): JarvisMessage {
	return {
		id: crypto.randomUUID(),
		role,
		content,
		timestamp: new Date(),
		suggestions,
	};
}

export function WorkflowJarvisPanel({
	onLoadTemplate,
	onRenameTab,
	hasWorkflow = false,
}: WorkflowJarvisPanelProps) {
	const [collapsed, setCollapsed] = useState(false);
	const [panelWidth, setPanelWidth] = useState(297);
	const isResizing = useRef(false);
	const [messages, setMessages] = useState<JarvisMessage[]>([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [demoPhase, setDemoPhase] = useState<DemoPhase>(
		hasWorkflow ? "editing" : "idle",
	);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const editingIdx = useRef(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message count change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length]);

	const appendAssistant = useCallback((content: string, delay = 1500) => {
		setIsLoading(true);
		setTimeout(() => {
			setMessages((prev) => [...prev, makeMsg("assistant", content)]);
			setIsLoading(false);
		}, delay);
	}, []);

	const handleSend = useCallback(() => {
		if (!input.trim() || isLoading) return;

		const text = input.trim();
		setMessages((prev) => [...prev, makeMsg("user", text)]);
		setInput("");

		// Route based on demo phase
		if (demoPhase === "asked_what") {
			// Detect which workflow to build based on keywords
			const lower = text.toLowerCase();
			const isPasswordReset =
				lower.includes("password") ||
				lower.includes("reset") ||
				lower.includes("google");

			setDemoPhase("building");
			setIsLoading(true);

			if (isPasswordReset) {
				setTimeout(() => {
					setMessages((prev) => [
						...prev,
						makeMsg(
							"assistant",
							"Got it! I'm building a Google Password Reset workflow for you...",
						),
					]);
					setTimeout(() => {
						onLoadTemplate("google-password-reset");
						onRenameTab?.("Google Password Reset");
						setMessages((prev) => [
							...prev,
							makeMsg(
								"assistant",
								"Done! I've created a 10-step Google Password Reset workflow:\n\n• Parse Ticket Input — extract email from the request\n• Trim Email — clean up the email address\n• Google Workspace Lookup — find user via Admin SDK\n• User Found? — branch on whether user exists\n• Validate MFA — verify manager approval\n• Reset Password — generate temp password via API\n• Send Credentials — email the temp password to the user\n• Log Reset Complete — write to audit log\n\nClick any activity on the canvas to configure it, or ask me to make changes.",
							),
						]);
						setIsLoading(false);
						setDemoPhase("built");
					}, 2000);
				}, 1500);
			} else {
				setTimeout(() => {
					setMessages((prev) => [
						...prev,
						makeMsg(
							"assistant",
							"Got it! I'm building an Azure AD Offboarding workflow for you...",
						),
					]);
					setTimeout(() => {
						onLoadTemplate("azure-ad-offboarding");
						onRenameTab?.("Azure AD Offboarding");
						setMessages((prev) => [
							...prev,
							makeMsg(
								"assistant",
								"Done! I've created a 10-step Azure AD Offboarding workflow:\n\n• Split — parse the employee's full name\n• User Name / Trim Name — extract and clean the username\n• Azure AD User — look up the account via Graph API\n• Filter Results — match active accounts\n• Display Name / Row Count — verify the result\n• If/Else — branch on whether the user was found\n• Disable Account or Log Not Found\n\nClick any activity on the canvas to configure it, or ask me to make changes.",
							),
						]);
						setIsLoading(false);
						setDemoPhase("built");
					}, 2000);
				}, 1500);
			}
			return;
		}

		if (demoPhase === "built" || demoPhase === "editing" || hasWorkflow) {
			// Workflow exists — give contextual editing responses
			setDemoPhase("editing");
			const response =
				EDITING_RESPONSES[editingIdx.current % EDITING_RESPONSES.length];
			editingIdx.current += 1;
			appendAssistant(response);
			return;
		}

		// Default fallback — generic assistant response
		appendAssistant(
			"I can help with that! Would you like to create a workflow, find a template, or add an activity?",
		);
	}, [
		input,
		isLoading,
		demoPhase,
		hasWorkflow,
		onLoadTemplate,
		onRenameTab,
		appendAssistant,
	]);

	const handleSuggestionClick = useCallback(
		(text: string) => {
			if (isLoading) return;
			setInput("");
			setMessages((prev) => {
				// Remove suggestions from the last assistant message
				const updated = prev.map((m, i) =>
					i === prev.length - 1 && m.suggestions
						? { ...m, suggestions: undefined }
						: m,
				);
				return [...updated, makeMsg("user", text)];
			});

			// Route through same demo logic
			if (demoPhase === "asked_what") {
				const lower = text.toLowerCase();
				const isPasswordReset =
					lower.includes("password") ||
					lower.includes("reset") ||
					lower.includes("google");

				setDemoPhase("building");
				setIsLoading(true);

				if (isPasswordReset) {
					setTimeout(() => {
						setMessages((prev) => [
							...prev,
							makeMsg(
								"assistant",
								"Got it! I'm building a Google Password Reset workflow for you...",
							),
						]);
						setTimeout(() => {
							onLoadTemplate("google-password-reset");
							onRenameTab?.("Google Password Reset");
							setMessages((prev) => [
								...prev,
								makeMsg(
									"assistant",
									"Done! I've created a 10-step Google Password Reset workflow:\n\n• Parse Ticket Input — extract email from the request\n• Trim Email — clean up the email address\n• Google Workspace Lookup — find user via Admin SDK\n• User Found? — branch on whether user exists\n• Validate MFA — verify manager approval\n• Reset Password — generate temp password via API\n• Send Credentials — email the temp password to the user\n• Log Reset Complete — write to audit log\n\nClick any activity on the canvas to configure it, or ask me to make changes.",
								),
							]);
							setIsLoading(false);
							setDemoPhase("built");
						}, 2000);
					}, 1500);
				} else {
					setTimeout(() => {
						setMessages((prev) => [
							...prev,
							makeMsg(
								"assistant",
								"Got it! I'm building an Azure AD Offboarding workflow for you...",
							),
						]);
						setTimeout(() => {
							onLoadTemplate("azure-ad-offboarding");
							onRenameTab?.("Azure AD Offboarding");
							setMessages((prev) => [
								...prev,
								makeMsg(
									"assistant",
									"Done! I've created a 10-step Azure AD Offboarding workflow.\n\nClick any activity on the canvas to configure it, or ask me to make changes.",
								),
							]);
							setIsLoading(false);
							setDemoPhase("built");
						}, 2000);
					}, 1500);
				}
			} else {
				appendAssistant("I can help with that! Let me look into it for you.");
			}
		},
		[isLoading, demoPhase, onLoadTemplate, onRenameTab, appendAssistant],
	);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const handleResizeStart = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			isResizing.current = true;
			const startX = e.clientX;
			const startWidth = panelWidth;

			const onMouseMove = (ev: MouseEvent) => {
				if (!isResizing.current) return;
				const newWidth = Math.min(
					Math.max(startWidth + (ev.clientX - startX), 220),
					500,
				);
				setPanelWidth(newWidth);
			};

			const onMouseUp = () => {
				isResizing.current = false;
				document.removeEventListener("mousemove", onMouseMove);
				document.removeEventListener("mouseup", onMouseUp);
				document.body.style.cursor = "";
				document.body.style.userSelect = "";
			};

			document.addEventListener("mousemove", onMouseMove);
			document.addEventListener("mouseup", onMouseUp);
			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";
		},
		[panelWidth],
	);

	const handleQuickAction = useCallback((action: string) => {
		setMessages([makeMsg("user", action)]);
		setIsLoading(true);

		if (action === "Create a workflow") {
			setDemoPhase("asked_what");
			setTimeout(() => {
				setMessages((prev) => [
					...prev,
					makeMsg(
						"assistant",
						"I can help you create a new workflow. What process would you like to automate?",
						[
							"Employee offboarding (Azure AD)",
							"Password reset for Google users",
							"Ticket routing by category",
							"New hire onboarding",
						],
					),
				]);
				setIsLoading(false);
			}, 1500);
		} else if (action === "Find a template") {
			setDemoPhase("asked_what");
			setTimeout(() => {
				setMessages((prev) => [
					...prev,
					makeMsg(
						"assistant",
						"I'll help you find a template. What type of automation are you looking for?",
						[
							"Azure AD management",
							"Password resets",
							"Ticket routing",
							"Onboarding",
						],
					),
				]);
				setIsLoading(false);
			}, 1500);
		} else {
			// "Create an activity"
			setDemoPhase("asked_what");
			setTimeout(() => {
				setMessages((prev) => [
					...prev,
					makeMsg(
						"assistant",
						"Let's create an activity. What type of activity do you need?",
						[
							"Data transform",
							"API integration",
							"Conditional logic",
							"Email notification",
						],
					),
				]);
				setIsLoading(false);
			}, 1500);
		}
	}, []);

	const handleDragStart = (
		e: React.DragEvent,
		item: (typeof TOOLBOX_ITEMS)[0],
	) => {
		e.dataTransfer.setData("application/workflow-activity", item.type);
		e.dataTransfer.setData("application/workflow-label", item.label);
		e.dataTransfer.setData("application/workflow-subtitle", item.subtitle);
		e.dataTransfer.effectAllowed = "move";
	};

	if (collapsed) {
		return (
			<div className="w-8 shrink-0 bg-white border-r border-slate-200 flex flex-col items-center pt-2 shadow-sm">
				<button
					onClick={() => setCollapsed(false)}
					className="p-1 hover:bg-slate-100 rounded transition-colors"
					aria-label="Expand panel"
				>
					<ChevronsRight className="w-4 h-4 text-slate-400" />
				</button>
			</div>
		);
	}

	return (
		<div
			className="shrink-0 bg-white border-r border-[#d1d5db] flex flex-col min-h-0 overflow-hidden relative"
			style={{ width: panelWidth }}
		>
			<Tabs defaultValue="jarvis" className="flex-1 flex flex-col min-h-0">
				<div className="flex items-center px-[9px] py-[8px]">
					<TabsList className="bg-transparent h-auto p-0 gap-0 rounded-none">
						<TabsTrigger
							value="jarvis"
							className="rounded-t-[3px] rounded-b-none px-[11px] h-[28px] text-[12px] font-semibold leading-[18px] border border-b-0 data-[state=active]:bg-[#e5e7eb] data-[state=active]:text-[#011331] data-[state=active]:border-[#e5e7eb] data-[state=active]:shadow-none data-[state=inactive]:bg-white data-[state=inactive]:text-[#374151] data-[state=inactive]:border-white"
							style={{ fontFamily: "'Open Sans', sans-serif" }}
						>
							Jarvis
						</TabsTrigger>
						<TabsTrigger
							value="toolbox"
							className="rounded-t-[3px] rounded-b-none px-[11px] h-[28px] text-[12px] font-semibold leading-[18px] border border-b-0 data-[state=active]:bg-[#e5e7eb] data-[state=active]:text-[#011331] data-[state=active]:border-[#e5e7eb] data-[state=active]:shadow-none data-[state=inactive]:bg-white data-[state=inactive]:text-[#374151] data-[state=inactive]:border-white"
							style={{ fontFamily: "'Open Sans', sans-serif" }}
						>
							Toolbox
						</TabsTrigger>
						<TabsTrigger
							value="templates"
							className="rounded-t-[3px] rounded-b-none px-[11px] h-[28px] text-[12px] font-semibold leading-[18px] border border-b-0 data-[state=active]:bg-[#e5e7eb] data-[state=active]:text-[#011331] data-[state=active]:border-[#e5e7eb] data-[state=active]:shadow-none data-[state=inactive]:bg-white data-[state=inactive]:text-[#374151] data-[state=inactive]:border-white"
							style={{ fontFamily: "'Open Sans', sans-serif" }}
						>
							Templates
						</TabsTrigger>
						</TabsList>
					<div className="flex-1 flex items-center justify-end">
						<button
							onClick={() => setCollapsed(true)}
							className="p-1 hover:bg-slate-100 rounded transition-colors"
							aria-label="Collapse panel"
						>
							<ChevronsLeft className="w-4 h-4 text-slate-400" />
						</button>
					</div>
				</div>

				{/* Jarvis Chat Tab */}
				<TabsContent
					value="jarvis"
					className="flex-1 flex flex-col mt-0 p-0 min-h-0 overflow-hidden"
				>
					{!hasWorkflow && messages.length === 0 ? (
						<>
							{/* Onboarding empty state — new workflow only */}
							<div className="flex-1 flex flex-col items-start justify-center gap-3 px-5">
								<div className="flex flex-col gap-8 text-center w-full">
									<div className="text-sm leading-5 text-[#0a0a0a]">
										<p>I'm Jarvis, your IT assistant for Resolve.</p>
										<br />
										<p>
											I can help you build a workflow, find the right activity,
											or help troubleshoot.
										</p>
									</div>
									<p className="text-sm leading-none text-[#737373]">
										To get started, try one of these:
									</p>
								</div>
								{[
									{
										icon: Sparkles,
										label: "Create a workflow",
										action: () => handleQuickAction("Create a workflow"),
									},
									{
										icon: Search,
										label: "Find a template",
										action: () => handleQuickAction("Find a template"),
									},
									{
										icon: Plus,
										label: "Create an activity",
										action: () => handleQuickAction("Create an activity"),
									},
								].map((item) => (
									<button
										key={item.label}
										onClick={item.action}
										className="w-full flex items-center gap-[10px] p-4 rounded-[8px] border border-[#e5e5e5] bg-white hover:border-[#0050c7] hover:bg-[#f8faff] active:scale-[0.98] transition-all text-left cursor-pointer group"
									>
										<div className="w-8 h-8 rounded-[6px] bg-[#eff6ff] flex items-center justify-center shrink-0">
											<item.icon className="w-6 h-6 text-[#0050c7]" />
										</div>
										<span className="flex-1 text-[16px] leading-[24px] text-[#0a0a0a]">
											{item.label}
										</span>
										<ChevronRight className="w-4 h-4 text-[#0050c7] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
									</button>
								))}
							</div>
						</>
					) : (
						<ScrollArea className="flex-1 min-h-0 p-3">
							<div className="space-y-3">
								{messages.map((msg) => (
									<div key={msg.id} className="space-y-2">
										<div
											className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
										>
											{msg.role === "assistant" && (
												<div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
													<Bot className="w-3 h-3 text-white" />
												</div>
											)}
											<div
												className={`rounded-lg px-3 py-2 text-sm ${
													msg.role === "user"
														? "bg-blue-500 text-white max-w-[85%]"
														: "bg-slate-100 text-slate-700"
												}`}
											>
												<span className="whitespace-pre-line">
													{msg.content}
												</span>
												{msg.role === "assistant" && (
													<div className="flex items-center gap-1 mt-2 pt-1 border-t border-slate-200/50">
														<button
															className="p-1 hover:bg-slate-200 rounded transition-colors"
															aria-label="Copy response"
														>
															<Copy className="w-3 h-3 text-slate-400" />
														</button>
														<button
															className="p-1 hover:bg-slate-200 rounded transition-colors"
															aria-label="Like response"
														>
															<ThumbsUp className="w-3 h-3 text-slate-400" />
														</button>
														<button
															className="p-1 hover:bg-slate-200 rounded transition-colors"
															aria-label="Dislike response"
														>
															<ThumbsDown className="w-3 h-3 text-slate-400" />
														</button>
													</div>
												)}
											</div>
										</div>
										{msg.suggestions && msg.suggestions.length > 0 && (
											<div className="flex flex-wrap gap-2 ml-8">
												{msg.suggestions.map((s) => (
													<button
														key={s}
														onClick={() => handleSuggestionClick(s)}
														className="px-3 py-1.5 text-xs font-medium rounded-full border border-[#0050c7]/30 text-[#0050c7] bg-white hover:bg-[#0050c7] hover:text-white active:scale-[0.97] transition-all cursor-pointer"
													>
														{s}
													</button>
												))}
											</div>
										)}
									</div>
								))}
								{isLoading && (
									<div className="flex gap-2">
										<div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
											<Bot className="w-3 h-3 text-white" />
										</div>
										<div className="bg-slate-100 rounded-lg px-3 py-2 text-sm text-slate-500">
											working...
										</div>
									</div>
								)}
								<div ref={messagesEndRef} />
							</div>
						</ScrollArea>
					)}

					{/* Input */}
					<div className="p-3 border-t border-[#e5e5e5] shrink-0">
						<div className="flex items-center gap-2 border border-[#e5e5e5] rounded-[8px] px-3 py-2">
							<Input
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Ask me anything..."
								className="text-sm text-[#737373] border-0 shadow-none focus-visible:ring-0 h-auto p-0"
								aria-label="Chat with Jarvis"
							/>
							<Button
								size="icon"
								className="h-9 w-9 shrink-0 rounded-[8px] bg-[#0050c7]"
								onClick={handleSend}
								disabled={!input.trim() || isLoading}
								aria-label="Send message"
							>
								<SendHorizontal className="w-5 h-5" />
							</Button>
						</div>
					</div>
				</TabsContent>

				{/* Toolbox Tab */}
				<TabsContent
					value="toolbox"
					className="flex-1 flex flex-col mt-0 p-0 min-h-0 overflow-hidden"
				>
					<ScrollArea className="flex-1 min-h-0 p-3">
						<div className="space-y-4">
							{["Data", "Integrations", "Logic"].map((category) => {
								const items = TOOLBOX_ITEMS.filter(
									(i) => i.category === category,
								);
								if (items.length === 0) return null;
								return (
									<div key={category}>
										<div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
											{category}
										</div>
										<ul className="space-y-1">
											{items.map((item) => {
												const Icon = ACTIVITY_ICON_MAP[item.type];
												return (
													<li
														key={item.type}
														draggable
														onDragStart={(e) => handleDragStart(e, item)}
														className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-grab active:cursor-grabbing transition-colors group list-none"
													>
														<GripVertical className="w-3 h-3 text-slate-300 group-hover:text-slate-400" />
														<div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center text-white">
															<Icon className="w-3.5 h-3.5" />
														</div>
														<div className="flex-1 min-w-0">
															<div className="text-sm font-medium text-slate-700 truncate">
																{item.label}
															</div>
															<div className="text-xs text-slate-400 truncate">
																{item.subtitle}
															</div>
														</div>
													</li>
												);
											})}
										</ul>
									</div>
								);
							})}
						</div>
					</ScrollArea>
				</TabsContent>

				{/* Templates Tab */}
				<TabsContent
					value="templates"
					className="flex-1 flex flex-col mt-0 p-0 min-h-0 overflow-hidden"
				>
					<ScrollArea className="flex-1 min-h-0 p-3">
						<div className="space-y-2">
							{WORKFLOW_TEMPLATES.map((template) => (
								<button
									key={template.id}
									onClick={() => onLoadTemplate(template.id)}
									className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
								>
									<div className="flex items-center gap-2 mb-1">
										<FileText className="w-4 h-4 text-blue-500" />
										<span className="text-sm font-medium text-slate-700">
											{template.name}
										</span>
									</div>
									<p className="text-xs text-slate-500 leading-relaxed">
										{template.description}
									</p>
								</button>
							))}
						</div>
					</ScrollArea>
				</TabsContent>
			</Tabs>
			{/* Resize handle */}
			<div
				aria-hidden="true"
				onMouseDown={handleResizeStart}
				className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400/40 active:bg-blue-500/50 transition-colors z-10"
			/>
		</div>
	);
}
