/**
 * Structured step renderer for reasoning/thinking content.
 *
 * Parses newline-separated reasoning text into discrete visual steps with:
 * - Icon per step type (agent, verify, code, action, poll)
 * - Active step spinner on the last line while streaming
 * - Deduplication of repeated consecutive lines (×N badge)
 * - UUID/execution_id hiding (full text on hover)
 * - Fade-in animation on each new step
 *
 * @view ReasoningSteps
 * @constraint Input must be newline-separated step text from merged reasoning messages
 *
 * ## Step Classification Rules
 *
 * The component classifies each line by matching text patterns:
 *
 * - **agent**: "is working", "analyst", "developer", "architect", "agent"
 * - **poll**: "polling", "execution status", "waiting"
 * - **verify**: "verifying", "checking", "validating", "searching"
 * - **code**: "generate", "code", "compil", "build"
 * - **action**: "starting", "running", "execut", "trigger"
 * - **generic**: everything else
 *
 * Platform developers can control which icon appears by using these
 * keywords in their step messages.
 */
"use client";

import { cn } from "@/lib/utils";
import {
	Bot,
	Check,
	Code,
	Loader2,
	Search,
	Workflow,
	Zap,
} from "lucide-react";
import { memo, useMemo } from "react";

interface ReasoningStepsProps {
	content: string;
	isStreaming: boolean;
	className?: string;
}

interface ParsedStep {
	text: string;
	type: "agent" | "poll" | "verify" | "code" | "action" | "generic";
	count: number;
}

/**
 * Parses reasoning content text into structured steps.
 * Deduplicates repeated lines and classifies each step by type.
 */
function parseSteps(content: string): ParsedStep[] {
	const lines = content
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);

	const steps: ParsedStep[] = [];

	for (const line of lines) {
		// Deduplicate: if same as last step, increment count
		const last = steps[steps.length - 1];
		if (last && last.text === line) {
			last.count++;
			continue;
		}

		steps.push({
			text: line,
			type: classifyStep(line),
			count: 1,
		});
	}

	return steps;
}

function classifyStep(text: string): ParsedStep["type"] {
	const lower = text.toLowerCase();
	if (/is working|analyst|developer|architect|agent/.test(lower))
		return "agent";
	if (/polling|execution.?status|waiting/.test(lower)) return "poll";
	if (/verifying|checking|validating|searching/.test(lower)) return "verify";
	if (/generate|code|compil|build/.test(lower)) return "code";
	if (/starting|running|execut|trigger/.test(lower)) return "action";
	return "generic";
}

const stepIcons: Record<ParsedStep["type"], typeof Bot> = {
	agent: Bot,
	poll: Workflow,
	verify: Search,
	code: Code,
	action: Zap,
	generic: Zap,
};

/**
 * Cleans technical details from step text for display.
 * Hides UUIDs/execution IDs but keeps them accessible on hover.
 */
function cleanStepText(text: string): { display: string; full: string } {
	const uuidPattern =
		/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
	const hasUuid = uuidPattern.test(text);

	if (!hasUuid) return { display: text, full: text };

	const display = text.replace(
		/\([^)]*[0-9a-f]{8}-[0-9a-f]{4}[^)]*\)/gi,
		"",
	).trim();

	return { display: display || text, full: text };
}

/**
 * Structured step renderer for reasoning/thinking workflow progress.
 * Parses newline-separated text into steps with typed icons, dedup badges, and UUID hiding.
 * Used by ReasoningContent when content has multiple lines.
 * Platform controls icon selection via keywords in step text (see file-level JSDoc).
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
					const Icon = stepIcons[step.type];
					const { display, full } = cleanStepText(step.text);

					return (
						<div
							key={`${i}-${step.text.slice(0, 20)}`}
							className={cn(
								"flex items-start gap-2 py-1 text-sm transition-opacity duration-300",
								isActive
									? "text-foreground"
									: "text-muted-foreground",
								// Fade-in for new steps
								"animate-in fade-in-0 duration-300",
							)}
							style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
						>
							{/* Step icon */}
							<div className="mt-0.5 shrink-0">
								{isActive ? (
									<Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
								) : (
									<Icon
										className={cn(
											"h-3.5 w-3.5",
											isActive
												? "text-primary"
												: "text-muted-foreground/50",
										)}
									/>
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
									<span className="ms-1.5 inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
										x{step.count}
									</span>
								)}
							</span>

							{/* Completed checkmark for non-active steps */}
							{!isActive && !isStreaming && (
								<Check className="h-3 w-3 text-muted-foreground/30 shrink-0 mt-0.5" />
							)}
						</div>
					);
				})}
			</div>
		);
	},
);

ReasoningSteps.displayName = "ReasoningSteps";
