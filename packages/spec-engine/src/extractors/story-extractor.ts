import { readFileSync } from "node:fs";
import path from "node:path";
import { glob } from "glob";
import type { View } from "../types/avcj.js";

export interface StoryData {
	views: Partial<View>[];
}

export async function extractStories(rootDir: string): Promise<StoryData> {
	const views: Partial<View>[] = [];
	const storyFiles = await glob("packages/client/src/**/*.stories.{ts,tsx}", {
		cwd: rootDir,
	});

	for (const file of storyFiles) {
		const content = readFileSync(path.join(rootDir, file), "utf-8");

		const titleMatch = content.match(/title:\s*["'`]([^"'`]+)["'`]/);
		if (!titleMatch) continue;

		const storybookPath = titleMatch[1];

		// Extract component name from the import or the meta
		const componentMatch = content.match(/component:\s*(\w+)/);
		const componentName = componentMatch?.[1];
		if (!componentName) continue;

		const id = toKebabCase(componentName);

		views.push({
			id,
			name: componentName,
			storybookPath,
		});
	}

	return { views };
}

function toKebabCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.replace(/[_\s]+/g, "-")
		.toLowerCase();
}
