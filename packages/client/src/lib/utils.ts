import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Copy text to clipboard
 * @param text - Text to copy
 * @returns Promise that resolves when text is copied
 */
export async function copyToClipboard(text: string): Promise<void> {
	await navigator.clipboard.writeText(text);
}

/**
 * Convert snake_case or kebab-case tool names to Title Case for display.
 * "get_db_version" → "Get Db Version"
 * "validate-python-code" → "Validate Python Code"
 */
export function humanizeToolName(name: string): string {
	return name
		.split(/[_-]/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ");
}
