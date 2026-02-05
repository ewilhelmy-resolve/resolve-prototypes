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

let isCleaningUp = false;

const cleanup = () => {
	if (isCleaningUp) return;
	isCleaningUp = true;
	console.log("\n========== Stopping docker ==========");
	try {
		execSync("docker compose down", { stdio: "inherit" });
	} catch {
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

// Handle exit signals (SIGINT works on both Windows and Unix)
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

// Run concurrently
// Use escaped quotes for cross-platform compatibility
const dockerCmd = process.platform === "win32"
	? '\\"docker compose up\\"'
	: '"docker compose up"';

const child = spawn(
	"npx",
	[
		"concurrently",
		"-n",
		"docker,api,client,mock",
		"-c",
		"gray,blue,green,yellow",
		dockerCmd,
		"pnpm:dev:api",
		"pnpm:dev:client",
		"pnpm:dev:mock",
	],
	{
		stdio: "inherit",
		shell: true,
	},
);

child.on("exit", () => {
	cleanup();
});
