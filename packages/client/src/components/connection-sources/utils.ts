import type { IngestionRun } from "@/types/dataSource";

/** Error codes used as error_message by the platform for credential/permission failures */
export const CREDENTIAL_ERROR_CODES = [
	"authentication_failed",
	"permission_denied",
] as const;

/** Map a credential error code to its i18n key. Returns null for non-code strings. */
export function credentialErrorI18nKey(
	error: string,
): "syncError.authentication_failed" | "syncError.permission_denied" | null {
	if (error === "authentication_failed")
		return "syncError.authentication_failed";
	if (error === "permission_denied") return "syncError.permission_denied";
	return null;
}

/**
 * Check if an error string indicates a credential/permission issue.
 * Checks error code match first, then falls back to keyword matching (backward compat).
 */
export function isCredentialError(error: string | null | undefined): boolean {
	if (!error) return false;

	// Check as structured error code
	if ((CREDENTIAL_ERROR_CODES as readonly string[]).includes(error)) {
		return true;
	}

	// Fall back to keyword matching (backward compat)
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
 * Delegates to isCredentialError on the run's error_message.
 */
export function isCredentialIngestionError(
	run: IngestionRun | null | undefined,
): boolean {
	if (!run) return false;
	return isCredentialError(run.error_message);
}
