import { type LucideIcon, Network, Sparkles, Zap } from "lucide-react";
import type { TicketPriority } from "@/components/tickets/ReviewAIResponseSheet";

/**
 * AI Response type constants
 */
export const AI_RESPONSE_TYPE = {
	AUTO_RESPOND: "auto-respond",
	AUTO_POPULATE: "auto-populate",
	AUTO_RESOLVE: "auto-resolve",
} as const;

/**
 * AI Response types for ticket automation
 */
export type AIResponseType =
	(typeof AI_RESPONSE_TYPE)[keyof typeof AI_RESPONSE_TYPE];

/**
 * Configuration for each AI response type
 */
export interface AIResponseTypeConfig {
	type: AIResponseType;
	title: string;
	icon: LucideIcon;
	color: string;
	badgeClasses: string;
	comingSoon?: boolean;
}

/**
 * Centralized configuration for AI response types
 * Used by AIResponseSection and ClusterDetailOverviewTab
 */
export const AI_RESPONSE_TYPES: Record<AIResponseType, AIResponseTypeConfig> = {
	"auto-respond": {
		type: "auto-respond",
		title: "Auto-Respond",
		icon: Sparkles,
		color: "text-purple-500",
		badgeClasses: "border-purple-500 bg-purple-50 text-purple-500",
	},
	"auto-populate": {
		type: "auto-populate",
		title: "Auto-Populate",
		icon: Zap,
		color: "text-green-500",
		badgeClasses: "border-green-500 bg-green-50 text-green-500",
	},
	"auto-resolve": {
		type: "auto-resolve",
		title: "Auto-Resolve",
		icon: Network,
		color: "text-blue-500",
		badgeClasses: "border-blue-500 bg-blue-50 text-blue-500",
		comingSoon: true,
	},
};

/**
 * Get AI response type configuration by type
 */
export function getAIResponseTypeConfig(
	type: AIResponseType,
): AIResponseTypeConfig {
	return AI_RESPONSE_TYPES[type];
}

/**
 * Get all AI response types as array (useful for mapping)
 */
export function getAllAIResponseTypes(): AIResponseTypeConfig[] {
	return Object.values(AI_RESPONSE_TYPES);
}

/**
 * Get badge color classes based on ticket priority level
 *
 * @param priority - Ticket priority level
 * @returns Tailwind CSS classes for background, text, and border colors
 */
export function getPriorityColor(priority: TicketPriority): string {
	switch (priority) {
		case "critical":
			return "bg-red-50 text-red-800 border-red-400";
		case "high":
			return "bg-orange-50 text-orange-800 border-orange-400";
		case "medium":
			return "bg-yellow-50 text-yellow-800 border-yellow-400";
		case "low":
			return "bg-blue-50 text-blue-800 border-blue-400";
	}
}

/**
 * Get badge background color based on confidence score
 *
 * @param score - Confidence score (0-100)
 * @returns Tailwind CSS background color class
 */
export function getConfidenceColor(score: number): string {
	if (score >= 90) return "bg-teal-500";
	if (score >= 75) return "bg-green-500";
	if (score >= 60) return "bg-yellow-500";
	return "bg-orange-500";
}

/**
 * Get confidence level label based on score
 *
 * @param score - Confidence score (0-100)
 * @returns Human-readable confidence level
 */
export function getConfidenceLabel(score: number): string {
	if (score >= 90) return "strong";
	if (score >= 75) return "good";
	if (score >= 60) return "moderate";
	return "low";
}

/**
 * Format ticket priority for display (capitalize first letter)
 *
 * @param priority - Ticket priority level
 * @returns Formatted priority string
 */
export function formatPriority(priority: TicketPriority): string {
	return priority.charAt(0).toUpperCase() + priority.slice(1);
}
