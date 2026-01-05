#!/usr/bin/env node
const { execSync } = require("child_process");

const isDockerRunning = () => {
	try {
		execSync("docker info", { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
};

const run = (cmd, description) => {
	console.log(`\n========== ${description} ==========`);
	execSync(cmd, { stdio: "inherit" });
};

// Check if Docker is running first
if (!isDockerRunning()) {
	console.error("\n========== Error: Docker is not running ==========");
	console.error("Please start Docker Desktop manually and try again.");
	process.exit(1);
}

try {
	run("pnpm install", "Installing dependencies");
	run("docker compose up -d", "Starting docker");
	run(
		"docker compose exec postgres pg_isready -U rita -d onboarding --timeout=60",
		"Waiting for postgres",
	);
	run("pnpm run migrate", "Running migrations");
	console.log("\n========== Setup complete ==========");
	console.log("Run 'pnpm run dev' to start development servers.\n");
} catch {
	console.error("\n========== Setup failed ==========");
	process.exit(1);
}
