#!/usr/bin/env node

/**
 * Reset Keycloak to re-import realm-export.json with deterministic user IDs.
 *
 * Steps:
 *   1. Stop and remove Keycloak container
 *   2. Remove Keycloak data volume
 *   3. Start Keycloak (re-imports realm on startup)
 *
 * Usage: pnpm e2e:reset-keycloak
 */

import { execSync } from "node:child_process";

const run = (cmd) => {
	console.log(`$ ${cmd}`);
	execSync(cmd, { stdio: "inherit" });
};

try {
	console.log("🔄 Resetting Keycloak...\n");

	// Get the actual volume name from docker compose
	const volumeName = execSync("docker compose config --format json", {
		encoding: "utf8",
	});
	const config = JSON.parse(volumeName);
	const kcVolume = config.volumes?.keycloak_data?.name;

	if (!kcVolume) {
		console.error(
			"❌ Could not find keycloak_data volume name in docker-compose config",
		);
		process.exit(1);
	}

	run("docker compose stop keycloak");
	run("docker compose rm -f keycloak");
	try {
		run(`docker volume rm ${kcVolume}`);
	} catch {
		console.log("   (volume already removed or doesn't exist — ok)");
	}
	run("docker compose up -d keycloak");

	console.log("\n✅ Keycloak reset complete. Waiting for startup (~30s)...");
	console.log("   Users: testuser/test (owner), testmember/test (member)");
	console.log("   Fixed IDs: aaaaaaaa-..., bbbbbbbb-...");
} catch (err) {
	console.error("❌ Keycloak reset failed:", err.message);
	process.exit(1);
}
