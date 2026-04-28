import {
	Bot,
	ChevronRight,
	Copy,
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
import type { JarvisMessage } from "./workflowDesignerTypes";

interface WorkflowJarvisChatProps {
	onLoadTemplate: (templateId: string) => void;
	onRenameTab?: (name: string) => void;
	hasWorkflow?: boolean;
}

type DemoPhase = "idle" | "asked_what" | "building" | "built" | "editing";

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

export function WorkflowJarvisChat({
	onLoadTemplate,
	onRenameTab,
	hasWorkflow = false,
}: WorkflowJarvisChatProps) {
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

	const runBuildFlow = useCallback(
		(text: string) => {
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
								"Done! I've created a 10-step Google Password Reset workflow:\n\n\u2022 Parse Ticket Input \u2014 extract email from the request\n\u2022 Trim Email \u2014 clean up the email address\n\u2022 Google Workspace Lookup \u2014 find user via Admin SDK\n\u2022 User Found? \u2014 branch on whether user exists\n\u2022 Validate MFA \u2014 verify manager approval\n\u2022 Reset Password \u2014 generate temp password via API\n\u2022 Send Credentials \u2014 email the temp password to the user\n\u2022 Log Reset Complete \u2014 write to audit log\n\nClick any activity on the canvas to configure it, or ask me to make changes.",
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
								"Done! I've created a 10-step Azure AD Offboarding workflow:\n\n\u2022 Split \u2014 parse the employee's full name\n\u2022 User Name / Trim Name \u2014 extract and clean the username\n\u2022 Azure AD User \u2014 look up the account via Graph API\n\u2022 Filter Results \u2014 match active accounts\n\u2022 Display Name / Row Count \u2014 verify the result\n\u2022 If/Else \u2014 branch on whether the user was found\n\u2022 Disable Account or Log Not Found\n\nClick any activity on the canvas to configure it, or ask me to make changes.",
							),
						]);
						setIsLoading(false);
						setDemoPhase("built");
					}, 2000);
				}, 1500);
			}
		},
		[onLoadTemplate, onRenameTab],
	);

	const handleSend = useCallback(() => {
		if (!input.trim() || isLoading) return;

		const text = input.trim();
		setMessages((prev) => [...prev, makeMsg("user", text)]);
		setInput("");

		if (demoPhase === "asked_what") {
			runBuildFlow(text);
			return;
		}

		if (demoPhase === "built" || demoPhase === "editing" || hasWorkflow) {
			setDemoPhase("editing");
			const response =
				EDITING_RESPONSES[editingIdx.current % EDITING_RESPONSES.length];
			editingIdx.current += 1;
			appendAssistant(response);
			return;
		}

		appendAssistant(
			"I can help with that! Would you like to create a workflow, find a template, or add an activity?",
		);
	}, [input, isLoading, demoPhase, hasWorkflow, runBuildFlow, appendAssistant]);

	const handleSuggestionClick = useCallback(
		(text: string) => {
			if (isLoading) return;
			setInput("");
			setMessages((prev) => {
				const updated = prev.map((m, i) =>
					i === prev.length - 1 && m.suggestions
						? { ...m, suggestions: undefined }
						: m,
				);
				return [...updated, makeMsg("user", text)];
			});

			if (demoPhase === "asked_what") {
				runBuildFlow(text);
			} else {
				appendAssistant("I can help with that! Let me look into it for you.");
			}
		},
		[isLoading, demoPhase, runBuildFlow, appendAssistant],
	);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

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

	return (
		<div className="flex-1 flex flex-col min-h-0 overflow-hidden">
			{!hasWorkflow && messages.length === 0 ? (
				<>
					{/* Onboarding empty state */}
					<div className="flex-1 flex flex-col items-start justify-center gap-3 px-5">
						<div className="flex flex-col gap-8 text-center w-full">
							<div className="text-sm leading-5 text-[#0a0a0a]">
								<p>I'm Jarvis, your IT assistant for Resolve.</p>
								<br />
								<p>
									I can help you build a workflow, find the right activity, or
									help troubleshoot.
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
										<span className="whitespace-pre-line">{msg.content}</span>
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
		</div>
	);
}
