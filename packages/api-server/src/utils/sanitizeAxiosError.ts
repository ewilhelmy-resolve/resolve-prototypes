/**
 * Strip sensitive headers (X-API-Key, X-DB-Tenant, Authorization) from axios
 * errors before they're handed to a logger or printed to stdout.
 *
 * Axios attaches the outgoing request config (including headers) to every
 * error it throws, and both Node's error printer and pino's default object
 * serializer walk that config tree — so a transient 5xx from an upstream
 * service would otherwise leak credentials into logs / terminal output.
 *
 * The returned value is a plain object summary suitable for logging. The
 * original error is NOT mutated — callers that need to branch on
 * `error.response.status` (or anything else) must keep using the raw error.
 */

const SENSITIVE_HEADERS = new Set([
	"x-api-key",
	"x-db-tenant",
	"authorization",
]);

function redactHeaders(headers: unknown): unknown {
	if (!headers || typeof headers !== "object") return headers;
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(headers as Record<string, unknown>)) {
		out[k] = SENSITIVE_HEADERS.has(k.toLowerCase()) ? "[REDACTED]" : v;
	}
	return out;
}

export function sanitizeAxiosError(err: unknown): unknown {
	if (!err || typeof err !== "object") return err;
	const e = err as {
		isAxiosError?: boolean;
		name?: string;
		message?: string;
		code?: string;
		stack?: string;
		config?: {
			url?: string;
			method?: string;
			baseURL?: string;
			headers?: unknown;
		};
		response?: { status?: number; statusText?: string; data?: unknown };
	};
	if (!e.isAxiosError && !e.config && !e.response) return err;
	return {
		name: e.name,
		message: e.message,
		code: e.code,
		status: e.response?.status,
		statusText: e.response?.statusText,
		method: e.config?.method,
		url: e.config?.url,
		baseURL: e.config?.baseURL,
		requestHeaders: redactHeaders(e.config?.headers),
		responseData: e.response?.data,
		stack: e.stack,
	};
}
