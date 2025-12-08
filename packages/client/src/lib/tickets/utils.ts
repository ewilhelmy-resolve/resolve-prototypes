import type { TicketPriority } from "@/components/tickets/ReviewAIResponseSheet";

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
