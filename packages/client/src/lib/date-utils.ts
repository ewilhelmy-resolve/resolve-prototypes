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

/**
 * Format a Date object safely, handling null/undefined
 * @param date - Date object, null, or undefined
 * @returns Formatted date string or "N/A" if invalid
 */
export function formatDateSafe(date: Date | null | undefined): string {
	if (!date) return "N/A";
	return new Intl.DateTimeFormat("en-US", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

/**
 * Format an ISO date string into a compact relative time.
 * e.g. "just now", "2m ago", "3h ago", "5d ago", "2w ago"
 */
export function formatRelativeTime(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const seconds = Math.floor(diff / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	const weeks = Math.floor(days / 7);
	return `${weeks}w ago`;
}
