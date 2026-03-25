/**
 * Set feature flag overrides via the test API.
 *
 * Usage:
 *   tsx scripts/e2e/set-flags.ts auto-pilot=true iframe-dev-tools=false
 *   tsx scripts/e2e/set-flags.ts --clear
 *   tsx scripts/e2e/set-flags.ts --show
 *
 * Uses platform flag names (auto-pilot, not ENABLE_AUTO_PILOT).
 */

const API_URL = process.env.VITE_API_URL || "http://localhost:3000";
const args = process.argv.slice(2);

async function main() {
	if (args.length === 0 || args.includes("--help")) {
		console.log("Usage:");
		console.log(
			"  tsx scripts/e2e/set-flags.ts auto-pilot=true iframe-dev-tools=false",
		);
		console.log("  tsx scripts/e2e/set-flags.ts --clear");
		console.log("  tsx scripts/e2e/set-flags.ts --show");
		console.log("\nAvailable flags (platform names):");
		console.log(
			"  auto-pilot, auto-pilot-suggestions, auto-pilot-actions, iframe-dev-tools",
		);
		process.exit(0);
	}

	if (args.includes("--clear")) {
		const res = await fetch(`${API_URL}/test/feature-flags`, {
			method: "DELETE",
		});
		const data = await res.json();
		console.log("✅ Flag overrides cleared:", data);
		return;
	}

	if (args.includes("--show")) {
		const res = await fetch(`${API_URL}/test/feature-flags`);
		const data = await res.json();
		console.log("Current flag overrides:", data);
		return;
	}

	// Parse flag=value pairs
	const flags: Record<string, boolean> = {};
	for (const arg of args) {
		const [name, value] = arg.split("=");
		if (!name || value === undefined) {
			console.error(
				`❌ Invalid flag format: ${arg}. Expected: name=true|false`,
			);
			process.exit(1);
		}
		flags[name] = value === "true" || value === "1";
	}

	const res = await fetch(`${API_URL}/test/feature-flags`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ flags }),
	});

	if (!res.ok) {
		const body = await res.text();
		console.error(`❌ Failed (${res.status}): ${body}`);
		process.exit(1);
	}

	const data = await res.json();
	console.log("✅ Flag overrides set:", data);
}

main().catch((err) => {
	console.error(`❌ ${err.message}`);
	process.exit(1);
});
