/**
 * Host Origin Store
 *
 * Stores the trusted parent origin from the Valkey payload (via API response).
 * Used as targetOrigin for all outbound postMessage calls to prevent
 * leaking sensitive data (sessionKey, form data, etc.) to untrusted origins.
 *
 * If parentOrigin is not configured in Valkey, outbound postMessages are blocked.
 * In dev mode, falls back to "*" for cross-port testing.
 */

let trustedOrigin: string | null = null;

/**
 * Store the trusted host origin from the Valkey payload (via API response).
 */
export function setHostOrigin(origin: string): void {
	if (origin && origin !== "null") {
		trustedOrigin = origin;
	}
}

/**
 * Get the trusted host origin for use as postMessage targetOrigin.
 * Returns null if no trusted origin is configured (blocks outbound messages).
 * In dev mode, falls back to "*" for cross-port testing.
 */
export function getHostOrigin(): string | null {
	if (trustedOrigin) return trustedOrigin;
	if (import.meta.env.DEV) return "*";
	return null;
}

/**
 * Reset stored origin (for testing)
 */
export function resetHostOrigin(): void {
	trustedOrigin = null;
}
