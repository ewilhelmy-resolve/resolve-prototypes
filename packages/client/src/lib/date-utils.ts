/**
 * Format date to relative time
 * @param date - Date to format
 * @returns Relative time string (e.g., "Just now", "2 min ago", "Yesterday", "Mon", "Jan 5")
 */
export function formatTime(date: Date): string {
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (seconds < 60) {
		return "Just now";
	} else if (minutes < 60) {
		return `${minutes} min ago`;
	} else if (hours < 24) {
		return `${hours}h ago`;
	} else if (days === 1) {
		return "Yesterday";
	} else if (days < 7) {
		return date.toLocaleDateString([], { weekday: "short" });
	} else {
		return date.toLocaleDateString([], { month: "short", day: "numeric" });
	}
}

/**
 * Format date to absolute time with date
 * @param date - Date to format
 * @returns Absolute time string (e.g., "Jan 5, 2025, 10:30 AM")
 */
export function formatAbsoluteTime(date: Date): string {
	return date.toLocaleString([], {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

/**
 * Format date string to display format (existing utility, kept for compatibility)
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString("en-US", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}
