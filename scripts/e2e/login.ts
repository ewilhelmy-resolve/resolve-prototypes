/**
 * Programmatic login — gets a session cookie without browser UI.
 *
 * Flow:
 *   1. Get Keycloak access token via resource owner password grant
 *   2. Exchange token for session cookie via POST /auth/login
 *   3. Output cookie value (usable in playwright-cli)
 *
 * Usage:
 *   tsx scripts/e2e/login.ts                     # defaults: testuser / test
 *   tsx scripts/e2e/login.ts testmember test
 *   pnpm e2e:login
 *   pnpm e2e:login -- testmember test
 */

const KEYCLOAK_URL =
	process.env.KEYCLOAK_URL ||
	process.env.VITE_KEYCLOAK_URL ||
	"http://localhost:8080";
const KEYCLOAK_REALM =
	process.env.KEYCLOAK_REALM ||
	process.env.VITE_KEYCLOAK_REALM ||
	"rita-chat-realm";
const KEYCLOAK_CLIENT_ID =
	process.env.KEYCLOAK_CLIENT_ID ||
	process.env.VITE_KEYCLOAK_CLIENT_ID ||
	"rita-chat-client";
const API_URL = process.env.VITE_API_URL || "http://localhost:3000";

const username = process.argv[2] || "testuser";
const password = process.argv[3] || "test";

async function getKeycloakToken(): Promise<string> {
	const tokenUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

	const res = await fetch(tokenUrl, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "password",
			client_id: KEYCLOAK_CLIENT_ID,
			username,
			password,
		}),
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Keycloak token request failed (${res.status}): ${body}`);
	}

	const data = (await res.json()) as { access_token: string };
	return data.access_token;
}

async function getSessionCookie(accessToken: string): Promise<string> {
	const loginUrl = `${API_URL}/auth/login`;

	const res = await fetch(loginUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ accessToken }),
		redirect: "manual", // Don't follow redirects, we need the Set-Cookie header
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`API login failed (${res.status}): ${body}`);
	}

	// Extract session cookie from Set-Cookie header
	const setCookie = res.headers.get("set-cookie");
	if (!setCookie) {
		throw new Error("No Set-Cookie header in login response");
	}

	return setCookie;
}

async function main() {
	try {
		console.error(`🔑 Logging in as ${username}...`);

		const token = await getKeycloakToken();
		console.error("   ✅ Keycloak token acquired");

		const cookie = await getSessionCookie(token);
		console.error("   ✅ Session cookie received");

		// Parse cookie name and value
		const cookieParts = cookie.split(";")[0]; // "name=value"
		const [cookieName, ...cookieValueParts] = cookieParts.split("=");
		const cookieValue = cookieValueParts.join("=");

		// Output to stderr for humans, stdout for piping
		console.error(
			`\n   Cookie: ${cookieName}=${cookieValue.substring(0, 20)}...`,
		);
		console.error(`\n   To use with curl:`);
		console.error(
			`   curl -b "${cookieName}=${cookieValue}" http://localhost:3000/auth/session`,
		);
		console.error(`\n   NOTE: For browser auth, use auto-login instead:`);
		console.error(`   "$PWCLI" open "http://localhost:5173/test/auto-login"`);

		// Output full Set-Cookie to stdout (for scripting)
		console.log(cookie);
	} catch (err) {
		console.error(`❌ Login failed: ${(err as Error).message}`);
		process.exit(1);
	}
}

main();
