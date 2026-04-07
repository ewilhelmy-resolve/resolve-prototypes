import type { Meta, StoryObj } from "@storybook/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, PartyPopper, SendIcon, Sparkles, SquareIcon, Trash2 } from "lucide-react";
import confetti from "canvas-confetti";
import { Loader } from "./loader";
import { ReasoningSteps } from "./reasoning-steps";
import { Clock } from "../animate-ui/icons/clock";

/**
 * Full chat flow demo matching the Jarvis iframe UI.
 * Simulates real SSE data: send → thinking → reasoning steps → response → completion.
 */

type Phase =
	| "idle"
	| "submitted"
	| "thinking"
	| "reasoning"
	| "streaming"
	| "complete";

const REASONING_LINES = [
	"Starting agent",
	"Polling for execution status updates (execution_id: 48479a88-fe39-4d36-b274-556949ade62c)",
	"Requirements Analyst is working...",
	"Verifying if activity with same name already exists",
	"Software Developer is working...",
	"Using generate_python_code...",
	"Using validate_python_code...",
	"Using res_create_resolve_activity_basic...",
];

const RESPONSE_TEXT =
	"Activity 'MultiplyTwoNumbers' has been successfully created with ID 3261. This activity multiplies two numbers together and returns the result, handling both integer and floating-point numbers.";

function TypingDots() {
	return (
		<div className="flex items-center gap-1.5 py-1">
			{[0, 150, 300].map((delay) => (
				<span
					key={delay}
					className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
					style={{ animationDelay: `${delay}ms`, animationDuration: "1.2s" }}
				/>
			))}
		</div>
	);
}

function RotatingStatus() {
	const messages = [
		"Thinking...",
		"Analyzing your request...",
		"Working on it...",
		"Processing...",
	];
	const [index, setIndex] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setIndex((i) => (i + 1) % messages.length);
		}, 2000);
		return () => clearInterval(interval);
	}, []);

	return (
		<span
			key={index}
			className="text-xs text-muted-foreground animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
		>
			{messages[index]}
		</span>
	);
}

function ThinkingAccordion({
	content,
	isStreaming,
}: { content: string; isStreaming: boolean }) {
	const [isOpen, setIsOpen] = useState(true);
	const [userInteracted, setUserInteracted] = useState(false);

	useEffect(() => {
		if (!isStreaming && isOpen && !userInteracted) {
			const timer = setTimeout(() => setIsOpen(false), 2000);
			return () => clearTimeout(timer);
		}
	}, [isStreaming, isOpen, userInteracted]);

	return (
		<div>
			<button
				type="button"
				className="flex items-center gap-2 text-muted-foreground text-sm cursor-pointer hover:text-foreground transition-colors"
				onClick={() => { setUserInteracted(true); setIsOpen(!isOpen); }}
			>
				<Clock
					animate={isStreaming ? "default" : false}
					loop={isStreaming}
					className="size-4"
				/>
				<span>{isStreaming ? "Thinking..." : "Thought for a few seconds"}</span>
				<ChevronDown
					className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
				/>
			</button>
			{isOpen && (
				<div className="mt-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
					<ReasoningSteps content={content} isStreaming={isStreaming} />
				</div>
			)}
		</div>
	);
}

