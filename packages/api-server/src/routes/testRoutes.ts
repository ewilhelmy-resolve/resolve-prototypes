/**
 * Test-only routes for e2e validation.
 *
 * ONLY registered when NODE_ENV is 'development' or 'test'.
 * Never available in production.
 *
 * Provides:
 *   GET    /test/auto-login     — one-step browser login (sets cookie + redirects)
 *   POST   /test/feature-flags  — set feature flag overrides
 *   DELETE /test/feature-flags  — clear all overrides
 *   GET    /test/feature-flags  — get current overrides
 */

import express from "express";
import { logger } from "../config/logger.js";
import {
	clearTestFlagOverrides,
	getTestFlagOverrides,
	setTestFlagOverrides,
} from "../services/FeatureFlagService.js";

const router = express.Router();

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || "http://localhost:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "rita-chat-realm";
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || "rita-chat-client";

/**
 * GET /test/auto-login
 * One-step browser login for playwright-cli / e2e validation.
 *
 * Serves an HTML page that:
 * 1. Sets localStorage feature flags (if requested)
 * 2. Stores desired redirect in sessionStorage
 * 3. Redirects browser to Keycloak auth URL
 *
 * Keycloak shows its login form → agent fills username/password (3 commands)
 * → Keycloak redirects to /test/auto-login-complete → redirects to final page.
 *
 * Usage:
 *   /test/auto-login
 *   /test/auto-login?redirect=/settings/connections/itsm
 *   /test/auto-login?flags=ENABLE_SERVICENOW,ENABLE_JIRA&redirect=/settings/connections/itsm
 */
router.get("/auto-login", (req, res) => {
	const redirect = (req.query.redirect as string) || "/chat";
	const flagsParam = req.query.flags as string | undefined;

	// Build Keycloak auth URL
	// Derive origin from the request so it works through the Vite proxy
	const origin = `${req.protocol}://${req.get("host")}`;
	const redirectUri = `${origin}/test/auto-login-complete?redirect=${encodeURIComponent(redirect)}`;
	const authUrl =
		`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth` +
		`?client_id=${KEYCLOAK_CLIENT_ID}` +
		`&redirect_uri=${encodeURIComponent(redirectUri)}` +
		`&response_mode=query&response_type=code&scope=openid` +
		`&state=test-state&nonce=test-nonce`;

	// Build localStorage flags script
	const flagsScript = flagsParam
		? `const existing = JSON.parse(localStorage.getItem('rita_feature_flags') || '{}');
	const newFlags = ${JSON.stringify(
		flagsParam.split(",").reduce(
			(acc, flag) => {
				acc[flag.trim()] = true;
				return acc;
			},
			{} as Record<string, boolean>,
		),
	)};
	localStorage.setItem('rita_feature_flags', JSON.stringify({...existing, ...newFlags}));`
		: "";

	// Serve HTML: set flags in localStorage, then redirect to Keycloak
	res.setHeader("Content-Type", "text/html");
	res.send(`<!DOCTYPE html>
<html><head><title>Auto-login setup...</title></head>
<body>
<p>Setting up test session...</p>
<script>
  ${flagsScript}
  window.location.href = '${authUrl}';
</script>
</body></html>`);
});

/**
 * GET /test/auto-login-complete
 * Landing page after Keycloak login redirect.
 * Keycloak SSO cookies are now set in the browser.
 * Redirects to the final destination where keycloak-js will detect the session.
 */
router.get("/auto-login-complete", (req, res) => {
	const redirect = (req.query.redirect as string) || "/chat";

	// Keycloak SSO cookies are set — redirect to the client app.
	// keycloak-js check-sso will detect the active session and authenticate.
	res.redirect(redirect);
});

/**
 * POST /test/feature-flags
 * Set feature flag overrides for testing.
 *
 * Body: { flags: { "auto-pilot": true, "iframe-dev-tools": false } }
 *
 * Uses platform flag names (not client names).
 */
router.post("/feature-flags", (req, res) => {
	const { flags } = req.body;

	if (!flags || typeof flags !== "object") {
		return res.status(400).json({ error: "flags object required" });
	}

	setTestFlagOverrides(flags);

	logger.info({ flags }, "Test feature flag overrides set");

	res.json({
		success: true,
		overrides: getTestFlagOverrides(),
	});
});

/**
 * GET /test/feature-flags
 * Get current feature flag overrides.
 */
router.get("/feature-flags", (_req, res) => {
	res.json({ overrides: getTestFlagOverrides() });
});

/**
 * DELETE /test/feature-flags
 * Clear all feature flag overrides.
 */
router.delete("/feature-flags", (_req, res) => {
	clearTestFlagOverrides();

	logger.info("Test feature flag overrides cleared");

	res.json({ success: true, overrides: {} });
});

export default router;
