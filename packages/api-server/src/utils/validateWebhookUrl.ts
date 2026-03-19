/**
 * validateWebhookUrl.ts
 *
 * SSRF prevention for outbound HTTP requests to actionsApiBaseUrl.
 * The URL comes from Valkey (set by host app integration config) and must be
 * validated before use in axios.post() to prevent Server-Side Request Forgery.
 */

export class SsrfBlockedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SsrfBlockedError";
	}
}

/**
 * Private IP ranges blocked to prevent SSRF:
 * - 127.x.x.x  — loopback
 * - 10.x.x.x   — RFC1918 class A
 * - 172.16-31.x.x — RFC1918 class B
 * - 192.168.x.x — RFC1918 class C
 * - 169.254.x.x — link-local / AWS metadata (169.254.169.254)
 */
const BLOCKED_IP_RANGES = [
	/^127\./,
	/^10\./,
	/^172\.(1[6-9]|2\d|3[01])\./,
	/^192\.168\./,
	/^169\.254\./,
];

const BLOCKED_HOSTNAMES = new Set(["localhost", "::1", "0.0.0.0"]);

/**
 * Validates a webhook URL before use in an outbound HTTP request.
 *
 * - Rejects non-http/https protocols
 * - Rejects loopback, link-local, and RFC1918 private IP ranges
 * - Rejects "localhost" hostname
 *
 * @param raw - The URL string to validate (after trailing-slash strip)
 * @param options.skipInDev - When true, skip validation in NODE_ENV=development
 *   (preserves local dev Valkey mock which uses localhost:3001)
 * @returns The original URL string if valid
 * @throws SsrfBlockedError if the URL fails validation
 */
export function validateWebhookUrl(
	raw: string,
	options?: { skipInDev?: boolean },
): string {
	if (options?.skipInDev && process.env.NODE_ENV === "development") {
		return raw;
	}

	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		throw new SsrfBlockedError(`Invalid URL: ${raw}`);
	}

	if (!["http:", "https:"].includes(parsed.protocol)) {
		throw new SsrfBlockedError(`Blocked protocol: ${parsed.protocol}`);
	}

	// Strip IPv6 brackets for hostname comparison
	const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

	if (BLOCKED_HOSTNAMES.has(hostname)) {
		throw new SsrfBlockedError(`Blocked hostname: ${hostname}`);
	}

	if (BLOCKED_IP_RANGES.some((pattern) => pattern.test(hostname))) {
		throw new SsrfBlockedError(`Blocked private IP: ${hostname}`);
	}

	return raw;
}
