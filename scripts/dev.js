#!/usr/bin/env node
const { spawn, execSync } = require("child_process");

const isDockerRunning = () => {
	try {
		execSync("docker info", { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
};

const cleanup = () => {
	console.log("\n========== Stopping docker ==========");
	try {
		execSync("docker compose down", { stdio: "inherit" });
	} catch (e) {
		// ignore errors during cleanup
	}
	process.exit(0);
};

// Check if Docker is running
if (!isDockerRunning()) {
	console.error("\n========== Error: Docker is not running ==========");
	console.error("Please start Docker Desktop manually and try again.");
	process.exit(1);
}

// Handle exit signals
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);

// Run concurrently
const child = spawn(
	"npx",
	[
		"concurrently",
		"-n",
		"docker,api,client,mock",
		"-c",
		"gray,blue,green,yellow",
		"docker compose up",
		"npm:dev:api",
		"npm:dev:client",
		"npm:dev:mock",
	],
	{
		stdio: "inherit",
		shell: true,
	},
);

child.on("exit", (code) => {
	cleanup();
});
