// Skip rate limits on staging/dev (only enforce in production)
const clientUrl = process.env.CLIENT_URL || "";
const isNonProduction =
	clientUrl.includes("onboarding.resolve.io") ||
	clientUrl.includes("localhost");

// Simple in-memory rate limiter (fixed-window counter)
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

// Purge expired entries every 5 minutes to prevent unbounded growth
setInterval(
	() => {
		const now = Date.now();
		for (const [key, value] of rateLimiter) {
			if (now > value.resetAt) {
				rateLimiter.delete(key);
			}
		}
	},
	5 * 60 * 1000,
);

export function checkRateLimit(
	key: string,
	maxRequests: number,
	windowMs: number,
): boolean {
	if (isNonProduction) return true;

	const now = Date.now();
	const limit = rateLimiter.get(key);

	if (!limit || now > limit.resetAt) {
		rateLimiter.set(key, { count: 1, resetAt: now + windowMs });
		return true;
	}

	if (limit.count >= maxRequests) {
		return false;
	}

	limit.count++;
	return true;
}
