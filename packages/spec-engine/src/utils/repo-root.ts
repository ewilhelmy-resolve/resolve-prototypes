import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Walk up from cwd to find the monorepo root (has pnpm-workspace.yaml).
 */
export function findRepoRoot(startDir?: string): string {
	let dir = startDir || process.cwd();

	while (dir !== path.dirname(dir)) {
		if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
			return dir;
		}
		dir = path.dirname(dir);
	}

	throw new Error(
		"Could not find monorepo root (no pnpm-workspace.yaml found)",
	);
}
