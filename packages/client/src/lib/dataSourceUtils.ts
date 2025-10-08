/**
 * Utility functions for data source operations
 */

/**
 * Parse comma-separated string into array of trimmed strings
 * @param value - String or array value from backend
 * @returns Array of trimmed non-empty strings
 */
export function parseCommaSeparatedString(
	value: string | string[] | undefined | null,
): string[] {
	if (!value) return [];

	if (Array.isArray(value)) {
		return value.filter(Boolean);
	}

	if (typeof value === "string") {
		return value
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
	}

	return [];
}

/**
 * Parse spaces from latest_options for multiselect options
 * @param latestOptions - Backend latest_options object
 * @returns Array of space strings
 */
export function parseAvailableSpaces(
	latestOptions: Record<string, string> | null | undefined,
): string[] {
	return parseCommaSeparatedString(latestOptions?.spaces);
}

/**
 * Parse spaces from settings for selected/configured values
 * @param settings - Backend settings object
 * @returns Array of space strings
 */
export function parseSelectedSpaces(
	settings: Record<string, any> | undefined,
): string[] {
	return parseCommaSeparatedString(settings?.spaces);
}
