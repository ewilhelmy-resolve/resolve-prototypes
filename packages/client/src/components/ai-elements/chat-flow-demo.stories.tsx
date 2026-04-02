import type { Meta, StoryObj } from "@storybook/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader } from "./loader";
import { ReasoningSteps } from "./reasoning-steps";
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from "./reasoning";
import { Check, Send } from "lucide-react";

/**
 * Full chat flow demo simulating the iframe experience.
 * Shows: send → thinking → reasoning steps → streaming response → completion.
 */

type Phase =
	| "idle"
	| "submitted"
	| "thinking"
	| "reasoning"
	| "streaming"
	| "complete";

// Real SSE reasoning steps from a Jarvis workflow execution
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

// Real SSE final message from workflow completion
const RESPONSE_TEXT =
	"Activity 'MultiplyTwoNumbers' has been successfully created with ID 3261. This activity multiplies two numbers together and returns the result, handling both integer and floating-point numbers.";

function TypingDots() {
	return (
		<div className="flex items-center gap-1.5">
			<span
				className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
				style={{ animationDelay: "0ms", animationDuration: "1.2s" }}
			/>
			<span
				className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
				style={{ animationDelay: "150ms", animationDuration: "1.2s" }}
			/>
			<span
				className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
				style={{ animationDelay: "300ms", animationDuration: "1.2s" }}
			/>
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

function ChatFlowDemo() {
	const [phase, setPhase] = useState<Phase>("idle");
	const [reasoningLines, setReasoningLines] = useState(0);
	const [responseChars, setResponseChars] = useState(0);
	const [inputValue, setInputValue] = useState("");
	const [userMessage, setUserMessage] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [phase, reasoningLines, responseChars, scrollToBottom]);

	// Phase transitions
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

	// Stream reasoning lines
	useEffect(() => {
		if (phase !== "reasoning") return;
		if (reasoningLines >= REASONING_LINES.length) {
			const timer = setTimeout(() => {
				setPhase("streaming");
				setResponseChars(1);
			}, 800);
			return () => clearTimeout(timer);
		}
		const timer = setTimeout(
			() => setReasoningLines((l) => l + 1),
			1200,
		);
		return () => clearTimeout(timer);
	}, [phase, reasoningLines]);

	// Stream response text
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

	const reasoningContent = REASONING_LINES.slice(0, reasoningLines).join("\n");
	const responseContent = RESPONSE_TEXT.slice(
		0,
		Math.min(responseChars, RESPONSE_TEXT.length),
	);

	return (
		<div className="flex flex-col h-[600px] w-full max-w-2xl border rounded-lg bg-background overflow-hidden">
			{/* Header */}
			<div className="px-4 py-3 border-b bg-[#2d3748] text-white flex justify-between items-center">
				<span className="font-semibold text-sm">Jarvis</span>
				<span className="text-xs bg-white/20 px-2 py-0.5 rounded">Demo</span>
			</div>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				<p className="text-center text-xs text-muted-foreground">
					Beginning of conversation
				</p>

				{/* User message */}
				{userMessage && (
					<div className="flex justify-end animate-in fade-in-0 slide-in-from-right-2 duration-300">
						<div className="bg-muted rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
							<p className="text-sm">{userMessage}</p>
						</div>
					</div>
				)}

				{/* Thinking indicator (before any response) */}
				{phase === "submitted" && (
					<div className="flex items-start gap-2 animate-in fade-in-0 duration-300">
						<div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
							<span className="text-xs font-semibold text-primary">R</span>
						</div>
						<div className="bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3">
							<TypingDots />
						</div>
					</div>
				)}

				{/* Waiting with rotating status */}
				{phase === "thinking" && (
					<div className="flex items-start gap-2 animate-in fade-in-0 duration-300">
						<div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
							<span className="text-xs font-semibold text-primary">R</span>
						</div>
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<Loader size={14} />
								<RotatingStatus />
							</div>
						</div>
					</div>
				)}

				{/* Reasoning accordion with steps */}
				{(phase === "reasoning" ||
					phase === "streaming" ||
					phase === "complete") && (
					<div className="animate-in fade-in-0 duration-300">
						<Reasoning
							isStreaming={phase === "reasoning"}
							defaultOpen={true}
						>
							<ReasoningTrigger />
							<ReasoningContent>
								{reasoningContent}
							</ReasoningContent>
						</Reasoning>
					</div>
				)}

				{/* Streaming response */}
				{(phase === "streaming" || phase === "complete") && (
					<div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
						<div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap">
							{responseContent}
							{phase === "streaming" && (
								<span className="inline-block w-0.5 h-4 bg-foreground animate-pulse ml-0.5 align-middle" />
							)}
						</div>
					</div>
				)}

				{/* Completion */}
				{phase === "complete" && (
					<div className="flex items-center gap-2 animate-in zoom-in-50 fade-in-0 duration-500">
						<div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center">
							<Check className="h-3 w-3 text-green-500" />
						</div>
						<span className="text-xs text-green-600 dark:text-green-400">
							Workflow complete
						</span>
					</div>
				)}

				<div ref={messagesEndRef} />
			</div>

			{/* Input */}
			<div className="border-t p-3">
				<div className="flex items-center gap-2">
					<input
						type="text"
						className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
						placeholder="Enter a description of what the activity should do."
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSend()}
						disabled={phase !== "idle"}
					/>
					{phase === "idle" ? (
						<button
							type="button"
							className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 disabled:opacity-50"
							onClick={handleSend}
							disabled={!inputValue.trim()}
						>
							<Send className="h-4 w-4" />
						</button>
					) : phase === "complete" ? (
						<button
							type="button"
							className="px-3 py-1.5 rounded-lg bg-muted text-sm cursor-pointer hover:bg-muted/80"
							onClick={handleReset}
						>
							Reset
						</button>
					) : null}
				</div>
			</div>
		</div>
	);
}

const meta: Meta = {
	title: "Rita/Chat Flow Demo",
	parameters: {
		layout: "centered",
	},
};

export default meta;

export const FullFlow: StoryObj = {
	render: () => <ChatFlowDemo />,
};
