/**
 * Structured step renderer for reasoning/thinking content.
 *
 * Supports two modes:
 * 1. **Plain text** — `content` string split by newlines, classified by keywords (backward compatible)
 * 2. **Explicit steps** — `steps` array with icon/color specified by the API
 *
 * @view ReasoningSteps
 *
 * ## API-Specified Icons (Optional)
 *
 * Actions Platform can control icons and indicator colors per step by sending
 * `reasoning.steps` instead of (or alongside) `reasoning.content`:
 *
 * ```json
 * { "reasoning": { "content": "Starting agent", "icon": "bot", "color": "green" } }
 * ```
 *
 * ### Available icons
 * bot, search, code, zap, workflow, shield, database, globe, file, settings, alert, clock
 *
 * ### Available indicator colors
 * primary (blue), green, amber, red, purple
 *
 * ### Fallback
 * Without icon/color fields, keywords in text determine the icon (backward compatible):
 * - "is working", "analyst", "developer" → bot
 * - "verifying", "checking", "searching" → search
 * - "generate", "code", "build" → code
 * - "starting", "running", "trigger" → zap
 * - "polling", "execution status" → workflow
 */
"use client";

import { cn } from "@/lib/utils";
import {
	AlertTriangle,
	Bot,
	Clock,
	Code,
	Database,
	FileText,
	Globe,
	Loader2,
	Search,
	Settings,
	Shield,
	Workflow,
	Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { memo, useMemo } from "react";

interface ReasoningStepsProps {
	content: string;
	isStreaming: boolean;
	className?: string;
}

type StepType = "agent" | "poll" | "verify" | "code" | "action" | "generic";
type IconName = "bot" | "search" | "code" | "zap" | "workflow" | "shield" | "database" | "globe" | "file" | "settings" | "alert" | "clock";
type IndicatorColor = "primary" | "green" | "amber" | "red" | "purple";

interface ParsedStep {
	text: string;
	type: StepType;
	icon?: IconName;
	color?: IndicatorColor;
	count: number;
}

// All available icons Actions Platform can request by name
const namedIcons: Record<IconName, LucideIcon> = {
	bot: Bot,
	search: Search,
	code: Code,
	zap: Zap,
	workflow: Workflow,
	shield: Shield,
	database: Database,
	globe: Globe,
	file: FileText,
	settings: Settings,
	alert: AlertTriangle,
	clock: Clock,
};

// Default icons from keyword classification
const stepIcons: Record<StepType, LucideIcon> = {
	agent: Bot,
	poll: Workflow,
	verify: Search,
	code: Code,
	action: Zap,
	generic: Zap,
};

// Indicator colors for the active step
const indicatorColors: Record<IndicatorColor, { dot: string; text: string }> = {
	primary: { dot: "text-primary", text: "text-primary" },
	green: { dot: "text-green-500", text: "text-green-600 dark:text-green-400" },
	amber: { dot: "text-amber-500", text: "text-amber-600 dark:text-amber-400" },
	red: { dot: "text-red-500", text: "text-red-600 dark:text-red-400" },
	purple: { dot: "text-purple-500", text: "text-purple-600 dark:text-purple-400" },
};

/**
 * Parses reasoning content text into structured steps.
 * Supports inline directives: [icon:bot] or [icon:code,color:green] at start of line.
 * Deduplicates repeated lines and classifies each step by type.
 */
function parseSteps(content: string): ParsedStep[] {
	const lines = content
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);

	const steps: ParsedStep[] = [];

	for (const line of lines) {
		const { text, icon, color } = parseDirectives(line);

		// Deduplicate: if same text as last step, increment count
		const last = steps[steps.length - 1];
		if (last && last.text === text) {
			last.count++;
			continue;
		}

		steps.push({
			text,
			type: classifyStep(text),
			icon,
			color,
			count: 1,
		});
	}

	return steps;
}

