import type { IngestionRun } from "@/types/dataSource";

/**
 * Check if an error message string indicates a credential/permission issue
 */
export function isCredentialError(error: string | null | undefined): boolean {
	if (!error) return false;
	const lower = error.toLowerCase();
	return (
		lower.includes("authentication") ||
		lower.includes("permission") ||
		lower.includes("unauthorized") ||
		lower.includes("access denied")
	);
}

/**
 * Check if an ingestion run failed due to credential/permission issues.
 * Checks error_code in metadata first, then falls back to string matching.
 */
export function isCredentialIngestionError(
	run: IngestionRun | null | undefined,
): boolean {
	if (!run) return false;

	// Check structured error_code from metadata.error_detail
	const errorCode = run.metadata?.error_detail?.error_code;
	if (
		errorCode === "authentication_failed" ||
		errorCode === "permission_denied"
	) {
		return true;
	}

	// Fall back to string matching on error_message
	return isCredentialError(run.error_message);
}
