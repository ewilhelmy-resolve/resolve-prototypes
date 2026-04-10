import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { Loader } from "./loader";
import { Spinner } from "@/components/custom/spinner";

/**
 * Showcase of loading state options for the chat UI.
 * Compare side-by-side to pick which patterns to use where.
 */

// --- Typing Indicator (Bouncing Dots) ---

function TypingDots({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
	const dotSize = size === "sm" ? "h-1.5 w-1.5" : size === "lg" ? "h-3 w-3" : "h-2 w-2";
	const gap = size === "sm" ? "gap-1" : "gap-1.5";
	return (
		<div className={`flex items-center ${gap}`}>
			<span className={`${dotSize} rounded-full bg-muted-foreground/60 animate-bounce`} style={{ animationDelay: "0ms", animationDuration: "1.2s" }} />
			<span className={`${dotSize} rounded-full bg-muted-foreground/60 animate-bounce`} style={{ animationDelay: "150ms", animationDuration: "1.2s" }} />
			<span className={`${dotSize} rounded-full bg-muted-foreground/60 animate-bounce`} style={{ animationDelay: "300ms", animationDuration: "1.2s" }} />
		</div>
	);
}

// --- Pulsing Orb ---

function PulsingOrb({ color = "primary" }: { color?: "primary" | "green" | "amber" }) {
	const colors = {
		primary: "bg-primary/20 shadow-primary/30",
		green: "bg-green-500/20 shadow-green-500/30",
		amber: "bg-amber-500/20 shadow-amber-500/30",
	};
	const innerColors = {
		primary: "bg-primary",
		green: "bg-green-500",
		amber: "bg-amber-500",
	};
	return (
		<div className="relative flex items-center justify-center">
			<div className={`absolute h-8 w-8 rounded-full ${colors[color]} animate-ping opacity-30`} />
			<div className={`h-3 w-3 rounded-full ${innerColors[color]} animate-pulse`} />
		</div>
	);
}

// --- Rotating Status Text ---

function RotatingStatusText() {
	const messages = [
		"Thinking...",
		"Analyzing your request...",
		"Working on it...",
		"Processing...",
		"Almost there...",
		"Connecting the dots...",
		"Crunching the numbers...",
		"Building your response...",
	];
	const [index, setIndex] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setIndex((i) => (i + 1) % messages.length);
		}, 2500);
		return () => clearInterval(interval);
	}, []);

	return (
		<div className="flex items-center gap-2">
			<Loader size={14} />
			<span
				key={index}
				className="text-sm text-muted-foreground animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
			>
				{messages[index]}
			</span>
		</div>
	);
}

// --- Shimmer Skeleton ---

function ShimmerSkeleton({ lines = 3 }: { lines?: number }) {
	return (
		<div className="space-y-2.5 py-1">
			{Array.from({ length: lines }).map((_, i) => (
				<div
					key={`shimmer-${i}`}
					className="h-3.5 rounded-md bg-muted/60 relative overflow-hidden"
					style={{ width: `${85 - i * 15}%` }}
				>
					<div
						className="absolute inset-0 bg-gradient-to-r from-transparent via-background/60 to-transparent"
						style={{
							animation: "shimmer 2s infinite",
							animationDelay: `${i * 100}ms`,
						}}
					/>
				</div>
			))}
			<style>{`
				@keyframes shimmer {
					0% { transform: translateX(-100%); }
					100% { transform: translateX(100%); }
				}
			`}</style>
		</div>
	);
}

// --- Progress Bar (Indeterminate) ---

function IndeterminateProgress() {
	return (
		<div className="h-1 w-full bg-muted rounded-full overflow-hidden">
			<div
				className="h-full bg-primary rounded-full"
				style={{
					width: "30%",
					animation: "indeterminate 1.5s infinite ease-in-out",
				}}
			/>
			<style>{`
				@keyframes indeterminate {
					0% { transform: translateX(-100%); }
					100% { transform: translateX(400%); }
				}
			`}</style>
		</div>
	);
}

// --- Breathing Glow ---

function BreathingGlow() {
	return (
		<div className="flex items-center gap-2.5">
			<div
				className="h-2.5 w-2.5 rounded-full bg-primary"
				style={{ animation: "breathing 2.5s infinite ease-in-out" }}
			/>
			<span className="text-sm text-muted-foreground">Processing</span>
			<style>{`
				@keyframes breathing {
					0%, 100% { opacity: 0.3; transform: scale(0.9); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
					50% { opacity: 1; transform: scale(1.1); box-shadow: 0 0 8px 2px rgba(59, 130, 246, 0.3); }
				}
			`}</style>
		</div>
	);
}

// --- Message Bubble with Typing ---

function MessageBubbleTyping() {
	return (
		<div className="flex items-start gap-2 max-w-[280px]">
			<div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
				<span className="text-xs font-semibold text-primary">R</span>
			</div>
			<div className="bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3">
				<TypingDots />
			</div>
		</div>
	);
}

// --- Message with Shimmer Skeleton ---

function MessageBubbleSkeleton() {
	return (
		<div className="flex items-start gap-2 max-w-[380px]">
			<div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
				<span className="text-xs font-semibold text-primary">R</span>
			</div>
			<div className="bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3 flex-1">
				<ShimmerSkeleton lines={3} />
			</div>
		</div>
	);
}

// --- Success Checkmark Animation ---