/**
 * Parse optional inline directives from step text.
 * Format: [icon:name] or [icon:name,color:value] at start of line.
 * Returns clean text without the directive prefix.
 */
function parseDirectives(line: string): { text: string; icon?: IconName; color?: IndicatorColor } {
	const match = line.match(/^\[([^\]]+)\]\s*(.*)/);
	if (!match) return { text: line };

	const directives = match[1];
	const text = match[2] || line;

	let icon: IconName | undefined;
	let color: IndicatorColor | undefined;

	for (const part of directives.split(",")) {
		const [key, value] = part.split(":").map((s) => s.trim());
		if (key === "icon" && value in namedIcons) {
			icon = value as IconName;
		}
		if (key === "color" && value in indicatorColors) {
			color = value as IndicatorColor;
		}
	}

	return { text, icon, color };
}

function classifyStep(text: string): StepType {
	const lower = text.toLowerCase();
	if (/is working|analyst|developer|architect|agent/.test(lower)) return "agent";
	if (/polling|execution.?status|waiting/.test(lower)) return "poll";
	if (/verifying|checking|validating|searching/.test(lower)) return "verify";
	if (/generate|code|compil|build/.test(lower)) return "code";
	if (/starting|running|execut|trigger/.test(lower)) return "action";
	return "generic";
}

/**
 * Cleans technical details from step text for display.
 */
function cleanStepText(text: string): { display: string; full: string } {
	const uuidPattern =
		/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
	const hasUuid = uuidPattern.test(text);

	if (!hasUuid) return { display: text, full: text };

	const display = text
		.replace(/\([^)]*[0-9a-f]{8}-[0-9a-f]{4}[^)]*\)/gi, "")
		.trim();

	return { display: display || text, full: text };
}

/**
 * Structured step renderer for reasoning/thinking workflow progress.
 * Supports API-specified icons/colors via inline directives or keyword fallback.
 */
export const ReasoningSteps = memo(
	({ content, isStreaming, className }: ReasoningStepsProps) => {
		const steps = useMemo(() => parseSteps(content), [content]);

		if (steps.length === 0) return null;

		return (
			<div className={cn("space-y-1", className)}>
				{steps.map((step, i) => {
					const isLast = i === steps.length - 1;
					const isActive = isLast && isStreaming;
					const { display, full } = cleanStepText(step.text);

					// Resolve icon: explicit > keyword classification
					const Icon = step.icon
						? namedIcons[step.icon]
						: stepIcons[step.type];

					// Resolve color for active step
					const colorConfig = step.color
						? indicatorColors[step.color]
						: indicatorColors.primary;

					return (
						<div
							key={`step-${i}`}
							className={cn(
								"flex items-start gap-2 py-1 text-sm transition-opacity duration-300",
								isActive ? "text-foreground" : "text-muted-foreground",
								"animate-in fade-in-0 duration-300",
							)}
							style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
						>
							{/* Step indicator: spinner for active, icon only if explicitly set */}
							<div className="mt-0.5 shrink-0">
								{isActive ? (
									<Loader2
										role="status"
										aria-label="Processing step"
										className={cn(
											"h-3.5 w-3.5 animate-spin",
											colorConfig.dot,
										)}
									/>
								) : step.icon ? (
									<Icon
										aria-hidden="true"
										className="h-3.5 w-3.5 text-muted-foreground/50"
									/>
								) : (
									null
								)}
							</div>

							{/* Step text */}
							<span
								className={cn(
									"flex-1 leading-snug",
									isActive && "font-medium",
								)}
								title={full !== display ? full : undefined}
							>
								{display}
								{step.count > 1 && (
									<span aria-label={`repeated ${step.count} times`} className="ms-1.5 inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
										x{step.count}
									</span>
								)}
							</span>

						</div>
					);
				})}
			</div>
		);
	},
);

ReasoningSteps.displayName = "ReasoningSteps";
