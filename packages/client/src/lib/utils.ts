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
 * Words that already contain uppercase letters are preserved (acronyms, camelCase).
 * "get_db_version" → "Get Db Version"
 * "IT_MSteams_reset_plugin" → "IT MSteams Reset Plugin"
 */
export function humanizeToolName(name: string): string {
	return name
		.split(/[_-]/)
		.map((word) => {
			if (/[A-Z]/.test(word)) return word;
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		})
		.join(" ");
}
