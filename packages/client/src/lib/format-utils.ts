import {
	FILE_SOURCE_DISPLAY_NAMES,
	type FileSourceType,
} from "@/lib/constants";

/**
 * Format bytes to human-readable file size
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get display name for a file source
 * @param source - Database source value (e.g., "manual", "confluence")
 * @returns Display name (e.g., "Manual", "Jira Confluence") or "-" if empty
 */
export function getSourceDisplayName(
	source: string | undefined | null,
): string {
	if (!source) return "-";
	const normalizedSource = source.toLowerCase() as FileSourceType;
	return FILE_SOURCE_DISPLAY_NAMES[normalizedSource] || source;
}

/**
 * Get the database value from a source display name
 * @param displayName - Display name (e.g., "Manual", "Jira Confluence")
 * @returns Database value (e.g., "manual", "confluence")
 */
export function getSourceDatabaseValue(displayName: string): string {
	const entry = Object.entries(FILE_SOURCE_DISPLAY_NAMES).find(
		([_, name]) => name === displayName,
	);
	return entry ? entry[0] : displayName.toLowerCase();
}