function ChatFlowDemo() {
	const [phase, setPhase] = useState<Phase>("idle");
	const [reasoningLines, setReasoningLines] = useState(0);
	const [responseChars, setResponseChars] = useState(0);
	const [inputValue, setInputValue] = useState("");
	const [userMessage, setUserMessage] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [phase, reasoningLines, responseChars, scrollToBottom]);

	useEffect(() => {
		if (phase === "submitted") {
			const timer = setTimeout(() => setPhase("thinking"), 800);
			return () => clearTimeout(timer);
		}
		if (phase === "thinking") {
			const timer = setTimeout(() => {
				setPhase("reasoning");
				setReasoningLines(1);
			}, 2000);
			return () => clearTimeout(timer);
		}
	}, [phase]);

	useEffect(() => {
		if (phase !== "reasoning") return;
		if (reasoningLines >= REASONING_LINES.length) {
			const timer = setTimeout(() => {
				setPhase("streaming");
				setResponseChars(1);
			}, 800);
			return () => clearTimeout(timer);
		}
		const timer = setTimeout(() => setReasoningLines((l) => l + 1), 1200);
		return () => clearTimeout(timer);
	}, [phase, reasoningLines]);

	// Fire confetti only on first completion
	const hasConfettied = useRef(false);
	useEffect(() => {
		if (phase === "complete" && !hasConfettied.current) {
			hasConfettied.current = true;
			confetti({
				particleCount: 80,
				spread: 60,
				origin: { y: 0.7 },
				colors: ["#22c55e", "#3b82f6", "#a855f7", "#eab308"],
			});
		}
	}, [phase]);

	useEffect(() => {
		if (phase !== "streaming") return;
		if (responseChars >= RESPONSE_TEXT.length) {
			const timer = setTimeout(() => setPhase("complete"), 500);
			return () => clearTimeout(timer);
		}
		const timer = setTimeout(
			() => setResponseChars((c) => c + Math.floor(Math.random() * 4) + 2),
			30,
		);
		return () => clearTimeout(timer);
	}, [phase, responseChars]);

	const handleSend = () => {
		if (!inputValue.trim() || phase !== "idle") return;
		setUserMessage(inputValue);
		setInputValue("");
		setPhase("submitted");
	};

	const handleReset = () => {
		setPhase("idle");
		setReasoningLines(0);
		setResponseChars(0);
		setUserMessage("");
	};

	const isProcessing = phase !== "idle" && phase !== "complete";

	const reasoningContent = REASONING_LINES.slice(0, reasoningLines).join("\n");
	const responseContent = RESPONSE_TEXT.slice(0, Math.min(responseChars, RESPONSE_TEXT.length));

	return (
		<div className="flex flex-col h-[calc(100vh-80px)] w-[672px] border rounded-lg bg-background overflow-hidden">
			{/* Chat messages area */}
			<div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
				{/* Welcome state */}
				{phase === "idle" && !userMessage && (
					<div className="flex items-center justify-center h-full">
						<p className="text-sm text-muted-foreground text-center">
							Start by just describing in detail what you want<br />the activity to do.
						</p>
					</div>
				)}

				{/* User message — right aligned */}
				{userMessage && (
					<div className="flex justify-end animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
						<div className="bg-primary text-primary-foreground rounded-3xl rounded-br-lg px-4 py-2.5 max-w-[80%]">
							<p className="text-sm">{userMessage}</p>
						</div>
					</div>
				)}

				{/* Phase: typing dots — immediate feedback after send */}
				{phase === "submitted" && (
					<div className="animate-in fade-in-0 duration-200">
						<TypingDots />
					</div>
				)}

				{/* Phase: rotating status text with loader */}
				{phase === "thinking" && (
					<div className="flex items-center gap-2 animate-in fade-in-0 duration-200">
						<Loader size={14} />
						<RotatingStatus />
					</div>
				)}

				{/* Phase: reasoning accordion */}
				{(phase === "reasoning" || phase === "streaming" || phase === "complete") && (
					<div className="animate-in fade-in-0 duration-200">
						<ThinkingAccordion
							content={reasoningContent}
							isStreaming={phase === "reasoning"}
						/>
					</div>
				)}

				{/* Phase: streaming response text */}
				{(phase === "streaming" || phase === "complete") && (
					<div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
						<p className="text-sm leading-relaxed whitespace-pre-wrap">
							{responseContent}
							{phase === "streaming" && (
								<span className="inline-block w-0.5 h-4 bg-foreground animate-pulse ml-0.5 align-middle" />
							)}
						</p>
					</div>
				)}

				{/* Phase: completion card */}
				{phase === "complete" && (
					<div className="animate-in zoom-in-95 fade-in-0 slide-in-from-bottom-2 duration-500">
						<div className="border border-green-500/20 bg-green-500/5 rounded-lg px-4 py-3 space-y-2">
							<div className="flex items-center gap-2">
								<div className="h-6 w-6 rounded-full bg-green-500/15 flex items-center justify-center">
									<Check className="h-3.5 w-3.5 text-green-500" style={{
										strokeDasharray: 20,
										strokeDashoffset: 20,
										animation: "drawCheck 0.4s ease-out 0.3s forwards",
									}} />
								</div>
								<span className="text-sm font-medium text-green-700 dark:text-green-400">
									Activity created successfully
								</span>
								<Sparkles className="h-3.5 w-3.5 text-green-500/60 animate-pulse" />
							</div>
							<div className="flex items-center gap-4 text-xs text-muted-foreground pl-8">
								<span>MultiplyTwoNumbers</span>
								<span className="text-muted-foreground/40">|</span>
								<span>ID: 3261</span>
								<span className="text-muted-foreground/40">|</span>
								<span>8 steps completed</span>
							</div>
						</div>
						<style>{`
							@keyframes drawCheck {
								to { stroke-dashoffset: 0; }
							}
						`}</style>
					</div>
				)}

				<div ref={messagesEndRef} />
			</div>

			{/* Input area — matches real PromptInput style */}
			<div className="border-t">
				<div className="relative">
					<textarea
						className="w-full resize-none bg-transparent px-4 pt-3 pb-10 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50 min-h-[80px]"
						placeholder="Enter a description of what the activity should do."
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								handleSend();
							}
						}}
						disabled={isProcessing}
						rows={2}
					/>
					{/* Toolbar row */}
					<div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
						<div className="flex items-center gap-1">
							{/* Clear chat button */}
							<button
								type="button"
								className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent cursor-pointer"
								onClick={handleReset}
								title="Clear chat"
							>
								<Trash2 className="h-4 w-4" />
							</button>
						</div>
						<div>
							{isProcessing ? (
								<button
									type="button"
									className="h-8 w-8 flex items-center justify-center rounded-lg bg-destructive text-destructive-foreground cursor-pointer"
									title="Stop"
								>
									<SquareIcon className="h-3.5 w-3.5" fill="currentColor" />
								</button>
							) : (
								<button
									type="button"
									className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-primary-foreground cursor-pointer disabled:opacity-30"
									onClick={handleSend}
									disabled={!inputValue.trim()}
									title="Send"
								>
									<SendIcon className="h-4 w-4" />
								</button>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

const meta: Meta = {
	title: "Rita/Chat Flow Demo",
	parameters: { layout: "centered" },
};

export default meta;

export const FullFlow: StoryObj = {
	render: () => <ChatFlowDemo />,
};
