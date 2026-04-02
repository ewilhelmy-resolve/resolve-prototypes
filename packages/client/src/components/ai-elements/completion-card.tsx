"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Sparkles, XCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { memo, useEffect, useRef } from "react";

/**
 * Rich completion card for workflow results.
 * Driven by `metadata.completion` on the final SSE message (turn_complete: true).
 *
 * @view CompletionCard
 *
 * ## Platform Contract
 *
 * Send `metadata.completion` on the final message to render a styled result card:
 *
 * ```json
 * {
 *   "completion": {
 *     "status": "success",
 *     "title": "Activity created successfully",
 *     "details": { "name": "MyActivity", "id": "3261" }
 *   }
 * }
 * ```
 *
 * - status "success" → green card + confetti (first time only)
 * - status "error" → red card
 * - status "warning" → amber card
 * - Without this field → plain markdown (backward compatible)
 */

interface CompletionCardProps {
	status: "success" | "error" | "warning";
	title: string;
	details?: Record<string, string | number>;
	fireConfetti?: boolean;
	className?: string;
}

const statusConfig = {
	success: {
		border: "border-green-500/20",
		bg: "bg-green-500/5",
		icon: Check,
		iconBg: "bg-green-500/15",
		iconColor: "text-green-500",
		titleColor: "text-green-700 dark:text-green-400",
		sparkle: true,
	},
	error: {
		border: "border-red-500/20",
		bg: "bg-red-500/5",
		icon: XCircle,
		iconBg: "bg-red-500/15",
		iconColor: "text-red-500",
		titleColor: "text-red-700 dark:text-red-400",
		sparkle: false,
	},
	warning: {
		border: "border-amber-500/20",
		bg: "bg-amber-500/5",
		icon: AlertTriangle,
		iconBg: "bg-amber-500/15",
		iconColor: "text-amber-500",
		titleColor: "text-amber-700 dark:text-amber-400",
		sparkle: false,
	},
};

// Track confetti globally so it only fires once per session
let hasConfettiFired = false;

export const CompletionCard = memo(
	({
		status,
		title,
		details,
		fireConfetti = true,
		className,
	}: CompletionCardProps) => {
		const config = statusConfig[status];
		const Icon = config.icon;
		const confettiRef = useRef(false);

		useEffect(() => {
			if (
				status === "success" &&
				fireConfetti &&
				!hasConfettiFired &&
				!confettiRef.current
			) {
				confettiRef.current = true;
				hasConfettiFired = true;
				confetti({
					particleCount: 80,
					spread: 60,
					origin: { y: 0.7 },
					colors: ["#22c55e", "#3b82f6", "#a855f7", "#eab308"],
				});
			}
		}, [status, fireConfetti]);

		const detailEntries = details ? Object.entries(details) : [];

		return (
			<div
				className={cn(
					"border rounded-lg px-4 py-3 space-y-2 animate-in zoom-in-95 fade-in-0 duration-500",
					config.border,
					config.bg,
					className,
				)}
			>
				<div className="flex items-center gap-2">
					<div
						className={cn(
							"h-6 w-6 rounded-full flex items-center justify-center",
							config.iconBg,
						)}
					>
						<Icon className={cn("h-3.5 w-3.5", config.iconColor)} />
					</div>
					<span className={cn("text-sm font-medium", config.titleColor)}>
						{title}
					</span>
					{config.sparkle && (
						<Sparkles
							className={cn(
								"h-3.5 w-3.5 animate-pulse",
								`${config.iconColor}/60`,
							)}
						/>
					)}
				</div>
				{detailEntries.length > 0 && (
					<div className="flex items-center gap-4 text-xs text-muted-foreground ps-8 flex-wrap">
						{detailEntries.map(([key, value], i) => (
							<span key={key} className="flex items-center gap-1">
								{i > 0 && (
									<span className="text-muted-foreground/40 me-3">|</span>
								)}
								{String(value)}
							</span>
						))}
					</div>
				)}
			</div>
		);
	},
);

CompletionCard.displayName = "CompletionCard";