function SuccessCheck() {
	return (
		<div className="flex items-center gap-2">
			<div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center animate-in zoom-in-50 duration-300">
				<svg className="h-3.5 w-3.5 text-green-500" viewBox="0 0 16 16" fill="none">
					<path
						d="M3 8.5L6.5 12L13 4"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						style={{
							strokeDasharray: 20,
							strokeDashoffset: 20,
							animation: "drawCheck 0.4s ease-out 0.2s forwards",
						}}
					/>
				</svg>
			</div>
			<span className="text-sm text-green-600 dark:text-green-400 animate-in fade-in-0 duration-500">
				Complete
			</span>
			<style>{`
				@keyframes drawCheck {
					to { stroke-dashoffset: 0; }
				}
			`}</style>
		</div>
	);
}

// --- Completion Card ---

function CompletionCard() {
	return (
		<div className="border border-green-500/20 bg-green-500/5 rounded-lg px-4 py-3 space-y-2 max-w-md animate-in zoom-in-95 fade-in-0 duration-500">
			<div className="flex items-center gap-2">
				<div className="h-6 w-6 rounded-full bg-green-500/15 flex items-center justify-center">
					<svg className="h-3.5 w-3.5 text-green-500" viewBox="0 0 16 16" fill="none">
						<path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
							style={{ strokeDasharray: 20, strokeDashoffset: 20, animation: "drawCheck 0.4s ease-out 0.2s forwards" }} />
					</svg>
				</div>
				<span className="text-sm font-medium text-green-700 dark:text-green-400">Activity created successfully</span>
			</div>
			<div className="flex items-center gap-4 text-xs text-muted-foreground pl-8">
				<span>MultiplyTwoNumbers</span>
				<span className="text-muted-foreground/40">|</span>
				<span>ID: 3261</span>
				<span className="text-muted-foreground/40">|</span>
				<span>8 steps completed</span>
			</div>
			<style>{`@keyframes drawCheck { to { stroke-dashoffset: 0; } }`}</style>
		</div>
	);
}

// --- Storybook Stories ---

const meta: Meta = {
	title: "Rita/Loading States",
	parameters: {
		layout: "padded",
	},
};

export default meta;

export const AllOptions: StoryObj = {
	render: () => (
		<div className="space-y-10 p-6 max-w-2xl">
			<div>
				<h2 className="text-lg font-semibold mb-1">Loading State Options</h2>
				<p className="text-sm text-muted-foreground mb-6">
					Compare animations side-by-side. Pick which patterns to use for each state in the chat UI.
				</p>
			</div>

			<Section title="Typing Indicators" description="Show while waiting for first response token">
				<Row label="Bouncing dots (small)"><TypingDots size="sm" /></Row>
				<Row label="Bouncing dots (medium)"><TypingDots size="md" /></Row>
				<Row label="Bouncing dots (large)"><TypingDots size="lg" /></Row>
				<Row label="Existing Loader"><Loader size={16} /></Row>
				<Row label="Existing Spinner"><Spinner /></Row>
			</Section>

			<Section title="Status Indicators" description="Background processing / workflow running">
				<Row label="Pulsing orb (primary)"><PulsingOrb color="primary" /></Row>
				<Row label="Pulsing orb (green)"><PulsingOrb color="green" /></Row>
				<Row label="Pulsing orb (amber)"><PulsingOrb color="amber" /></Row>
				<Row label="Breathing glow"><BreathingGlow /></Row>
				<Row label="Indeterminate progress"><div className="w-48"><IndeterminateProgress /></div></Row>
			</Section>

			<Section title="Status Text" description="Rotating messages during long waits">
				<Row label="Rotating status"><RotatingStatusText /></Row>
			</Section>

			<Section title="Message Placeholders" description="Before content starts streaming">
				<Row label="Bubble with typing dots"><MessageBubbleTyping /></Row>
				<Row label="Bubble with shimmer skeleton"><MessageBubbleSkeleton /></Row>
				<Row label="Shimmer skeleton (standalone)"><div className="w-64"><ShimmerSkeleton lines={4} /></div></Row>
			</Section>

			<Section title="Completion" description="When a step or workflow finishes">
				<Row label="Animated checkmark"><SuccessCheck /></Row>
				<div className="mt-2"><CompletionCard /></div>
			</Section>
		</div>
	),
};

export const TypingIndicators: StoryObj = {
	render: () => (
		<div className="space-y-6 p-6">
			<h3 className="font-semibold">Typing Indicator Variants</h3>
			<div className="space-y-4">
				<MessageBubbleTyping />
				<MessageBubbleSkeleton />
			</div>
		</div>
	),
};

export const StatusIndicators: StoryObj = {
	render: () => (
		<div className="space-y-6 p-6">
			<h3 className="font-semibold">Processing State Options</h3>
			<div className="space-y-4">
				<BreathingGlow />
				<div className="flex items-center gap-4">
					<PulsingOrb color="primary" />
					<PulsingOrb color="green" />
					<PulsingOrb color="amber" />
				</div>
				<div className="w-64"><IndeterminateProgress /></div>
				<RotatingStatusText />
			</div>
		</div>
	),
};

export const CompletionAnimations: StoryObj = {
	render: () => (
		<div className="space-y-6 p-6">
			<h3 className="font-semibold">Completion Feedback</h3>
			<SuccessCheck />
		</div>
	),
};

// --- Layout Helpers ---

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
	return (
		<div>
			<h3 className="text-sm font-semibold mb-0.5">{title}</h3>
			<p className="text-xs text-muted-foreground mb-3">{description}</p>
			<div className="space-y-3 pl-1">{children}</div>
		</div>
	);
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex items-center gap-4">
			<span className="text-xs text-muted-foreground w-48 shrink-0">{label}</span>
			{children}
		</div>
	);
}
